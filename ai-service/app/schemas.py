"""Pydantic response models for the AI service."""
from typing import List, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: int = Field(..., description="Top-left x in pixels")
    y: int = Field(..., description="Top-left y in pixels")
    width: int
    height: int


class CategoryScore(BaseModel):
    """One candidate category and its normalised match score (0-1)."""
    category: str = Field(..., description="Category enum value")
    category_label: str = Field(..., description="Human-friendly category name")
    score: float = Field(..., ge=0.0, le=1.0)


class AnalyzeResponse(BaseModel):
    detected: bool = Field(..., description="Whether any civic issue was detected")
    category: Optional[str] = Field(None, description="Detected issue category (enum value)")
    category_label: Optional[str] = Field(None, description="Human-friendly category name")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    severity: Optional[str] = Field(None, description="LOW | MEDIUM | HIGH | CRITICAL")
    priority: Optional[str] = Field(None, description="LOW | MEDIUM | HIGH | URGENT")
    bounding_box: Optional[BoundingBox] = None
    alternatives: List[CategoryScore] = Field(
        default_factory=list,
        description="Top candidate categories the model considered, best first",
    )
    model_version: str = Field(..., description="Identifier of the model that produced this result")
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    model_version: str
    engine: str = Field(..., description="Active detection engine")
    mock: bool = Field(..., description="True only if no real detector is active")
