# AREOSITE
A Weighted Multi-Criteria Suitability and Uncertainty Decision Engine for Mars Base Siting

AREOSITE combines planetary topography, subsurface water-ice consistency, and orbital radar track coverage into a real-time spatial decision support system for Mars landing site analysis.

## Overview

The engine processes elevation and radar sounder data to evaluate candidate landing zones based on user-defined mission priorities:
- Water Ice Accessibility (SWIM ice consistency and shallow depth models)
- Landing Safety (MOLA terrain slope and atmospheric entry elevation)
- Solar Power Availability (latitude insolation models and slope orientation)
- Radiation Shielding (atmospheric column density and regolith/ice shielding)
- Observation Uncertainty (SHARAD orbital pass density, depth estimation confidence, and radar clutter)

## Architecture

The project is structured into modular layers:

- `backend/config.py`: Mars physical constants, geographic coordinate bounds, CRS definitions, and candidate landing sites.
- `backend/data_pipeline/download_data.py`: Data ingestion interface for USGS MOLA DEM and PSI SWIM rasters, including calibrated synthetic generation for offline use.
- `backend/data_pipeline/preprocess.py`: Reprojection to EPSG:4326, terrain slope derivation, and criteria score normalization.
- `backend/data_pipeline/uncertainty.py`: Orbital radar coverage quantification, sensor error margins, and categorical confidence classification.
- `backend/data_pipeline/scoring.py`: Multi-criteria weighted suitability calculations, nearest-site spatial index, and mission report cards.
- `backend/data_pipeline/generate_tiles.py`: Slippy-map XYZ tile pyramid generation and RGBA raster rendering for CesiumJS globe integration.
- `backend/data_pipeline/run_pipeline.py`: End-to-end command-line pipeline executor.
- `backend/api/app.py`: FastAPI service providing REST endpoints for report cards, site rankings, dynamic heatmap generation, and tile hosting.

## Installation and Setup

1. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the complete data pipeline:
   ```bash
   python -m backend.data_pipeline.run_pipeline
   ```

4. Run automated tests:
   ```bash
   pytest -v
   ```

5. Launch the backend API server:
   ```bash
   uvicorn backend.api.app:app --reload --port 8000
   ```

## API Reference

- `GET /api/health`: Health status and pipeline metadata.
- `GET /api/report-card`: Coordinate inspection returning site metrics, confidence level, and ice depth error bars.
- `GET /api/sites/recommend`: Ranks top candidate landing locations based on active criteria weights.
- `GET /api/dynamic-layer.png`: Generates dynamic equirectangular RGBA overlay images based on real-time weights.
- `GET /tiles/{layer}/{z}/{x}/{y}.png`: Static XYZ map tiles for CesiumJS globe layers.
