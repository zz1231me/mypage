// client/src/components/common/PageHeader.tsx
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader = React.memo(({ title, description, icon, children }: PageHeaderProps) => {
  return (
    <header
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-200 dark:border-slate-700/60"
      role="banner"
      aria-label={`${title} 페이지 헤더`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className="w-8 h-8 text-primary-600 dark:text-primary-400 flex-shrink-0"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <nav className="flex-shrink-0 w-full sm:w-auto" aria-label="페이지 액션">
          {children}
        </nav>
      )}
    </header>
  );
});

PageHeader.displayName = 'PageHeader';
