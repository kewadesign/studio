
import React from 'react';
import type { AnimalType, PlayerType } from '@/types/game';
import { Cat, Crown, HelpCircle } from 'lucide-react'; 

interface CustomSVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// Simple Gazelle SVG (using 'Z' letter for distinctness as per GDD's Z notation)
const GazelleSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <polyline points="8 4 16 4 8 12 16 12"></polyline>
    <line x1="8" y1="20" x2="16" y2="20"></line>
  </svg>
);

// Simple Giraffe SVG (using 'G' letter, could be more graphical)
const GiraffeSVG: React.FC<CustomSVGProps> = ({ size = 24, className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <path d="M15 8a1 1 0 0 0-1-1h- iniciativas .2c-.4 0-.8.2-1 .4L8 11v3a1 1 0 0 0 1 1h.2c.4 0 .8-.2 1-.4L15 11V8Z"/>
    <path d="M20.44 16.19a2 2 0 0 0-2.13-2.13l-6.4-1.6a3 3 0 0 0-3.08 1.16l-1.74 2.61a2 2 0 0 0 .18 2.65l4.16 3.12a2 2 0 0 0 2.65.18l1.74-2.61a3 3 0 0 0-1.16-3.08l6.4-1.6Z"/>
    <path d="m18 5-1.27 2.53a1 1 0 0 1-1.42.31l-1.23-1.23a1 1 0 0 0-1.41 0L11.5 7.77a1 1 0 0 1-1.41 0L8.4 6.08a1 1 0 0 0-1.41 0L4 9"/>
  </svg>
);


interface AnimalIconProps {
  animal?: AnimalType;
  player?: PlayerType;
  type: 'animal' | 'crown';
  size?: number;
  className?: string; 
}

const AnimalIcon: React.FC<AnimalIconProps> = ({ animal, player, type, size = 24, className: passedInClassName }) => {
  const baseStrokeWidth = size && size < 24 ? 'stroke-[2.5]' : 'stroke-[2]'; // Adjusted stroke for better visibility
  const iconProps = {
    size,
    className: cn(
      baseStrokeWidth, 
      player === 'human' ? 'text-primary' : 'text-accent', 
      passedInClassName 
    ),
  };

  if (type === 'crown') {
    return <Crown {...iconProps} className={cn('text-yellow-500', passedInClassName)} />;
  }

  if (!animal) return <HelpCircle {...iconProps} className={cn('text-muted-foreground', passedInClassName)} />;

  switch (animal) {
    case 'lion':
      return <Cat {...iconProps} />; 
    case 'gazelle': // Changed from goat
      return <GazelleSVG {...iconProps} />;
    case 'giraffe':
      return <GiraffeSVG {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} className={cn('text-muted-foreground', passedInClassName)} />;
  }
};

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default AnimalIcon;
