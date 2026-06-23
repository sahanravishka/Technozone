import { waLink } from '@/lib/site';

export const WhatsAppIcon = ({ className = 'h-[18px] w-[18px]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.1 4c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.4-.3-1.6-.8c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.3.1-.5L10 8.2c-.1-.3-.3-.4-.5-.4h-.6Z"/>
  </svg>
);

export default function WhatsAppButton({ text, label, variant = 'soft' }:
  { text: string; label: string; variant?: 'soft' | 'solid' | 'ghost' }) {
  const cls = {
    solid: 'bg-[#1FAF5E] text-white hover:bg-[#18934F]',
    soft:  'bg-card text-ink hover:bg-[#EAF7EF]',
    ghost: 'bg-white/10 text-white hover:bg-white/20'
  }[variant];
  return (
    <a href={waLink(text)} target="_blank" rel="noopener noreferrer"
       className={`pressable inline-flex h-12 items-center justify-center gap-2 rounded-btn px-5 text-[14.5px] font-semibold ${cls}`}>
      <WhatsAppIcon className={`h-[18px] w-[18px] ${variant !== 'ghost' ? 'text-[#1FAF5E]' : ''}`} />
      {label}
    </a>
  );
}
