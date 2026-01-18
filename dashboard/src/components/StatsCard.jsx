import React from 'react';

const StatsCard = ({ icon: Icon, label, value, badge, bgColor, iconColor, badgeColor, compact = false }) => {
  return (
    <div className={`${bgColor} border ${compact ? 'p-3 rounded-xl' : 'p-4 rounded-[1.5rem]'} flex flex-col relative overflow-hidden group`}>
      <div className={`absolute right-0 top-0 ${compact ? 'p-2' : 'p-3'} opacity-10 group-hover:opacity-20 transition-opacity`}>
        <Icon className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} ${iconColor}`} />
      </div>
      {/* Icon logo visible di pojok kiri atas */}
      <div className={`${compact ? 'mb-1' : 'mb-2'}`}>
        <Icon className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} ${iconColor}`} />
      </div>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold ${iconColor} uppercase tracking-wider mb-1`}>
        {label}
      </span>
      <span className={`${compact ? 'text-2xl' : 'text-3xl'} font-black ${iconColor.replace('text-', 'text-').replace('-600', '-800')}`}>
        {value}
      </span>
      <span className={`${compact ? 'text-[9px] mt-1' : 'text-[10px] mt-2'} ${iconColor} ${badgeColor} self-start px-2 py-0.5 rounded-md`}>
        {badge}
      </span>
    </div>
  );
};

export default StatsCard;
