import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Camera, Maximize2, AlertCircle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { getDirectStreamUrl, getStreamUrl } from '../services/api';

const CCTVFeed = ({ activeCamera, setActiveCamera, streamStatus, fps, latency }) => {
  // Responsive glass card - smaller radius on mobile
  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-xl md:rounded-[2rem]";
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const primaryStreamUrl = useMemo(() => getStreamUrl(), []);
  const fallbackStreamUrl = useMemo(() => getDirectStreamUrl(), []);
  const [streamUrl, setStreamUrl] = useState(primaryStreamUrl);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

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
    setIsRetrying(false);
  };

  // Retry stream connection
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setImageError(false);
    setImageLoaded(false);
    setFallbackTried(false);
    setRetryCount(prev => prev + 1);
    
    // Add cache-busting timestamp to force reload
    const timestamp = Date.now();
    setStreamUrl(`${primaryStreamUrl}${primaryStreamUrl.includes('?') ? '&' : '?'}t=${timestamp}`);
    
    // Timeout to show error if stream doesn't load
    setTimeout(() => {
      if (!imageLoaded) {
        setIsRetrying(false);
      }
    }, 10000); // 10 second timeout
  }, [primaryStreamUrl, imageLoaded]);

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
      {/* Header - Compact on mobile */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm md:text-base">Camera {activeCamera}</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={handleSwitchCamera}
            className="px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-emerald-600 border border-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors"
            disabled={!isLive}
          >
            Switch Camera
          </button>
          <button
            onClick={handleFullscreen}
            className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={!isLive || !imageLoaded}
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Video Container - Responsive with aspect ratio */}
      <div id="cctv-container" className="relative bg-slate-900 overflow-hidden flex items-center justify-center aspect-video">
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

            {/* CCTV Stream Image - object-contain ensures full image visible */}
            <img
              src={streamUrl}
              alt="CCTV Stream"
              className="w-full h-auto max-h-full object-contain block"
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
          /* Error/Offline State with Retry Button */
          <div className="flex items-center justify-center bg-slate-900 aspect-video w-full">
            <div className="text-center text-white px-4">
              {isRetrying ? (
                <>
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
                  <p className="text-lg font-bold mb-2">Reconnecting...</p>
                  <p className="text-sm text-gray-400">Attempting to restore stream connection</p>
                </>
              ) : (
                <>
                  <div className="relative inline-block mb-4">
                    <WifiOff className="w-16 h-16 text-red-500" />
                    <AlertCircle className="w-6 h-6 text-red-400 absolute -bottom-1 -right-1 bg-slate-900 rounded-full" />
                  </div>
                  <p className="text-lg font-bold mb-2">Stream Unavailable</p>
                  <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                    Unable to connect to camera feed. This may be due to network issues or the stream is offline.
                  </p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Retry Connection
                  </button>
                  {retryCount > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                      Retry attempts: {retryCount}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Status Bar - Compact on mobile */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 border-t border-gray-100 text-xs md:text-sm">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
          <span className={`font-medium ${isLive ? 'text-emerald-600' : 'text-gray-500'}`}>
            {isLive ? 'Detection Active' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-gray-500">
          <span className="hidden sm:inline">Resolution: <span className="font-medium text-gray-700">1920×1080</span></span>
          <span>FPS: <span className="font-medium text-gray-700">{fps > 0 ? fps : 30}</span></span>
        </div>
      </div>
    </div>
  );
};

export default CCTVFeed;
