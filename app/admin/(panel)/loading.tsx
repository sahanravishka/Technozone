// Shown instantly on every admin navigation while the (force-dynamic) page
// fetches on the server — turns a "frozen" wait into immediate feedback.
export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* header */}
      <div className="mb-5 flex items-end justify-between border-b border-line pb-4">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-lg bg-line" />
          <div className="h-3 w-64 rounded bg-line/70" />
        </div>
        <div className="h-9 w-28 rounded-btn bg-line" />
      </div>

      {/* stat row */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="admin-card h-24 p-5">
            <div className="h-3 w-24 rounded bg-line/70" />
            <div className="mt-3 h-7 w-20 rounded-lg bg-line" />
          </div>
        ))}
      </div>

      {/* list */}
      <div className="admin-card mt-6 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i ? 'border-t border-line/70' : ''}`}>
            <div className="h-10 w-10 shrink-0 rounded-lg bg-line" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-line" />
              <div className="h-3 w-1/4 rounded bg-line/70" />
            </div>
            <div className="h-6 w-16 rounded-lg bg-line/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
