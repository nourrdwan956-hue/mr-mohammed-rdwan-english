'use client';

export const Button = ({ children, className = '', variant = 'default', ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-full font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-50 disabled:pointer-events-none px-6 py-3 text-sm';
  const variants = {
    default: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:scale-105 shadow-lg shadow-yellow-400/20',
    outline: 'border-2 border-white/20 bg-white/5 backdrop-blur text-white hover:bg-white/10 hover:border-yellow-400/50',
    ghost: 'hover:bg-white/10 text-white',
    destructive: 'bg-red-500/80 hover:bg-red-600 text-white',
  };
  return (
    <button className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
};