"""Weighted Multi-Criteria Suitability Scoring Engine."""

from typing import Dict, Any, List
import numpy as np

from backend.config import MARS_REGIONS
from backend.data_pipeline.uncertainty import (
    confidence_label_from_code,
    describe_coverage_gap,
    match_landmark_region,
)


PRESET_WEIGHTS: Dict[str, Dict[str, float]] = {
    "balanced": {"ice": 0.25, "safety": 0.25, "power": 0.25, "radiation": 0.25},
    "ice_max": {"ice": 1.0, "safety": 0.0, "power": 0.0, "radiation": 0.0},
    "safety_max": {"ice": 0.0, "safety": 1.0, "power": 0.0, "radiation": 0.0},
    "power_max": {"ice": 0.0, "safety": 0.0, "power": 1.0, "radiation": 0.0},
    "radiation_max": {"ice": 0.0, "safety": 0.0, "power": 0.0, "radiation": 1.0},
    "human_base": {"ice": 0.40, "safety": 0.30, "power": 0.15, "radiation": 0.15},
}


def compute_weighted_suitability(
    layers: Dict[str, np.ndarray],
    w_ice: float = 0.25,
    w_safety: float = 0.25,
    w_power: float = 0.25,
    w_radiation: float = 0.25,
) -> np.ndarray:
    """Compute normalized weighted suitability score grid in [0, 1]."""
    w_ice = max(0.0, float(w_ice))
    w_safety = max(0.0, float(w_safety))
    w_power = max(0.0, float(w_power))
    w_radiation = max(0.0, float(w_radiation))

    total = w_ice + w_safety + w_power + w_radiation
    if total <= 1e-6:
        w_ice = w_safety = w_power = w_radiation = 0.25
        total = 1.0

    score = (
        w_ice * layers["ice_score"]
        + w_safety * layers["safety_score"]
        + w_power * layers["power_score"]
        + w_radiation * layers["radiation_score"]
    ) / total

    return np.clip(score, 0.0, 1.0).astype(np.float32)


def normalize_lon_180(lon: float) -> float:
    """Convert any longitude (e.g., 0..360E like 210°E) to [-180, 180] (-150°)."""
    lon_norm = ((float(lon) + 180.0) % 360.0) - 180.0
    return lon_norm


def normalize_lon_360(lon: float) -> float:
    """Convert any longitude to [0, 360) East."""
    return float(lon) % 360.0


def format_mars_coords(lat: float, lon: float) -> str:
    """Format Mars coordinates in planetary mission convention, e.g. '35°N, 210°E'."""
    ns = "N" if lat >= 0 else "S"
    lon_e = normalize_lon_360(lon)
    lat_abs = abs(lat)
    lat_str = (
        f"{int(round(lat_abs))}°{ns}"
        if abs(lat_abs - round(lat_abs)) < 0.15
        else f"{lat_abs:.1f}°{ns}"
    )
    lon_str = (
        f"{int(round(lon_e))}°E"
        if abs(lon_e - round(lon_e)) < 0.15
        else f"{lon_e:.1f}°E"
    )
    return f"{lat_str}, {lon_str}"


