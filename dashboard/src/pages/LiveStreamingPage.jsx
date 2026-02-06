/**
 * LiveStreamingPage
 * Real-time CCTV monitoring page - wraps existing WarehouseAIDashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Loader2,
  Activity,
  ArrowUpRight as ArrowUpRightIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import CCTVFeed from '../components/CCTVFeed';
import ActivityLog from '../components/ActivityLog';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Connection Badge Component
 */
const ConnectionBadge = ({ connected, status }) => (
  <div className={`
    flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium
    ${connected 
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
      : 'bg-red-50 text-red-700 border border-red-200'
    }
  `}>
    {connected ? (
      <>
        <Wifi className="h-4 w-4" />
        <span>{status || 'Connected'}</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4" />
        <span>Disconnected</span>
      </>
    )}
  </div>
);

const LiveStreamingPage = () => {
  const [activeCamera, setActiveCamera] = useState(1);

  // WebSocket hook for real-time updates
  const { connected, stats, activities, status, sheetsData, requestStats, requestActivities } = useWebSocket();

  // Request initial data
  useEffect(() => {
    if (connected) {
      requestStats();
      requestActivities();
    }
  }, [connected, requestStats, requestActivities]);

  // Loading truck data from Google Sheets
  const activeLoadingTruck = {
    id: 'T1',
    plate: sheetsData.latest_plate || 'N/A',
    dock: 'Dock A',
    progress: 75,
    items: sheetsData.latest_items || 'Loading',
    driver: sheetsData.latest_driver || 'Driver'
  };

  // Responsive glass card
  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-xl md:rounded-[2rem]";

  // Helper function to safely parse values
  const parseValue = (val, fallback) => {
    if (val === undefined || val === null || val === '') return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  /**
   * Determine loading status based on jam_datang and jam_selesai
   */
  const getLoadingStatus = () => {
    const jamDatang = sheetsData.jam_datang?.trim() || '';
    const jamSelesai = sheetsData.jam_selesai?.trim() || '';
    const plate = sheetsData.latest_plate || 'N/A';
    
    if (jamDatang && !jamSelesai) {
      return {
        isActiveLoading: true,
        isCompleted: false,
        activePlate: plate,
        lastCompletedPlate: 'N/A',
        arrivalTime: jamDatang,
      };
    }
    
    if (jamDatang && jamSelesai) {
      return {
        isActiveLoading: false,
        isCompleted: true,
        activePlate: null,
        lastCompletedPlate: plate,
        arrivalTime: jamDatang,
      };
    }
    
    return {
      isActiveLoading: false,
      isCompleted: false,
      activePlate: null,
      lastCompletedPlate: 'N/A',
      arrivalTime: '',
    };
  };

  const loadingStatus = getLoadingStatus();

  // Use latest_loading/latest_rehab from last row
  const barangMasuk = parseValue(sheetsData.latest_loading, parseValue(sheetsData.loading_count, stats.inbound || 0));
  const barangKeluar = parseValue(sheetsData.latest_rehab, parseValue(sheetsData.rehab_count, stats.outbound || 0));
  const totalLoading = barangMasuk - barangKeluar;

  const statsConfig = [
    {
      icon: ArrowDownLeft,
      label: 'Barang Masuk',
      value: barangMasuk,
      badge: 'Loading Truk Terakhir',
      bgColor: 'bg-emerald-100/50 border-emerald-100',
      iconColor: 'text-emerald-600',
      badgeColor: 'bg-emerald-200/50',
    },
    {
      icon: ArrowUpRight,
      label: 'Barang Keluar',
      value: barangKeluar,
      badge: 'Rehab Truk Terakhir',
      bgColor: 'bg-rose-100/50 border-rose-100',
      iconColor: 'text-rose-600',
      badgeColor: 'bg-rose-200/50',
    },
    {
      icon: Activity,
      label: 'Total Loading',
      value: totalLoading,
      badge: 'Total Hari Ini',
      bgColor: 'bg-violet-100/50 border-violet-100',
      iconColor: 'text-violet-600',
      badgeColor: 'bg-violet-200/50',
    },
    {
      icon: Truck,
      label: 'Truck Aktivitas',
      value: stats.trucks,
      badge: '4 Loading Dock',
      bgColor: 'bg-blue-100/50 border-blue-100',
      iconColor: 'text-blue-600',
      badgeColor: 'bg-blue-200/50',
    },
    {
      icon: Box,
      label: 'Loading Truk Terakhir',
      value: loadingStatus.lastCompletedPlate,
      badge: loadingStatus.isCompleted
        ? `Loading: ${barangMasuk} | Rehab: ${barangKeluar}`
        : 'Tidak Ada Data',
      bgColor: 'bg-amber-100/50 border-amber-100',
      iconColor: 'text-amber-600',
      badgeColor: 'bg-amber-200/50',
    },
  ];

  // Mobile-only Loading Dock stat card config
  const loadingDockStatCard = {
    icon: Loader2,
    label: 'Loading Dock',
    value: loadingStatus.isActiveLoading ? loadingStatus.activePlate : 'Tidak Ada Loading',
    badge: loadingStatus.isActiveLoading
      ? `Sedang Loading • ${loadingStatus.arrivalTime}`
      : 'Semua dock tersedia',
    bgColor: 'bg-violet-100/50 border-violet-100',
    iconColor: 'text-violet-600',
    badgeColor: 'bg-violet-200/50',
    isAnimated: loadingStatus.isActiveLoading,
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Live Streaming</h1>
          <p className="text-sm text-gray-500">Real-time CCTV monitoring</p>
        </div>
        <ConnectionBadge connected={connected} status={status} />
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        {statsConfig.map((stat, index) => (
          <StatsCard key={index} {...stat} compact={true} />
        ))}
        {/* Loading Dock as 6th stat card - MOBILE ONLY */}
        <div className="md:hidden">
          <StatsCard {...loadingDockStatCard} compact={true} />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* CCTV Feed */}
        <div className="lg:col-span-8">
          <CCTVFeed
            activeCamera={activeCamera}
            setActiveCamera={setActiveCamera}
            streamStatus={status}
            fps={stats.fps}
            latency={stats.latency}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* LOADING DOCK CARD - DESKTOP ONLY */}
          <div className="hidden lg:flex bg-violet-100/50 border border-violet-100 p-6 rounded-2xl flex-col relative overflow-hidden group min-h-[140px] justify-center items-center">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Truck className="w-16 h-16 text-violet-600" />
            </div>

            <div className="text-center z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Loader2 className={`w-5 h-5 text-violet-400 ${loadingStatus.isActiveLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
                  Loading Dock
                </span>
              </div>

              {loadingStatus.isActiveLoading ? (
                <>
                  <h3 className="text-2xl font-black text-violet-900 mb-2">{loadingStatus.activePlate}</h3>
                  <p className="text-sm font-medium text-violet-700">
                    Sedang Loading • {loadingStatus.arrivalTime}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-black text-violet-900 mb-2">Tidak Ada Loading</h3>
                  <p className="text-sm font-medium text-violet-700">
                    Semua dock tersedia
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ACTIVITY LOGS */}
          <div className={`${glassCard} flex-1 flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-white/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Log Aktivitas</h2>
                <p className="text-xs text-gray-500">Deteksi Real-time</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                <Filter className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
              <ActivityLog logs={activities} />
            </div>

            <div className="p-4 border-t border-white/50 bg-white/30 backdrop-blur-md">
              <button className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm">
                View All Reports <ArrowUpRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingPage;
