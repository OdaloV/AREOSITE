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


