import { CriteriaWeights, ReportCard, SiteRecommendation, LayerMode, ConfidenceLevel } from '../types';
import { MARS_CANDIDATE_SITES } from '../constants/marsData';

const BASE_URL = '';

export async function fetchHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchReportCard(
  lat: number,
  lon: number,
  weights: CriteriaWeights
): Promise<ReportCard> {
  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : 35.0;
  const safeLon = typeof lon === 'number' && !isNaN(lon) ? lon : -150.0;

  const params = new URLSearchParams({
    lat: safeLat.toFixed(4),
    lon: safeLon.toFixed(4),
    w_ice: (weights?.ice ?? 1.0).toString(),
    w_safety: (weights?.safety ?? 0.0).toString(),
    w_power: (weights?.power ?? 0.0).toString(),
    w_radiation: (weights?.radiation ?? 0.0).toString(),
  });

  try {
    const res = await fetch(`${BASE_URL}/api/report-card?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return normalizeReportCard(data, safeLat, safeLon, weights);
    }
  } catch {
    // Fallback
  }

  return computeLocalReportCard(safeLat, safeLon, weights);
}

export async function fetchRecommendedSites(
  weights: CriteriaWeights,
  topK: number = 7
): Promise<SiteRecommendation[]> {
  const params = new URLSearchParams({
    w_ice: (weights?.ice ?? 1.0).toString(),
    w_safety: (weights?.safety ?? 0.0).toString(),
    w_power: (weights?.power ?? 0.0).toString(),
    w_radiation: (weights?.radiation ?? 0.0).toString(),
    top_k: topK.toString(),
  });

  try {
    const res = await fetch(`${BASE_URL}/api/sites/recommend?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const list = data.recommendations || [];
      return list.map((item: any, idx: number) => normalizeSiteRecommendation(item, idx));
    }
  } catch {
    // Fallback
  }

  return computeLocalSiteRecommendations(weights, topK);
}

export function getDynamicLayerUrl(weights: CriteriaWeights, mode: LayerMode): string {
  const params = new URLSearchParams({
    w_ice: (weights?.ice ?? 1.0).toString(),
    w_safety: (weights?.safety ?? 0.0).toString(),
    w_power: (weights?.power ?? 0.0).toString(),
    w_radiation: (weights?.radiation ?? 0.0).toString(),
    mode: mode === 'mola' ? 'suitability' : mode,
    width: '1440',
    height: '720',
  });
  return `${BASE_URL}/api/dynamic-layer.png?${params.toString()}`;
}

function normalizeReportCard(raw: any, fallbackLat: number, fallbackLon: number, weights: CriteriaWeights): ReportCard {
  const conf = ((raw?.confidence_level || 'MEDIUM').toUpperCase()) as ConfidenceLevel;
  const iceDepth = typeof raw?.ice_depth_m === 'number' ? raw.ice_depth_m : 2.1;
  const iceStd = typeof raw?.ice_depth_std_m === 'number' ? raw.ice_depth_std_m : 1.8;

  return {
    site_name: raw?.site_name || 'Arcadia Planitia',
    coordinates_formatted: raw?.coordinates_formatted || `${fallbackLat.toFixed(1)}°, ${fallbackLon.toFixed(1)}°`,
    lat: typeof raw?.lat === 'number' ? raw.lat : fallbackLat,
    lon_180: typeof raw?.lon_180 === 'number' ? raw.lon_180 : fallbackLon,
    lon_360: typeof raw?.lon_360 === 'number' ? raw.lon_360 : ((fallbackLon % 360 + 360) % 360),
    suitability_score: typeof raw?.suitability_score === 'number' ? raw.suitability_score : 0.85,
    confidence_level: conf,
    confidence_score: typeof raw?.confidence_score === 'number' ? raw.confidence_score : 0.65,
    ice_depth_m: iceDepth,
    ice_depth_std_m: iceStd,
    ice_depth_formatted: raw?.ice_depth_formatted || `${iceDepth} m ± ${iceStd} m`,
    sharad_passes: typeof raw?.sharad_passes === 'number' ? raw.sharad_passes : 3,
    coverage_gap_note: raw?.coverage_gap_note || 'Regional orbital coverage evaluated.',
    geology_note: raw?.geology_note || 'Smooth Amazonian volcanic and periglacial plains.',
    metrics: {
      ice_score: typeof raw?.metrics?.ice_score === 'number' ? raw.metrics.ice_score : 0.85,
      safety_score: typeof raw?.metrics?.safety_score === 'number' ? raw.metrics.safety_score : 0.85,
      power_score: typeof raw?.metrics?.power_score === 'number' ? raw.metrics.power_score : 0.80,
      radiation_score: typeof raw?.metrics?.radiation_score === 'number' ? raw.metrics.radiation_score : 0.80,
      elevation_m: typeof raw?.metrics?.elevation_m === 'number' ? raw.metrics.elevation_m : -3900,
      slope_deg: typeof raw?.metrics?.slope_deg === 'number' ? raw.metrics.slope_deg : 1.2,
    },
    weights_applied: {
      w_ice: weights?.ice ?? 1.0,
      w_safety: weights?.safety ?? 0.0,
      w_power: weights?.power ?? 0.0,
      w_radiation: weights?.radiation ?? 0.0,
    },
  };
}

function normalizeSiteRecommendation(item: any, idx: number): SiteRecommendation {
  const name = item.site_name || item.name || `Candidate Site #${idx + 1}`;
  const id = item.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const conf = ((item.confidence_level || 'MEDIUM').toUpperCase()) as ConfidenceLevel;
  const score = typeof item.suitability_score === 'number' ? item.suitability_score : 0.75;
  const iceDepth = typeof item.ice_depth_m === 'number' ? item.ice_depth_m : 2.5;
  const iceStd = typeof item.ice_depth_std_m === 'number' ? item.ice_depth_std_m : 1.5;

  return {
    rank: item.rank || (idx + 1),
    id,
    name,
    site_name: name,
    lat: typeof item.lat === 'number' ? item.lat : 0,
    lon_180: typeof item.lon_180 === 'number' ? item.lon_180 : 0,
    lon_360: typeof item.lon_360 === 'number' ? item.lon_360 : 0,
    suitability_score: score,
    confidence_level: conf,
    ice_depth_m: iceDepth,
    ice_depth_std_m: iceStd,
    ice_depth_formatted: item.ice_depth_formatted || `${iceDepth} m ± ${iceStd} m`,
    sharad_passes: typeof item.sharad_passes === 'number' ? item.sharad_passes : 4,
    geology_note: item.geology_note || 'Martian terrain suitable for landing.',
    breakdown: {
      ice: item.breakdown?.ice ?? item.metrics?.ice_score ?? 0.7,
      safety: item.breakdown?.safety ?? item.metrics?.safety_score ?? 0.7,
      power: item.breakdown?.power ?? item.metrics?.power_score ?? 0.7,
      radiation: item.breakdown?.radiation ?? item.metrics?.radiation_score ?? 0.7,
    },
  };
}

function computeLocalReportCard(lat: number, lon: number, weights: CriteriaWeights): ReportCard {
  let lon180 = ((lon + 180) % 360) - 180;
  let lon360 = ((lon % 360) + 360) % 360;

  let nearest = MARS_CANDIDATE_SITES[0];
  let minDistanceDeg = 999;

  for (const site of MARS_CANDIDATE_SITES) {
    const dLat = lat - site.lat;
    let dLon = Math.abs(lon180 - site.lon_180);
    if (dLon > 180) dLon = 360 - dLon;
    const dist = Math.hypot(dLat, dLon);
    if (dist < minDistanceDeg) {
      minDistanceDeg = dist;
      nearest = site;
    }
  }

  const proximityFactor = Math.exp(-minDistanceDeg / 15.0);
  const totalWeight = (weights.ice + weights.safety + weights.power + weights.radiation) || 1.0;

  const powerScore = Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const latIceTrend = Math.min(1.0, Math.pow(Math.abs(lat) / 45.0, 1.4));
  const iceScore = Math.min(1.0, nearest.ice_score * proximityFactor + latIceTrend * (1 - proximityFactor) * 0.7);
  const safetyScore = Math.max(0.15, 1.0 - (nearest.slope_deg / 15.0) * proximityFactor);
  const elevation = nearest.elevation_m * proximityFactor + (Math.sin(lat * 0.1) * 2000 - 1500) * (1 - proximityFactor);
  const radiationScore = Math.min(1.0, Math.max(0.1, (-elevation + 8000) / 15000));

  const suitabilityScore = (
    weights.ice * iceScore +
    weights.safety * safetyScore +
    weights.power * powerScore +
    weights.radiation * radiationScore
  ) / totalWeight;

  const sharadPasses = Math.round(nearest.sharad_passes * proximityFactor + 2 * (1 - proximityFactor));
  let confidenceLevel: ConfidenceLevel = 'MEDIUM';
  if (sharadPasses >= 6) confidenceLevel = 'HIGH';
  else if (sharadPasses <= 2) confidenceLevel = 'LOW';

  const iceDepth = Number((nearest.ice_depth_m * proximityFactor + 12.0 * (1 - proximityFactor)).toFixed(1));
  const iceStd = Number((nearest.ice_depth_std_m * proximityFactor + 4.5 * (1 - proximityFactor)).toFixed(1));

  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${lon360.toFixed(1)}°E`;

  return {
    site_name: minDistanceDeg < 10 ? nearest.name : `Martian Region (${latStr}, ${lonStr})`,
    coordinates_formatted: `${latStr}, ${lonStr}`,
    lat: Number(lat.toFixed(4)),
    lon_180: Number(lon180.toFixed(4)),
    lon_360: Number(lon360.toFixed(4)),
    suitability_score: Number(suitabilityScore.toFixed(2)),
    confidence_level: confidenceLevel,
    confidence_score: Number((confidenceLevel === 'HIGH' ? 0.88 : confidenceLevel === 'MEDIUM' ? 0.62 : 0.35).toFixed(2)),
    ice_depth_m: iceDepth,
    ice_depth_std_m: iceStd,
    ice_depth_formatted: `${iceDepth} m ± ${iceStd} m`,
    sharad_passes: sharadPasses,
    coverage_gap_note: minDistanceDeg < 12 ? nearest.coverage_gap : 'Regional orbital survey needed.',
    geology_note: minDistanceDeg < 12 ? nearest.geology_note : 'Regional regolith terrain with unresolved subsurface dielectric reflectors.',
    metrics: {
      ice_score: Number(iceScore.toFixed(2)),
      safety_score: Number(safetyScore.toFixed(2)),
      power_score: Number(powerScore.toFixed(2)),
      radiation_score: Number(radiationScore.toFixed(2)),
      elevation_m: Math.round(elevation),
      slope_deg: Number((nearest.slope_deg * proximityFactor + 2.5 * (1 - proximityFactor)).toFixed(1)),
    },
    weights_applied: {
      w_ice: weights.ice,
      w_safety: weights.safety,
      w_power: weights.power,
      w_radiation: weights.radiation,
    },
  };
}

function computeLocalSiteRecommendations(weights: CriteriaWeights, topK: number): SiteRecommendation[] {
  const totalWeight = (weights.ice + weights.safety + weights.power + weights.radiation) || 1.0;

  const scored = MARS_CANDIDATE_SITES.map((site) => {
    const powerScore = Math.max(0.1, Math.cos((site.lat * Math.PI) / 180));
    const safetyScore = Math.max(0.15, 1.0 - site.slope_deg / 15.0);
    const radiationScore = Math.min(1.0, Math.max(0.1, (-site.elevation_m + 8000) / 15000));
    const iceScore = site.ice_score;

    const composite = (
      weights.ice * iceScore +
      weights.safety * safetyScore +
      weights.power * powerScore +
      weights.radiation * radiationScore
    ) / totalWeight;

    let conf: ConfidenceLevel = 'MEDIUM';
    if (site.sharad_passes >= 6) conf = 'HIGH';
    else if (site.sharad_passes <= 2) conf = 'LOW';

    return {
      id: site.id,
      name: site.name,
      site_name: site.name,
      lat: site.lat,
      lon_180: site.lon_180,
      lon_360: site.lon_360,
      suitability_score: Number(composite.toFixed(2)),
      confidence_level: conf,
      ice_depth_m: site.ice_depth_m,
      ice_depth_std_m: site.ice_depth_std_m,
      ice_depth_formatted: `${site.ice_depth_m} m ± ${site.ice_depth_std_m} m`,
      sharad_passes: site.sharad_passes,
      geology_note: site.geology_note,
      breakdown: {
        ice: Number(iceScore.toFixed(2)),
        safety: Number(safetyScore.toFixed(2)),
        power: Number(powerScore.toFixed(2)),
        radiation: Number(radiationScore.toFixed(2)),
      },
    };
  });

  scored.sort((a, b) => b.suitability_score - a.suitability_score);

  return scored.slice(0, topK).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
