from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ingest, insights

app = FastAPI(
    title="Civi AI",
    description="Agentic analysis plane for the Chainnes Community Intelligence Hub.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(insights.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civi-ai"}
