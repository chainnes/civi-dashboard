from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.db import SupabaseNotConfiguredError, get_supabase

router = APIRouter(prefix="/v1", tags=["insights"])


@router.get("/insights")
def list_insights(limit: int = Query(default=20, ge=1, le=100)) -> dict[str, Any]:
    try:
        client = get_supabase()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result = (
        client.table("insights")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"items": result.data or []}


@router.get("/metrics")
def metrics() -> dict[str, Any]:
    try:
        client = get_supabase()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    posts = client.table("community_posts").select("id", count="exact").execute()
    insights = client.table("insights").select("id,sentiment,status").execute()
    rows = insights.data or []
    sentiment_counts: dict[str, int] = {}
    for row in rows:
        key = row.get("sentiment") or "unscored"
        sentiment_counts[key] = sentiment_counts.get(key, 0) + 1

    return {
        "posts": posts.count or 0,
        "insights": len(rows),
        "complete": sum(1 for row in rows if row.get("status") == "complete"),
        "sentiment": sentiment_counts,
    }
