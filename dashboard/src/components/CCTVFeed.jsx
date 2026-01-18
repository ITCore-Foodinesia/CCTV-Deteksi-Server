import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Maximize2, AlertCircle, Loader2 } from 'lucide-react';
import { getDirectStreamUrl, getStreamUrl } from '../services/api';

const CCTVFeed = ({ activeCamera, setActiveCamera, streamStatus, fps, latency }) => {
  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-[2rem]";
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const primaryStreamUrl = useMemo(() => getStreamUrl(), []);
  const fallbackStreamUrl = useMemo(() => getDirectStreamUrl(), []);
  const [streamUrl, setStreamUrl] = useState(primaryStreamUrl);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update timestamp every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleSwitchCamera = () => {
    const nextCamera = activeCamera >= 4 ? 1 : activeCamera + 1;
    setActiveCamera(nextCamera);
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

  // Format timestamp
  const formatTimestamp = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`;
  };

  return (
    <div className={`${glassCard} flex flex-col relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-800">Camera {activeCamera}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSwitchCamera}
            className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors"
            disabled={!isLive}
          >
            Switch Camera
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={!isLive || !imageLoaded}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div id="cctv-container" className="relative bg-slate-900 overflow-hidden">
        {!imageError ? (
          <>
            {/* Loading Indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 aspect-video">
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

            {/* LIVE Badge - Top Left */}
            {imageLoaded && (
              <div className="absolute top-4 left-4 z-10">
                <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  LIVE
                </span>
              </div>
            )}

            {/* Timestamp - Bottom Left */}
            {imageLoaded && (
              <div className="absolute bottom-4 left-4 z-10">
                <span className="bg-black/60 backdrop-blur-sm text-amber-400 text-sm font-mono px-2 py-1 rounded">
                  {formatTimestamp(currentTime)}
                </span>
              </div>
            )}
          </>
        ) : (
          /* Error/Offline State */
          <div className="flex items-center justify-center bg-slate-900 aspect-video">
            <div className="text-center text-white">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-bold mb-2">Stream Error</p>
              <p className="text-sm text-gray-400">Failed to load video stream</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Status Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
          <span className={`font-medium ${isLive ? 'text-emerald-600' : 'text-gray-500'}`}>
            {isLive ? 'Detection Active' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <span>Resolution: <span className="font-medium text-gray-700">1920×1080</span></span>
          <span>FPS: <span className="font-medium text-gray-700">{fps > 0 ? fps : 30}</span></span>
        </div>
      </div>
    </div>
  );
};

export default CCTVFeed;
