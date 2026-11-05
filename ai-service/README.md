# Civic AI Service — automatic issue detection

A small **Python + FastAPI** microservice that looks at a civic-issue photo and
**automatically detects** what it is — pothole, damaged road, garbage, broken
streetlight, water leakage, or damaged infrastructure — then returns a category,
confidence, severity, priority, a bounding box, and the runner-up guesses.

It ships with **two real, content-based detectors** (no mock, no hand-picked
categories):

| Engine | When it runs | What it does |
|---|---|---|
| **Heuristic vision** (`heuristic-vision-v1`) | Always — needs only numpy + Pillow | Extracts genuine pixel features (darkness, colour, texture/edges, reflectivity) and scores each category. Different photos give genuinely different results. |
| **Zero-shot CLIP** (`clip-zeroshot-vit-b-32`) | Auto-enabled if `torch` + `open_clip` are installed | Runs OpenAI CLIP in zero-shot mode, matching the image against a text prompt per category. Real ML, **no training or labelled dataset** — pretrained weights download on first use. |

`get_detector()` prefers CLIP and falls back to the heuristic engine, so the
service **always** auto-detects. The citizen's optional category choice is used
only as a *mild prior* — the image decides.

## Prerequisites

- **Python 3.10+** — https://www.python.org/downloads/ (check "Add to PATH" on Windows)

## Setup (Windows PowerShell)

From the `ai-service/` folder:

```powershell
# 1) create a virtual environment
python -m venv venv

# 2) activate it
venv\Scripts\Activate.ps1
# (if PowerShell blocks the script, run once:
#  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned  then reactivate)

# 3) install dependencies (heuristic engine works with just these)
pip install -r requirements.txt

# 4) OPTIONAL — turn on real zero-shot CLIP detection (~350MB weights on first run)
pip install -r requirements-ml.txt
```

If you install the ML extras, the service detects them at startup and switches to
CLIP automatically — no code change needed.

## Run it

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Service runs on **http://localhost:8000**
- Interactive API docs (Swagger UI): **http://localhost:8000/docs**
- `GET /health` reports which engine is active (`engine` field).

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Liveness + active engine |
| `/analyze` | POST | multipart: `image` (file) + optional `category` prior |

### Example

```powershell
curl.exe http://localhost:8000/health

# No category needed — the system detects it automatically:
curl.exe -X POST http://localhost:8000/analyze -F "image=@C:\path\to\photo.jpg"
```

Sample response:

```json
{
  "detected": true,
  "category": "POTHOLE",
  "category_label": "Pothole",
  "confidence": 0.91,
  "severity": "HIGH",
  "priority": "URGENT",
  "bounding_box": { "x": 120, "y": 210, "width": 300, "height": 180 },
  "alternatives": [
    { "category": "POTHOLE", "category_label": "Pothole", "score": 0.85 },
    { "category": "DAMAGED_ROAD", "category_label": "Damaged Road", "score": 0.08 },
    { "category": "DAMAGED_INFRASTRUCTURE", "category_label": "Damaged Infrastructure", "score": 0.04 }
  ],
  "model_version": "heuristic-vision-v1",
  "message": "Automatic detection from image content (heuristic vision engine)."
}
```

## How detection works (heuristic engine)

The image is downscaled and turned into a handful of interpretable features:

- **darkness & dark-contrast** — a deep, localized dark region signals a *pothole*.
- **edge/texture density** — heavy cracking across grey tarmac signals a *damaged road*.
- **colour saturation & variance** — colourful, cluttered heaps signal *garbage*.
- **overall brightness + a bright lamp highlight** — a dark night scene signals a *broken streetlight*.
- **blueness & reflective highlights** — standing bright/blue water signals a *water leakage*.
- grey concrete + edges without the above is the *damaged infrastructure* residual.

Scores are turned into probabilities with a softmax; the winner's margin over the
runner-up sets the confidence. **Severity** blends confidence with how much of the
frame the issue fills; **priority** maps from severity and is bumped for
high-impact categories (potholes, damaged roads, water, streetlights).

## How severity & priority are decided

- **Severity** blends model confidence (60%) with issue area (40%) → `LOW / MEDIUM / HIGH / CRITICAL`.
- **Priority** maps from severity, bumped one level for high-impact categories → `LOW / MEDIUM / HIGH / URGENT`.

## Upgrading accuracy further (optional, later)

The zero-shot CLIP engine already needs no training. If you later want a
task-specific model, you can train YOLOv8 on a civic dataset (e.g. RDD2022 for
road damage) and add a `YoloDetector` implementing the same `Detector` interface
— `get_detector()` is the single switch point and the JSON contract stays the
same, so nothing in the backend or frontend changes.

## How the backend uses this

When a citizen submits a complaint, the Spring Boot backend POSTs the image here,
stores the returned analysis in the `ai_analysis` table, and sets the complaint's
category/severity/priority. If this service is **down**, the backend logs a
warning and still saves the complaint (it just won't have AI data) — so the two
services are loosely coupled.
