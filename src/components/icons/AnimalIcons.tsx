import React from 'react';
import type { AnimalType, PlayerType } from '@/types/game';
import { Cat, Sparkles, Crown, HelpCircle } from 'lucide-react'; // Removed Elephant, PawPrint; Added HelpCircle

interface CustomSVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  // className is part of React.SVGProps<SVGSVGElement>
}

// Simple Elephant SVG (Outline)
const ElephantSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <path d="M20.84 14.58A2 2 0 0 0 20 14H16a2 2 0 0 0-2 2v2M16 14V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.42M4 18.57V10a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8.57M4 14h8M4 10a2 2 0 0 0-2 2v2.57a2 2 0 0 0 2 2V10Z" />
    <path d="M7.16 10A2.92 2.92 0 0 0 5.5 8.5C5.5 7 7 5.5 8.5 5.5S11.5 7 11.5 8.5A2.92 2.92 0 0 0 9.84 10" />
    <path d="M18 6V5c0-1.1-.9-2-2-2h-1a2 2 0 0 0-2 2v2"/>
  </svg>
);

// Simple Zebra SVG (Outline with Stripes)
const ZebraSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <path d="M7.5 21H4.5a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1h1.5L8 3h5l1.5 8H16a1 1 0 0 1 1 1v7.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V18"/>
    <path d="M20 12h-2.5L15 3h-2.5"/>
    <path d="M5 12H3"/>
    <path d="M11 3l.5 8"/>
    <path d="M8 12h5"/>
    <path d="M5 17h2.5"/>
    <path d="M9.5 17H12"/>
    <path d="M17 17h-2.5"/>
  </svg>
);

// Simple Cheetah SVG (Outline, Slender Cat)
const CheetahSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {/* A more slender/dynamic cat compared to lucide's Cat icon */}
    <path d="M16 4h-5L7 9v7h2l3-4h5V8l-3-4Z" />
    <path d="M18 8V4" />
    <path d="M14 16v-3" />
    <path d="M10 16v-3.5" />
    <path d="M5 9v7" />
    <path d="M7 16H4" />
     {/* Simple spots */}
    <circle cx="10" cy="11" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);


interface AnimalIconProps {
  animal?: AnimalType;
  player?: PlayerType;
  type: 'animal' | 'rift' | 'crown';
  size?: number;
  className?: string; // Allow additional custom classes
}

const AnimalIcon: React.FC<AnimalIconProps> = ({ animal, player, type, size = 24, className: passedInClassName }) => {
  const iconProps = {
    size,
    className: cn(
      'stroke-[1.5]', // Default stroke width
      player === 'human' ? 'text-primary' : 'text-accent', // Player color for animals
      passedInClassName // Pass through any additional classes
    ),
  };

  if (type === 'rift') {
    return <Sparkles {...iconProps} className={cn('text-purple-500', passedInClassName)} />;
  }
  if (type === 'crown') {
    return <Crown {...iconProps} className={cn('text-yellow-500', passedInClassName)} />;
  }

  if (!animal) return <HelpCircle {...iconProps} className={cn('text-muted-foreground', passedInClassName)} />;

  switch (animal) {
    case 'lion':
      return <Cat {...iconProps} />;
    case 'elephant':
      return <ElephantSVG {...iconProps} />;
    case 'zebra':
      return <ZebraSVG {...iconProps} />;
    case 'cheetah':
      return <CheetahSVG {...iconProps} />;
    default:
      // Fallback for unknown animal types
      return <HelpCircle {...iconProps} className={cn('text-muted-foreground', passedInClassName)} />;
  }
};

// Helper to avoid direct import of cn in every component if not needed broadly for icons
// For this example, assuming cn is available or can be simplified.
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');


export default AnimalIcon;
