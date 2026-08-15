'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { SRI_LANKA_CITIES } from '@/lib/sri-lanka-cities';
import { submitFacebookOrder, type LeadLine } from './actions';
import { ORDER_FORM_DICT, type OrderFormLocale } from './dictionary';

type ModuleVariant = { id: string; name: string; price: number; inStock: boolean };
type Module = { id: string; name: string; brand: string | null; categoryId: string | null; image: string | null; variants: ModuleVariant[] };
type CategoryTile = { id: string; name: string; slug: string; icon: string; photo: string | null; count: number };
type SelectedLine = { key: string; productId: string; variantId: string; label: string; image: string | null; price: number; qty: number };

const LKR = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;
const STEPS = ['lang', 'shop', 'details'] as const;
type Step = typeof STEPS[number];

export default function OrderFormClient({ modules, categories }: { modules: Module[]; categories: CategoryTile[] }) {
  const [lang, setLang] = useState<OrderFormLocale>('en');
  const t = ORDER_FORM_DICT[lang];
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // This page is always cream/light regardless of the visitor's saved site theme.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');
    return () => { prev ? html.setAttribute('data-theme', prev) : html.removeAttribute('data-theme'); };
  }, []);

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

  const go = (s: Step) => { setStep(s); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); };

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

  // ── Cream / warm-white palette ──
  const CREAM = 'bg-[#FBF8F3]';
  const INK = 'text-[#1C1A17]';
  const LINE = 'border-[#E5DFD4]';
  // Dark, high-contrast answer fields so they're unmistakable against the cream page.
  const inputCls = `w-full rounded-xl border-2 ${LINE} bg-[#2B2825] px-4 py-4 text-[16px] font-medium text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#1C1A17]`;
  const labelCls = `mb-2 block text-[18px] font-extrabold tracking-tight ${INK}`;

  if (orderNumber) {
    return (
      <main className={`grid min-h-screen place-items-center ${CREAM} px-6 text-center`}>
        <div>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#1C1A17] text-3xl text-[#FBF8F3]">✓</div>
          <h1 className={`mt-5 text-2xl font-extrabold tracking-tight ${INK}`}>{t.successTitle}</h1>
          <p className="mt-2 max-w-xs text-[15px] text-[#6B645B]">{t.successBody(orderNumber)}</p>
          <p className="mt-6 text-[13px] font-bold text-[#A29A8E]">{t.successFooter}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${CREAM} ${INK} pb-32`}>
      {/* ══════ STEP 0: LANGUAGE ══════ */}
      {step === 'lang' && (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#A29A8E]">Techno Zone Lanka</p>
          <h1 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-tight">Choose your language</h1>
          <p className="mt-2 text-[15px] text-[#6B645B]">භාෂාව තෝරන්න · மொழியைத் தேர்ந்தெடுக்கவும்</p>

          <div className="mt-10 w-full space-y-3">
            {([
              { key: 'en' as const, label: 'English' },
              { key: 'si' as const, label: 'සිංහල' },
              { key: 'ta' as const, label: 'தமிழ்' },
            ]).map(l => (
              <button key={l.key} type="button"
                onClick={() => { setLang(l.key); go('shop'); }}
                className={`flex w-full items-center justify-between rounded-2xl border-2 ${LINE} bg-white px-6 py-5 text-left transition-all hover:border-[#1C1A17] hover:shadow-sm`}>
                <span className="text-[20px] font-extrabold tracking-tight">{l.label}</span>
                <span className="text-[20px] text-[#C4BCB0]">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════ STEP 1: SHOP (categories + products on one page) ══════ */}
      {step === 'shop' && (
        <>
          {/* Sticky category strip at the top */}
          <div className={`sticky top-0 z-30 border-b-2 ${LINE} ${CREAM}/95 backdrop-blur`}>
            <div className="mx-auto max-w-2xl px-4 pb-3 pt-4 sm:px-6">
              <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-wide text-[#A29A8E]">{t.step1}</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map(c => {
                  const on = activeCats.has(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                      className={`relative shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                        on ? 'border-[#1C1A17] shadow-md' : `${LINE} opacity-70`
                      }`}
                      style={{ width: 108 }}>
                      <div className="relative h-[76px] w-full bg-white">
                        {c.photo ? (
                          <Image src={c.photo} alt={c.name} fill sizes="108px"
                            className={`object-cover transition-all duration-300 ${on ? '' : 'grayscale'}`} />
                        ) : (
                          <div className={`grid h-full place-items-center text-3xl ${on ? '' : 'grayscale'}`}>{c.icon}</div>
                        )}
                        {on && (
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#1C1A17] text-[10px] font-bold text-white">✓</span>
                        )}
                      </div>
                      <p className={`px-1.5 py-1.5 text-center text-[11px] font-bold leading-tight ${on ? INK : 'text-[#8C857B]'}`}>
                        {c.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Products below */}
          <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
            {!activeCats.size ? (
              <div className="grid place-items-center py-20 text-center">
                <p className="text-[40px]">👆</p>
                <p className="mt-3 max-w-[14rem] text-[15px] font-semibold text-[#8C857B]">{t.pickCategoryFirst}</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#A29A8E]">{t.step2}</h2>
                  <p className="text-[12px] font-medium text-[#A29A8E]">{t.step2Sub}</p>
                </div>
                <input
                  type="text" value={productQuery} onChange={e => setProductQuery(e.target.value)}
                  placeholder={t.itemsSearchPlaceholder}
                  className={`mb-4 w-full rounded-xl border-2 ${LINE} bg-white px-4 py-3 text-[15px] ${INK} placeholder:text-[#B5ADA1] outline-none focus:border-[#1C1A17]`}
                />

                {visibleProducts.length === 0 ? (
                  <p className={`rounded-2xl border-2 border-dashed ${LINE} px-4 py-10 text-center text-[14px] font-medium text-[#A29A8E]`}>
                    {t.itemsNoMatch}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {visibleProducts.map(m => m.variants.map(v => {
                      const selected = isSelected(v.id);
                      const vLabel = v.name && v.name !== 'Default' ? v.name : t.standard;
                      return (
                        <button key={v.id} type="button" onClick={() => toggleLine(m, v)} disabled={!v.inStock}
                          className={`relative overflow-hidden rounded-2xl border-2 bg-white text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            selected ? 'border-[#1C1A17] shadow-md' : `${LINE}`
                          }`}>
                          <div className="relative aspect-square w-full bg-[#F4F0E9]">
                            {m.image ? (
                              <Image src={m.image} alt={m.name} fill sizes="200px"
                                className={`object-cover transition-all duration-300 ${selected ? '' : 'grayscale'}`} />
                            ) : (
                              <div className={`grid h-full w-full place-items-center text-[#C4BCB0] ${selected ? '' : 'grayscale'}`}>
                                <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
                                  <path d="m3 16 5-4 4 3 3-2 6 5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                            {selected && (
                              <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#1C1A17] text-[13px] font-bold text-white shadow">✓</span>
                            )}
                            {!v.inStock && (
                              <span className="absolute inset-x-0 bottom-0 bg-[#1C1A17]/80 py-1.5 text-center text-[10.5px] font-bold text-white">{t.outOfStock}</span>
                            )}
                          </div>
                          <div className="p-3">
                            <p className={`line-clamp-2 text-[13px] font-bold leading-snug ${selected ? INK : 'text-[#6B645B]'}`}>{m.name}</p>
                            {vLabel !== t.standard && <p className="mt-0.5 text-[11px] text-[#A29A8E]">{vLabel}</p>}
                            <p className={`mt-1.5 text-[15px] font-extrabold ${selected ? INK : 'text-[#8C857B]'}`}>{LKR(v.price)}</p>
                          </div>
                        </button>
                      );
                    }))}
                  </div>
                )}
              </>
            )}

            {/* Selected items summary, right on the same page */}
            {lines.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-[#A29A8E]">{t.selectedLabel}</h2>
                <ul className="space-y-2.5">
                  {lines.map(l => (
                    <li key={l.key} className={`flex items-center gap-3 rounded-2xl border-2 ${LINE} bg-white px-3 py-3`}>
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F4F0E9]">
                        {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{l.label}</p>
                        <p className="text-[12.5px] font-medium text-[#8C857B]">{LKR(l.price)} {t.each}</p>
                      </div>
                      <div className={`flex shrink-0 items-center gap-0.5 rounded-xl border-2 ${LINE} px-1 py-1`}>
                        <button type="button" onClick={() => updateQty(l.key, l.qty - 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[17px] font-bold text-[#6B645B] hover:bg-[#F4F0E9]">−</button>
                        <span className="w-6 text-center text-[14px] font-extrabold">{l.qty}</span>
                        <button type="button" onClick={() => updateQty(l.key, l.qty + 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[17px] font-bold text-[#6B645B] hover:bg-[#F4F0E9]">+</button>
                      </div>
                      <button type="button" onClick={() => removeLine(l.key)} aria-label="Remove"
                        className="shrink-0 px-1 text-[18px] leading-none text-[#C4BCB0] hover:text-[#D14343]">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════ STEP 2: DETAILS ══════ */}
      {step === 'details' && (
        <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-md px-4 pt-8 sm:px-6">
          <h1 className="mb-1 text-[1.7rem] font-extrabold tracking-tight">{t.step3}</h1>
          <p className="mb-7 text-[14px] text-[#8C857B]">{t.subtitle}</p>

          <div className="space-y-6">
            <div>
              <label className={labelCls}>{t.nameLabel}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} className={inputCls} />
              {errors.name && <p className="mt-1.5 text-[13px] font-bold text-[#D14343]">{errors.name}</p>}
            </div>

            <div>
              <label className={labelCls}>{t.addressLabel}</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                placeholder={t.addressPlaceholder} className={`${inputCls} resize-none`} />
              {errors.address && <p className="mt-1.5 text-[13px] font-bold text-[#D14343]">{errors.address}</p>}
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
                  <div className={`absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border-2 ${LINE} bg-white shadow-lg`}>
                    {filteredCities.map(c => (
                      <button key={c} type="button"
                        onClick={() => { setCity(c); setShowCityList(false); }}
                        className="block w-full border-b border-[#F0EBE2] px-4 py-3 text-left text-[15px] font-medium last:border-0 hover:bg-[#FBF8F3]">
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {errors.city && <p className="mt-1.5 text-[13px] font-bold text-[#D14343]">{errors.city}</p>}
            </div>

            <div>
              <label className={labelCls}>{t.phone1Label}</label>
              <input value={phone1} onChange={e => setPhone1(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" className={inputCls} />
              {errors.phone1 && <p className="mt-1.5 text-[13px] font-bold text-[#D14343]">{errors.phone1}</p>}
            </div>

            <div>
              <label className={labelCls}>{t.phone2Label}</label>
              <input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder={t.phone2Optional} inputMode="tel" className={inputCls} />
              {errors.phone2 && <p className="mt-1.5 text-[13px] font-bold text-[#D14343]">{errors.phone2}</p>}
            </div>

            <div>
              <label className={labelCls}>{t.noteLabel}</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder={t.notePlaceholder} className={`${inputCls} resize-none`} />
            </div>
          </div>

          {submitError && (
            <p className="mt-5 rounded-xl bg-[#D14343]/10 px-4 py-3 text-[14px] font-bold text-[#D14343]">{submitError}</p>
          )}
        </form>
      )}

      {/* ══════ Sticky bottom bar ══════ */}
      {step !== 'lang' && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t-2 ${LINE} bg-white/95 px-4 py-3 backdrop-blur sm:px-6`}>
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            {step === 'details' && (
              <button type="button" onClick={() => go('shop')}
                className={`rounded-xl border-2 ${LINE} px-5 py-4 text-[16px] font-extrabold text-[#6B645B] hover:bg-[#FBF8F3]`}>
                ←
              </button>
            )}

            <div className="min-w-0 flex-1">
              {lines.length > 0 ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#A29A8E]">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </p>
                  <p className="truncate text-[19px] font-extrabold leading-tight">{LKR(total)}</p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-[#A29A8E]">{t.errItems}</p>
              )}
            </div>

            <button
              type={step === 'details' ? 'submit' : 'button'}
              disabled={step === 'details' ? pending : !lines.length}
              onClick={step === 'details' ? handleSubmit : () => go('details')}
              className="shrink-0 rounded-xl bg-[#1C1A17] px-8 py-4 text-[16px] font-extrabold text-white transition-opacity disabled:opacity-25">
              {step === 'details' ? (pending ? t.submitting : t.submit) : '→'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
