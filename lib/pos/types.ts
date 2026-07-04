// POS API response types — the subset the website consumes.
// Source of truth is the TZL POS backend (Mongo/Express). Field names mirror
// what /api/products/public, /api/categories, /api/orders etc. return.

export type MongoDecimal = number | string | { $numberDecimal: string };

export type PosSpecification = { key: string; value: string };

export type PosVariation = {
  _id?: string;
  color?: string;
  colorHex?: string;
  availableQty?: number;
  sellingPrice?: MongoDecimal;
  images?: string[];
};

export type PosProduct = {
  _id: string;
  name: string;
  categoryID?: string | { _id: string; name?: string };
  category?: { _id: string; name?: string };
  mainCategory?: string;
  barcode?: string;
  brand?: string;
  description?: string;
  specifications?: PosSpecification[];
  unit?: string;
  MRP?: MongoDecimal;
  sellingPrice?: MongoDecimal;
  wholesalePrice?: MongoDecimal;
  costPrice?: MongoDecimal;
  stockQty?: number;
  totalStock?: number;
  hasStock?: boolean;
  reorderLevel?: number;
  isWeightBased?: boolean;
  weight?: MongoDecimal;
  warrantyPeriodValue?: number;
  warrantyPeriodUnit?: 'days' | 'months' | 'years' | string;
  Site_vissible?: boolean;
  status?: string;
  image?: string;
  variations?: PosVariation[];
  colors?: string[];
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type PosCategory = {
  _id: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  image?: string;
  isActive?: boolean;
};

// POS list endpoints wrap data in various envelopes; normalize in the client.
export type PosEnvelope<T> = {
  success?: boolean;
  data?: T;
  products?: T;
  categories?: T;
  total?: number;
  message?: string;
};
