import React from 'react';
import { Star, Quote } from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Testimonials Section Component
 * Customer reviews and social proof
 */
const TestimonialsSection = () => {
  const reviews = [
    {
      name: "Budi Santoso",
      role: "Operations Manager",
      company: "PT Logistik Cepat",
      image: "BS",
      content: "Gudang AI has cut our inventory loss by 40% in just two months. The object detection is incredibly accurate.",
      rating: 5
    },
    {
      name: "Sarah Wijaya",
      role: "Warehouse Head",
      company: "Mega Distribution",
      image: "SW",
      content: "The ability to check live feeds and get alerts on Telegram makes my job so much easier. I can monitor from anywhere.",
      rating: 5
    },
    {
      name: "Michael Tan",
      role: "Director",
      company: "Tan Cargo Solutions",
      image: "MT",
      content: "Implementation was smooth. We connected our existing CCTV cameras and the dashboard was live in minutes.",
      rating: 4
    }
  ];

  return (
    <section id="reviews" className="py-20 px-6 bg-white/40 border-y border-white/50">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-100 text-lime-700 font-bold text-xs uppercase tracking-wider mb-4">
            <Star size={14} className="fill-lime-700" /> Customer Stories
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Trusted by Logistics Leaders
          </h2>
          <p className="text-gray-600">
            See what warehouse managers are saying about Gudang AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <div key={i} className={`${THEME.glassCard} p-8 rounded-2xl relative`}>
              <Quote className="absolute top-6 right-6 text-gray-200" size={40} />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, starIndex) => (
                  <Star 
                    key={starIndex} 
                    size={16} 
                    className={`${
                      starIndex < review.rating 
                        ? 'fill-[#a3e635] text-[#a3e635]' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>

              <p className="text-gray-700 leading-relaxed mb-8 relative z-10">
                "{review.content}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-lg border-2 border-white">
                  {review.image}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{review.name}</p>
                  <p className="text-xs text-gray-500">
                    {review.role}, {review.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
