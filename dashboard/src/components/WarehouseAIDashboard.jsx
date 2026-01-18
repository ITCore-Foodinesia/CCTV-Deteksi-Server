import React, { useState, useEffect } from 'react';
import {
  Box,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Loader2,
  Activity,
} from 'lucide-react';
import Header from './Header';
import StatsCard from './StatsCard';
import CCTVFeed from './CCTVFeed';
import ActivityLog from './ActivityLog';
import { useWebSocket } from '../hooks/useWebSocket';

const WarehouseAIDashboard = () => {
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

  // Responsive glass card - smaller radius on mobile
  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-xl md:rounded-[2rem]";

  // Helper function to safely parse values
  const parseValue = (val, fallback) => {
    if (val === undefined || val === null || val === '') return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  /**
   * Determine loading status based on jam_datang and jam_selesai
   * - Active Loading: jam_datang exists AND jam_selesai is empty
   * - Completed: both jam_datang AND jam_selesai exist
   * - No Data: jam_datang is empty
   */
  const getLoadingStatus = () => {
    const jamDatang = sheetsData.jam_datang?.trim() || '';
    const jamSelesai = sheetsData.jam_selesai?.trim() || '';
    const plate = sheetsData.latest_plate || 'N/A';
    
    // Case 1: Has arrival time but no completion time = Currently Loading
    if (jamDatang && !jamSelesai) {
      return {
        isActiveLoading: true,
        isCompleted: false,
        activePlate: plate,
        lastCompletedPlate: 'N/A',
        arrivalTime: jamDatang,
      };
    }
    
    // Case 2: Has both arrival and completion time = Completed
    if (jamDatang && jamSelesai) {
      return {
        isActiveLoading: false,
        isCompleted: true,
        activePlate: null,
        lastCompletedPlate: plate,
        arrivalTime: jamDatang,
      };
    }
    
    // Case 3: No data
    return {
      isActiveLoading: false,
      isCompleted: false,
      activePlate: null,
      lastCompletedPlate: 'N/A',
      arrivalTime: '',
    };
  };

  const loadingStatus = getLoadingStatus();

  // Use latest_loading/latest_rehab from last row (prioritize over totals)
  const barangMasuk = parseValue(sheetsData.latest_loading, parseValue(sheetsData.loading_count, stats.inbound || 0));
  const barangKeluar = parseValue(sheetsData.latest_rehab, parseValue(sheetsData.rehab_count, stats.outbound || 0));
  const totalLoading = barangMasuk - barangKeluar;

  // DEBUG: Log values to identify source of 28/20
  console.log('DEBUG Stats:', {
    'sheetsData.latest_loading': sheetsData.latest_loading,
    'sheetsData.latest_rehab': sheetsData.latest_rehab,
    'stats.inbound': stats.inbound,
    'stats.outbound': stats.outbound,
    'barangMasuk (displayed)': barangMasuk,
    'barangKeluar (displayed)': barangKeluar,
  });

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

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Centered container with max-width for compact layout */}
      {/* Outer: slate-200 (gray), Inner: cream (#F5F7F2) */}
      <div className="max-w-7xl mx-auto p-2 md:p-4 font-sans text-slate-600 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-[#F5F7F2] shadow-xl">
        <Header connected={connected} status={status} />

        {/* Mobile: scrollable, Desktop: fixed layout */}
        <div className="flex-1 flex flex-col gap-3 md:gap-4 overflow-y-auto lg:overflow-hidden pb-2">
          {/* STATS ROW - 2 cols mobile, 5 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 flex-shrink-0">
            {statsConfig.map((stat, index) => (
              <StatsCard key={index} {...stat} compact={true} />
            ))}
          </div>

          {/* MAIN CONTENT - Stack on mobile, grid on desktop */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4 lg:overflow-hidden">
            {/* CCTV Feed - Full width on mobile, 8 cols on desktop */}
            <div className="lg:col-span-8 flex flex-col lg:overflow-y-auto scrollbar-hide lg:pr-2">
              <CCTVFeed
                activeCamera={activeCamera}
                setActiveCamera={setActiveCamera}
                streamStatus={status}
                fps={stats.fps}
                latency={stats.latency}
              />
            </div>

            {/* Sidebar - Stack below CCTV on mobile, 4 cols on desktop */}
            <div className="lg:col-span-4 flex flex-col gap-3 md:gap-4 lg:overflow-hidden">

              {/* LOADING DOCK CARD - Compact on mobile */}
              <div className="bg-violet-100/50 border border-violet-100 p-4 md:p-6 rounded-xl md:rounded-[2rem] flex flex-col relative overflow-hidden group min-h-[120px] md:min-h-[160px] justify-center items-center flex-shrink-0">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Truck className="w-20 h-20 text-violet-600" />
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
              <div className="p-5 border-b border-white/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Log Aktivitas</h2>
                  <p className="text-xs text-gray-500">Deteksi Real-time</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                <ActivityLog logs={activities} />
              </div>

              <div className="p-4 border-t border-white/50 bg-white/30 backdrop-blur-md">
                <button className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm">
                  View All Reports <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseAIDashboard;
