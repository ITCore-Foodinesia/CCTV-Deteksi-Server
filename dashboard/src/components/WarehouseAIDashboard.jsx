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

  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-[2rem]";

  // Helper function to safely parse values
  const parseValue = (val, fallback) => {
    if (val === undefined || val === null || val === '') return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  const barangMasuk = parseValue(sheetsData.latest_loading, stats.inbound || 0);
  const barangKeluar = parseValue(sheetsData.latest_rehab, stats.outbound || 0);
  const totalLoading = barangMasuk + barangKeluar;

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
      label: 'Kapasitas',
      value: `${stats.capacity}%`,
      badge: 'Hampir Penuh',
      bgColor: 'bg-amber-100/50 border-amber-100',
      iconColor: 'text-amber-600',
      badgeColor: 'bg-amber-200/50',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F2] p-4 md:p-6 font-sans text-slate-600 flex flex-col h-screen overflow-hidden">
      <Header connected={connected} status={status} />

      <div className="flex-1 flex flex-col gap-6 overflow-hidden pb-2">
        {/* STATS ROW - 5 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-shrink-0">
          {statsConfig.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* LEFT: CCTV Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col overflow-y-auto scrollbar-hide pr-2">

            <CCTVFeed
              activeCamera={activeCamera}
              setActiveCamera={setActiveCamera}
              streamStatus={status}
              fps={stats.fps}
              latency={stats.latency}
            />
          </div>

          {/* RIGHT: Loading Dock + Activity Logs (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">

            {/* LOADING DOCK CARD - BIG */}
            <div className="bg-violet-100/50 border border-violet-100 p-6 rounded-[2rem] flex flex-col relative overflow-hidden group min-h-[180px] justify-between">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Truck className="w-20 h-20 text-violet-600" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
                    Loading {activeLoadingTruck.dock}
                  </span>
                  <span className="ml-auto bg-violet-200/50 text-violet-700 text-sm font-bold px-3 py-1 rounded-full border border-violet-200">
                    {activeLoadingTruck.progress}%
                  </span>
                </div>

                <h3 className="text-4xl font-black text-violet-900 mb-2">{activeLoadingTruck.plate}</h3>
                <p className="text-sm font-medium text-violet-700">
                  {activeLoadingTruck.driver} • {activeLoadingTruck.items}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/40 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-white/20 mt-4">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${activeLoadingTruck.progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
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
  );
};

export default WarehouseAIDashboard;
