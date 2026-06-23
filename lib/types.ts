export type Variant = {
  id: string; sku: string; name: string;
  attributes: Record<string, string>;
  price: number; stock_qty: number; reserved_qty: number;
  is_default: boolean; is_active: boolean;
};

export type ProductImage = { id: string; storage_path: string; alt: string | null; sort_order: number };

export type Product = {
  id: string; slug: string; name: string; brand: string | null;
  description: string | null; specs: Record<string, string>;
  base_price: number; category_id: string | null;
  warranty_months?: number;
  product_variants: Variant[];
  product_images: ProductImage[];
  product_translations?: { locale: string; name: string; description: string | null }[];
  rating_avg?: number;
  rating_count?: number;
};

export type Category = { id: string; slug: string; name: string; sort_order: number };
export type Discount = {
  id: string; scope: 'product' | 'category' | 'all';
  product_id: string | null; category_id: string | null;
  type: 'percentage' | 'fixed'; value: number;
};
export type DeliveryZone = { id: string; name: string; fee: number };

/** Resolved, display-ready pricing for a product (cheapest active variant). */
export type Pricing = { price: number; compareAt: number | null; variantId: string; sku: string; stock: number };

export type Review = {
  id: string; product_id: string; author_name: string;
  rating: number; title: string | null; body: string | null;
  is_verified: boolean; by_staff: boolean; status: 'published' | 'pending' | 'hidden';
  created_at: string;
};

export type ServiceType = {
  id: string; name: string; base_price: number | null; est_days: number | null;
  is_active: boolean; sort_order: number;
};

export type ServiceStatus =
  'received' | 'diagnosing' | 'awaiting_approval' | 'repairing' | 'ready' | 'collected' | 'cancelled';

export type ServiceJob = {
  id: string; job_number: string; contact_id: string | null;
  customer_name: string; customer_phone: string;
  device_brand: string | null; device_model: string | null;
  service_type_id: string | null; service_category: string | null;
  issue: string | null; status: ServiceStatus;
  estimate: number | null; final_price: number | null;
  intake_notes: string | null; created_at: string; updated_at: string;
};

export type Contact = {
  id: string; customer_id: string | null; full_name: string | null;
  phone_norm: string | null; phone_display: string | null; email: string | null;
  city: string | null; address: string | null;
  orders_count: number; lifetime_value: number; last_order_at: string | null;
  created_at: string;
};

export type LoyaltyTier = 'new' | 'regular' | 'gold' | 'vip';

export type Warranty = {
  product_name: string; serial_no: string; purchase_date: string;
  expires_at: string; status: string; active: boolean;
};
export type Courier = { id: string; name: string; code: string; track_url_template: string | null; is_active: boolean; sort_order: number };
export type ShipmentStatus = 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned' | 'failed';
export type RmaStatus = 'requested' | 'approved' | 'received' | 'refunded' | 'rejected';
