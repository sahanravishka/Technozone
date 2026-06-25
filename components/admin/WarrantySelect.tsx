'use client';

import { useState } from 'react';

/**
 * WarrantySelect
 * Dropdown of common warranty periods + a "Custom" option that reveals a number
 * input (in months). Emits the chosen value into the hidden `warranty_months`
 * field so the existing product form/server action is unchanged. Default 0.
 */

const PRESETS = [
  { v: 0,  label: 'No warranty' },
  { v: 1,  label: '1 month' },
  { v: 2,  label: '2 months' },
  { v: 3,  label: '3 months' },
  { v: 4,  label: '4 months' },
  { v: 6,  label: '6 months' },
  { v: 12, label: '12 months (1 year)' },
  { v: 18, label: '18 months' },
  { v: 24, label: '24 months (2 years)' },
];

const inp =
  'h-11 w-full rounded-xl bg-paper px-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt';

export default function WarrantySelect({ initial = 0 }: { initial?: number }) {
  const isPreset = PRESETS.some((p) => p.v === initial);
  const [mode, setMode] = useState<string>(isPreset ? String(initial) : 'custom');
  const [custom, setCustom] = useState<number>(isPreset ? 0 : initial);
  // custom can be entered as years too via a small unit toggle
  const [unit, setUnit] = useState<'months' | 'years'>('months');

  const customMonths = unit === 'years' ? Math.round(custom * 12) : Math.round(custom);
  const value = mode === 'custom' ? customMonths : Number(mode);

  return (
    <div>
      {/* the value the form actually submits */}
      <input type="hidden" name="warranty_months" value={value} />

      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className={inp}
      >
        {PRESETS.map((p) => (
          <option key={p.v} value={String(p.v)}>
            {p.label}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>

      {mode === 'custom' && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={custom}
            onChange={(e) => setCustom(Math.max(0, Number(e.target.value) || 0))}
            className={`${inp} flex-1`}
            placeholder="e.g. 36"
          />
          <div className="flex overflow-hidden rounded-xl border border-line">
            {(['months', 'years'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-3 py-2.5 text-[12.5px] font-semibold transition ${
                  unit === u ? 'bg-volt text-white' : 'bg-paper text-muted'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-1 text-[11px] text-muted">
        {value === 0
          ? 'No warranty (accessories) · auto-registered at dispatch'
          : `${value} month${value === 1 ? '' : 's'} · auto-registered at dispatch`}
      </p>
    </div>
  );
}
