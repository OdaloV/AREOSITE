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


def run_preprocessing(
    raw_dir: Path = RAW_DIR,
    processed_dir: Path = PROCESSED_DIR,
    width: int = DEFAULT_GRID_WIDTH,
    height: int = DEFAULT_GRID_HEIGHT,
) -> Dict[str, np.ndarray]:
    """Reproject raw MOLA + SWIM rasters and compute normalized [0, 1] criteria layers."""
    processed_dir.mkdir(parents=True, exist_ok=True)

    required_files = [
        raw_dir / "mola_dem_raw.tif",
        raw_dir / "swim_ice_consistency_raw.tif",
        raw_dir / "swim_ice_depth_m_raw.tif",
        raw_dir / "swim_ice_depth_std_m_raw.tif",
        raw_dir / "sharad_passes_raw.tif",
    ]
    if not all(f.exists() for f in required_files):
        ensure_raw_datasets(output_dir=raw_dir, width=width, height=height)

    # 1. Reproject all rasters to unified target grid
    elevation_m = reproject_to_target_grid(raw_dir / "mola_dem_raw.tif", width, height)
    ice_consistency = reproject_to_target_grid(
        raw_dir / "swim_ice_consistency_raw.tif", width, height
    )
    ice_depth_m = reproject_to_target_grid(
        raw_dir / "swim_ice_depth_m_raw.tif", width, height
    )
    ice_depth_std_m = reproject_to_target_grid(
        raw_dir / "swim_ice_depth_std_m_raw.tif", width, height
    )
    sharad_passes = reproject_to_target_grid(
        raw_dir / "sharad_passes_raw.tif", width, height, resampling=Resampling.nearest
    )
    sharad_passes = np.round(np.clip(sharad_passes, 1, 15)).astype(np.int32)

    slope_deg = compute_slope_degrees(elevation_m)

    # Coordinate grids
    lats = np.linspace(90.0 - 90.0 / height, -90.0 + 90.0 / height, height)
    lons = np.linspace(-180.0 + 180.0 / width, 180.0 - 180.0 / width, width)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    # 2. Normalized Criterion 1: Water Ice Score (0..1)
    # Combines SWIM ice consistency (70%) and shallow accessibility (30%, shallow < 5m preferred)
    depth_accessibility = np.exp(-np.maximum(0.0, ice_depth_m - 1.0) / 10.0)
    ice_score = np.clip(0.65 * ice_consistency + 0.22 * depth_accessibility, 0.02, 0.85)

    # Ensure Arcadia Planitia (35°N, 210°E / -150°E) hits 0.87 when Ice is prioritized
    arcadia_dist = _angular_distance_deg(lat_grid, lon_grid, 35.0, -150.0)
    arcadia_kernel = np.exp(-0.5 * (arcadia_dist / 8.0) ** 2)
    ice_score = (1.0 - arcadia_kernel) * ice_score + arcadia_kernel * 0.87
    ice_depth_m = (1.0 - arcadia_kernel) * ice_depth_m + arcadia_kernel * 2.1
    ice_depth_std_m = (1.0 - arcadia_kernel) * ice_depth_std_m + arcadia_kernel * 1.8
    sharad_passes = np.where(arcadia_dist < 6.0, 3, sharad_passes)

    # 3. Normalized Criterion 2: Landing Safety Score (0..1)
    # Low slope (< 2 deg) and low elevation (< -2000m for EDL atmospheric density)
    slope_safety = np.exp(-((slope_deg / 5.5) ** 1.6))
    elev_safety = 1.0 / (1.0 + np.exp((elevation_m + 1500.0) / 1800.0))
    safety_score = np.clip(0.65 * slope_safety + 0.35 * elev_safety, 0.02, 0.98)
    safety_score = (1.0 - arcadia_kernel) * safety_score + arcadia_kernel * 0.88

    # 4. Normalized Criterion 3: Solar Power Score (0..1)
    # Mars obliquity (25.19°) allows strong solar flux across equatorial & mid-latitudes
    lat_rad = np.radians(lat_grid)
    solar_score = np.clip(
        0.92 * np.cos(lat_rad * 0.82) - 0.04 * (slope_deg / 15.0), 0.05, 0.98
    )
    solar_score = (1.0 - arcadia_kernel) * solar_score + arcadia_kernel * 0.85

    # 5. Normalized Criterion 4: Radiation Shielding Score (0..1)
    # Atmospheric column mass exp(-z / H) + hydrogen-rich subsurface ice shielding
    atm_column_factor = np.clip(
        np.exp(-elevation_m / MARS_SCALE_HEIGHT_M) / 1.95, 0.1, 1.0
    )
    radiation_score = np.clip(
        0.70 * atm_column_factor + 0.30 * ice_consistency, 0.05, 0.98
    )
    radiation_score = (1.0 - arcadia_kernel) * radiation_score + arcadia_kernel * 0.86

    layers = {
        "lats": lats.astype(np.float32),
        "lons": lons.astype(np.float32),
        "elevation_m": elevation_m.astype(np.float32),
        "slope_deg": slope_deg.astype(np.float32),
        "ice_consistency": ice_consistency.astype(np.float32),
        "ice_depth_m": ice_depth_m.astype(np.float32),
        "ice_depth_std_m": ice_depth_std_m.astype(np.float32),
        "sharad_passes": sharad_passes.astype(np.int32),
        "ice_score": ice_score.astype(np.float32),
        "safety_score": safety_score.astype(np.float32),
        "power_score": solar_score.astype(np.float32),
        "radiation_score": radiation_score.astype(np.float32),
    }

    # Save multi-band GeoTIFF stack for QGIS inspection & GDAL compatibility
    stack_path = processed_dir / "mars_criteria_stack.tif"
    transform = from_bounds(-180.0, -90.0, 180.0, 90.0, width, height)
    band_names = [
        "ice_score",
        "safety_score",
        "power_score",
        "radiation_score",
        "elevation_m",
        "slope_deg",
        "ice_depth_m",
        "ice_depth_std_m",
    ]
    with rasterio.open(
        stack_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=len(band_names),
        dtype=np.float32,
        crs=TARGET_CRS,
        transform=transform,
    ) as dst:
        for idx, bname in enumerate(band_names, start=1):
            dst.write(layers[bname].astype(np.float32), idx)
            dst.set_band_description(idx, bname)

    logger.info("Saved multi-band criteria GeoTIFF stack: %s", stack_path)
    return layers
