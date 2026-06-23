/** Consistent admin page heading — title, optional subtitle, and an action slot. */
export default function PageHeader({ title, subtitle, children }:
  { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
