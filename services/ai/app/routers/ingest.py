from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.agents.insight_agent import analyze_post
from app.config import settings
from app.db import SupabaseNotConfiguredError, get_supabase

router = APIRouter(prefix="/v1", tags=["ingest"])


class IngestPayload(BaseModel):
    source: str = Field(pattern="^(forum|social|submission|n8n|other)$")
    channel: str | None = None
    external_id: str | None = None
    title: str | None = None
    body: str
    language: str | None = None
    author_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    run_agent: bool = True


def require_ingest_secret(x_civi_secret: str | None = Header(default=None)) -> None:
    if not settings.ingest_webhook_secret:
        return
    if x_civi_secret != settings.ingest_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid ingest secret")


@router.post("/ingest")
def ingest_post(payload: IngestPayload, _: None = Depends(require_ingest_secret)) -> dict[str, Any]:
    try:
        client = get_supabase()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    insert = (
        client.table("community_posts")
        .insert(
            {
                "source": payload.source,
                "channel": payload.channel,
                "external_id": payload.external_id,
                "title": payload.title,
                "body": payload.body,
                "language": payload.language,
                "author_id": payload.author_id,
                "metadata": payload.metadata,
            }
        )
        .execute()
    )
    rows = insert.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Ingest insert returned no row")
    post = rows[0]

    insight: dict[str, Any] | None = None
    if payload.run_agent:
        analysis = analyze_post(payload.title, payload.body)
        created = (
            client.table("insights")
            .insert(
                {
                    "post_id": post["id"],
                    "status": "complete",
                    **analysis,
                }
            )
            .execute()
        )
        insight = (created.data or [None])[0]
        client.table("community_posts").update(
            {"processed_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", post["id"]).execute()

    return {"post": post, "insight": insight}
