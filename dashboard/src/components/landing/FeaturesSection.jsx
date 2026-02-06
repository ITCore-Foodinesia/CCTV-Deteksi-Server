import React from 'react';
import { 
  Camera, 
  ShieldCheck, 
  BarChart3, 
  Smartphone, 
  FileSpreadsheet, 
  Bell 
} from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Features Section Component
 * Displays key product features in a grid layout
 */
const FeaturesSection = () => {
  const features = [
    { 
      icon: <Camera />, 
      title: "Live Streaming", 
      desc: "Low latency HD video feed accessible from anywhere securely.", 
      color: "text-blue-500", 
      bg: "bg-blue-50" 
    },
    { 
      icon: <ShieldCheck />, 
      title: "AI Object Detection", 
      desc: "Detects trucks, workers, and PPE compliance instantly.", 
      color: "text-[#a3e635]", 
      bg: "bg-lime-50" 
    },
    { 
      icon: <BarChart3 />, 
      title: "Real-time Analytics", 
      desc: "Track inbound/outbound volume and dock capacity usage.", 
      color: "text-purple-500", 
      bg: "bg-purple-50" 
    },
    { 
      icon: <FileSpreadsheet />, 
      title: "Sheets Integration", 
      desc: "Auto-log every event directly to your Google Sheets.", 
      color: "text-green-600", 
      bg: "bg-green-50" 
    },
    { 
      icon: <Smartphone />, 
      title: "Telegram Control", 
      desc: "Receive alerts and request snapshots via Telegram bot.", 
      color: "text-sky-500", 
      bg: "bg-sky-50" 
    },
    { 
      icon: <Bell />, 
      title: "Smart Alerts", 
      desc: "Instant notifications for unauthorized access or bottlenecks.", 
      color: "text-rose-500", 
      bg: "bg-rose-50" 
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-white/40">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Monitor
          </h2>
          <p className="text-gray-600">
            Our AI does the heavy lifting so you can focus on operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className={`${THEME.glassCard} p-8 rounded-2xl group`}
            >
              <div 
                className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}
              >
                {React.cloneElement(feature.icon, { size: 28 })}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
