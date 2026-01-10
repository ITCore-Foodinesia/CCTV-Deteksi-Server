import React, { useState, useEffect, useMemo } from 'react';
import { Maximize2, AlertCircle, Loader2 } from 'lucide-react';
import { getDirectStreamUrl, getStreamUrl } from '../services/api';

const CCTVFeed = ({ activeCamera, setActiveCamera, streamStatus, fps, latency }) => {
  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-[2rem]";
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const primaryStreamUrl = useMemo(() => getStreamUrl(), []);
  const fallbackStreamUrl = useMemo(() => getDirectStreamUrl(), []);
  const [streamUrl, setStreamUrl] = useState(primaryStreamUrl);
  const [fallbackTried, setFallbackTried] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setStreamUrl(primaryStreamUrl);
    setFallbackTried(false);
  }, [primaryStreamUrl, fallbackStreamUrl]);

  const handleFullscreen = () => {
    const videoContainer = document.getElementById('cctv-container');
    if (videoContainer) {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch((err) => {
          console.error('Fullscreen error:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const isConnected = streamStatus === 'Connected';
  const isLive = isConnected || imageLoaded;

  const handleStreamError = () => {
    if (!fallbackTried && fallbackStreamUrl && fallbackStreamUrl !== streamUrl) {
      setFallbackTried(true);
      setImageError(false);
      setImageLoaded(false);
      setStreamUrl(fallbackStreamUrl);
      return;
    }
    setImageError(true);
  };

  return (
    <div className={`${glassCard} p-2 w-fit max-w-full mx-auto flex flex-col relative overflow-hidden group`}>
      {/* Status Overlays */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <span className={`text-white text-[10px] font-bold px-2 py-1 rounded ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}>
          {isLive ? 'LIVE' : 'OFFLINE'}
        </span>
        <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20">
          CAM-0{activeCamera}: Main Gate
        </span>
      </div>

      {/* Performance Stats */}
      {isConnected && fps > 0 && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
          <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20">
            {fps} FPS
          </span>
          <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20">
            {latency}ms
          </span>
        </div>
      )}

      {/* Video Container */}
      <div id="cctv-container" className="w-[960px] max-w-full bg-slate-900 rounded-[1.5rem] relative overflow-hidden">
        {!imageError ? (
          <>
            {/* Loading Indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                  <p className="text-sm">Loading stream...</p>
                </div>
              </div>
            )}

            {/* CCTV Stream Image */}
            <img
              src={streamUrl}
              alt="CCTV Stream"
              className="w-full h-auto block"
              onLoad={() => setImageLoaded(true)}
              onError={handleStreamError}
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />

            {/* Grid Overlay Effect */}
            {imageLoaded && (
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none"></div>
            )}
          </>
        ) : (
          /* Error/Offline State */
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-white">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-bold mb-2">Stream Error</p>
              <p className="text-sm text-gray-400">Failed to load video stream</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((cam) => (
            <button
              key={cam}
              onClick={() => setActiveCamera(cam)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${activeCamera === cam
                ? 'bg-lime-400 text-white shadow-lg shadow-lime-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              disabled={!isLive}
            >
              {cam}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-gray-400">
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={!isLive || !imageLoaded}
          >
            <Maximize2 className="w-5 h-5 hover:text-lime-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CCTVFeed;
