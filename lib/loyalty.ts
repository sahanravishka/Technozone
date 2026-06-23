import type { LoyaltyTier } from './types';

export function loyaltyTier(orders: number, ltv: number): LoyaltyTier {
  if (ltv >= 300000 || orders >= 6) return 'vip';
  if (ltv >= 75000 || orders >= 3) return 'gold';
  if (orders >= 1) return 'regular';
  return 'new';
}

export const TIER_META: Record<LoyaltyTier, { label: string; cls: string; emoji: string }> = {
  vip:     { label: 'VIP',     cls: 'bg-warn-soft text-warn',   emoji: '⭐' },
  gold:    { label: 'Gold',    cls: 'bg-[#FBF0DC] text-[#9A6B12]', emoji: '🥇' },
  regular: { label: 'Regular', cls: 'bg-[#E8F7EE] text-ok',     emoji: '' },
  new:     { label: 'New',     cls: 'bg-paper text-muted',      emoji: '' }
};

/** Suggested personalized discount % by tier (admin can override). */
export function suggestedDiscount(tier: LoyaltyTier): number {
  return tier === 'vip' ? 10 : tier === 'gold' ? 7 : tier === 'regular' ? 5 : 0;
}
