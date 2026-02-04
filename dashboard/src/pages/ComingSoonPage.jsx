/**
 * ComingSoonPage Component
 * Placeholder page for features under development
 */

import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoonPage = ({ title = 'This Feature' }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-amber-100 mb-6">
        <Construction className="h-10 w-10 text-amber-600" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="text-gray-500 max-w-md mb-6">
        This feature is currently under development. We're working hard to bring it to you soon!
      </p>

      {/* Status Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium mb-8">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
        Coming Soon
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>
    </div>
  );
};

export default ComingSoonPage;
