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


