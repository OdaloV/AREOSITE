import React from 'react';
import { LayerMode } from '../types';
import { Layers, Eye, ShieldAlert, Droplets, Map, Sparkles, Navigation } from 'lucide-react';

interface LayerControlsProps {
  currentMode: LayerMode;
  onSelectMode: (mode: LayerMode) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  currentMode,
  onSelectMode,
  opacity,
  onOpacityChange,
  showMarkers,
  onToggleMarkers,
}) => {
  const layers = [
    {
      id: 'suitability' as LayerMode,
      name: 'Suitability Heatmap',
      subtitle: 'Dynamic multi-criteria synthesis',
      icon: Sparkles,
      color: 'text-emerald-400',
      activeBorder: 'border-emerald-500',
    },
    {
      id: 'uncertainty' as LayerMode,
      name: 'Radar Uncertainty',
      subtitle: 'SHARAD sounder pass density & confidence',
      icon: ShieldAlert,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500',
    },
    {
      id: 'ice' as LayerMode,
      name: 'Water Ice Consistency',
      subtitle: 'SWIM radar & neutron spectrometer',
      icon: Droplets,
      color: 'text-sky-400',
      activeBorder: 'border-sky-500',
    },
    {
      id: 'mola' as LayerMode,
      name: 'Martian Basemap',
      subtitle: 'USGS MOLA DEM & Viking Color Mosaic',
      icon: Map,
      color: 'text-mars-red-bright',
      activeBorder: 'border-mars-red',
    },
  ];

  return (
    <div className="hud-panel rounded-lg p-4 text-slate-200 tactical-corners">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="font-display font-bold text-sm tracking-wide text-white uppercase">
            Active Cartographic Layers
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800">
          EPSG:4326
        </span>
      </div>

      {/* Layer Selection Radio Grid */}
      <div className="space-y-2 mb-4">
        {layers.map((layer) => {
          const isActive = currentMode === layer.id;
          const Icon = layer.icon;

          return (
            <button
              key={layer.id}
              onClick={() => onSelectMode(layer.id)}
              className={`w-full flex items-start space-x-3 p-2.5 rounded text-left transition-all border ${
                isActive
                  ? `bg-slate-900/95 ${layer.activeBorder} shadow-lg ring-1 ring-inset ${layer.activeBorder}`
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div
                className={`p-1.5 rounded mt-0.5 ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? layer.color : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold font-mono ${
                      isActive ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {layer.name}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-mars-red/20 text-mars-red-bright border border-mars-red/40 uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {layer.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Opacity Slider */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            <span>LAYER OPACITY</span>
          </div>
          <span className="text-slate-200 font-bold">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-900 rounded cursor-pointer"
        />
      </div>

      {/* Legend Colormap Bar */}
      <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 mb-4 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400 mb-1.5">
          <span>LEGEND COLORMAP</span>
          <span className="text-slate-300 uppercase">{currentMode}</span>
        </div>

        {currentMode === 'uncertainty' ? (
          <div>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-[#10b981] via-[#f59e0b] to-[#e11d48] border border-slate-700"></div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>HIGH CONFIDENCE</span>
              <span>MEDIUM</span>
              <span>HIGH UNCERTAINTY</span>
            </div>
          </div>
        ) : currentMode === 'ice' ? (
          <div>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-[#0f172a] via-[#0284c7] to-[#38bdf8] border border-slate-700"></div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>NO SHALLOW ICE</span>
              <span>DEEP ICE</span>
              <span>EXCESS ICE (&lt;2M)</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-[#8c1f0e] via-[#f59e0b] to-[#10b981] border border-slate-700"></div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>0.0 UNFAVORABLE</span>
              <span>0.5 MARGINAL</span>
              <span>1.0 OPTIMAL</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Candidate Site Pins */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-mars-red-bright" />
          <span>SITE MARKERS (10)</span>
        </div>
        <button
          onClick={onToggleMarkers}
          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
            showMarkers
              ? 'bg-mars-red/20 text-mars-red-bright border-mars-red/50'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          {showMarkers ? 'VISIBLE' : 'HIDDEN'}
        </button>
      </div>
    </div>
  );
};
