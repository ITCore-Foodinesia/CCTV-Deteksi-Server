import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Truck, Package } from 'lucide-react';

const ActivityLog = ({ logs }) => {
  return (
    <>
      <div className="flex items-center gap-2 mb-4 justify-center">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
        <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">
          Listening for events...
        </span>
      </div>

      {logs.map((log) => {
        const isOut = log.type === 'outbound';
        const colorClass = isOut ? 'rose' : 'emerald';
        const Icon = isOut ? ArrowUpRight : ArrowDownLeft;

        return (
          <div
            key={log.id}
            className="bg-white/60 p-4 rounded-[1.5rem] border border-white shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-${colorClass}-100 flex items-center justify-center text-${colorClass}-600`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {isOut ? 'Barang Keluar' : 'Barang Masuk'}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-mono">{log.time} WIB</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-${colorClass}-50 text-${colorClass}-600`}
              >
                {log.item}
              </span>
            </div>

            <div className="bg-white/50 rounded-xl p-3 border border-white/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${log.driver}`}
                    alt="driver"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{log.driver}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {log.plate}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-600 font-bold">
                  <Package className="w-3 h-3 text-amber-500" />
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
    </>
  );
};

export default ActivityLog;
