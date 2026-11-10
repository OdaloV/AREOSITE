# AREOSITE
**A Weighted Suitability & Uncertainty Decision Engine for the First Mars Base**

> *"Pick your priorities. We'll find your landing site — and tell you how sure we are."*

---

## Architecture & Data Pipeline (`backend/`)

AREOSITE combines **USGS MGS MOLA** topography, **PSI SWIM** subsurface water-ice mapping, and **MRO SHARAD** orbital radar pass coverage into a real-time multi-criteria decision engine with explicit uncertainty quantification.

### Pipeline Modules
1. **[`backend/data_pipeline/download_data.py`](backend/data_pipeline/download_data.py)** — Downloads official MOLA & SWIM GeoTIFFs (or generates scientifically calibrated 0.5° global Mars GeoTIFFs anchored on 10 real candidate landing sites: Arcadia Planitia, Utopia Planitia, Deuteronilus Mensae, Jezero Crater, Amazonis Planitia, Chryse Planitia, Hellas Planitia, Elysium Planitia, Valles Marineris, and Tharsis).
2. **[`backend/data_pipeline/preprocess.py`](backend/data_pipeline/preprocess.py)** — Reprojects all rasters to a unified `EPSG:4326` equirectangular Mars grid (`[-180, 180] x [-90, 90]`), computes spherical slope from MOLA DEM, and derives normalized `[0, 1]` criteria layers (`ice_score`, `safety_score`, `power_score`, `radiation_score`), saving a multi-band GeoTIFF (`data/processed/mars_criteria_stack.tif`) for QGIS inspection.
3. **[`backend/data_pipeline/uncertainty.py`](backend/data_pipeline/uncertainty.py)** — Computes continuous orbital sensor confidence (`confidence_score`, `uncertainty_score`, and `HIGH` / `MEDIUM` / `LOW` badges) from SHARAD radar pass density, ice depth error bars (`± m`), and topographic radar clutter.
4. **[`backend/data_pipeline/scoring.py`](backend/data_pipeline/scoring.py)** — Real-time weighted suitability engine and Mission Planner Report Card generator.
5. **[`backend/data_pipeline/generate_tiles.py`](backend/data_pipeline/generate_tiles.py)** — Exports RGBA GeoTIFFs, high-res equirectangular PNG overlays (`data/layers/*.png`), XYZ slippy-map tile pyramids (`data/tiles/{layer}/{z}/{x}/{y}.png`) for CesiumJS, and compact JSON lookup grids (`data/processed/mars_grid.json`, `data/processed/named_sites.json`).
6. **[`backend/api/app.py`](backend/api/app.py)** — FastAPI service serving report cards, site recommendations, dynamic RGBA overlays, and map tiles.

---

## Quickstart

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Run the end-to-end data pipeline (generates GeoTIFFs, tiles, and JSON grids)
python -m backend.data_pipeline.run_pipeline

# 3. Start the FastAPI backend server
uvicorn backend.api.app:app --reload --port 8000

# 4. Run automated test suite
pytest -v
```

### Key API Endpoints
- `GET /api/health` — Pipeline & grid status
- `GET /api/report-card?lat=35.0&lon=210.0&w_ice=1.0&w_safety=0.0&w_power=0.0&w_radiation=0.0` — Mission Planner Report Card with error bars and SHARAD confidence
- `GET /api/sites/recommend?w_ice=1.0&w_safety=0.5&w_power=0.3&w_radiation=0.4` — Top ranked Mars landing sites for current slider weights
- `GET /api/dynamic-layer.png?w_ice=1.0&w_safety=0.0&w_power=0.0&w_radiation=0.0&mode=suitability` — Real-time RGBA heatmap overlay for CesiumJS
- `GET /tiles/{layer}/{z}/{x}/{y}.png` & `GET /layers/{layer}.png` — Pre-baked XYZ tiles and single-tile imagery layers
