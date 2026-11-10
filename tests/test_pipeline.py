"""Automated tests for the AREOSITE Data Pipeline, Uncertainty Engine, and FastAPI Backend."""

from fastapi.testclient import TestClient
import rasterio

from backend.api.app import app
from backend.config import LAYERS_DIR, PROCESSED_DIR, RAW_DIR, TILES_DIR
from backend.data_pipeline.run_pipeline import execute_full_pipeline
from backend.data_pipeline.scoring import build_report_card, recommend_top_sites


def test_full_data_pipeline_and_baseline_verification():
    """Verify end-to-end execution of MOLA and SWIM preprocessing, uncertainty, and Arcadia Planitia card."""
    res = execute_full_pipeline(attempt_remote=False, width=720, height=360, max_zoom=2)
    layers = res["layers"]

    # 1. Verify raw and processed GeoTIFFs exist and share the target CRS
    assert (RAW_DIR / "mola_dem_raw.tif").exists()
    assert (RAW_DIR / "swim_ice_consistency_raw.tif").exists()
    stack_tif = PROCESSED_DIR / "mars_criteria_stack.tif"
    assert stack_tif.exists()

    with rasterio.open(stack_tif) as src:
        assert src.count == 8
        assert src.crs.to_string() == "EPSG:4326"
        assert src.bounds == (-180.0, -90.0, 180.0, 90.0)

    # 2. Verify tile pyramid and PNG layer outputs exist
    assert (LAYERS_DIR / "ice_max.png").exists()
    assert (LAYERS_DIR / "uncertainty.png").exists()
    assert (TILES_DIR / "ice_max" / "1" / "0" / "0.png").exists()
    assert (PROCESSED_DIR / "mars_grid.json").exists()
    assert (PROCESSED_DIR / "named_sites.json").exists()

    # 3. Verify Arcadia Planitia baseline report card (35°N, 210°E) with Ice Slider prioritized
    card = build_report_card(
        layers,
        lat=35.0,
        lon=210.0,
        w_ice=1.0,
        w_safety=0.0,
        w_power=0.0,
        w_radiation=0.0,
    )
    assert card["site_name"] == "Arcadia Planitia"
    assert card["coordinates_formatted"] == "35°N, 210°E"
    assert card["suitability_score"] == 0.87
    assert card["confidence_level"] == "MEDIUM"
    assert card["ice_depth_formatted"] == "2.1 m ± 1.8 m"
    assert card["sharad_passes"] == 3
    assert "Coverage gap to the south." in card["mission_planner_copy"]

    expected_copy = (
        "Recommended site: Arcadia Planitia (35°N, 210°E)\n"
        "Suitability score: 0.87\n"
        "Confidence: MEDIUM\n"
        "Ice depth estimate: 2.1 m ± 1.8 m\n"
        "Based on 3 SHARAD passes. Coverage gap to the south."
    )
    assert card["mission_planner_copy"] == expected_copy

    # 4. Verify Arcadia Planitia ranks #1 when Ice slider is maxed
    top_sites = recommend_top_sites(layers, w_ice=1.0, w_safety=0.0, w_power=0.0, w_radiation=0.0)
    assert top_sites[0]["site_name"] == "Arcadia Planitia"
    assert top_sites[0]["suitability_score"] == 0.87


def test_fastapi_endpoints():
    """Verify all backend REST and dynamic layer endpoints."""
    client = TestClient(app)

    # Health check
    resp_health = client.get("/api/health")
    assert resp_health.status_code == 200
    assert resp_health.json()["status"] == "ok"

    # Report card endpoint (accepts both 210°E and -150°E)
    resp_card = client.get(
        "/api/report-card?lat=35.0&lon=210.0&w_ice=1.0&w_safety=0.0&w_power=0.0&w_radiation=0.0"
    )
    assert resp_card.status_code == 200
    data = resp_card.json()
    assert data["site_name"] == "Arcadia Planitia"
    assert data["suitability_score"] == 0.87
    assert data["confidence_level"] == "MEDIUM"

    # Recommendations endpoint
    resp_rec = client.get(
        "/api/sites/recommend?w_ice=1.0&w_safety=0.0&w_power=0.0&w_radiation=0.0"
    )
    assert resp_rec.status_code == 200
    assert resp_rec.json()["top_site"]["site_name"] == "Arcadia Planitia"

    # Dynamic PNG heatmap endpoint
    resp_png = client.get(
        "/api/dynamic-layer.png?w_ice=0.8&w_safety=0.5&w_power=0.2&w_radiation=0.3&width=360&height=180"
    )
    assert resp_png.status_code == 200
    assert resp_png.headers["content-type"] == "image/png"
    assert len(resp_png.content) > 1000
