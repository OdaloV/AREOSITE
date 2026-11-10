"""Uncertainty & Orbital Sensor Confidence Engine (The Differentiator)."""

from typing import Dict, Any, Tuple
import numpy as np

from backend.config import MARS_REGIONS
from backend.data_pipeline.download_data import _angular_distance_deg


