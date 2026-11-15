import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Key, 
  Activity, 
  Volume2, 
  VolumeX, 
  Layers, 
  Compass, 
  Crosshair,
  Server
} from 'lucide-react';

interface HeaderProps {
  isSpinning: boolean;
  onToggleSpin: () => void;
  onOpenTokenModal: () => void;
  hoverCoords: { lat: number; lon: number } | null;
  isBackendConnected: boolean;
  activePresetLabel?: string;
  topSiteName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isSpinning,
  onToggleSpin,
  onOpenTokenModal,
  hoverCoords,
  isBackendConnected,
  activePresetLabel,
  topSiteName,
}) => {
  const [solTime, setSolTime] = useState<string>('SOL 1042 · 14:22:05 MST');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // Update Martian Sol simulation clock
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const sec = (now.getUTCSeconds() % 60).toString().padStart(2, '0');
      const min = (now.getUTCMinutes() % 60).toString().padStart(2, '0');
      const hr = ((now.getUTCHours() + 14) % 24).toString().padStart(2, '0');
      setSolTime(`SOL 1042 · ${hr}:${min}:${sec} MST`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-14 bg-mars-950/85 backdrop-blur-md border-b border-mars-red/25 px-4 flex items-center justify-between shadow-2xl select-none">
      {/* Brand & Mission Identifier */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br from-mars-red to-mars-red-dark border border-mars-red/60 shadow-hud-red">
          <div className="w-4 h-4 rounded-full border-2 border-white/80 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]"></div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-display font-bold text-lg tracking-wider text-slate-100 flex items-center">
              AREOSITE
              <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-mars-red/20 text-mars-red-bright border border-mars-red/40 font-semibold tracking-normal">
                v1.0 CE
              </span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 tracking-tight flex items-center gap-1.5">
            <span>MARS BASE SITING DECISION ENGINE</span>
            <span>•</span>
            <span className="text-mars-red-bright/90">{activePresetLabel || 'Custom Weights'}</span>
          </span>
        </div>
      </div>

      {/* Center Tactical Telemetry Banner */}
      <div className="hidden lg:flex items-center space-x-6 text-xs font-mono text-slate-300">
        <div className="flex items-center space-x-2 bg-mars-900/80 px-3 py-1 rounded border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-mars-red-bright animate-pulse" />
          <span className="text-slate-400">CHRONO:</span>
          <span className="text-amber-400 font-semibold tracking-wide">{solTime}</span>
        </div>

        <div className="flex items-center space-x-2 bg-mars-900/80 px-3 py-1 rounded border border-slate-800">
          <Crosshair className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">RETICLE:</span>
          <span className="text-sky-300">
            {hoverCoords
              ? `${Math.abs(hoverCoords.lat).toFixed(1)}°${hoverCoords.lat >= 0 ? 'N' : 'S'}, ${((hoverCoords.lon % 360 + 360) % 360).toFixed(1)}°E`
              : 'ORBITAL FREE-LOOK'}
          </span>
        </div>

        {topSiteName && (
          <div className="flex items-center space-x-2 bg-mars-900/80 px-3 py-1 rounded border border-slate-800">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">TOP CANDIDATE:</span>
            <span className="text-emerald-400 font-semibold">{topSiteName}</span>
          </div>
        )}
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center space-x-2">
        {/* Spin Mars Toggle Button */}
        <button
          onClick={onToggleSpin}
          title={isSpinning ? "Pause Mars Rotation" : "Spin Mars (Orbital Auto-Rotation)"}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all border ${
            isSpinning
              ? 'bg-mars-red/20 text-mars-red-bright border-mars-red/50 shadow-hud-red'
              : 'bg-mars-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          {isSpinning ? (
            <>
              <Pause className="w-3.5 h-3.5 text-mars-red-bright" />
              <span>ROTATING</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-slate-400" />
              <span>SPIN MARS</span>
            </>
          )}
        </button>

        {/* Cesium Ion Token Settings */}
        <button
          onClick={onOpenTokenModal}
          title="Cesium Ion Configuration"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono bg-mars-900 hover:bg-mars-850 text-slate-300 hover:text-white border border-slate-800 hover:border-mars-red/40 transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">ION TOKEN</span>
        </button>

        {/* Backend Connectivity Status */}
        <div
          title={isBackendConnected ? "FastAPI Engine Online & Streaming" : "Client Synthesis Fallback Active"}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono border ${
            isBackendConnected
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
              : 'bg-amber-950/40 text-amber-400 border-amber-500/40'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isBackendConnected ? 'API SYNC' : 'STANDALONE'}</span>
          <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
        </div>
      </div>
    </header>
  );
};
