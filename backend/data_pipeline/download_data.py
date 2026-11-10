"""Download or synthesize realistic MOLA DEM & SWIM Subsurface Ice GeoTIFF datasets."""

import argparse
import logging
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import rasterio
from rasterio.transform import from_bounds
import requests

from backend.config import (
    DEFAULT_GRID_HEIGHT,
    DEFAULT_GRID_WIDTH,
    MARS_REGIONS,
    OFFICIAL_URLS,
    RAW_DIR,
    TARGET_CRS,
)

logger = logging.getLogger(__name__)


def _angular_distance_deg(
    lat1_deg: np.ndarray,
    lon1_deg: np.ndarray,
    lat2_deg: float,
    lon2_deg: float,
) -> np.ndarray:
    """Compute great-circle angular distance in degrees on a sphere."""
    lat1 = np.radians(lat1_deg)
    lon1 = np.radians(lon1_deg)
    lat2 = np.radians(lat2_deg)
    lon2 = np.radians(lon2_deg)

    dlon = lon1 - lon2
    cos_c = np.sin(lat1) * np.sin(lat2) + np.cos(lat1) * np.cos(lat2) * np.cos(dlon)
    cos_c = np.clip(cos_c, -1.0, 1.0)
    return np.degrees(np.arccos(cos_c))


