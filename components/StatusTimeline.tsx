import type { Dict } from '@/lib/i18n/dictionaries';

const FLOW = ['pending', 'paid', 'packed', 'shipped', 'delivered'] as const;

export default function StatusTimeline({ status, dict }: { status: string; dict: Dict }) {
  const idx = FLOW.indexOf(status as typeof FLOW[number]);
  const dead = status === 'cancelled' || status === 'refunded';
  return (
    <ol className="space-y-0">
      {FLOW.map((s, i) => {
        const done = !dead && idx >= i;
        const current = !dead && idx === i;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < FLOW.length - 1 && (
              <span className={`absolute left-[9px] top-5 h-full w-0.5 ${done && idx > i ? 'bg-volt' : 'bg-line'}`} />
            )}
            <span className={`relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold
              ${done ? 'bg-volt text-white' : 'bg-line text-muted'}`}>
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[14px] ${current ? 'font-bold' : done ? 'font-semibold' : 'text-muted'}`}>
              {dict.status[s]}
            </span>
          </li>
        );
      })}
      {dead && (
        <li className="flex gap-3 pt-1">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-sale text-[10px] font-bold text-white">✕</span>
          <span className="text-[14px] font-bold text-sale">{dict.status[status as 'cancelled' | 'refunded']}</span>
        </li>
      )}
    </ol>
  );
}
