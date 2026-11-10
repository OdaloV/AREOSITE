"""Uncertainty & Orbital Sensor Confidence Engine (The Differentiator)."""

from typing import Dict, Any, Tuple
import numpy as np

from backend.config import MARS_REGIONS
from backend.data_pipeline.download_data import _angular_distance_deg


def compute_uncertainty_layers(layers: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
    """Compute continuous confidence & uncertainty rasters from SHARAD pass density,
    depth estimation error bars, and topographic radar clutter.
    """
    sharad_passes = layers["sharad_passes"].astype(np.float32)
    ice_depth_std_m = layers["ice_depth_std_m"].astype(np.float32)
    slope_deg = layers["slope_deg"].astype(np.float32)

    # Pass density factor: 1 pass -> 0.20, 3 passes -> 0.56, 7+ passes -> 0.88+
    pass_confidence = 1.0 - np.exp(-sharad_passes / 3.6)

    # Error bar tightness factor
    std_confidence = np.exp(-ice_depth_std_m / 4.5)

    # Radar surface clutter penalty (steep slopes cause off-nadir clutter in SHARAD echoes)
    clutter_factor = np.exp(-slope_deg / 18.0)

    confidence_score = np.clip(
        0.55 * pass_confidence + 0.30 * std_confidence + 0.15 * clutter_factor,
        0.05,
        0.98,
    ).astype(np.float32)

    uncertainty_score = (1.0 - confidence_score).astype(np.float32)

    layers["confidence_score"] = confidence_score
    layers["uncertainty_score"] = uncertainty_score
    return layers
