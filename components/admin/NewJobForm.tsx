'use client';

import { useRef, useState } from 'react';
import { createServiceJob } from '@/app/admin/actions';

export default function NewJobForm({ types }: { types: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const inp = 'h-11 w-full rounded-btn bg-paper px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-volt';

  return (
    <>
      <button onClick={() => setOpen(true)} className="pressable rounded-btn bg-volt px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-volt-deep">+ New repair</button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <form ref={ref} onClick={e => e.stopPropagation()}
            action={async fd => { await createServiceJob(fd); ref.current?.reset(); setOpen(false); }}
            className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h2 className="text-[16px] font-bold">New repair intake</h2>
            <div className="grid grid-cols-2 gap-3">
              <input name="customer_name" placeholder="Customer name" required className={inp} />
              <input name="customer_phone" placeholder="Phone" required className={inp} inputMode="tel" />
              <input name="device_brand" placeholder="Brand (Samsung)" className={inp} />
              <input name="device_model" placeholder="Model (A34)" className={inp} />
            </div>
            <input name="service_category" placeholder="Service" list="svc-types" className={inp} />
            <datalist id="svc-types">{types.map(t => <option key={t} value={t} />)}</datalist>
            <textarea name="issue" placeholder="Issue / notes" rows={2} className="w-full rounded-btn bg-paper p-3 text-[13.5px] outline-none focus:ring-2 focus:ring-volt" />
            <input name="estimate" placeholder="Estimate Rs (optional)" inputMode="numeric" className={inp} />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="pressable flex-1 rounded-btn bg-paper py-2.5 text-[13.5px] font-semibold">Cancel</button>
              <button className="pressable flex-1 rounded-btn bg-volt py-2.5 text-[13.5px] font-semibold text-white hover:bg-volt-deep">Create job</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
