/** Cesium 3D Mars Globe with IAU 2000 Ellipsoid and reticle tracking */
import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { CriteriaWeights, LayerMode } from '../types';
import { MARS_CANDIDATE_SITES, MARS_SEMI_MAJOR_M, MARS_SEMI_MINOR_M } from '../constants/marsData';
import { getDynamicLayerUrl } from '../services/api';
import { ZoomIn, ZoomOut, Rotate3d, Globe, AlertTriangle } from 'lucide-react';

interface MarsGlobeProps {
  weights: CriteriaWeights;
  layerMode: LayerMode;
  layerOpacity: number;
  showMarkers: boolean;
  isSpinning: boolean;
  ionToken: string;
  flyToCoords: { lat: number; lon: number } | null;
  onSelectCoordinates: (lat: number, lon: number) => void;
  onHoverCoordinates: (coords: { lat: number; lon: number } | null) => void;
}

export const MarsGlobe: React.FC<MarsGlobeProps> = ({
  weights,
  layerMode,
  layerOpacity,
  showMarkers,
  isSpinning,
  ionToken,
  flyToCoords,
  onSelectCoordinates,
  onHoverCoordinates,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dynamicLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const isSpinningRef = useRef<boolean>(isSpinning);
  const marsEllipsoidRef = useRef<Cesium.Ellipsoid>(
    new Cesium.Ellipsoid(MARS_SEMI_MAJOR_M, MARS_SEMI_MAJOR_M, MARS_SEMI_MINOR_M)
  );
  const [altitudeKm, setAltitudeKm] = useState<number>(9500);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Synchronize spinning state
  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  // Set Ion Token if provided
  useEffect(() => {
    if (ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }
  }, [ionToken]);

  // Initialize Cesium Mars Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous child nodes to guarantee clean mount
    containerRef.current.innerHTML = '';

    const ellipsoid = marsEllipsoidRef.current;
    let viewer: Cesium.Viewer;

    try {
      // Create Mars Viewer with custom planetary ellipsoid and disabled Earth default layers
      viewer = new Cesium.Viewer(containerRef.current, {
        globe: new Cesium.Globe(ellipsoid),
        baseLayer: false, // Prevents default Earth Bing/Ion tiles
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        animation: false,
        fullscreenButton: false,
        creditContainer: document.createElement('div'), // Hide watermark
      });
      viewerRef.current = viewer;
    } catch (err: any) {
      console.error('Cesium Viewer initialization error:', err);
      setWebglError(err?.message || 'WebGL context initialization failed');
      return;
    }

    // Tactical Space & Atmosphere Styling
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#06080E');
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#933B22');
    viewer.scene.globe.enableLighting = false;

    // 1. Add High-Resolution Mars Surface Imagery (Viking MDIM 2.1 Color) using modern fromUrl factory
    Cesium.SingleTileImageryProvider.fromUrl('/assets/mars_surface.jpg', {
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
      ellipsoid: ellipsoid,
    })
      .then((provider) => {
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.addImageryProvider(provider);
        }
      })
      .catch((err) => {
        console.warn('Mars base imagery load note:', err);
      });

    // 2. Add Candidate Landing Site Billboard Markers
    MARS_CANDIDATE_SITES.forEach((site) => {
      const position = Cesium.Cartesian3.fromDegrees(site.lon_180, site.lat, 8000, ellipsoid);

      viewer.entities.add({
        id: site.id,
        name: site.name,
        position: position,
        point: {
          pixelSize: 8,
          color: Cesium.Color.fromCssColorString('#FF5733'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: site.name,
          font: 'bold 11px "JetBrains Mono", monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#111520'),
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000000),
        },
      });
    });

    // 3. ScreenSpaceEventHandler for Martian Click & Mouse Tracking
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.name) {
        const found = MARS_CANDIDATE_SITES.find((s) => s.id === pickedObject.id.id);
        if (found) {
          onSelectCoordinates(found.lat, found.lon_180);
          return;
        }
      }

      const ray = viewer.camera.getPickRay(click.position);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        onSelectCoordinates(lat, lon);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement: any) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        onHoverCoordinates({
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          lon: Cesium.Math.toDegrees(cartographic.longitude),
        });
      } else {
        onHoverCoordinates(null);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 4. Mars Sidereal Rotation animation loop
    const onPostRender = () => {
      if (isSpinningRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.001);
      }

      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        const cameraPos = viewerRef.current.camera.positionCartographic;
        if (cameraPos) {
          setAltitudeKm(Math.round(cameraPos.height / 1000));
        }
      }
    };
    viewer.scene.postRender.addEventListener(onPostRender);

    // Set Initial Camera Position (facing Arcadia Planitia)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-150.0, 30.0, 9500000, ellipsoid),
      duration: 1.5,
    });

    return () => {
      try {
        viewer.scene.postRender.removeEventListener(onPostRender);
        if (handler && !handler.isDestroyed()) {
          handler.destroy();
        }
        if (!viewer.isDestroyed()) {
          viewer.destroy();
        }
      } catch (e) {
        console.warn('Viewer cleanup note:', e);
      }
      viewerRef.current = null;
    };
  }, []);

  // Update Dynamic Overlay Layer when weights or mode changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Remove previous dynamic layer if exists
    if (dynamicLayerRef.current) {
      try {
        viewer.imageryLayers.remove(dynamicLayerRef.current, true);
      } catch (e) {
        // Ignored
      }
      dynamicLayerRef.current = null;
    }

    if (layerMode === 'mola') {
      return;
    }

    let overlayUrl = getDynamicLayerUrl(weights, layerMode);
    if (layerMode === 'uncertainty') {
      overlayUrl = '/layers/uncertainty.png';
    } else if (layerMode === 'ice') {
      overlayUrl = '/layers/ice.png';
    }

    Cesium.SingleTileImageryProvider.fromUrl(overlayUrl, {
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
      ellipsoid: marsEllipsoidRef.current,
    })
      .then((provider) => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          const layer = viewerRef.current.imageryLayers.addImageryProvider(provider);
          layer.alpha = layerOpacity;
          dynamicLayerRef.current = layer;
        }
      })
      .catch((err) => {
        console.warn('Dynamic layer overlay note:', err);
      });
  }, [weights, layerMode]);

  // Update Layer Opacity
  useEffect(() => {
    if (dynamicLayerRef.current) {
      dynamicLayerRef.current.alpha = layerOpacity;
    }
  }, [layerOpacity]);

  // Toggle Marker Entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    MARS_CANDIDATE_SITES.forEach((site) => {
      const entity = viewer.entities.getById(site.id);
      if (entity) {
        entity.show = showMarkers;
      }
    });
  }, [showMarkers]);

  // Handle Fly-To Coordinates Programmatically
  useEffect(() => {
    if (!flyToCoords || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    const ellipsoid = marsEllipsoidRef.current;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        flyToCoords.lon,
        flyToCoords.lat,
        2800000,
        ellipsoid
      ),
      duration: 2.0,
    });
  }, [flyToCoords]);

  // Camera Utility Actions
  const handleZoomIn = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.camera.zoomIn(1000000);
  };

  const handleZoomOut = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.camera.zoomOut(1000000);
  };

  const handleResetView = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-150.0, 30.0, 9500000, marsEllipsoidRef.current),
      duration: 1.5,
    });
  };

  // If WebGL fails on a headless system or VM, render interactive 2D Mars surface fallback
  if (webglError) {
    return (
      <div className="relative w-full h-full bg-mars-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-xl p-6 rounded-lg bg-mars-900/90 border border-mars-red/50 shadow-2xl text-slate-200">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white mb-2 uppercase">
            3D WebGL Context Notification
          </h3>
          <p className="text-xs font-mono text-slate-300 mb-4 leading-relaxed">
            {webglError}
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-left mb-4">
            <span className="text-slate-400 block mb-1">Recommended actions:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Ensure hardware acceleration is enabled in your browser settings.</li>
              <li>Or click any candidate site on the left panel to inspect the Mission Planner Report Card directly.</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-mars-red hover:bg-mars-red-bright text-white font-mono text-xs font-semibold"
          >
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-mars-950">
      {/* Cesium Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Crosshair Center Reticle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
        <div className="relative w-16 h-16 border border-mars-red/60 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-mars-red"></div>
          <div className="absolute top-0 w-0.5 h-3 bg-mars-red"></div>
          <div className="absolute bottom-0 w-0.5 h-3 bg-mars-red"></div>
          <div className="absolute left-0 w-3 h-0.5 bg-mars-red"></div>
          <div className="absolute right-0 w-3 h-0.5 bg-mars-red"></div>
        </div>
      </div>

      {/* Camera HUD Controls (Right Bottom) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col space-y-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In (+1000 km)"
          className="p-2 rounded bg-mars-900/80 hover:bg-mars-850 text-slate-200 border border-slate-700/80 hover:border-mars-red shadow-lg transition backdrop-blur-md"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-1000 km)"
          className="p-2 rounded bg-mars-900/80 hover:bg-mars-850 text-slate-200 border border-slate-700/80 hover:border-mars-red shadow-lg transition backdrop-blur-md"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Mars Global View"
          className="p-2 rounded bg-mars-900/80 hover:bg-mars-850 text-slate-200 border border-slate-700/80 hover:border-mars-red shadow-lg transition backdrop-blur-md"
        >
          <Rotate3d className="w-4 h-4 text-mars-red-bright" />
        </button>
      </div>

      {/* Planetary Orbit Telemetry (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-20 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded bg-mars-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 backdrop-blur-md">
        <div className="flex items-center space-x-1.5">
          <Globe className="w-3.5 h-3.5 text-mars-red-bright" />
          <span>MARS (IAU 2000)</span>
        </div>
        <span>•</span>
        <div>
          <span>ALT: </span>
          <span className="text-slate-200 font-semibold">{altitudeKm.toLocaleString()} km</span>
        </div>
        <span>•</span>
        <div className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ORBITAL RECON ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
