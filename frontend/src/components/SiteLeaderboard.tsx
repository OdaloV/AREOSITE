import React from 'react';
import { SiteRecommendation } from '../types';
import { Trophy, ChevronRight, Droplets, Compass } from 'lucide-react';

interface SiteLeaderboardProps {
  recommendations: SiteRecommendation[];
  selectedSiteId?: string;
  onSelectSite: (site: SiteRecommendation) => void;
}

export const SiteLeaderboard: React.FC<SiteLeaderboardProps> = ({
  recommendations = [],
  selectedSiteId,
  onSelectSite,
}) => {
  const safeList = Array.isArray(recommendations) ? recommendations : [];

  return (
    <div className="hud-panel rounded-lg p-4 text-slate-200 tactical-corners">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="font-display font-bold text-sm tracking-wide text-white uppercase">
            Top Ranked Landing Zones
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {safeList.length} EVALUATED
        </span>
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {safeList.map((site, idx) => {
          const siteName = site.name || site.site_name || `Site #${idx + 1}`;
          const siteId = site.id || siteName;
          const isSelected = selectedSiteId === siteId || selectedSiteId === siteName;
          const score = typeof site.suitability_score === 'number' ? site.suitability_score : 0;
          const scorePct = Math.round(score * 100);
          const rank = site.rank || (idx + 1);
          const lat = typeof site.lat === 'number' ? site.lat : 0;
          const iceDepth = typeof site.ice_depth_m === 'number' ? site.ice_depth_m : 2.0;
          const conf = (site.confidence_level || 'MEDIUM').toUpperCase();

          return (
            <button
              key={siteId}
              onClick={() => onSelectSite(site)}
              className={`w-full flex items-center justify-between p-2.5 rounded text-left transition-all border ${
                isSelected
                  ? 'bg-mars-red/20 border-mars-red shadow-hud-red text-white'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/80 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold ${
                    rank === 1
                      ? 'bg-amber-400 text-black'
                      : rank === 2
                      ? 'bg-slate-300 text-black'
                      : rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{rank}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-xs font-mono truncate text-white">
                    {siteName}
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Compass className="w-2.5 h-2.5 text-sky-400" />
                      {Math.abs(lat).toFixed(0)}°{lat >= 0 ? 'N' : 'S'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-sky-300">
                      <Droplets className="w-2.5 h-2.5" />
                      {iceDepth}m
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex flex-col items-end">
                  <span
                    className={`font-mono text-xs font-bold ${
                      scorePct >= 75
                        ? 'text-emerald-400'
                        : scorePct >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {scorePct}%
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1 rounded ${
                      conf === 'HIGH'
                        ? 'bg-emerald-950 text-emerald-400'
                        : conf === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {conf}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
