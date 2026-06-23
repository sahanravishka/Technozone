'use client';

import { useState, useTransition } from 'react';
import type { ServiceJob, ServiceStatus } from '@/lib/types';
import { advanceService, setServiceEstimate } from '@/app/admin/actions';
import { serviceNotifyLink } from '@/lib/whatsapp';
import { formatLKR } from '@/lib/site';

const COLUMNS: { key: ServiceStatus; label: string; accent: string }[] = [
  { key: 'received', label: 'Received', accent: '#9AA2AE' },
  { key: 'diagnosing', label: 'Diagnosing', accent: '#B06A0A' },
  { key: 'awaiting_approval', label: 'Awaiting approval', accent: '#8156D6' },
  { key: 'repairing', label: 'Repairing', accent: '#1B6FD8' },
  { key: 'ready', label: 'Ready', accent: '#0F8A55' }
];
const NEXT: Record<string, ServiceStatus> = {
  received: 'diagnosing', diagnosing: 'awaiting_approval', awaiting_approval: 'repairing',
  repairing: 'ready', ready: 'collected'
};
const NEXT_LABEL: Record<string, string> = {
  received: 'Diagnosing', diagnosing: 'Awaiting approval', awaiting_approval: 'Repairing',
  repairing: 'Ready', ready: 'Collected'
};

export default function RepairBoard({ jobs }: { jobs: ServiceJob[] }) {
  const [pending, start] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map(col => {
        const colJobs = jobs.filter(j => j.status === col.key);
        return (
          <div key={col.key}>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />{col.label} · {colJobs.length}
            </p>
            <div className="space-y-2.5">
              {colJobs.map(j => <JobCard key={j.id} job={j} accent={col.accent} pending={pending} start={start} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobCard({ job, accent, pending, start }:
  { job: ServiceJob; accent: string; pending: boolean; start: (cb: () => Promise<void>) => void }) {
  const [est, setEst] = useState(job.estimate ?? '');
  const next = NEXT[job.status];

  return (
    <div className="rounded-2xl bg-card p-3.5" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{job.job_number}</span>
        {job.estimate != null && <span className="text-[12px] font-semibold text-volt">{formatLKR(Number(job.estimate))}</span>}
      </div>
      <p className="mt-1 text-[12.5px] font-medium">{job.device_brand} {job.device_model}</p>
      <p className="text-[11.5px] text-muted">{job.service_category}{job.issue ? ` — ${job.issue}` : ''}</p>
      <p className="mt-1 text-[11.5px] text-muted">{job.customer_name} · {job.customer_phone}</p>

      {(job.status === 'diagnosing' || job.status === 'awaiting_approval') && (
        <div className="mt-2 flex items-center gap-1.5">
          <input value={est} onChange={e => setEst(e.target.value)} inputMode="numeric" placeholder="Estimate Rs"
            className="h-8 w-full rounded-lg bg-paper px-2 text-[12px] outline-none" />
          <button onClick={() => start(async () => { await setServiceEstimate(job.id, Number(est)); })}
            disabled={pending || !est} className="pressable shrink-0 rounded-lg bg-paper px-2.5 py-1.5 text-[11.5px] font-semibold disabled:opacity-50">Save</button>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {next && (
          <button onClick={() => start(async () => { await advanceService(job.id, next); })} disabled={pending}
            className="pressable rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50">
            → {NEXT_LABEL[job.status]}
          </button>
        )}
        <a href={serviceNotifyLink(job, job.status)} target="_blank" rel="noopener"
          className="pressable rounded-lg bg-[#E8F7EE] px-2.5 py-1.5 text-[11.5px] font-semibold text-ok">WhatsApp</a>
        <button onClick={() => { if (confirm('Cancel this job?')) start(async () => { await advanceService(job.id, 'cancelled'); }); }}
          disabled={pending} className="pressable rounded-lg bg-paper px-2 py-1.5 text-[11.5px] font-semibold text-muted disabled:opacity-50">✕</button>
      </div>
    </div>
  );
}
