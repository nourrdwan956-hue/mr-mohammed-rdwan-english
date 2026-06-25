'use client';

export const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent transition-all duration-300 ${className}`}
      {...props}
    />
  );
};

export const Label = ({ children, className = '', ...props }) => {
  return (
    <label className={`block text-sm font-medium text-gray-300 mb-2 ${className}`} {...props}>
      {children}
    </label>
  );
};