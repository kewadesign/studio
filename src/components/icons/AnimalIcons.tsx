import React from 'react';
import type { AnimalType, PlayerType } from '@/types/game';
import { Cat, Elephant, PawPrint, Sparkles, Crown } from 'lucide-react';

interface AnimalIconProps {
  animal?: AnimalType;
  player?: PlayerType;
  type: 'animal' | 'rift' | 'crown';
  size?: number;
  className?: string;
}

const AnimalIcon: React.FC<AnimalIconProps> = ({ animal, player, type, size = 24, className }) => {
  const iconProps = {
    size,
    className: cn(
      'stroke-[1.5]', // Thinner stroke for child-friendly look
      player === 'human' ? 'text-primary' : 'text-accent', // Different colors for players
      className
    ),
  };

  if (type === 'rift') {
    return <Sparkles {...iconProps} className={cn('text-purple-500', className)} />;
  }
  if (type === 'crown') {
    return <Crown {...iconProps} className={cn('text-yellow-500', className)} />;
  }

  if (!animal) return null;

  switch (animal) {
    case 'lion':
      return <Cat {...iconProps} />;
    case 'elephant':
      return <Elephant {...iconProps} />;
    case 'zebra':
      // Using PawPrint for Zebra as a placeholder
      return <PawPrint {...iconProps} />;
    case 'cheetah':
      // Using Cat for Cheetah, color will differentiate from Lion if same player
      return <Cat {...iconProps} />;
    default:
      return <PawPrint {...iconProps} />;
  }
};

// Helper to avoid direct import of cn in every component if not needed broadly for icons
// For simple components, direct string concatenation is fine too.
// For this example, assuming cn is available or can be simplified.
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');


export default AnimalIcon;
