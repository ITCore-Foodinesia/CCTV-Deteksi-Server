import React from 'react';
import { Check } from 'lucide-react';

/**
 * Pricing Section Component
 * Displays pricing plans with feature comparison
 */
const PricingSection = ({ onNavigate }) => {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      desc: "Essential monitoring for small warehouses.",
      features: [
        "Up to 4 Cameras", 
        "7 Days Cloud Retention", 
        "Basic Motion Detection", 
        "Email Alerts", 
        "Standard Support"
      ],
      highlight: false,
      cta: "Start Free Trial"
    },
    {
      name: "Pro",
      price: "$149",
      period: "/month",
      desc: "Advanced AI analytics for growing operations.",
      features: [
        "Up to 16 Cameras", 
        "30 Days Cloud Retention", 
        "Advanced AI Object Detection", 
        "Telegram & WhatsApp Alerts", 
        "Google Sheets Sync", 
        "Priority Support"
      ],
      highlight: true,
      cta: "Get Started"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "Full-scale solution for logistics networks.",
      features: [
        "Unlimited Cameras", 
        "90+ Days Retention", 
        "Custom AI Model Training", 
        "API Access & Webhooks", 
        "Dedicated Account Manager", 
        "On-premise Deployment"
      ],
      highlight: false,
      cta: "Contact Sales"
    }
  ];

  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600">
            Choose the perfect plan for your warehouse size. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative rounded-3xl p-8 ${
                plan.highlight 
                  ? 'bg-white border-2 border-[#a3e635] shadow-2xl shadow-lime-200 scale-105 z-10' 
                  : 'bg-white/60 border border-white/60 shadow-xl backdrop-blur-md'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#a3e635] text-gray-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 font-medium">
                    {plan.period}
                  </span>
                </div>
                <p className="text-gray-500 mt-4 text-sm leading-relaxed">
                  {plan.desc}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div 
                      className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        plan.highlight 
                          ? 'bg-[#a3e635]/20 text-[#65a30d]' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-gray-700 text-sm">{feat}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onNavigate('signup')}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  plan.highlight 
                    ? 'bg-[#a3e635] hover:bg-[#84cc16] text-gray-900 shadow-lg shadow-lime-300/40' 
                    : 'bg-gray-900 hover:bg-gray-800 text-white shadow-lg'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
