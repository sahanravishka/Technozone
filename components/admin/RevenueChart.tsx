/** Pure-SVG daily revenue bar chart — no chart library needed. */
export default function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const w = 720;
  const h = 160;
  const barGap = 3;
  const barW = data.length ? Math.max(2, w / data.length - barGap) : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="h-[150px] w-full min-w-[480px]" preserveAspectRatio="none" aria-hidden>
        {data.map((d, i) => {
          const barH = Math.max(1, (d.value / max) * h);
          const x = i * (barW + barGap);
          const y = h - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={2} className="fill-volt/80">
                <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
              </rect>
            </g>
          );
        })}
        <line x1={0} y1={h} x2={w} y2={h} stroke="currentColor" className="text-line" strokeWidth={1} />
      </svg>
    </div>
  );
}
