// components/ui/card.jsx
'use client';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl hover:border-yellow-400/50 transition-all duration-500 p-4 sm:p-5 md:p-6 ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-0 sm:p-2 md:p-6 ${className}`}>{children}</div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`p-4 sm:p-5 md:p-6 pb-0 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg xs:text-xl sm:text-2xl font-bold ${className}`}>{children}</h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs sm:text-sm text-gray-400 ${className}`}>{children}</p>
);