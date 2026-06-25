'use client';

import { useMemo, useRef, useState } from 'react';
import EyedropperPicker from './EyedropperPicker';

/**
 * VariantBuilder
 * --------------
 * The full variant authoring UI:
 *   1. Toggle "has RAM/ROM variants" (off => colours only)
 *   2. Tick RAM/ROM from saved presets (+ add new combo)
 *   3. Bulk-upload colour photos -> one colour row per photo
 *   4. Eyedrop a hex off each photo (mobile loupe + desktop)
 *   5. Auto-built availability grid (colour x ram/rom) with per-cell stock;
 *      untick combos that don't exist.
 *
 * Emits its full state into a hidden input named `variants_payload` (JSON) so the
 * existing product <form> submits it in one go. Photos are uploaded via the
 * payload's File list carried on a parallel hidden file input `variant_photos`.
 */

export type Preset = { id: string; ram: string; rom: string };

type ColorRow = {
  key: string;          // local id
  file: File | null;    // new upload (null if already-saved)
  url: string;          // object URL or stored public URL for preview/eyedrop
  hex: string | null;   // picked colour
  existingPath?: string;// storage path if already saved
};

type CellState = Record<string, { enabled: boolean; stock: number; price?: number }>;
// cell key = `${colorKey}__${presetId}` (or `${colorKey}__none` when no ram/rom)

const card = 'admin-card p-4 sm:p-5';
const lbl = 'mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-muted';
const btn = 'rounded-lg border border-line px-3 py-2 text-sm font-semibold transition active:scale-95';

export default function VariantBuilder({
  presets,
  basePrice,
}: {
  presets: Preset[];
  basePrice: number;
}) {
  const [hasStorage, setHasStorage] = useState(false);
  const [tickedPresets, setTickedPresets] = useState<string[]>([]);
  const [localPresets, setLocalPresets] = useState<Preset[]>(presets);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [cells, setCells] = useState<CellState>({});
  const [activeEyedrop, setActiveEyedrop] = useState<string | null>(null);
  const [newRam, setNewRam] = useState('');
  const [newRom, setNewRom] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Columns = ticked presets (or a single "none" column when colours-only).
  const columns = useMemo(() => {
    if (!hasStorage) return [{ id: 'none', label: '—' }];
    return localPresets
      .filter((p) => tickedPresets.includes(p.id))
      .map((p) => ({ id: p.id, label: `${p.ram}/${p.rom}` }));
  }, [hasStorage, localPresets, tickedPresets]);

  const cellKey = (colorKey: string, colId: string) => `${colorKey}__${colId}`;

  // --- Bulk colour photo upload: one row per file ---
  const onPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const rows: ColorRow[] = files.map((f, i) => ({
      key: `c_${Date.now()}_${i}`,
      file: f,
      url: URL.createObjectURL(f),
      hex: null,
    }));
    setColors((prev) => [...prev, ...rows]);
    // default-enable all cells for the new colours
    setCells((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        columns.forEach((c) => {
          next[cellKey(r.key, c.id)] = { enabled: true, stock: 0 };
        });
      });
      return next;
    });
    e.target.value = '';
  };

  const removeColor = (key: string) => {
    setColors((prev) => prev.filter((c) => c.key !== key));
    setCells((prev) => {
      const next: CellState = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(`${key}__`)) next[k] = v;
      });
      return next;
    });
  };

  const setHex = (key: string, hex: string) =>
    setColors((prev) => prev.map((c) => (c.key === key ? { ...c, hex } : c)));

  // Toggling a preset on/off rebuilds the grid columns; keep existing cell values.
  const togglePreset = (id: string) => {
    setTickedPresets((prev) => {
      const on = prev.includes(id);
      const nextTicked = on ? prev.filter((x) => x !== id) : [...prev, id];
      // ensure cells exist for the newly enabled column
      if (!on) {
        setCells((cprev) => {
          const next = { ...cprev };
          colors.forEach((r) => {
            const k = cellKey(r.key, id);
            if (!next[k]) next[k] = { enabled: true, stock: 0 };
          });
          return next;
        });
      }
      return nextTicked;
    });
  };

  const addPreset = () => {
    const ram = newRam.trim();
    const rom = newRom.trim();
    if (!ram || !rom) return;
    if (localPresets.some((p) => p.ram === ram && p.rom === rom)) return;
    const id = `new_${ram}_${rom}`;
    setLocalPresets((prev) => [...prev, { id, ram, rom }]);
    setTickedPresets((prev) => [...prev, id]);
    setNewRam('');
    setNewRom('');
  };

  const toggleCell = (k: string) =>
    setCells((prev) => ({ ...prev, [k]: { ...prev[k], enabled: !prev[k]?.enabled } }));
  const setCellStock = (k: string, stock: number) =>
    setCells((prev) => ({ ...prev, [k]: { ...prev[k], stock: Math.max(0, stock) } }));
  const bumpCellStock = (k: string, delta: number) =>
    setCells((prev) => ({ ...prev, [k]: { ...prev[k], stock: Math.max(0, (prev[k]?.stock ?? 0) + delta) } }));

  // "Fill all stock" convenience
  const [bulkStock, setBulkStock] = useState('');
  const applyBulkStock = () => {
    const n = Math.max(0, Number(bulkStock) || 0);
    setCells((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k].enabled) next[k] = { ...next[k], stock: n };
      });
      return next;
    });
  };

  // Build the JSON payload the server action consumes.
  const payload = useMemo(() => {
    const variants = colors.flatMap((color, ci) =>
      columns
        .filter((col) => cells[cellKey(color.key, col.id)]?.enabled)
        .map((col) => {
          const cell = cells[cellKey(color.key, col.id)];
          const preset = localPresets.find((p) => p.id === col.id);
          return {
            colorKey: color.key,
            colorIndex: ci,
            hex: color.hex,
            existingPath: color.existingPath ?? null,
            ram: hasStorage && preset ? preset.ram : null,
            rom: hasStorage && preset ? preset.rom : null,
            stock: cell?.stock ?? 0,
            price: cell?.price ?? basePrice,
          };
        })
    );
    return { hasStorage, variants };
  }, [colors, columns, cells, localPresets, hasStorage, basePrice]);

  // Photos need to ride along as real files on a hidden multi-file input.
  // We reconstruct that input's FileList whenever colours change.
  const photoInputRef = useRef<HTMLInputElement>(null);
  const syncPhotoInput = () => {
    if (!photoInputRef.current) return;
    const dt = new DataTransfer();
    colors.forEach((c) => {
      if (c.file) dt.items.add(c.file);
    });
    photoInputRef.current.files = dt.files;
  };
  // keep it synced on every render that changes colours
  if (typeof window !== 'undefined') syncPhotoInput();

  const readyColors = colors.filter((c) => c.hex);
  const totalVariants = payload.variants.length;

  return (
    <div className="space-y-4">
      {/* hidden payload carried by the parent form */}
      <input type="hidden" name="variants_payload" value={JSON.stringify(payload)} />
      <input type="hidden" name="has_storage_variants" value={hasStorage ? 'true' : 'false'} />
      <input ref={photoInputRef} type="file" name="variant_photos" multiple className="hidden" />

      {/* 1) RAM/ROM toggle */}
      <div className={card}>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={hasStorage}
            onChange={(e) => setHasStorage(e.target.checked)}
            className="h-5 w-5 accent-volt"
          />
          <span className="text-sm font-bold">This device has RAM/ROM variants</span>
        </label>
        <p className="mt-1 text-[12px] text-muted">
          On = phones (colour × RAM/ROM grid). Off = colours only (cases, audio, etc.).
        </p>

        {hasStorage && (
          <div className="mt-4">
            <span className={lbl}>Tick RAM / ROM</span>
            <div className="flex flex-wrap gap-2">
              {localPresets.map((p) => {
                const on = tickedPresets.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePreset(p.id)}
                    className={`${btn} ${on ? 'bg-volt text-ink border-volt' : 'bg-paper'}`}
                  >
                    {p.ram}/{p.rom}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={newRam}
                onChange={(e) => setNewRam(e.target.value)}
                placeholder="RAM e.g. 12GB"
                className="h-10 w-32 rounded-lg bg-paper px-3 text-sm"
              />
              <input
                value={newRom}
                onChange={(e) => setNewRom(e.target.value)}
                placeholder="ROM e.g. 512GB"
                className="h-10 w-32 rounded-lg bg-paper px-3 text-sm"
              />
              <button type="button" onClick={addPreset} className={`${btn} bg-paper`}>
                + Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2) Colours: bulk upload + eyedrop */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <span className={`${lbl} mb-0`}>Colours ({colors.length})</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`${btn} bg-volt text-ink border-volt`}
          >
            + Upload colour photos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotos}
            className="hidden"
          />
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Upload all colours at once — one photo per colour. Then drag on each photo to pick its colour.
        </p>

        {colors.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {colors.map((c) => (
              <div key={c.key} className="rounded-xl border border-line p-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.url}
                    alt=""
                    className="aspect-square w-full rounded-lg object-contain bg-[#0b1526]"
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(c.key)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className="h-6 w-6 rounded-full border border-line"
                    style={{ background: c.hex || 'transparent' }}
                  />
                  <button
                    type="button"
                    onClick={() => setActiveEyedrop(activeEyedrop === c.key ? null : c.key)}
                    className={`${btn} flex-1 py-1.5 text-xs ${c.hex ? 'bg-paper' : 'bg-volt text-ink border-volt'}`}
                  >
                    {c.hex ? 'Re-pick' : 'Pick colour'}
                  </button>
                </div>
                {activeEyedrop === c.key && (
                  <div className="mt-2">
                    <EyedropperPicker
                      src={c.url}
                      value={c.hex}
                      onChange={(hex) => setHex(c.key, hex)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3) Availability + stock grid */}
      {readyColors.length > 0 && columns.length > 0 && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`${lbl} mb-0`}>
              Availability & stock — {totalVariants} variant{totalVariants === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBulkStock((s) => String(Math.max(0, (Number(s) || 0) - 1)))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-lg font-bold text-muted active:scale-90"
                  aria-label="Decrease"
                >
                  −
                </button>
                <input
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  placeholder="Stock"
                  inputMode="numeric"
                  className="h-9 w-14 rounded-lg bg-paper px-2 text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setBulkStock((s) => String((Number(s) || 0) + 1))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-lg font-bold text-muted active:scale-90"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <button type="button" onClick={applyBulkStock} className={`${btn} bg-paper py-1.5 text-xs`}>
                Fill all
              </button>
            </div>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Untick combos that don&apos;t exist. Set stock per cell.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card p-2 text-left">Colour</th>
                  {columns.map((col) => (
                    <th key={col.id} className="p-2 text-center whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readyColors.map((color) => (
                  <tr key={color.key} className="border-t border-line">
                    <td className="sticky left-0 bg-card p-2">
                      <span
                        className="inline-block h-6 w-6 rounded-full border border-line align-middle"
                        style={{ background: color.hex || 'transparent' }}
                      />
                    </td>
                    {columns.map((col) => {
                      const k = cellKey(color.key, col.id);
                      const cell = cells[k] ?? { enabled: true, stock: 0 };
                      return (
                        <td key={col.id} className="p-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="checkbox"
                              checked={cell.enabled}
                              onChange={() => toggleCell(k)}
                              className="h-4 w-4 accent-volt"
                            />
                            {cell.enabled && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => bumpCellStock(k, -1)}
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper text-base font-bold text-muted active:scale-90"
                                  aria-label="Decrease stock"
                                >
                                  −
                                </button>
                                <input
                                  value={cell.stock}
                                  onChange={(e) => setCellStock(k, Number(e.target.value) || 0)}
                                  inputMode="numeric"
                                  className="h-8 w-11 rounded-lg bg-paper px-1 text-center text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => bumpCellStock(k, 1)}
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper text-base font-bold text-muted active:scale-90"
                                  aria-label="Increase stock"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {colors.length > 0 && readyColors.length < colors.length && (
        <p className="text-[12px] font-semibold text-sale">
          Pick a colour for all {colors.length} photos to build the grid (
          {colors.length - readyColors.length} left).
        </p>
      )}
    </div>
  );
}
