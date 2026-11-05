"""
Detection logic for the AI service.

This module turns an uploaded photo into a civic-issue classification. It ships
with two real detectors:

  * HeuristicVisionDetector  — always available. Uses numpy to extract genuine
    pixel features (colour distribution, darkness, texture/edge density,
    brightness, blue/green ratios) and scores each civic category. It looks at
    actual image content, so different photos produce genuinely different
    results — no training or model download required.

  * ClipZeroShotDetector     — optional upgrade. If PyTorch + open_clip are
    installed, this runs OpenAI CLIP in zero-shot mode: it compares the image
    against natural-language prompts for each category ("a photo of a pothole in
    a road", ...) and picks the best match. This is real ML with no training and
    no labelled dataset — just `pip install -r requirements-ml.txt`.

get_detector() prefers CLIP and falls back to the heuristic detector, so the
system always auto-detects the issue. The citizen's optional category choice is
treated only as a mild prior, never as an override — the image decides.

The API contract (AnalyzeResponse) is identical for both, so the backend and
frontend don't care which engine is running.
"""
from __future__ import annotations

import io
from abc import ABC, abstractmethod
from typing import Optional

import numpy as np
from PIL import Image

from .schemas import AnalyzeResponse, BoundingBox, CategoryScore

# Categories mirror the backend's IssueCategory enum (value -> label).
CATEGORIES = {
    "POTHOLE": "Pothole",
    "DAMAGED_ROAD": "Damaged Road",
    "GARBAGE": "Garbage / Waste",
    "BROKEN_STREETLIGHT": "Broken Streetlight",
    "WATER_LEAKAGE": "Water Leakage",
    "DAMAGED_INFRASTRUCTURE": "Damaged Infrastructure",
    "OTHER": "Other",
}

# Only these are things the detector will actively classify into (OTHER is the
# fallback when nothing scores confidently).
DETECTABLE = [c for c in CATEGORIES if c != "OTHER"]

# Natural-language prompts used by the zero-shot CLIP detector.
CLIP_PROMPTS = {
    "POTHOLE": "a photo of a pothole in a road",
    "DAMAGED_ROAD": "a photo of a cracked and damaged road surface",
    "GARBAGE": "a photo of a pile of garbage and waste on the street",
    "BROKEN_STREETLIGHT": "a night photo of a broken or unlit streetlight",
    "WATER_LEAKAGE": "a photo of water leaking and flooding on the street",
    "DAMAGED_INFRASTRUCTURE": "a photo of damaged public infrastructure like a broken wall or footpath",
}


def _severity_from(confidence: float, area_ratio: float) -> str:
    """Combine model confidence and how much of the frame the issue fills."""
    score = (confidence * 0.6) + (area_ratio * 0.4)
    if score >= 0.75:
        return "CRITICAL"
    if score >= 0.55:
        return "HIGH"
    if score >= 0.35:
        return "MEDIUM"
    return "LOW"


def _priority_from(category: str, severity: str) -> str:
    """Derive handling priority from severity, nudged up for high-impact categories."""
    base = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}[severity]
    high_impact = {"POTHOLE", "DAMAGED_ROAD", "WATER_LEAKAGE", "BROKEN_STREETLIGHT"}
    if category in high_impact:
        base = min(base + 1, 3)
    return ["LOW", "MEDIUM", "HIGH", "URGENT"][base]


class Detector(ABC):
    """Interface every detector implementation must satisfy."""

    name: str = "detector"

    @abstractmethod
    def analyze(self, image_bytes: bytes, category_hint: Optional[str] = None) -> AnalyzeResponse:
        ...


# ---------------------------------------------------------------------------
# Shared image utilities
# ---------------------------------------------------------------------------

_ANALYSIS_LONG_EDGE = 256  # downscale for fast, stable feature extraction
_GRID = 8                  # coarse saliency grid (GRID x GRID cells)


def _open_rgb(image_bytes: bytes) -> Optional[Image.Image]:
    """Validate and open the upload as an RGB image, or return None if invalid."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # integrity check
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return img
    except Exception:
        return None


def _to_small_array(img: Image.Image) -> np.ndarray:
    """Downscale (preserving aspect) and return an HxWx3 float array in [0, 1]."""
    w, h = img.size
    scale = _ANALYSIS_LONG_EDGE / float(max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))))
    return np.asarray(img, dtype=np.float32) / 255.0


def _per_pixel_features(arr: np.ndarray):
    """Compute per-pixel maps used by both the scalar features and saliency grid."""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    max_c = np.max(arr, axis=-1)
    min_c = np.min(arr, axis=-1)
    saturation = (max_c - min_c) / (max_c + 1e-6)
    blueness = np.clip(b - np.maximum(r, g), 0.0, 1.0)
    greenness = np.clip(g - np.maximum(r, b), 0.0, 1.0)

    # Edge/texture magnitude from the luminance gradient (cracks & clutter = high).
    gy, gx = np.gradient(luminance)
    edges = np.sqrt(gx * gx + gy * gy)

    return {
        "luminance": luminance,
        "saturation": saturation,
        "blueness": blueness,
        "greenness": greenness,
        "edges": edges,
    }


def _cell_means(field: np.ndarray, grid: int = _GRID) -> np.ndarray:
    """Average a 2-D field into a coarse grid, returned as a flat array of cell means."""
    h, w = field.shape
    ch, cw = max(1, h // grid), max(1, w // grid)
    cells = []
    for i in range(0, h, ch):
        for j in range(0, w, cw):
            cells.append(float(field[i:i + ch, j:j + cw].mean()))
    return np.array(cells, dtype=np.float32)


def _scalar_features(px: dict) -> dict:
    """Aggregate the per-pixel maps into interpretable scalar features in ~[0, 1]."""
    lum = px["luminance"]
    sat = px["saturation"]
    mean_brightness = float(lum.mean())
    # How deeply the darkest region dips below the overall brightness — the tell
    # for a localized dark hole (pothole) versus uniform cracking (damaged road).
    darkest_cell = float(_cell_means(lum).min())
    dark_contrast = float(np.clip(mean_brightness - darkest_cell, 0.0, 1.0))
    return {
        "mean_brightness": mean_brightness,
        "dark_frac": float((lum < 0.25).mean()),
        "dark_contrast": dark_contrast,
        "highlight_frac": float((lum > 0.85).mean()),
        "gray_frac": float(((sat < 0.18) & (lum > 0.2) & (lum < 0.8)).mean()),
        "blue_frac": float((px["blueness"] > 0.06).mean()),
        "green_frac": float((px["greenness"] > 0.06).mean()),
        "sat_mean": float(sat.mean()),
        "sat_std": float(sat.std()),
        "edge_density": float(np.clip(px["edges"].mean() * 6.0, 0.0, 1.0)),
    }


def _score_categories(f: dict) -> dict:
    """
    Turn scalar features into a raw score per detectable category. Each formula
    encodes a simple, defensible visual signature of that civic issue.
    """
    raw = {
        # A concentrated dark hole sitting in a grey, low-colour road surface.
        "POTHOLE": 2.2 * f["dark_contrast"] + 0.6 * f["gray_frac"]
                   + 0.3 * f["dark_frac"] - 0.5 * f["sat_mean"],
        # Grey tarmac with heavy cracking/texture but no single deep hole.
        "DAMAGED_ROAD": 1.5 * f["edge_density"] + 0.7 * f["gray_frac"]
                        - 1.0 * f["dark_contrast"] - 0.6 * f["sat_mean"] - 0.4 * f["green_frac"],
        # Colourful, cluttered, high-variance heaps — often organic/warm tones.
        "GARBAGE": 1.2 * f["sat_mean"] + 1.0 * f["sat_std"] + 0.7 * f["edge_density"]
                   + 0.4 * f["green_frac"] - 0.5 * f["gray_frac"],
        # A dark / night scene, sometimes with a small bright lamp highlight.
        "BROKEN_STREETLIGHT": 1.3 * f["dark_frac"] + 0.9 * (1.0 - f["mean_brightness"])
                              + 0.5 * f["highlight_frac"] - 0.9 * f["gray_frac"],
        # Bluish and/or bright reflective standing water.
        "WATER_LEAKAGE": 1.4 * f["blue_frac"] + 0.9 * f["highlight_frac"]
                         + 0.4 * f["mean_brightness"] - 0.4 * f["edge_density"],
        # Grey concrete structures with edges — the weaker structural residual,
        # deliberately less greedy so specific signatures win when present.
        "DAMAGED_INFRASTRUCTURE": 0.6 * f["gray_frac"] + 0.6 * f["edge_density"]
                                  - 0.5 * f["dark_contrast"] - 0.5 * f["sat_mean"]
                                  - 0.3 * f["blue_frac"],
    }
    # Clip negatives to zero so weak signals don't distort the softmax.
    return {k: max(0.0, v) for k, v in raw.items()}


def _salient_box(px: dict, category: str, orig_w: int, orig_h: int) -> BoundingBox:
    """
    Locate the most relevant region for the detected category using a coarse
    grid, then map the peak cell back to original-image pixel coordinates.
    """
    if category == "WATER_LEAKAGE":
        field = px["luminance"] * 0.5 + px["blueness"]
    elif category in ("POTHOLE", "BROKEN_STREETLIGHT"):
        field = 1.0 - px["luminance"]  # darkest region
    else:
        field = px["edges"]            # most textured region (cracks/clutter)

    h, w = field.shape
    ch, cw = max(1, h // _GRID), max(1, w // _GRID)
    best, bi, bj = -1.0, 0, 0
    for i in range(0, h, ch):
        for j in range(0, w, cw):
            cell_mean = float(field[i:i + ch, j:j + cw].mean())
            if cell_mean > best:
                best, bi, bj = cell_mean, i, j

    # Box spans roughly 3 cells, centred on the peak, clamped to the frame.
    sx, sy = orig_w / float(w), orig_h / float(h)
    x0 = max(0, bj - cw)
    y0 = max(0, bi - ch)
    x1 = min(w, bj + 2 * cw)
    y1 = min(h, bi + 2 * ch)
    return BoundingBox(
        x=int(x0 * sx), y=int(y0 * sy),
        width=int((x1 - x0) * sx), height=int((y1 - y0) * sy),
    )


def _finalize(scores: dict, category_hint: Optional[str],
              px: dict, orig_w: int, orig_h: int,
              model_version: str, message: str) -> AnalyzeResponse:
    """Shared post-processing: apply the hint prior, softmax, pick winner, build response."""
    # A valid citizen category is a *mild* prior, not an override.
    if category_hint in scores:
        scores = dict(scores)
        scores[category_hint] += 0.15

    keys = list(scores.keys())
    vals = np.array([scores[k] for k in keys], dtype=np.float64)

    if vals.sum() <= 1e-6:
        # Nothing looked like a civic issue — report OTHER, low confidence.
        return AnalyzeResponse(
            detected=True, category="OTHER", category_label=CATEGORIES["OTHER"],
            confidence=0.4, severity="LOW", priority="LOW",
            bounding_box=None, alternatives=[], model_version=model_version,
            message="No strong civic-issue signal; flagged for manual review.",
        )

    # Softmax with a temperature that keeps probabilities readable.
    exp = np.exp((vals - vals.max()) / 0.35)
    probs = exp / exp.sum()
    order = np.argsort(probs)[::-1]

    top_i = int(order[0])
    category = keys[top_i]
    top_p = float(probs[top_i])
    second_p = float(probs[int(order[1])]) if len(order) > 1 else 0.0

    # Confidence: baseline plus how decisively the winner beat the runner-up.
    confidence = round(float(np.clip(0.55 + 1.7 * (top_p - second_p), 0.55, 0.96)), 2)

    alternatives = [
        CategoryScore(category=keys[i], category_label=CATEGORIES[keys[i]],
                      score=round(float(probs[i]), 3))
        for i in order[:3]
    ]

    box = _salient_box(px, category, orig_w, orig_h)
    area_ratio = (box.width * box.height) / float(orig_w * orig_h) if box else 0.0
    severity = _severity_from(confidence, area_ratio)
    priority = _priority_from(category, severity)

    return AnalyzeResponse(
        detected=True, category=category, category_label=CATEGORIES[category],
        confidence=confidence, severity=severity, priority=priority,
        bounding_box=box, alternatives=alternatives,
        model_version=model_version, message=message,
    )


# ---------------------------------------------------------------------------
# Heuristic vision detector (always available)
# ---------------------------------------------------------------------------

class HeuristicVisionDetector(Detector):
    """
    Real content-based detection using numpy pixel features. No training and no
    model download — it inspects colour, darkness, texture and reflectivity to
    decide which civic issue the photo most resembles.
    """

    name = "heuristic-vision-v1"

    def analyze(self, image_bytes: bytes, category_hint: Optional[str] = None) -> AnalyzeResponse:
        img = _open_rgb(image_bytes)
        if img is None:
            return AnalyzeResponse(
                detected=False, model_version=self.name,
                message="Uploaded file is not a valid image",
            )
        orig_w, orig_h = img.size
        arr = _to_small_array(img)
        px = _per_pixel_features(arr)
        scores = _score_categories(_scalar_features(px))
        return _finalize(
            scores, category_hint, px, orig_w, orig_h, self.name,
            "Automatic detection from image content (heuristic vision engine).",
        )


# ---------------------------------------------------------------------------
# Optional zero-shot CLIP detector (real ML; activates if torch + open_clip present)
# ---------------------------------------------------------------------------

class ClipZeroShotDetector(Detector):
    """
    Zero-shot classification with OpenAI CLIP via open_clip. Compares the image
    against a natural-language prompt for each category and picks the best match.
    Real machine learning, but needs no training data — just the pretrained
    weights that open_clip downloads on first use.
    """

    name = "clip-zeroshot-vit-b-32"

    def __init__(self):
        import torch
        import open_clip

        self._torch = torch
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="laion2b_s34b_b79k"
        )
        self._model.eval().to(self._device)
        tokenizer = open_clip.get_tokenizer("ViT-B-32")

        self._labels = DETECTABLE
        prompts = [CLIP_PROMPTS[c] for c in self._labels]
        with torch.no_grad():
            text_tokens = tokenizer(prompts).to(self._device)
            text_features = self._model.encode_text(text_tokens)
            self._text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    def analyze(self, image_bytes: bytes, category_hint: Optional[str] = None) -> AnalyzeResponse:
        img = _open_rgb(image_bytes)
        if img is None:
            return AnalyzeResponse(
                detected=False, model_version=self.name,
                message="Uploaded file is not a valid image",
            )
        orig_w, orig_h = img.size
        torch = self._torch
        with torch.no_grad():
            image_input = self._preprocess(img).unsqueeze(0).to(self._device)
            image_features = self._model.encode_image(image_input)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            sims = (image_features @ self._text_features.T).squeeze(0)
            sims = sims.cpu().numpy()

        # CLIP similarities -> non-negative scores keyed by category.
        scores = {c: max(0.0, float(s)) for c, s in zip(self._labels, sims)}

        # Reuse the shared saliency box + severity/priority pipeline.
        arr = _to_small_array(img)
        px = _per_pixel_features(arr)
        return _finalize(
            scores, category_hint, px, orig_w, orig_h, self.name,
            "Automatic detection via zero-shot CLIP image-text matching.",
        )


# ---------------------------------------------------------------------------

_ACTIVE: Optional[Detector] = None


def get_detector() -> Detector:
    """
    Return the best available detector, preferring real zero-shot CLIP when its
    dependencies are installed and falling back to the always-available
    heuristic vision engine. Cached so the model loads only once.
    """
    global _ACTIVE
    if _ACTIVE is not None:
        return _ACTIVE
    try:
        _ACTIVE = ClipZeroShotDetector()
    except Exception:
        # torch/open_clip missing or weights unavailable — use the heuristic engine.
        _ACTIVE = HeuristicVisionDetector()
    return _ACTIVE

