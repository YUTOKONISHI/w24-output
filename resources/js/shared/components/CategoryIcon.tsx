import { CookingPot, CupSoda, Package, SprayCan, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  食品: Utensils,
  日用品: SprayCan,
  飲料: CupSoda,
  調味料: CookingPot,
};

type Props = {
  category: string | null | undefined;
  size?: number;
  className?: string;
};

export function CategoryIcon({ category, size = 28, className }: Props) {
  const Icon = (category ? CATEGORY_ICONS[category] : undefined) ?? Package;

  return <Icon size={size} className={className} aria-hidden />;
}
