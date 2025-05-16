import React from 'react';
import type { AnimalType, PlayerType } from '@/types/game';
import { Cat, Sparkles, Crown, HelpCircle } from 'lucide-react'; 

interface CustomSVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// Simple Goat SVG
const GoatSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
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
    <path d="M16 16.68c-1.56.93-3.12 1.32-4.68 1.32-2.29 0-4.58-.86-6.32-2.68A estrategic .05.05 0 0 1 4 14.57c0-3.03 1.28-5.79 3.58-7.74.46-.39.95-.75 1.47-1.08.42-.26.88-.49 1.37-.68 1.2-.48 2.54-.77 3.93-.77 2.73 0 5.24 1.09 7.07 3.07.37.4.69.83.97 1.29.28.46.52.95.71 1.46.19.5.33 1.03.43 1.57.1.54.15 1.1.15 1.66 0 2.11-.84 4.01-2.22 5.41-.93.94-2.05 1.64-3.32 2.09-.43.15-.87.28-1.32.39-.45.11-.9.2-1.36.27-.46.07-.93.11-1.4.11a8.1 8.1 0 0 1-1.4-.11Z"/>
    <path d="M13 10c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2Z"/>
    <path d="M11.68 12.48c.82.68 1.68 1.32 2.52 2.02"/>
  </svg>
);

// Simple Giraffe SVG
const GiraffeSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
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
    <path d="M11.32 4.04a.5.5 0 0 0-.64 0L8.5 6.68a.5.5 0 0 0 .32.88h6.36a.5.5 0 0 0 .32-.88l-2.18-2.64Z"/>
    <path d="M12 8v10M9 18h6"/>
    <path d="M16.5 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
    <path d="M7.5 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
    <path d="M12 22c-2.67 0-4.79-1.01-6.39-2.56C4 17.68 4 14.91 4 12c0-2.91 0-5.68 1.61-7.44C7.21 3.01 9.33 2 12 2s4.79 1.01 6.39 2.56C20 6.32 20 9.09 20 12c0 2.91 0 5.68-1.61 7.44C16.79 20.99 14.67 22 12 22Z"/>
    <path d="M14 4.5c0 1.5-1.5 1.5-1.5 1.5S11 6 11 4.5"/>
  </svg>
);


interface AnimalIconProps {
  animal?: AnimalType;
  player?: PlayerType;
  type: 'animal' | 'rift' | 'crown';
  size?: number;
  className?: string; 
}

const AnimalIcon: React.FC<AnimalIconProps> = ({ animal, player, type, size = 24, className: passedInClassName }) => {
  const baseStrokeWidth = size && size < 24 ? 'stroke-[2]' : 'stroke-[1.5]'; // Thicker stroke for smaller icons
  const iconProps = {
    size,
    className: cn(
      baseStrokeWidth, 
      player === 'human' ? 'text-primary' : 'text-accent', 
      passedInClassName 
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
      return <Cat {...iconProps} />; // Still using Cat for Lion
    case 'goat':
      return <GoatSVG {...iconProps} />;
    case 'giraffe':
      return <GiraffeSVG {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} className={cn('text-muted-foreground', passedInClassName)} />;
  }
};

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default AnimalIcon;
