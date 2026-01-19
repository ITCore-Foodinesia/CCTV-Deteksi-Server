import React from 'react';

/**
 * How It Works Section Component
 * Step-by-step explanation of the product workflow
 */
const HowItWorksSection = () => {
  const steps = [
    { 
      step: "01", 
      title: "Connect Camera", 
      desc: "Plug in your IP camera or use an existing RTSP stream." 
    },
    { 
      step: "02", 
      title: "AI Analysis", 
      desc: "Our cloud engine processes video frames in real-time." 
    },
    { 
      step: "03", 
      title: "Get Insights", 
      desc: "View dashboards and receive alerts on your device." 
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10"></div>
          
          {steps.map((item, i) => (
            <div key={i} className="text-center relative">
              <div className="w-24 h-24 mx-auto bg-white rounded-full border-4 border-[#F5F7F2] shadow-lg flex items-center justify-center mb-6 z-10 relative">
                <span className="text-2xl font-bold text-[#a3e635]">{item.step}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 max-w-xs mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
