"""CRS Reprojection and Derivation of Mars Physical & Normalized Suitability Layers."""

import logging
from pathlib import Path
from typing import Dict

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject

from backend.config import (
    DEFAULT_GRID_HEIGHT,
    DEFAULT_GRID_WIDTH,
    MARS_RADIUS_M,
    MARS_REGIONS,
    MARS_SCALE_HEIGHT_M,
    PROCESSED_DIR,
    RAW_DIR,
    TARGET_CRS,
)
from backend.data_pipeline.download_data import _angular_distance_deg, ensure_raw_datasets

logger = logging.getLogger(__name__)


def reproject_to_target_grid(
    src_path: Path,
    width: int = DEFAULT_GRID_WIDTH,
    height: int = DEFAULT_GRID_HEIGHT,
    resampling: Resampling = Resampling.bilinear,
) -> np.ndarray:
    """Reproject any input GeoTIFF raster to the unified Mars Equirectangular CRS grid."""
    dst_transform = from_bounds(-180.0, -90.0, 180.0, 90.0, width, height)
    dst_array = np.empty((height, width), dtype=np.float32)

    with rasterio.open(src_path) as src:
        reproject(
            source=rasterio.band(src, 1),
            destination=dst_array,
            src_transform=src.transform,
            src_crs=src.crs or TARGET_CRS,
            dst_transform=dst_transform,
            dst_crs=TARGET_CRS,
            resampling=resampling,
        )
    return dst_array


