export interface CriteriaWeights {
  ice: number;
  safety: number;
  power: number;
  radiation: number;
}

export type LayerMode = 'suitability' | 'uncertainty' | 'ice' | 'mola';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReportCardMetrics {
  ice_score: number;
  safety_score: number;
  power_score: number;
  radiation_score: number;
  elevation_m: number;
  slope_deg: number;
}

export interface ReportCard {
  site_name: string;
  coordinates_formatted: string;
  lat: number;
  lon_180: number;
  lon_360: number;
  suitability_score: number;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  ice_depth_m: number;
  ice_depth_std_m: number;
  ice_depth_formatted: string;
  sharad_passes: number;
  coverage_gap_note: string;
  geology_note: string;
  metrics: ReportCardMetrics;
  weights_applied: {
    w_ice: number;
    w_safety: number;
    w_power: number;
    w_radiation: number;
  };
}

export interface MarsCandidateSite {
  id: string;
  name: string;
  lat: number;
  lon_360: number;
  lon_180: number;
  radius_deg: number;
  elevation_m: number;
  slope_deg: number;
  ice_score: number;
  ice_depth_m: number;
  ice_depth_std_m: number;
  sharad_passes: number;
  coverage_gap: string;
  geology_note: string;
  report_card_ice_max?: ReportCard;
}

export interface SiteRecommendation {
  rank: number;
  id: string;
  name: string;
  site_name?: string;
  lat: number;
  lon_180: number;
  lon_360: number;
  suitability_score: number;
  confidence_level: ConfidenceLevel;
  ice_depth_m: number;
  ice_depth_std_m: number;
  ice_depth_formatted: string;
  sharad_passes: number;
  geology_note: string;
  breakdown: {
    ice: number;
    safety: number;
    power: number;
    radiation: number;
  };
}

export interface PresetWeight {
  id: string;
  label: string;
  description: string;
  weights: CriteriaWeights;
}
