import type { Discount, Product } from '@/lib/types';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { priceProduct } from '@/lib/pricing';
import ProductCard from './ProductCard';
import Reveal from './Reveal';

export default function ProductGrid({ products, discounts, locale, dict }:
  { products: Product[]; discounts: Discount[]; locale: Locale; dict: Dict }) {
  // Auto-sort: push out-of-stock products to the end
  const sorted = [...products].sort((a, b) => {
    const stockA = priceProduct(a, discounts).stock;
    const stockB = priceProduct(b, discounts).stock;
    if (stockA > 0 && stockB <= 0) return -1;
    if (stockA <= 0 && stockB > 0) return 1;
    return 0;
  });

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {sorted.map((p, i) => (
        <Reveal key={p.id} delay={(i % 4) * 60}>
          <ProductCard product={p} discounts={discounts} locale={locale} dict={dict} priority={i < 4} />
        </Reveal>
      ))}
    </div>
  );
}
