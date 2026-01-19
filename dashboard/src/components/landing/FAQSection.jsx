import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

/**
 * FAQ Section Component
 * Accordion-style frequently asked questions
 */
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "Can I use my existing CCTV cameras?",
      answer: "Yes! Gudang AI Monitor is compatible with 99% of IP cameras that support RTSP or ONVIF protocols. You don't need to buy new hardware."
    },
    {
      question: "Is my video data secure?",
      answer: "Absolutely. We use bank-grade encryption for all video streams. Your footage is processed securely and we offer on-premise deployment options for Enterprise clients."
    },
    {
      question: "Does the AI work in low light conditions?",
      answer: "Our AI models are trained on diverse datasets including night vision and low-light scenarios. However, the accuracy depends on the quality of your camera's night mode."
    },
    {
      question: "How does the Telegram alert system work?",
      answer: "Once you connect your account to our Telegram bot, you can configure which events (e.g., 'Unauthorized Entry', 'Truck Arrival') trigger a notification. You'll receive a snapshot and details instantly."
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">
            Have questions? We're here to help.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`rounded-2xl transition-all duration-300 overflow-hidden ${
                openIndex === idx 
                  ? 'bg-white shadow-lg border border-lime-200' 
                  : 'bg-white/40 border border-white/60 hover:bg-white/60'
              }`}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-left"
                aria-expanded={openIndex === idx}
                aria-controls={`faq-answer-${idx}`}
              >
                <span className={`font-bold text-lg ${
                  openIndex === idx ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {faq.question}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  openIndex === idx 
                    ? 'bg-[#a3e635] text-gray-900' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {openIndex === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              <div 
                id={`faq-answer-${idx}`}
                className={`px-6 text-gray-600 leading-relaxed overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === idx 
                    ? 'max-h-48 pb-6 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <button className="text-[#65a30d] font-bold hover:underline flex items-center justify-center gap-2 mx-auto">
            <HelpCircle size={18} /> Visit our Help Center
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
