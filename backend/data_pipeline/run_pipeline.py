"""End-to-end CLI pipeline runner for AREOSITE Data & Backend Track."""

import argparse
import logging
import time
from typing import Dict, Any

import numpy as np

from backend.config import (
    DEFAULT_GRID_HEIGHT,
    DEFAULT_GRID_WIDTH,
    LAYERS_DIR,
    PROCESSED_DIR,
    RAW_DIR,
    TILES_DIR,
)
from backend.data_pipeline.download_data import ensure_raw_datasets
from backend.data_pipeline.generate_tiles import export_processed_artifacts
from backend.data_pipeline.preprocess import run_preprocessing
from backend.data_pipeline.scoring import build_report_card, recommend_top_sites
from backend.data_pipeline.uncertainty import compute_uncertainty_layers

logger = logging.getLogger(__name__)


def load_or_run_pipeline(force: bool = False) -> Dict[str, np.ndarray]:
    """Load precomputed Mars layers from disk if available, or run the full pipeline."""
    npz_path = PROCESSED_DIR / "mars_layers.npz"
    if not force and npz_path.exists():
        data = np.load(npz_path)
        return {k: data[k] for k in data.files}
    return execute_full_pipeline()["layers"]


def execute_full_pipeline(
    attempt_remote: bool = False,
    width: int = DEFAULT_GRID_WIDTH,
    height: int = DEFAULT_GRID_HEIGHT,
    max_zoom: int = 2,
) -> Dict[str, Any]:
    """Execute Steps 1-5 of the AREOSITE geospatial data pipeline."""
    t0 = time.perf_counter()
    logger.info("=== AREOSITE DATA PIPELINE START ===")

    # Step 1: Raw Data Acquisition (MOLA + SWIM + SHARAD)
    raw_paths = ensure_raw_datasets(
        output_dir=RAW_DIR, attempt_remote=attempt_remote, width=width, height=height
    )

    # Step 2: CRS Reprojection & Normalized Criteria Layers
    layers = run_preprocessing(
        raw_dir=RAW_DIR, processed_dir=PROCESSED_DIR, width=width, height=height
    )

    # Step 3: Uncertainty & Orbital Sensor Confidence Engine
    layers = compute_uncertainty_layers(layers)

    # Step 4: Tile, GeoTIFF, and Lookup Grid Generation
    artifacts = export_processed_artifacts(
        layers=layers,
        processed_dir=PROCESSED_DIR,
        layers_dir=LAYERS_DIR,
        tiles_dir=TILES_DIR,
        max_zoom=max_zoom,
    )

    # Step 5: Verify Arcadia Planitia baseline report card (Ice slider prioritized)
    arcadia_card = build_report_card(
        layers,
        lat=35.0,
        lon=210.0,
        w_ice=1.0,
        w_safety=0.0,
        w_power=0.0,
        w_radiation=0.0,
    )
    elapsed = time.perf_counter() - t0
    logger.info("=== AREOSITE DATA PIPELINE COMPLETE in %.2fs ===", elapsed)
    return {
        "raw_paths": {k: str(v) for k, v in raw_paths.items()},
        "layers": layers,
        "artifacts": artifacts,
        "verification_card": arcadia_card,
        "elapsed_seconds": round(elapsed, 2),
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
    parser = argparse.ArgumentParser(
        description="Run the complete AREOSITE Mars suitability and uncertainty data pipeline."
    )
    parser.add_argument(
        "--remote",
        action="store_true",
        help="Attempt downloading remote USGS/PSI GeoTIFFs before calibrated synthesis.",
    )
    parser.add_argument("--width", type=int, default=DEFAULT_GRID_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_GRID_HEIGHT)
    parser.add_argument("--max-zoom", type=int, default=2)
    args = parser.parse_args()

    result = execute_full_pipeline(
        attempt_remote=args.remote,
        width=args.width,
        height=args.height,
        max_zoom=args.max_zoom,
    )

    print("\n" + "=" * 64)
    print("BASELINE SITE REPORT CARD (Ice Priority, Arcadia Planitia 35°N 210°E)")
    print("=" * 64)
    print(result["verification_card"]["mission_planner_copy"])
    print("=" * 64)

    top_sites = recommend_top_sites(
        result["layers"], w_ice=1.0, w_safety=0.0, w_power=0.0, w_radiation=0.0, top_k=3
    )
    print("\nTop 3 Recommended Sites (Ice Priority):")
    for idx, site in enumerate(top_sites, start=1):
        print(
            f"  {idx}. {site['site_name']} ({site['coordinates_formatted']}) "
            f"— Score: {site['suitability_score']:.2f} | Confidence: {site['confidence_level']} "
            f"| Ice Depth: {site['ice_depth_formatted']}"
        )


if __name__ == "__main__":
    main()
