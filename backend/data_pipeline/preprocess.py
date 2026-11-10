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


def compute_slope_degrees(elevation_m: np.ndarray) -> np.ndarray:
    """Compute topographic slope in degrees from MOLA DEM on spherical Mars."""
    height, width = elevation_m.shape
    lats = np.linspace(90.0 - 90.0 / height, -90.0 + 90.0 / height, height)
    dlat_rad = np.radians(180.0 / height)
    dlon_rad = np.radians(360.0 / width)

    dy_m = MARS_RADIUS_M * dlat_rad
    cos_lat = np.clip(np.cos(np.radians(lats)), 0.08, 1.0)[:, np.newaxis]
    dx_m = MARS_RADIUS_M * dlon_rad * cos_lat

    dz_dy, dz_dx = np.gradient(elevation_m)
    slope_rad = np.arctan(np.sqrt((dz_dx / dx_m) ** 2 + (dz_dy / dy_m) ** 2))
    slope_deg = np.degrees(slope_rad)

    # Blend with regional sub-grid lander-scale roughness from MARS_REGIONS
    lons = np.linspace(-180.0 + 180.0 / width, 180.0 - 180.0 / width, width)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    for region in MARS_REGIONS:
        dist_deg = _angular_distance_deg(
            lat_grid, lon_grid, region["lat"], region["lon_180"]
        )
        weight = np.exp(-0.5 * (dist_deg / (region["radius_deg"] * 0.55)) ** 2)
        slope_deg = (1.0 - weight) * slope_deg + weight * region["slope_deg"]

    return np.clip(slope_deg, 0.1, 35.0).astype(np.float32)


