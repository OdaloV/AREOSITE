import React from 'react';
import { CriteriaWeights, PresetWeight } from '../types';
import { PRESET_WEIGHTS } from '../constants/marsData';
import { Sliders, Droplets, Shield, Sun, Radio, RotateCcw, Sparkles } from 'lucide-react';

interface WeightSlidersProps {
  weights: CriteriaWeights;
  onChange: (weights: CriteriaWeights) => void;
  activePresetId?: string;
  onSelectPreset: (preset: PresetWeight) => void;
}

export const WeightSliders: React.FC<WeightSlidersProps> = ({
  weights,
  onChange,
  activePresetId,
  onSelectPreset,
}) => {
  const total = weights.ice + weights.safety + weights.power + weights.radiation || 1.0;

  const handleSliderChange = (key: keyof CriteriaWeights, val: number) => {
    onChange({
      ...weights,
      [key]: val,
    });
  };

  const handleReset = () => {
    onChange({
      ice: 1.0,
      safety: 0.0,
      power: 0.0,
      radiation: 0.0,
    });
  };

  const criteriaConfig = [
    {
      key: 'ice' as const,
      label: 'Water Ice (ISRU)',
      description: 'SWIM ice consistency & depth < 2m',
      icon: Droplets,
      color: 'text-sky-400',
      barColor: 'bg-sky-400',
      trackColor: 'accent-sky-400',
    },
    {
      key: 'safety' as const,
      label: 'Landing Safety',
      description: 'Slopes < 2° & deep entry elevation',
      icon: Shield,
      color: 'text-emerald-400',
      barColor: 'bg-emerald-400',
      trackColor: 'accent-emerald-400',
    },
    {
      key: 'power' as const,
      label: 'Solar Power',
      description: 'Equatorial cosine solar insolation',
      icon: Sun,
      color: 'text-amber-400',
      barColor: 'bg-amber-400',
      trackColor: 'accent-amber-400',
    },
    {
      key: 'radiation' as const,
      label: 'Radiation Shielding',
      description: 'Atmospheric column mass & depth',
      icon: Radio,
      color: 'text-purple-400',
      barColor: 'bg-purple-400',
      trackColor: 'accent-purple-400',
    },
  ];

  return (
    <div className="hud-panel rounded-lg p-4 text-slate-200 tactical-corners">
      {/* Title & Reset */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-mars-red-bright" />
          <h2 className="font-display font-bold text-sm tracking-wide text-white uppercase">
            Mission Criteria Priorities
          </h2>
        </div>
        <button
          onClick={handleReset}
          title="Reset to default (Ice Priority)"
          className="text-xs font-mono text-slate-400 hover:text-mars-red-bright flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="mb-4">
        <div className="flex items-center space-x-1.5 mb-2 text-[11px] font-mono text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>MISSION SCENARIO PRESETS</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {PRESET_WEIGHTS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`px-2 py-1.5 rounded text-[11px] font-mono text-left transition-all border ${
                  isActive
                    ? 'bg-mars-red/25 text-white border-mars-red shadow-hud-red'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold truncate">{preset.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Normalized Weight Stack Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
          <span>WEIGHT DISTRIBUTION</span>
          <span>100% COMPOSITE</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded overflow-hidden flex border border-slate-800">
          {criteriaConfig.map(({ key, barColor }) => {
            const pct = Math.round((weights[key] / total) * 100);
            if (pct <= 0) return null;
            return (
              <div
                key={key}
                style={{ width: `${pct}%` }}
                className={`h-full ${barColor} transition-all duration-200`}
                title={`${key}: ${pct}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Individual Criteria Sliders */}
      <div className="space-y-3.5">
        {criteriaConfig.map(({ key, label, description, icon: Icon, color }) => {
          const val = weights[key];
          const pct = Math.round((val / total) * 100);

          return (
            <div key={key} className="group">
              <div className="flex items-center justify-between text-xs mb-1 font-mono">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="font-medium text-slate-200">{label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400">{pct}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 font-bold text-slate-200 border border-slate-800 text-[11px] min-w-[32px] text-right">
                    {val.toFixed(1)}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={val}
                onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                className="w-full h-2 cursor-pointer"
              />

              <div className="text-[10px] text-slate-400 font-mono mt-0.5 pl-5">
                {description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
