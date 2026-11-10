"""Configuration, Mars physical constants, dataset URLs, and landmark regions."""

from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
TILES_DIR = DATA_DIR / "tiles"
LAYERS_DIR = DATA_DIR / "layers"

# Mars physical constants
MARS_RADIUS_M = 3_389_500.0
MARS_GRAVITY_MS2 = 3.72076
MARS_SCALE_HEIGHT_M = 11_100.0

# Unified Grid Resolution for Preprocessing & Interactive Web Serving
# 720 x 360 = 0.5 degree per pixel (global coverage, fast vectorization & tile generation)
DEFAULT_GRID_WIDTH = 720
DEFAULT_GRID_HEIGHT = 360

# Standard Geographic CRS ([-180, 180] lon, [-90, 90] lat) used by CesiumJS Equirectangular / WebMercator tiler
TARGET_CRS = "EPSG:4326"

# Official USGS Astrogeology (MOLA) & PSI (SWIM) Data Sources
OFFICIAL_URLS: Dict[str, str] = {
    # USGS Astrogeology MOLA MEGDR / DEM
    "mola_dem_463m": (
        "https://planetarymaps.usgs.gov/mosaic/"
        "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
    ),
    # PSI Subsurface Water Ice Mapping (SWIM) Northern + Southern Hemisphere Ice Consistency
    "swim_ice_nh": (
        "https://swim.psi.edu/data/SWIM2_NH_ice_consistency.tif"
    ),
    "swim_ice_sh": (
        "https://swim.psi.edu/data/SWIM2_SH_ice_consistency.tif"
    ),
}

# Curated Mars Candidate Landing Regions (used for anchoring geoscientific synthesis
# and naming regions in the Mission Planner Report Card)
MARS_REGIONS: List[Dict[str, Any]] = []
