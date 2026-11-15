import React, { useState } from 'react';
import { X, Key, CheckCircle, ShieldAlert, Globe, ExternalLink } from 'lucide-react';

interface CesiumTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onSaveToken: (token: string) => void;
}

export const CesiumTokenModal: React.FC<CesiumTokenModalProps> = ({
  isOpen,
  onClose,
  currentToken,
  onSaveToken,
}) => {
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveToken(tokenInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-mars-950 border border-mars-red/40 rounded-lg shadow-2xl p-6 text-slate-200 tactical-corners relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-lg tracking-wide text-white">
              CESIUM ION ACCESS TOKEN
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational callout */}
        <div className="space-y-3 mb-5 text-xs text-slate-300 leading-relaxed font-mono">
          <div className="p-3 bg-slate-900/90 rounded border border-slate-800 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200 mb-1">Autonomous Mars Siting Engine</p>
              <p className="text-slate-400">
                AREOSITE provides built-in planetary cartography for Mars (USGS MOLA DEM & NASA Viking Color MDIM 2.1) without requiring a Cesium Ion token.
              </p>
            </div>
          </div>

          <div className="p-3 bg-mars-900/40 rounded border border-mars-red/30 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-300 mb-1">Cesium Ion Integration (Optional)</p>
              <p className="text-slate-400">
                If you have an official Cesium Ion token or wish to stream private 3D tilesets from your Cesium Ion repository, paste it below. It will be stored in local browser state.
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-2 mb-6">
          <label className="block text-xs font-mono font-medium text-slate-300">
            CESIUM ION DEFAULT ACCESS TOKEN
          </label>
          <textarea
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-mars-red transition"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span>Get a token at cesium.com</span>
            <a
              href="https://ion.cesium.com/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 underline"
            >
              Open Cesium Ion <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="flex items-center space-x-2 px-5 py-2 rounded text-xs font-mono font-semibold bg-mars-red hover:bg-mars-red-bright text-white shadow-hud-red transition"
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>SAVED</span>
              </>
            ) : (
              <span>APPLY TOKEN</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
