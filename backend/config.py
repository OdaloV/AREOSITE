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
MARS_REGIONS: List[Dict[str, Any]] = [
    {
        "id": "arcadia_planitia",
        "name": "Arcadia Planitia",
        "lat": 35.0,
        "lon_360": 210.0,
        "lon_180": -150.0,
        "radius_deg": 18.0,
        "elevation_m": -4100.0,
        "slope_deg": 1.1,
        "ice_score": 0.96,
        "ice_depth_m": 2.1,
        "ice_depth_std_m": 1.8,
        "sharad_passes": 3,
        "coverage_gap": "Coverage gap to the south.",
        "geology_note": "Smooth Amazonian volcanic and periglacial plains with shallow excess water ice sheet.",
    },
    {
        "id": "utopia_planitia",
        "name": "Utopia Planitia",
        "lat": 42.5,
        "lon_360": 110.0,
        "lon_180": 110.0,
        "radius_deg": 20.0,
        "elevation_m": -4450.0,
        "slope_deg": 1.4,
        "ice_score": 0.84,
        "ice_depth_m": 2.8,
        "ice_depth_std_m": 0.9,
        "sharad_passes": 7,
        "coverage_gap": "Dense orbital track coverage; minor eastern cross-track gap.",
        "geology_note": "Vast northern impact basin hosting massive scalloped subsurface water-ice deposits.",
    },
    {
        "id": "deuteronilus_mensae",
        "name": "Deuteronilus Mensae",
        "lat": 41.0,
        "lon_360": 23.0,
        "lon_180": 23.0,
        "radius_deg": 12.0,
        "elevation_m": -3200.0,
        "slope_deg": 3.8,
        "ice_score": 0.81,
        "ice_depth_m": 1.5,
        "ice_depth_std_m": 0.6,
        "sharad_passes": 8,
        "coverage_gap": "High SHARAD reflector density across lobate debris aprons.",
        "geology_note": "Dichotomy boundary fretted terrain containing debris-covered glaciers.",
    },
    {
        "id": "jezero_crater",
        "name": "Jezero Crater",
        "lat": 18.38,
        "lon_360": 77.58,
        "lon_180": 77.58,
        "radius_deg": 10.0,
        "elevation_m": -2550.0,
        "slope_deg": 2.6,
        "ice_score": 0.38,
        "ice_depth_m": 14.5,
        "ice_depth_std_m": 4.2,
        "sharad_passes": 6,
        "coverage_gap": "Hydrated clay minerals confirmed; deep aquifer uncertainty.",
        "geology_note": "Noachian paleolake basin with phyllosilicate delta deposits and strong solar insolation.",
    },
    {
        "id": "amazonis_planitia",
        "name": "Amazonis Planitia",
        "lat": 24.8,
        "lon_360": 196.0,
        "lon_180": -164.0,
        "radius_deg": 16.0,
        "elevation_m": -3850.0,
        "slope_deg": 0.8,
        "ice_score": 0.68,
        "ice_depth_m": 5.4,
        "ice_depth_std_m": 2.4,
        "sharad_passes": 2,
        "coverage_gap": "Sparse SHARAD sub-track spacing; dust mantle attenuates radar return.",
        "geology_note": "Exceptionally flat low-elevation plains ideal for landing safety and solar arrays.",
    },
    {
        "id": "chryse_planitia",
        "name": "Chryse Planitia",
        "lat": 22.4,
        "lon_360": 312.0,
        "lon_180": -48.0,
        "radius_deg": 15.0,
        "elevation_m": -3600.0,
        "slope_deg": 1.9,
        "ice_score": 0.56,
        "ice_depth_m": 6.8,
        "ice_depth_std_m": 1.9,
        "sharad_passes": 5,
        "coverage_gap": "Moderate radar coverage; boulder fields near outflow channels.",
        "geology_note": "Outflow channel terminus with low elevation, thick atmosphere, and high solar flux.",
    },
    {
        "id": "hellas_planitia",
        "name": "Hellas Planitia",
        "lat": -42.4,
        "lon_360": 70.5,
        "lon_180": 70.5,
        "radius_deg": 20.0,
        "elevation_m": -7150.0,
        "slope_deg": 1.7,
        "ice_score": 0.82,
        "ice_depth_m": 3.4,
        "ice_depth_std_m": 2.1,
        "sharad_passes": 3,
        "coverage_gap": "Atmospheric dust opacity and southern coverage gap limit radar confidence.",
        "geology_note": "Deepest impact basin on Mars (-7.1 km), offering maximum natural radiation & aerodynamic shielding.",
    },
    {
        "id": "elysium_planitia",
        "name": "Elysium Planitia",
        "lat": 4.5,
        "lon_360": 135.9,
        "lon_180": 135.9,
        "radius_deg": 15.0,
        "elevation_m": -2650.0,
        "slope_deg": 1.2,
        "ice_score": 0.29,
        "ice_depth_m": 18.0,
        "ice_depth_std_m": 5.5,
        "sharad_passes": 4,
        "coverage_gap": "Equatorial dessication zone; radar echoes obscured by young lava flows.",
        "geology_note": "Equatorial plains with peak year-round solar power and benign landing slopes, but minimal shallow ice.",
    },
    {
        "id": "valles_marineris",
        "name": "Valles Marineris (Melas Chasma)",
        "lat": -9.8,
        "lon_360": 283.6,
        "lon_180": -76.4,
        "radius_deg": 12.0,
        "elevation_m": -3900.0,
        "slope_deg": 14.5,
        "ice_score": 0.44,
        "ice_depth_m": 11.2,
        "ice_depth_std_m": 3.9,
        "sharad_passes": 2,
        "coverage_gap": "Severe canyon-wall clutter degrades SHARAD radar reflections.",
        "geology_note": "Deep tectonic canyon system with high atmospheric pressure and solar energy, but hazardous terrain slopes.",
    },
    {
        "id": "tharsis_montes",
        "name": "Tharsis Rise / Olympus Mons Flank",
        "lat": 14.0,
        "lon_360": 245.0,
        "lon_180": -115.0,
        "radius_deg": 22.0,
        "elevation_m": 6800.0,
        "slope_deg": 8.2,
        "ice_score": 0.08,
        "ice_depth_m": 45.0,
        "ice_depth_std_m": 12.0,
        "sharad_passes": 1,
        "coverage_gap": "Thick volcanic dust mantle prevents subsurface radar penetration.",
        "geology_note": "High-altitude volcanic plateau with thin atmosphere, high radiation exposure, and extreme EDL risk.",
    },
]
