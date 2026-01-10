import React from 'react';

const StatsCard = ({ icon: Icon, label, value, badge, bgColor, iconColor, badgeColor }) => {
  return (
    <div className={`${bgColor} border p-4 rounded-[1.5rem] flex flex-col relative overflow-hidden group`}>
      <div className={`absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
        <Icon className={`w-12 h-12 ${iconColor}`} />
      </div>
      <span className={`text-[10px] font-bold ${iconColor} uppercase tracking-wider mb-1`}>
        {label}
      </span>
      <span className={`text-3xl font-black ${iconColor.replace('text-', 'text-').replace('-600', '-800')}`}>
        {value}
      </span>
      <span className={`text-[10px] ${iconColor} ${badgeColor} self-start px-2 py-0.5 rounded-md mt-2`}>
        {badge}
      </span>
    </div>
  );
};

export default StatsCard;
