"""FastAPI application serving Mars suitability scoring, uncertainty report cards, and map tiles."""

from contextlib import asynccontextmanager
from typing import Dict, Any
import numpy as np
from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import LAYERS_DIR, MARS_REGIONS, PROCESSED_DIR, TILES_DIR
from backend.data_pipeline.generate_tiles import render_rgba_png_bytes
from backend.data_pipeline.run_pipeline import load_or_run_pipeline
from backend.data_pipeline.scoring import (
    PRESET_WEIGHTS,
    build_report_card,
    compute_weighted_suitability,
    recommend_top_sites,
)

_MARS_LAYERS: Dict[str, np.ndarray] = {}


def get_layers() -> Dict[str, np.ndarray]:
    """Return cached Mars raster layers, initializing the pipeline if needed."""
    global _MARS_LAYERS
    if not _MARS_LAYERS:
        _MARS_LAYERS = load_or_run_pipeline(force=False)
    return _MARS_LAYERS


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_layers()
    yield


app = FastAPI(
    title="AREOSITE — Mars Base Suitability & Uncertainty Engine",
    description=(
        "Weighted multi-criteria decision engine for Mars base siting with "
        "MOLA topography, SWIM subsurface water ice, and SHARAD orbital pass uncertainty."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LAYERS_DIR.mkdir(parents=True, exist_ok=True)
TILES_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/tiles", StaticFiles(directory=str(TILES_DIR)), name="tiles")
app.mount("/layers", StaticFiles(directory=str(LAYERS_DIR)), name="layers")


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    layers = get_layers()
    return {
        "status": "ok",
        "service": "AREOSITE Backend Engine",
        "grid_shape": list(layers["ice_score"].shape),
        "presets": list(PRESET_WEIGHTS.keys()),
        "candidate_sites_count": len(MARS_REGIONS),
    }


@app.get("/api/report-card")
def get_report_card(
    lat: float = Query(35.0, ge=-90.0, le=90.0, description="Mars latitude (-90 to 90)"),
    lon: float = Query(
        210.0,
        ge=-360.0,
        le=360.0,
        description="Mars longitude (-180..180 or 0..360E)",
    ),
    w_ice: float = Query(1.0, ge=0.0, le=10.0, description="Water Ice priority weight"),
    w_safety: float = Query(
        0.0, ge=0.0, le=10.0, description="Landing Safety priority weight"
    ),
    w_power: float = Query(
        0.0, ge=0.0, le=10.0, description="Solar Power priority weight"
    ),
    w_radiation: float = Query(
        0.0, ge=0.0, le=10.0, description="Radiation Shielding priority weight"
    ),
) -> Dict[str, Any]:
    """Return the Mission Planner Report Card with error bars and SHARAD confidence for any (lat, lon)."""
    layers = get_layers()
    return build_report_card(
        layers=layers,
        lat=lat,
        lon=lon,
        w_ice=w_ice,
        w_safety=w_safety,
        w_power=w_power,
        w_radiation=w_radiation,
    )


@app.get("/api/sites/recommend")
def get_recommended_sites(
    w_ice: float = Query(1.0, ge=0.0, le=10.0),
    w_safety: float = Query(0.0, ge=0.0, le=10.0),
    w_power: float = Query(0.0, ge=0.0, le=10.0),
    w_radiation: float = Query(0.0, ge=0.0, le=10.0),
    top_k: int = Query(5, ge=1, le=10),
) -> Dict[str, Any]:
    """Return top ranked candidate Mars base sites for the given slider weights."""
    layers = get_layers()
    recommendations = recommend_top_sites(
        layers=layers,
        w_ice=w_ice,
        w_safety=w_safety,
        w_power=w_power,
        w_radiation=w_radiation,
        top_k=top_k,
    )
    return {
        "weights": {
            "ice": w_ice,
            "safety": w_safety,
            "power": w_power,
            "radiation": w_radiation,
        },
        "top_site": recommendations[0] if recommendations else None,
        "recommendations": recommendations,
    }


@app.get("/api/dynamic-layer.png")
def get_dynamic_suitability_png(
    w_ice: float = Query(0.25, ge=0.0, le=10.0),
    w_safety: float = Query(0.25, ge=0.0, le=10.0),
    w_power: float = Query(0.25, ge=0.0, le=10.0),
    w_radiation: float = Query(0.25, ge=0.0, le=10.0),
    mode: str = Query("suitability", pattern="^(suitability|uncertainty|ice)$"),
    width: int = Query(1440, ge=180, le=2880),
    height: int = Query(720, ge=90, le=1440),
) -> Response:
    """Dynamically compute and render a global equirectangular RGBA PNG overlay for CesiumJS."""
    layers = get_layers()
    if mode == "uncertainty":
        grid = layers["uncertainty_score"]
        cmap = "uncertainty"
    else:
        grid = compute_weighted_suitability(
            layers,
            w_ice=w_ice,
            w_safety=w_safety,
            w_power=w_power,
            w_radiation=w_radiation,
        )
        cmap = "ice" if mode == "ice" else "suitability"

    png_bytes = render_rgba_png_bytes(grid, colormap=cmap, out_size=(width, height))
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=60"},
    )
