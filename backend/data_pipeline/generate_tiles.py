"""Generate RGBA GeoTIFFs, Single-Tile Overlays, XYZ Tile Pyramids, and JSON Lookup Grids."""

import io
import json
import logging
from pathlib import Path
from typing import Dict, Any

import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_bounds

from backend.config import (
    LAYERS_DIR,
    MARS_REGIONS,
    PROCESSED_DIR,
    TARGET_CRS,
    TILES_DIR,
)
from backend.data_pipeline.scoring import (
    PRESET_WEIGHTS,
    build_report_card,
    compute_weighted_suitability,
)

logger = logging.getLogger(__name__)


def score_to_rgba(
    score: np.ndarray, colormap: str = "suitability", alpha_scale: float = 0.78
) -> np.ndarray:
    """Map a normalized [0, 1] 2D array to an (H, W, 4) uint8 RGBA image array.

    - 'suitability': Dark Mars crimson -> Tactical Amber -> Vivid Emerald Green
    - 'uncertainty': Low uncertainty (teal/cyan) -> Medium (amber) -> High uncertainty (warning red/magenta)
    - 'ice': Deep slate -> Cyan -> Bright Ice Blue/Green
    """
    s = np.clip(score, 0.0, 1.0)
    h, w = s.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    if colormap == "uncertainty":
        # 0.0 (confident) -> 0.5 (medium) -> 1.0 (high uncertainty)
        r = np.interp(s, [0.0, 0.45, 0.70, 1.0], [16, 245, 244, 255])
        g = np.interp(s, [0.0, 0.45, 0.70, 1.0], [185, 158, 63, 30])
        b = np.interp(s, [0.0, 0.45, 0.70, 1.0], [129, 11, 94, 140])
        a = np.interp(s, [0.0, 0.35, 1.0], [70, 155, 215]) * alpha_scale
    elif colormap == "ice":
        r = np.interp(s, [0.0, 0.5, 0.8, 1.0], [30, 14, 16, 0])
        g = np.interp(s, [0.0, 0.5, 0.8, 1.0], [27, 165, 215, 255])
        b = np.interp(s, [0.0, 0.5, 0.8, 1.0], [45, 233, 160, 128])
        a = np.interp(s, [0.0, 0.4, 0.8, 1.0], [50, 140, 200, 235]) * alpha_scale
    else:
        # Tactical Suitability ramp:
        # 0.00..0.40: Dark Crimson / Rust
        # 0.40..0.68: Tactical Amber / Gold
        # 0.68..1.00: Bright Mission Green (#00ff88 / #10b981)
        r = np.interp(s, [0.0, 0.38, 0.62, 0.80, 1.0], [115, 195, 245, 16, 0])
        g = np.interp(s, [0.0, 0.38, 0.62, 0.80, 1.0], [24, 65, 165, 210, 255])
        b = np.interp(s, [0.0, 0.38, 0.62, 0.80, 1.0], [28, 32, 20, 120, 136])
        a = np.interp(s, [0.0, 0.35, 0.75, 1.0], [85, 135, 195, 235]) * alpha_scale

    rgba[..., 0] = np.clip(r, 0, 255).astype(np.uint8)
    rgba[..., 1] = np.clip(g, 0, 255).astype(np.uint8)
    rgba[..., 2] = np.clip(b, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.clip(a, 0, 255).astype(np.uint8)
    return rgba


def render_rgba_png_bytes(
    score: np.ndarray, colormap: str = "suitability", out_size: tuple[int, int] = (1440, 720)
) -> bytes:
    """Render a 2D score array to PNG bytes for fast HTTP responses."""
    rgba = score_to_rgba(score, colormap=colormap)
    img = Image.fromarray(rgba, mode="RGBA")
    if out_size and (img.width != out_size[0] or img.height != out_size[1]):
        img = img.resize(out_size, resample=Image.Resampling.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


def save_layer_geotiff_and_png(
    score: np.ndarray,
    layer_name: str,
    colormap: str = "suitability",
    layers_dir: Path = LAYERS_DIR,
) -> Dict[str, Path]:
    """Save an RGBA GeoTIFF (for QGIS / gdal2tiles.py) and high-res Equirectangular PNG."""
    layers_dir.mkdir(parents=True, exist_ok=True)
    rgba = score_to_rgba(score, colormap=colormap)
    height, width, _ = rgba.shape

    tif_path = layers_dir / f"{layer_name}.tif"
    transform = from_bounds(-180.0, -90.0, 180.0, 90.0, width, height)
    with rasterio.open(
        tif_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=4,
        dtype=np.uint8,
        crs=TARGET_CRS,
        transform=transform,
    ) as dst:
        for b in range(4):
            dst.write(rgba[:, :, b], b + 1)

    png_path = layers_dir / f"{layer_name}.png"
    img = Image.fromarray(rgba, mode="RGBA").resize(
        (1440, 720), resample=Image.Resampling.BILINEAR
    )
    img.save(png_path, format="PNG")
    return {"tif": tif_path, "png": png_path}


def generate_xyz_tiles_for_layer(
    score: np.ndarray,
    layer_name: str,
    colormap: str = "suitability",
    tiles_dir: Path = TILES_DIR,
    max_zoom: int = 2,
    tile_size: int = 256,
) -> Path:
    """Generate XYZ slippy-map tile pyramid ({layer}/{z}/{x}/{y}.png) compatible with CesiumJS."""
    rgba = score_to_rgba(score, colormap=colormap)
    base_img = Image.fromarray(rgba, mode="RGBA")
    layer_tile_dir = tiles_dir / layer_name

    for z in range(max_zoom + 1):
        # Standard WebMercator / XYZ square pyramid: 2^z x 2^z tiles
        n_tiles = 2**z
        full_px = n_tiles * tile_size
        scaled = base_img.resize(
            (full_px, full_px), resample=Image.Resampling.BILINEAR
        )
        for x in range(n_tiles):
            x_dir = layer_tile_dir / str(z) / str(x)
            x_dir.mkdir(parents=True, exist_ok=True)
            for y in range(n_tiles):
                box = (
                    x * tile_size,
                    y * tile_size,
                    (x + 1) * tile_size,
                    (y + 1) * tile_size,
                )
                tile = scaled.crop(box)
                tile.save(x_dir / f"{y}.png", format="PNG")

    return layer_tile_dir


def export_processed_artifacts(
    layers: Dict[str, np.ndarray],
    processed_dir: Path = PROCESSED_DIR,
    layers_dir: Path = LAYERS_DIR,
    tiles_dir: Path = TILES_DIR,
    max_zoom: int = 2,
) -> Dict[str, Any]:
    """Generate all pre-baked suitability layers, uncertainty layer, XYZ tiles, and JSON lookup files."""
    processed_dir.mkdir(parents=True, exist_ok=True)
    layers_dir.mkdir(parents=True, exist_ok=True)
    tiles_dir.mkdir(parents=True, exist_ok=True)

    # 1. Save compressed NumPy archive for instant (<2ms) API reloads
    npz_path = processed_dir / "mars_layers.npz"
    np.savez_compressed(npz_path, **layers)

    # 2. Generate preset suitability layers + individual criteria + uncertainty layer
    layer_configs = {
        "ice": (layers["ice_score"], "ice"),
        "safety": (layers["safety_score"], "suitability"),
        "power": (layers["power_score"], "suitability"),
        "radiation": (layers["radiation_score"], "suitability"),
        "uncertainty": (layers["uncertainty_score"], "uncertainty"),
        "confidence": (layers["confidence_score"], "suitability"),
    }

    for preset_name, weights in PRESET_WEIGHTS.items():
        score_grid = compute_weighted_suitability(
            layers,
            w_ice=weights["ice"],
            w_safety=weights["safety"],
            w_power=weights["power"],
            w_radiation=weights["radiation"],
        )
        cmap = "ice" if preset_name == "ice_max" else "suitability"
        layer_configs[preset_name] = (score_grid, cmap)

    generated_layers = {}
    for lname, (grid, cmap) in layer_configs.items():
        paths = save_layer_geotiff_and_png(
            grid, lname, colormap=cmap, layers_dir=layers_dir
        )
        tile_root = generate_xyz_tiles_for_layer(
            grid, lname, colormap=cmap, tiles_dir=tiles_dir, max_zoom=max_zoom
        )
        generated_layers[lname] = {
            "geotiff": str(paths["tif"]),
            "png": str(paths["png"]),
            "tiles": str(tile_root),
        }

    # 3. Export named candidate sites catalog with precomputed report cards
    named_sites_payload = []
    for region in MARS_REGIONS:
        card_ice_max = build_report_card(
            layers,
            lat=region["lat"],
            lon=region["lon_360"],
            w_ice=1.0,
            w_safety=0.0,
            w_power=0.0,
            w_radiation=0.0,
        )
        card_balanced = build_report_card(
            layers,
            lat=region["lat"],
            lon=region["lon_360"],
            w_ice=0.25,
            w_safety=0.25,
            w_power=0.25,
            w_radiation=0.25,
        )
        named_sites_payload.append(
            {
                **region,
                "report_card_ice_max": card_ice_max,
                "report_card_balanced": card_balanced,
            }
        )

    named_sites_path = processed_dir / "named_sites.json"
    with open(named_sites_path, "w", encoding="utf-8") as f:
        json.dump(named_sites_payload, f, indent=2)

    # 4. Export a compact 2-degree global lookup grid (180x90) for static client fallback
    step = 4  # 720/4 = 180 lon steps, 360/4 = 90 lat steps (2 deg resolution)
    compact_grid = {
        "lats": np.round(layers["lats"][::step], 2).tolist(),
        "lons": np.round(layers["lons"][::step], 2).tolist(),
        "ice_score": np.round(layers["ice_score"][::step, ::step], 2).tolist(),
        "safety_score": np.round(layers["safety_score"][::step, ::step], 2).tolist(),
        "power_score": np.round(layers["power_score"][::step, ::step], 2).tolist(),
        "radiation_score": np.round(
            layers["radiation_score"][::step, ::step], 2
        ).tolist(),
        "confidence_score": np.round(
            layers["confidence_score"][::step, ::step], 2
        ).tolist(),
        "confidence_level_code": layers["confidence_level_code"][
            ::step, ::step
        ].tolist(),
        "ice_depth_m": np.round(layers["ice_depth_m"][::step, ::step], 1).tolist(),
        "ice_depth_std_m": np.round(
            layers["ice_depth_std_m"][::step, ::step], 1
        ).tolist(),
        "sharad_passes": layers["sharad_passes"][::step, ::step].tolist(),
        "elevation_m": np.round(layers["elevation_m"][::step, ::step], 0).tolist(),
        "slope_deg": np.round(layers["slope_deg"][::step, ::step], 1).tolist(),
    }
    grid_json_path = processed_dir / "mars_grid.json"
    with open(grid_json_path, "w", encoding="utf-8") as f:
        json.dump(compact_grid, f)

    logger.info("Exported all tiles, GeoTIFF overlays, and JSON lookup grids.")
    return {
        "npz_path": str(npz_path),
        "named_sites_path": str(named_sites_path),
        "grid_json_path": str(grid_json_path),
        "layers": generated_layers,
    }
