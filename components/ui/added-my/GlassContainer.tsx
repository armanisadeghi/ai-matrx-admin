// components/ui/GlassContainer.tsx
'use client';
import React, { ReactNode } from 'react';
import Image from 'next/image';

export interface GlassContainerProps {
  /** Content to display inside the glass container */
  children: ReactNode;
  
  /** Optional background image URL */
  backgroundImage?: string;
  
  /** Optional background color (used if no image provided) */
  backgroundColor?: string;
  
  /** Enable hover effects */
  enableHover?: boolean;
  
  /** Container height (default: 'auto') */
  height?: string | number;
  
  /** Container width (default: 'auto') */
  width?: string | number;
  
  /** Border radius (default: '2xl' = 1rem) */
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | number;
  
  /** Glass opacity (0-100, default: 10) */
  glassOpacity?: number;
  
  /** Border opacity (0-100, default: 20) */
  borderOpacity?: number;
  
  /** Blur intensity (default: 'md' = 12px) */
  blurIntensity?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;
  
  /** Background overlay darkness (0-100, default: 60) */
  overlayDarkness?: number;
  
  /** Add corner highlights */
  cornerHighlights?: boolean;
  
  /** Enable shimmer effect on hover */
  enableShimmer?: boolean;
  
  /** Enable glow effect on hover */
  enableGlow?: boolean;
  
  /** Scale factor on hover (default: 1.02) */
  hoverScale?: number;
  
  /** Make the container clickable (adds cursor-pointer) */
  clickable?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Optional click handler */
  onClick?: () => void;
}

const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  backgroundImage,
  backgroundColor = 'bg-gray-900',
  enableHover = false,
  height = 'auto',
  width = 'auto',
  borderRadius = '2xl',
  glassOpacity = 10,
  borderOpacity = 20,
  blurIntensity = 'md',
  overlayDarkness = 60,
  cornerHighlights = true,
  enableShimmer = false,
  enableGlow = false,
  hoverScale = 1.02,
  clickable = false,
  className = '',
  onClick
}) => {
  // Convert borderRadius to Tailwind class or custom style
  const getBorderRadiusClass = () => {
    if (typeof borderRadius === 'number') {
      return `rounded-[${borderRadius}px]`;
    }
    return `rounded-${borderRadius}`;
  };
  
  // Convert blurIntensity to Tailwind class or custom style
  const getBlurClass = () => {
    if (typeof blurIntensity === 'number') {
      return `blur-[${blurIntensity}px]`;
    }
    return `blur-${blurIntensity}`;
  };
  
  // Prepare style objects
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
  };
  
  // Prepare hover scale class
  const hoverScaleClass = enableHover ? `hover:scale-[${hoverScale}]` : '';
  
  // Automatically set clickable to true if onClick is provided
  const isClickable = clickable || !!onClick;
  
  // Prepare class strings
  const containerClasses = `
    relative overflow-hidden ${getBorderRadiusClass()} shadow-xl
    ${enableHover ? `transform transition-all duration-500 ease-out ${hoverScaleClass} hover:shadow-2xl` : ''}
    ${isClickable ? 'cursor-pointer' : ''}
    ${className}
  `;
  
  const backgroundClasses = `
    absolute inset-0
    ${enableHover ? 'transition-all duration-500 ease-out group-hover:scale-[1.05] group-hover:rotate-1' : ''}
  `;
  
  const overlayClasses = `
    absolute inset-0 bg-gradient-to-br 
    from-gray-900/${overlayDarkness} via-gray-900/${overlayDarkness - 10} to-gray-900/${overlayDarkness - 20}
    ${enableHover ? `transition-all duration-500 ease-out 
      group-hover:from-gray-900/${overlayDarkness - 10} 
      group-hover:via-gray-900/${overlayDarkness - 20} 
      group-hover:to-gray-900/${overlayDarkness - 30}` : ''}
  `;
  
  const glassClasses = `
    relative backdrop-blur-${blurIntensity} bg-gray-100/${glassOpacity} border border-gray-100/${borderOpacity} h-full
    ${enableHover ? `transition-all duration-500 ease-out 
      group-hover:backdrop-blur-${typeof blurIntensity === 'number' ? `[${blurIntensity * 1.5}px]` : 'lg'} 
      group-hover:bg-gray-100/${glassOpacity + 5} 
      group-hover:border-gray-100/${borderOpacity + 10}` : ''}
  `;

  return (
    <div 
      className={`${containerClasses} ${enableHover ? 'group' : ''}`} 
      style={containerStyle}
      onClick={onClick}
    >
      {/* Background Image or Color */}
      <div className={backgroundClasses}>
        {backgroundImage ? (
          <Image 
            src={backgroundImage} 
            alt="Background" 
            fill 
            className="object-cover transition-all duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={`w-full h-full ${backgroundColor}`}></div>
        )}
        {/* Overlay gradient */}
        <div className={overlayClasses}></div>
      </div>

      {/* Glass effect container */}
      <div className={glassClasses}>
        {children}
      </div>

      {/* Hover glow effect */}
      {enableHover && enableGlow && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-2xl"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -rotate-12"></div>
        </div>
      )}

      {/* Shimmer effect */}
      {enableHover && enableShimmer && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
        </div>
      )}

      {/* Corner highlights */}
      {cornerHighlights && (
        <>
          <div className={`absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent ${getBorderRadiusClass()} pointer-events-none ${enableHover ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-500' : ''}`}></div>
          <div className={`absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-white/10 to-transparent ${getBorderRadiusClass()} pointer-events-none ${enableHover ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-500' : ''}`}></div>
        </>
      )}
    </div>
  );
};

export default GlassContainer;