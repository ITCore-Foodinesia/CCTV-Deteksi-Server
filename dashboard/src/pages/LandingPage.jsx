import React from 'react';
import {
  Navbar,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer
} from '../components/landing';

/**
 * Landing Page Component
 * Main marketing page composing all landing sections
 */
const LandingPage = ({ onNavigate }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onNavigate={onNavigate} />
      
      {/* Hero Section */}
      <HeroSection onNavigate={onNavigate} />

      {/* Features Section */}
      <FeaturesSection />

      {/* How it works */}
      <HowItWorksSection />

      {/* Pricing Section */}
      <PricingSection onNavigate={onNavigate} />
      
      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA */}
      <CTASection onNavigate={onNavigate} />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
