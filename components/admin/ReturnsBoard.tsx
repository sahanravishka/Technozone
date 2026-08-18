'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReturnCard from './ReturnCard';
import NewReturnModal from './NewReturnModal';
import PageHeader from './PageHeader';

const COLS = [
  { key: 'requested', label: 'Requested', accent: '#9AA2AE' },
  { key: 'approved', label: 'Approved', accent: '#B06A0A' },
  { key: 'received', label: 'Received', accent: '#1B6FD8' },
  { key: 'refunded', label: 'Refunded', accent: '#0F8A55' },
];

// Matches ReturnCard's expected row shape.
type Row = Parameters<typeof ReturnCard>[0]['r'];

export default function ReturnsBoard({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Returns (RMA)" subtitle="Track return requests through to refund">
        <button onClick={() => setShowNew(true)}
          className="pressable rounded-xl bg-volt px-4 py-2.5 text-[13px] font-bold text-white hover:bg-volt-deep">
          + New Return
        </button>
      </PageHeader>

      {justCreated && (
        <div className="mb-4 rounded-xl bg-[#E8F7EE] px-4 py-3 text-[13.5px] font-semibold text-ok">
          ✓ Return {justCreated} created — it's in the Requested column below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map(col => {
          const list = rows.filter(r => r.status === col.key);
          return (
            <div key={col.key}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />{col.label} · {list.length}
              </p>
              <div className="space-y-2.5">
                {list.map(r => <ReturnCard key={r.id} r={r} accent={col.accent} />)}
                {!list.length && (
                  <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">None</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewReturnModal
          onClose={() => setShowNew(false)}
          onCreated={rma => { setShowNew(false); setJustCreated(rma); router.refresh(); }}
        />
      )}
    </div>
  );
}
