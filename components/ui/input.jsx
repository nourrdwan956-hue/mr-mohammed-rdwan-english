// components/ui/input.jsx
'use client';

export const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-3 py-2 text-xs xs:px-4 xs:py-2.5 xs:text-sm sm:px-4 sm:py-3 sm:text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent transition-all duration-300 ${className}`}
      {...props}
    />
  );
};

export const Label = ({ children, className = '', ...props }) => {
  return (
    <label className={`block text-xs xs:text-sm font-medium text-gray-300 mb-1.5 xs:mb-2 ${className}`} {...props}>
      {children}
    </label>
  );
};