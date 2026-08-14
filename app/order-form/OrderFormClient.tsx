'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { SRI_LANKA_CITIES } from '@/lib/sri-lanka-cities';
import { submitFacebookOrder, type LeadLine } from './actions';
import { ORDER_FORM_DICT, type OrderFormLocale } from './dictionary';

type ModuleVariant = { id: string; name: string; price: number; inStock: boolean };
type Module = { id: string; name: string; brand: string | null; categoryId: string | null; image: string | null; variants: ModuleVariant[] };
type CategoryTile = { id: string; name: string; slug: string; icon: string; count: number };
type SelectedLine = { key: string; productId: string; variantId: string; label: string; image: string | null; price: number; qty: number };

const LKR = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;
const STEPS = ['lang', 'cats', 'items', 'cart', 'details'] as const;
type Step = typeof STEPS[number];

export default function OrderFormClient({ modules, categories }: { modules: Module[]; categories: CategoryTile[] }) {
  const [lang, setLang] = useState<OrderFormLocale>('en');
  const t = ORDER_FORM_DICT[lang];
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const [step, setStep] = useState<Step>('lang');
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [productQuery, setProductQuery] = useState('');

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [showCityList, setShowCityList] = useState(false);
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const stepIdx = STEPS.indexOf(step);
  const go = (s: Step) => { setStep(s); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); };

  function canReach(s: Step): boolean {
    const i = STEPS.indexOf(s);
    if (i <= 1) return true;
    if (i === 2) return activeCats.size > 0;
    return lines.length > 0;
  }

  const toggleCat = (id: string) => setActiveCats(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredCities = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (!q) return SRI_LANKA_CITIES.slice(0, 8);
    return SRI_LANKA_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 8);
  }, [city]);

  const visibleProducts = useMemo(() => {
    if (!activeCats.size) return [];
    const q = productQuery.trim().toLowerCase();
    return modules.filter(m =>
      m.categoryId && activeCats.has(m.categoryId) &&
      (!q || m.name.toLowerCase().includes(q) || m.brand?.toLowerCase().includes(q))
    );
  }, [activeCats, productQuery, modules]);

  const total = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  function isSelected(variantId: string) { return lines.some(l => l.variantId === variantId); }

  function toggleLine(m: Module, v: ModuleVariant) {
    if (!v.inStock) return;
    setLines(prev => {
      if (prev.some(l => l.variantId === v.id)) return prev.filter(l => l.variantId !== v.id);
      const label = v.name && v.name !== 'Default' ? `${m.name} — ${v.name}` : m.name;
      return [...prev, { key: v.id, productId: m.id, variantId: v.id, label, image: m.image, price: v.price, qty: 1 }];
    });
  }
  function updateQty(key: string, qty: number) {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, 99)) } : l)));
  }
  function removeLine(key: string) { setLines(prev => prev.filter(l => l.key !== key)); }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.errRequired;
    if (!address.trim()) e.address = t.errRequired;
    if (!city.trim()) e.city = t.errRequired;
    const p1 = phone1.replace(/\s/g, '');
    if (!/^0\d{9}$/.test(p1)) e.phone1 = t.errPhone;
    const p2 = phone2.replace(/\s/g, '');
    if (p2 && !/^0\d{9}$/.test(p2)) e.phone2 = t.errPhone2;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    start(async () => {
      const res = await submitFacebookOrder({
        lines: lines.map<LeadLine>(l => ({ variantId: l.variantId, qty: l.qty })),
        name, address, city, phone1, phone2: phone2 || undefined, note: note || undefined,
      });
      if (res.ok) setOrderNumber(res.orderNumber);
      else setSubmitError(res.error);
    });
  }

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#101826] px-3.5 py-3 text-[14.5px] text-white placeholder:text-white/35 outline-none transition-colors focus:border-accent';
  const labelCls = 'mb-1.5 block text-[12.5px] font-bold uppercase tracking-wide text-white/60';

  if (orderNumber) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B1526] px-6 text-center">
        <div>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-accent to-volt text-3xl text-white shadow-lg shadow-volt/30">✓</div>
          <h1 className="mt-5 text-xl font-extrabold tracking-tight text-white">{t.successTitle}</h1>
          <p className="mt-2 max-w-xs text-[14px] text-white/60">{t.successBody(orderNumber)}</p>
          <p className="mt-6 text-[12.5px] font-semibold tracking-wide text-white/40">{t.successFooter}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1526] pb-28">
      <div className="pointer-events-none fixed -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none fixed -left-10 top-40 h-40 w-40 rounded-full bg-volt/20 blur-3xl" />

      {step !== 'lang' && (
        <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1526]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-1.5">
            {STEPS.slice(1).map(s => {
              const reachable = canReach(s);
              const done = STEPS.indexOf(s) < stepIdx;
              const current = s === step;
              return (
                <button key={s} type="button" disabled={!reachable}
                  onClick={() => reachable && go(s)}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    current ? 'bg-accent' : done ? 'bg-accent/50' : 'bg-white/10'
                  } ${reachable && !current ? 'cursor-pointer hover:bg-accent/70' : ''}`}
                  aria-label={s}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        {step === 'lang' && (
          <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
            <div className="mb-1 text-[13px] font-bold uppercase tracking-widest text-accent">Techno Zone Lanka</div>
            <h1 className="mt-2 text-[1.6rem] font-extrabold tracking-tight text-white sm:text-[2rem]">
              Choose your language
            </h1>
            <p className="mt-1.5 text-[13.5px] text-white/50">භාෂාව තෝරන්න · மொழியைத் தேர்ந்தெடுக்கவும்</p>

            <div className="mt-8 grid w-full max-w-sm grid-cols-1 gap-3">
              {([
                { key: 'en' as const, label: 'English', sub: 'Continue in English' },
                { key: 'si' as const, label: 'සිංහල', sub: 'සිංහලෙන් ඉදිරියට යන්න' },
                { key: 'ta' as const, label: 'தமிழ்', sub: 'தமிழில் தொடரவும்' },
              ]).map(l => (
                <button key={l.key} type="button"
                  onClick={() => { setLang(l.key); go('cats'); }}
                  className="pressable flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition-all hover:border-accent hover:bg-white/[0.08]">
                  <div>
                    <p className="text-[17px] font-extrabold text-white">{l.label}</p>
                    <p className="text-[12px] text-white/45">{l.sub}</p>
                  </div>
                  <span className="text-white/30">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'cats' && (
          <div className="min-h-[75vh] pt-2">
            <StepHeading n={1} title={t.step1} sub={t.step1Sub} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map(c => {
                const on = activeCats.has(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                    className={`pressable relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-6 text-center transition-all ${
                      on
                        ? 'border-accent bg-gradient-to-b from-accent/25 to-volt/10 shadow-lg shadow-accent/10'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}>
                    {on && (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-ink">✓</span>
                    )}
                    <span className="text-[32px] leading-none">{c.icon}</span>
                    <span className={`text-[13px] font-bold leading-tight ${on ? 'text-white' : 'text-white/70'}`}>{c.name}</span>
                    <span className="text-[10.5px] text-white/35">{c.count} items</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'items' && (
          <div className="min-h-[75vh] pt-2">
            <StepHeading n={2} title={t.step2} sub={t.step2Sub} />
            <input
              type="text" value={productQuery} onChange={e => setProductQuery(e.target.value)}
              placeholder={t.itemsSearchPlaceholder}
              className={`${inputCls} mb-3`}
            />
            {visibleProducts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-[13px] text-white/40">{t.itemsNoMatch}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleProducts.map(m => m.variants.map(v => {
                  const selected = isSelected(v.id);
                  const vLabel = v.name && v.name !== 'Default' ? v.name : t.standard;
                  return (
                    <button key={v.id} type="button" onClick={() => toggleLine(m, v)} disabled={!v.inStock}
                      className={`pressable relative overflow-hidden rounded-xl border text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        selected ? 'border-accent ring-2 ring-accent/40' : 'border-white/10 hover:border-white/25'
                      }`}>
                      <div className="relative aspect-square w-full bg-white/[0.04]">
                        {m.image ? (
                          <Image src={m.image} alt={m.name} fill sizes="180px" className="object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-white/20">
                            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
                              <path d="m3 16 5-4 4 3 3-2 6 5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-[12px] font-bold text-ink shadow">✓</span>
                        )}
                        {!v.inStock && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] font-bold text-white">{t.outOfStock}</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white">{m.name}</p>
                        {vLabel !== t.standard && <p className="mt-0.5 text-[10.5px] text-white/45">{vLabel}</p>}
                        <p className="mt-1 text-[12.5px] font-extrabold text-accent">{LKR(v.price)}</p>
                      </div>
                    </button>
                  );
                }))}
              </div>
            )}
          </div>
        )}

        {step === 'cart' && (
          <div className="min-h-[75vh] pt-2">
            <StepHeading n={3} title={t.selectedLabel} />
            <ul className="space-y-2">
              {lines.map(l => (
                <li key={l.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
                    {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-white">{l.label}</p>
                    <p className="text-[12px] text-white/45">{LKR(l.price)} {t.each}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.06] px-1 py-1">
                    <button type="button" onClick={() => updateQty(l.key, l.qty - 1)}
                      className="grid h-6 w-6 place-items-center rounded-md text-[13px] font-bold text-white/70 hover:bg-white/10">−</button>
                    <span className="w-5 text-center text-[12.5px] font-bold text-white">{l.qty}</span>
                    <button type="button" onClick={() => updateQty(l.key, l.qty + 1)}
                      className="grid h-6 w-6 place-items-center rounded-md text-[13px] font-bold text-white/70 hover:bg-white/10">+</button>
                  </div>
                  <button type="button" onClick={() => removeLine(l.key)} aria-label="Remove"
                    className="shrink-0 px-1 text-[16px] leading-none text-white/40 hover:text-[#FF6B6B]">✕</button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => go('items')}
              className="pressable mt-3 w-full rounded-xl border border-dashed border-white/15 py-3 text-[13px] font-semibold text-white/50 hover:border-accent hover:text-accent">
              + {t.step2}
            </button>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} noValidate className="min-h-[75vh] pt-2">
            <StepHeading n={4} title={t.step3} />
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
              <div>
                <label className={labelCls}>{t.nameLabel}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} className={inputCls} />
                {errors.name && <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{errors.name}</p>}
              </div>

              <div>
                <label className={labelCls}>{t.addressLabel}</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                  placeholder={t.addressPlaceholder} className={`${inputCls} resize-none`} />
                {errors.address && <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{errors.address}</p>}
              </div>

              <div className="relative">
                <label className={labelCls}>{t.cityLabel}</label>
                <input
                  value={city}
                  onFocus={() => setShowCityList(true)}
                  onChange={e => { setCity(e.target.value); setShowCityList(true); }}
                  placeholder={t.cityPlaceholder} className={inputCls} />
                {showCityList && filteredCities.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCityList(false)} />
                    <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#101826] shadow-xl">
                      {filteredCities.map(c => (
                        <button key={c} type="button"
                          onClick={() => { setCity(c); setShowCityList(false); }}
                          className="block w-full px-3.5 py-2.5 text-left text-[13.5px] text-white/85 hover:bg-white/10">
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {errors.city && <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{errors.city}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>{t.phone1Label}</label>
                  <input value={phone1} onChange={e => setPhone1(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" className={inputCls} />
                  {errors.phone1 && <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{errors.phone1}</p>}
                </div>
                <div>
                  <label className={labelCls}>{t.phone2Label}</label>
                  <input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder={t.phone2Optional} inputMode="tel" className={inputCls} />
                  {errors.phone2 && <p className="mt-1 text-[12px] font-semibold text-[#FF6B6B]">{errors.phone2}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>{t.noteLabel}</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder={t.notePlaceholder} className={`${inputCls} resize-none`} />
              </div>
            </div>

            {submitError && (
              <p className="mt-4 rounded-xl bg-[#FF6B6B]/10 px-3.5 py-2.5 text-[13px] font-semibold text-[#FF6B6B]">{submitError}</p>
            )}
          </form>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0B1526]/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {step !== 'lang' && stepIdx > 1 && (
            <button type="button" onClick={() => go(STEPS[stepIdx - 1])}
              className="pressable rounded-xl border border-white/15 px-4 py-3.5 text-[13.5px] font-bold text-white/70 hover:bg-white/5">
              ←
            </button>
          )}

          {(step === 'cats' || step === 'items' || step === 'cart') && (
            <>
              <div className="min-w-0 flex-1 sm:hidden">
                {lines.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                    <p className="truncate text-[15px] font-extrabold text-white">{LKR(total)}</p>
                  </>
                )}
              </div>
              <button type="button"
                disabled={step === 'cats' ? !activeCats.size : !lines.length}
                onClick={() => go(step === 'cats' ? 'items' : step === 'items' ? 'cart' : 'details')}
                className="pressable ml-auto flex-1 rounded-xl bg-gradient-to-r from-accent to-volt py-3.5 text-[14.5px] font-extrabold text-white shadow-lg shadow-volt/20 disabled:opacity-40 sm:flex-none sm:px-10">
                {step === 'cart' ? t.step3 : '→'}
              </button>
            </>
          )}

          {step === 'details' && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">{t.total}</p>
                <p className="truncate text-[17px] font-extrabold text-white">{LKR(total)}</p>
              </div>
              <button type="submit" onClick={handleSubmit} disabled={pending}
                className="pressable flex-1 rounded-xl bg-gradient-to-r from-accent to-volt py-3.5 text-[14.5px] font-extrabold text-white shadow-lg shadow-volt/20 disabled:opacity-50 sm:flex-none sm:px-10">
                {pending ? t.submitting : t.submit}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StepHeading({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-volt text-[14px] font-extrabold text-white">{n}</span>
      <div>
        <h2 className="text-[16px] font-extrabold text-white">{title}</h2>
        {sub && <p className="text-[12px] text-white/40">{sub}</p>}
      </div>
    </div>
  );
}
