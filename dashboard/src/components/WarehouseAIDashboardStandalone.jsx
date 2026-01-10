import React, { useState } from 'react';
import { 
  Box, Truck, ArrowDownLeft, ArrowUpRight, 
  Video, Package, Maximize2, ShieldCheck, Wifi
} from 'lucide-react';

const WarehouseAIDashboardStandalone = () => {
  const [activeCamera, setActiveCamera] = useState(1);
  const [logs] = useState([
    { id: 1, time: '10:42', type: 'inbound', item: 'ELEKTRONIK BOX A', count: 12, driver: 'Budi Santoso', plate: 'KT 9283 UKL', status: 'VERIFIED' },
    { id: 2, time: '10:38', type: 'outbound', item: 'FURNITURE SET', count: 5, driver: 'Asep Supriatna', plate: 'KT 8821 XZ', status: 'VERIFIED' },
    { id: 3, time: '10:35', type: 'inbound', item: 'RAW MATERIAL', count: 50, driver: 'Joko Anwar', plate: 'KT 1234 ABC', status: 'PENDING' },
  ]);

  const [stats] = useState({
    inbound: 145,
    outbound: 82,
    trucks: 12,
    capacity: 84
  });

  const glassCard = "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-sm rounded-[2rem]";

  return (
    <div className="min-h-screen bg-[#F5F7F2] p-4 md:p-6 font-sans text-slate-600 flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-lime-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-lime-300/50">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-none">Gudang AI Monitor</h1>
            <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              System Online • CCTV Gate 1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-white/60 px-4 py-2 rounded-2xl border border-white/60 gap-3 text-xs font-bold text-gray-500">
             <span className="flex items-center gap-1">
               <Wifi className="w-3 h-3 text-green-500"/> Connection: Excellent
             </span>
             <span className="h-3 w-px bg-gray-300"></span>
             <span className="flex items-center gap-1">
               <ShieldCheck className="w-3 h-3 text-blue-500"/> AI Model: YOLOv8-Pro
             </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" />
          </div>
        </div>
      </header>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
        <div className="bg-emerald-100/50 border border-emerald-100 p-4 rounded-[1.5rem] flex flex-col relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <ArrowDownLeft className="w-12 h-12 text-emerald-600"/>
           </div>
           <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Barang Masuk</span>
           <span className="text-3xl font-black text-emerald-800">{stats.inbound}</span>
           <span className="text-[10px] text-emerald-600 bg-emerald-200/50 self-start px-2 py-0.5 rounded-md mt-2">+12% vs kemarin</span>
        </div>
        
        <div className="bg-rose-100/50 border border-rose-100 p-4 rounded-[1.5rem] flex flex-col relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <ArrowUpRight className="w-12 h-12 text-rose-600"/>
           </div>
           <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Barang Keluar</span>
           <span className="text-3xl font-black text-rose-800">{stats.outbound}</span>
           <span className="text-[10px] text-rose-600 bg-rose-200/50 self-start px-2 py-0.5 rounded-md mt-2">On Target</span>
        </div>

        <div className="bg-blue-100/50 border border-blue-100 p-4 rounded-[1.5rem] flex flex-col relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Truck className="w-12 h-12 text-blue-600"/>
           </div>
           <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Truck Aktivitas</span>
           <span className="text-3xl font-black text-blue-800">{stats.trucks}</span>
           <span className="text-[10px] text-blue-600 bg-blue-200/50 self-start px-2 py-0.5 rounded-md mt-2">4 Loading Dock</span>
        </div>

        <div className="bg-amber-100/50 border border-amber-100 p-4 rounded-[1.5rem] flex flex-col relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Box className="w-12 h-12 text-amber-600"/>
           </div>
           <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Kapasitas</span>
           <span className="text-3xl font-black text-amber-800">{stats.capacity}%</span>
           <span className="text-[10px] text-amber-600 bg-amber-200/50 self-start px-2 py-0.5 rounded-md mt-2">Hampir Penuh</span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden pb-2">
        
        {/* LEFT COLUMN: CCTV FEED (Span 8) */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden">
          <div className={`${glassCard} p-2 flex-1 flex flex-col relative overflow-hidden group`}>
             {/* Header Overlay */}
             <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">LIVE</span>
                <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20">
                  CAM-0{activeCamera}: Main Gate
                </span>
             </div>
             
             {/* CCTV Screen with Detections */}
             <div className="flex-1 bg-slate-900 rounded-[1.5rem] relative overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')] bg-cover bg-center opacity-80"></div>
                
                {/* AI Detection Overlays */}
                <div className="absolute inset-0 pointer-events-none">
                   {/* Detected Truck */}
                   <div className="absolute top-1/4 left-1/4 w-1/3 h-1/2 border-2 border-blue-400 bg-blue-400/10 rounded-lg flex flex-col justify-between p-1">
                      <span className="bg-blue-500 text-white text-[9px] font-bold px-1 rounded self-start">Truck: 98%</span>
                   </div>

                   {/* Detected Person */}
                   <div className="absolute bottom-1/4 right-1/3 w-20 h-40 border-2 border-yellow-400 bg-yellow-400/10 rounded-lg">
                      <span className="bg-yellow-500 text-black text-[9px] font-bold px-1 rounded absolute -top-4 left-0">Person: Driver</span>
                   </div>

                   {/* Detected Box */}
                   <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-green-400 bg-green-400/10 rounded-lg">
                      <span className="bg-green-500 text-white text-[9px] font-bold px-1 rounded absolute -top-4 left-0">Box: Inbound</span>
                   </div>
                </div>

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
             </div>

             {/* Camera Controls */}
             <div className="h-16 flex items-center justify-between px-4">
                <div className="flex gap-2">
                   {[1, 2, 3, 4].map(cam => (
                      <button 
                        key={cam}
                        onClick={() => setActiveCamera(cam)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          activeCamera === cam 
                            ? 'bg-lime-400 text-white shadow-lg shadow-lime-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                         {cam}
                      </button>
                   ))}
                </div>
                <div className="flex gap-2 text-gray-400">
                   <Maximize2 className="w-5 h-5 cursor-pointer hover:text-lime-500 transition-colors"/>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVITY LOGS (Span 4) */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className={`${glassCard} flex-1 flex flex-col overflow-hidden`}>
            {/* Header */}
            <div className="p-5 border-b border-white/50 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Log Aktivitas</h2>
                <p className="text-xs text-gray-500">Deteksi Real-time</p>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 justify-center py-4 border-b border-white/30 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">LISTENING FOR EVENTS...</span>
            </div>

            {/* Log Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {logs.map((log) => {
                const isOut = log.type === 'outbound';
                
                return (
                  <div key={log.id} className="bg-white/60 p-4 rounded-[1.5rem] border border-white shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${isOut ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center`}>
                          {isOut ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownLeft className="w-5 h-5"/>}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">
                            Barang {isOut ? 'Keluar' : 'Masuk'}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-mono">{log.time} WIB</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                        isOut 
                          ? 'bg-rose-50 text-rose-600' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {log.item}
                      </span>
                    </div>
                    
                    <div className="bg-white/50 rounded-xl p-3 border border-white/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${log.driver}`} alt="driver" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700 truncate">{log.driver}</p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Truck className="w-3 h-3"/> {log.plate}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600 font-bold">
                          <Package className="w-3 h-3 text-amber-500"/>
                          {log.count} Unit
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          {log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer Button */}
            <div className="p-4 border-t border-white/50 bg-white/30 backdrop-blur-md flex-shrink-0">
              <button className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm">
                View All Reports <ArrowUpRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WarehouseAIDashboardStandalone;
