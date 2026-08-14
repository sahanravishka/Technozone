'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { SRI_LANKA_CITIES } from '@/lib/sri-lanka-cities';
import { submitFacebookOrder, type LeadLine } from './actions';
import { ORDER_FORM_DICT, type OrderFormLocale } from './dictionary';

type ModuleVariant = { id: string; name: string; price: number; inStock: boolean };
type Module = { id: string; name: string; brand: string | null; variants: ModuleVariant[] };
type SelectedLine = { key: string; productId: string; variantId: string; label: string; price: number; qty: number };

const LKR = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;

export default function OrderFormClient({ modules }: { modules: Module[] }) {
  const [lang, setLang] = useState<OrderFormLocale>('en');
  const t = ORDER_FORM_DICT[lang];

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [showProductList, setShowProductList] = useState(false);

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

  const cityBoxRef = useRef<HTMLDivElement>(null);
  const productBoxRef = useRef<HTMLDivElement>(null);

  const filteredCities = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (!q) return SRI_LANKA_CITIES.slice(0, 8);
    return SRI_LANKA_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 8);
  }, [city]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const list = q
      ? modules.filter(m => m.name.toLowerCase().includes(q) || m.brand?.toLowerCase().includes(q))
      : modules;
    return list.slice(0, 30);
  }, [productQuery, modules]);

  const total = lines.reduce((n, l) => n + l.price * l.qty, 0);

  function addLine(m: Module, v: ModuleVariant) {
    const key = v.id;
    setLines(prev => {
      if (prev.some(l => l.key === key)) return prev;
      const label = v.name && v.name !== 'Default' ? `${m.name} — ${v.name}` : m.name;
      return [...prev, { key, productId: m.id, variantId: v.id, label, price: v.price, qty: 1 }];
    });
    setProductQuery('');
    setShowProductList(false);
  }

  function updateQty(key: string, qty: number) {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, 99)) } : l)));
  }

  function removeLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!lines.length) e.lines = t.errItems;
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

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
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

  if (orderNumber) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#E8F7EE] text-3xl">✓</div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">{t.successTitle}</h1>
        <p className="mt-2 text-[14px] text-muted">{t.successBody(orderNumber)}</p>
        <p className="mt-6 text-[12.5px] text-muted">{t.successFooter}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-16 pt-6 sm:max-w-lg sm:px-6">
      <div className="mb-4 flex justify-center gap-1.5">
        {(['en', 'si', 'ta'] as OrderFormLocale[]).map(l => (
          <button key={l} type="button" onClick={() => setLang(l)}
            className={`pressable rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
              lang === l ? 'bg-ink text-white' : 'border border-line bg-card text-muted hover:bg-paper'
            }`}>
            {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
          </button>
        ))}
      </div>

      <header className="mb-6 text-center">
        <h1 className="text-[1.4rem] font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-[13px] text-muted">{t.subtitle}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* ---- Item picker ---- */}
        <section>
          <label className="mb-1.5 block text-[13px] font-bold">{t.itemsLabel}</label>
          <div className="relative" ref={productBoxRef}>
            <input
              type="text"
              value={productQuery}
              onFocus={() => setShowProductList(true)}
              onChange={e => { setProductQuery(e.target.value); setShowProductList(true); }}
              placeholder={t.itemsSearchPlaceholder}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt"
            />
            {showProductList && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProductList(false)} />
                <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-card shadow-lg">
                  {filteredProducts.length === 0 && (
                    <p className="p-3.5 text-[13px] text-muted">{t.itemsNoMatch}</p>
                  )}
                  {filteredProducts.map(m => (
                    <div key={m.id} className="border-b border-line/60 last:border-0">
                      <p className="px-3.5 pt-2.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">{m.name}</p>
                      {m.variants.map(v => (
                        <button
                          key={v.id} type="button" disabled={!v.inStock}
                          onClick={() => addLine(m, v)}
                          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-paper disabled:opacity-40">
                          <span>{v.name && v.name !== 'Default' ? v.name : t.standard}</span>
                          <span className="shrink-0 font-semibold">
                            {v.inStock ? LKR(v.price) : t.outOfStock}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          {errors.lines && <p className="mt-1 text-[12px] font-medium text-sale">{errors.lines}</p>}

          {/* Selected items */}
          {lines.length > 0 && (
            <ul className="mt-3 space-y-2">
              {lines.map(l => (
                <li key={l.key} className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{l.label}</p>
                    <p className="text-[12px] text-muted">{LKR(l.price)} {t.each}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-paper px-1 py-1">
                    <button type="button" onClick={() => updateQty(l.key, l.qty - 1)}
                      className="grid h-6 w-6 place-items-center rounded-md text-[13px] font-bold text-muted hover:bg-white/70">−</button>
                    <span className="w-5 text-center text-[12.5px] font-bold">{l.qty}</span>
                    <button type="button" onClick={() => updateQty(l.key, l.qty + 1)}
                      className="grid h-6 w-6 place-items-center rounded-md text-[13px] font-bold text-muted hover:bg-white/70">+</button>
                  </div>
                  <button type="button" onClick={() => removeLine(l.key)} aria-label="Remove"
                    className="shrink-0 px-1 text-[16px] leading-none text-muted hover:text-sale">✕</button>
                </li>
              ))}
              <li className="flex justify-between px-1 pt-1 text-[14px] font-extrabold">
                <span>{t.total}</span><span>{LKR(total)}</span>
              </li>
            </ul>
          )}
        </section>

        {/* ---- Contact details ---- */}
        <section className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold">{t.nameLabel}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
            {errors.name && <p className="mt-1 text-[12px] font-medium text-sale">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold">{t.addressLabel}</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              placeholder={t.addressPlaceholder}
              className="w-full resize-none rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
            {errors.address && <p className="mt-1 text-[12px] font-medium text-sale">{errors.address}</p>}
          </div>

          <div className="relative" ref={cityBoxRef}>
            <label className="mb-1.5 block text-[13px] font-bold">{t.cityLabel}</label>
            <input
              value={city}
              onFocus={() => setShowCityList(true)}
              onChange={e => { setCity(e.target.value); setShowCityList(true); }}
              placeholder={t.cityPlaceholder}
              className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
            {showCityList && filteredCities.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCityList(false)} />
                <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-card shadow-lg">
                  {filteredCities.map(c => (
                    <button key={c} type="button"
                      onClick={() => { setCity(c); setShowCityList(false); }}
                      className="block w-full px-3.5 py-2.5 text-left text-[13.5px] hover:bg-paper">
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {errors.city && <p className="mt-1 text-[12px] font-medium text-sale">{errors.city}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold">{t.phone1Label}</label>
              <input value={phone1} onChange={e => setPhone1(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel"
                className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
              {errors.phone1 && <p className="mt-1 text-[12px] font-medium text-sale">{errors.phone1}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold">{t.phone2Label}</label>
              <input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder={t.phone2Optional} inputMode="tel"
                className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
              {errors.phone2 && <p className="mt-1 text-[12px] font-medium text-sale">{errors.phone2}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold">{t.noteLabel}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder={t.notePlaceholder}
              className="w-full resize-none rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] outline-none focus:border-volt" />
          </div>
        </section>

        {submitError && (
          <p className="rounded-xl bg-sale/10 px-3.5 py-2.5 text-[13px] font-medium text-sale">{submitError}</p>
        )}

        <button type="submit" disabled={pending}
          className="pressable w-full rounded-xl bg-ink py-3.5 text-[14.5px] font-bold text-white disabled:opacity-50">
          {pending ? t.submitting : t.submit}
        </button>
      </form>
    </main>
  );
}
