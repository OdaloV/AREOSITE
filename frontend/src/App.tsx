import React, { useState, useEffect } from 'react';
import { MarsGlobe } from './components/MarsGlobe';
import { Header } from './components/Header';
import { WeightSliders } from './components/WeightSliders';
import { LayerControls } from './components/LayerControls';
import { ReportCard } from './components/ReportCard';
import { SiteLeaderboard } from './components/SiteLeaderboard';
import { CesiumTokenModal } from './components/CesiumTokenModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CriteriaWeights, LayerMode, ReportCard as ReportCardType, SiteRecommendation, PresetWeight } from './types';
import { DEFAULT_WEIGHTS, PRESET_WEIGHTS } from './constants/marsData';
import { fetchHealthCheck, fetchReportCard, fetchRecommendedSites } from './services/api';
import { Sliders, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

function getSafeStorage(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function setSafeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore in restricted environments
  }
}

export const App: React.FC = () => {
  const [weights, setWeights] = useState<CriteriaWeights>(DEFAULT_WEIGHTS);
  const [activePresetId, setActivePresetId] = useState<string>('ice_first');
  const [layerMode, setLayerMode] = useState<LayerMode>('suitability');
  const [layerOpacity, setLayerOpacity] = useState<number>(0.78);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  
  // Safe token initialization
  const [ionToken, setIonToken] = useState<string>(() => {
    const saved = getSafeStorage('cesium_ion_token');
    const envToken = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CESIUM_ION_TOKEN || '' : '';
    return saved || envToken || '';
  });
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  // Telemetry & Selected Site Data
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>({ lat: 35.0, lon: -150.0 });
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [reportCard, setReportCard] = useState<ReportCardType | null>(null);
  const [recommendations, setRecommendations] = useState<SiteRecommendation[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // HUD panel collapse states
  const [leftTab, setLeftTab] = useState<'criteria' | 'leaderboard'>('criteria');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Check Backend API Health on Mount
  useEffect(() => {
    let isCancelled = false;
    const checkConnection = async () => {
      const ok = await fetchHealthCheck();
      if (!isCancelled) {
        setIsBackendConnected(ok);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 8000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Update Report Card when coordinates or weights change
  useEffect(() => {
    let isCancelled = false;
    const loadReport = async () => {
      const res = await fetchReportCard(selectedCoords.lat, selectedCoords.lon, weights);
      if (!isCancelled && res) {
        setReportCard(res);
      }
    };
    loadReport();
    return () => {
      isCancelled = true;
    };
  }, [selectedCoords, weights]);

  // Update Recommended Sites Leaderboard when weights change
  useEffect(() => {
    let isCancelled = false;
    const loadRecommendations = async () => {
      const recs = await fetchRecommendedSites(weights, 7);
      if (!isCancelled && Array.isArray(recs)) {
        setRecommendations(recs);
      }
    };
    loadRecommendations();
    return () => {
      isCancelled = true;
    };
  }, [weights]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PresetWeight) => {
    setActivePresetId(preset.id);
    setWeights(preset.weights);
  };

  // Handle Manual Weight Changes
  const handleWeightChange = (newWeights: CriteriaWeights) => {
    setActivePresetId('');
    setWeights(newWeights);
  };

  // Handle Map Selection
  const handleSelectCoordinates = (lat: number, lon: number) => {
    setSelectedCoords({ lat, lon });
    setIsSpinning(false);
    setIsRightPanelOpen(true);
  };

  // Handle Site Click from Leaderboard
  const handleSelectSite = (site: SiteRecommendation) => {
    const lat = typeof site.lat === 'number' ? site.lat : 35.0;
    const lon = typeof site.lon_180 === 'number' ? site.lon_180 : -150.0;
    setSelectedCoords({ lat, lon });
    setFlyToCoords({ lat, lon });
    setIsSpinning(false);
    setIsRightPanelOpen(true);
  };

  // Handle Fly To Site from Report Card
  const handleFlyToSite = (lat: number, lon: number) => {
    setFlyToCoords({ lat, lon });
    setIsSpinning(false);
  };

  const activePreset = PRESET_WEIGHTS.find((p) => p.id === activePresetId);
  const topSite = recommendations && recommendations.length > 0 ? recommendations[0] : null;
  const topSiteName = topSite ? (topSite.name || topSite.site_name) : undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-mars-950 font-sans">
      {/* Top Tactical Header */}
      <Header
        isSpinning={isSpinning}
        onToggleSpin={() => setIsSpinning((prev) => !prev)}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        hoverCoords={hoverCoords}
        isBackendConnected={isBackendConnected}
        activePresetLabel={activePreset?.label}
        topSiteName={topSiteName}
      />

      {/* Main 3D Cesium Mars Globe */}
      <div className="absolute inset-0 pt-14">
        <ErrorBoundary fallbackTitle="3D MARS GLOBE SUBSYSTEM NOTICE">
          <MarsGlobe
            weights={weights}
            layerMode={layerMode}
            layerOpacity={layerOpacity}
            showMarkers={showMarkers}
            isSpinning={isSpinning}
            ionToken={ionToken}
            flyToCoords={flyToCoords}
            onSelectCoordinates={handleSelectCoordinates}
            onHoverCoordinates={setHoverCoords}
          />
        </ErrorBoundary>
      </div>

      {/* Left HUD Panel (Criteria Weights & Layer Controls & Leaderboard) */}
      <div
        className={`absolute top-16 left-4 z-20 w-80 md:w-96 transition-transform duration-300 ease-in-out ${
          isLeftPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'
        }`}
      >
        <div className="flex flex-col space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {/* Tab navigation */}
          <div className="flex items-center space-x-1 p-1 bg-mars-950/80 backdrop-blur-md rounded border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setLeftTab('criteria')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded transition ${
                leftTab === 'criteria'
                  ? 'bg-mars-red/25 text-white font-semibold border border-mars-red/50 shadow-hud-red'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-mars-red-bright" />
              <span>CRITERIA & LAYERS</span>
            </button>
            <button
              onClick={() => setLeftTab('leaderboard')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded transition ${
                leftTab === 'leaderboard'
                  ? 'bg-mars-red/25 text-white font-semibold border border-mars-red/50 shadow-hud-red'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>TOP SITES ({recommendations?.length ?? 0})</span>
            </button>
          </div>

          {leftTab === 'criteria' ? (
            <>
              <WeightSliders
                weights={weights}
                onChange={handleWeightChange}
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
              />
              <LayerControls
                currentMode={layerMode}
                onSelectMode={setLayerMode}
                opacity={layerOpacity}
                onOpacityChange={setLayerOpacity}
                showMarkers={showMarkers}
                onToggleMarkers={() => setShowMarkers((prev) => !prev)}
              />
            </>
          ) : (
            <SiteLeaderboard
              recommendations={recommendations}
              selectedSiteId={reportCard?.site_name}
              onSelectSite={handleSelectSite}
            />
          )}
        </div>
      </div>

      {/* Left Panel Toggle Button */}
      <button
        onClick={() => setIsLeftPanelOpen((prev) => !prev)}
        className={`absolute top-20 z-20 p-2 rounded-r bg-mars-950/90 border-y border-r border-mars-red/40 text-slate-300 hover:text-white shadow-lg transition-all ${
          isLeftPanelOpen ? 'left-[calc(20rem+1.5rem)] md:left-[calc(24rem+1.5rem)]' : 'left-0'
        }`}
        title={isLeftPanelOpen ? 'Collapse Left Panel' : 'Expand Controls Panel'}
      >
        {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Right HUD Panel (Mission Planner Report Card) */}
      <div
        className={`absolute top-16 right-4 z-20 w-84 md:w-96 transition-transform duration-300 ease-in-out ${
          isRightPanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
        }`}
      >
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          <ReportCard data={reportCard} onFlyToSite={handleFlyToSite} />
        </div>
      </div>

      {/* Right Panel Toggle Button */}
      <button
        onClick={() => setIsRightPanelOpen((prev) => !prev)}
        className={`absolute top-20 z-20 p-2 rounded-l bg-mars-950/90 border-y border-l border-mars-red/40 text-slate-300 hover:text-white shadow-lg transition-all ${
          isRightPanelOpen ? 'right-[calc(21rem+1.5rem)] md:right-[calc(24rem+1.5rem)]' : 'right-0'
        }`}
        title={isRightPanelOpen ? 'Collapse Report Card' : 'Expand Report Card'}
      >
        {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Cesium Ion Token Modal */}
      <CesiumTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={ionToken}
        onSaveToken={(token) => {
          setIonToken(token);
          setSafeStorage('cesium_ion_token', token);
        }}
      />
    </div>
  );
};

export default App;
