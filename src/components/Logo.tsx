import { motion } from 'motion/react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'centered' | 'horizontal';
  className?: string;
  id?: string;
}

export default function Logo({ size = 'md', variant = 'centered', className = '', id }: LogoProps) {
  const iconSizes = {
    sm: 'w-5 h-5 sm:w-6 sm:h-6',
    md: 'w-8 h-8 sm:w-10 sm:h-10',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const titleSizes = {
    sm: 'text-sm sm:text-base tracking-[0.15em]',
    md: 'text-xl sm:text-2xl tracking-[0.2em]',
    lg: 'text-3xl sm:text-4.5xl md:text-5xl tracking-[0.25em]',
  };

  const subtitleSizes = {
    sm: 'text-[8px] sm:text-[9px] tracking-[0.2em]',
    md: 'text-[9px] sm:text-[10px] tracking-[0.25em]',
    lg: 'text-[10px] sm:text-xs tracking-[0.3em]',
  };

  const lineLengths = {
    sm: 'w-8',
    md: 'w-16 group-hover:w-24',
    lg: 'w-32 group-hover:w-44',
  };

  // Custom high-quality luxury botanical branch SVG
  const logoIcon = (
    <svg
      viewBox="0 0 120 120"
      className={`${iconSizes[size]} text-olive transition-all duration-700 ease-out`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id={`logo-svg-${size}`}
    >
      <path
        d="M60 105 C60 75 56 46 60 22"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Leaf 1 (Left bottom) */}
      <path
        d="M58 84 C40 86 32 72 46 64 C54 70 56 78 58 84 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Leaf 2 (Right bottom) */}
      <path
        d="M62 76 C80 78 88 64 74 56 C66 62 64 70 62 76 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Leaf 3 (Left middle) */}
      <path
        d="M58 60 C40 62 32 48 46 40 C54 46 56 54 58 60 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Leaf 4 (Right middle) */}
      <path
        d="M62 52 C80 54 88 40 74 32 C66 38 64 46 62 52 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Leaf 5 (Top tip) */}
      <path
        d="M60 24 C52 12 60 2 60 2 C60 2 68 12 60 24 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'horizontal') {
    return (
      <div 
        className={`flex items-center gap-2 sm:gap-3 group cursor-pointer text-left ${className}`} 
        id={id || "logo-container-horizontal"}
      >
        <div className="bg-white p-1.5 sm:p-2 rounded-xl border border-light-gray/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-transform duration-500 group-hover:rotate-6 flex items-center justify-center flex-shrink-0">
          {logoIcon}
        </div>
        <div className="flex flex-col justify-center">
          <span className={`font-elegant font-bold text-charcoal uppercase leading-none ${titleSizes[size]}`} id="logo-text-title">
            Rustic Charm
          </span>
        </div>
      </div>
    );
  }

  // Centered stacked design
  return (
    <div 
      className={`flex flex-col items-center justify-center text-center group ${className}`} 
      id={id || "logo-container-centered"}
    >
      <div className="mb-2 sm:mb-3 transform transition-transform duration-700 group-hover:scale-105 group-hover:rotate-3">
        {logoIcon}
      </div>
      <h1 className={`font-elegant text-charcoal font-medium uppercase leading-tight ${titleSizes[size]}`} id="logo-text">
        Rustic Charm
      </h1>
      <div 
        className={`bg-gold opacity-60 h-[1px] transition-all duration-700 mt-2.5 sm:mt-3 ${lineLengths[size]}`} 
        id="logo-line"
      />
    </div>
  );
}
