// client/src/pages/components/calendar/components/SkeletonLoader.tsx
import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="px-4 pb-4 animate-pulse">
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
};
