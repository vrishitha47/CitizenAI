"""
AI microservice for the Civic Issue Reporting System.

Exposes:
  GET  /health   -> liveness + model info
  POST /analyze  -> accepts an image (+ optional category hint), returns a
                    detected category, confidence, severity, priority, and box.

Run locally:
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .detector import get_detector
from .schemas import AnalyzeResponse, HealthResponse

app = FastAPI(
    title="Civic AI Service",
    description="Automatically detects civic issues in photos (heuristic vision + optional zero-shot CLIP).",
    version="2.0.0",
)

# Allow the backend and local frontend to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = get_detector()

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="UP",
        service="civic-ai-service",
        model_version=detector.name,
        engine=detector.name,
        # Both current engines inspect real image content, so nothing is mocked.
        mock=False,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    image: UploadFile = File(..., description="The civic issue image"),
    category: Optional[str] = Form(None, description="Optional category hint from the citizen"),
) -> AnalyzeResponse:
    contents = await image.read()

    if not contents:
        return AnalyzeResponse(
            detected=False,
            model_version=MODEL_VERSION,
            message="Empty image upload",
        )
    if len(contents) > MAX_IMAGE_BYTES:
        return AnalyzeResponse(
            detected=False,
            model_version=MODEL_VERSION,
            message="Image exceeds 10MB limit",
        )

    return detector.analyze(contents, category_hint=category)
