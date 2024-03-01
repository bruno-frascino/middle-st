export interface SmToken {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface Shipping {
  free: boolean;
  enabled: boolean;
}

export interface Seo {
  title: string;
  description: string;
  keywords: string;
}

export interface GoogleShopping {
  enable: boolean;
  mpn: string;
  age_group: string; // infant
  gender: string; // male
  google_product_category: string;
}

export interface Dimension {
  weight: number; // same
  height: number; // same
  width: number; // same
  length: number; // same
}

export interface PriceDetail {
  regular: number; // price
  sale: number; // cost_price
}
export interface Price {
  retail: PriceDetail;
  wholesale?: PriceDetail;
}

export interface Variant {
  id: number;
  name: string; // "Tamanho",
  value: string; // "M"
}
export interface Sku {
  id?: number;
  stock: number; //                   stock
  barcode: string; //                 ean
  code_sku: string; //                id ?
  status: string; //                  "INACTIVE" | ACTIVE  // available
  unity_type: string; //              SM
  unity_quantity: number; //          SM
  extra_days_to_delivery: number; //  SM
  dimensions: Dimension; //           weight, length, width, height
  prices: Price; //                   price && cost_price
  variants: Variant[];
}
export interface Product {
  id: number;
  title: string;
  publish: boolean;
  active: boolean;
  slug: string;
  old_url: string;
  block?: string;
  categories: number[];
  attributes: number[]; // TODO - check type here?
  description: string;
  brand_id: number;
  model: string;
  reference_code: string;
  condition: string; // Novo | Usado
  supports_seller_contact: boolean;
  wholesale?: Wholesale; // no related field in Tray
  url_video?: string; //
  shipping: Shipping;
  seo: Seo;
  google_shopping?: GoogleShopping;
  gallery: Gallery;
  skus: Sku[];
  created_at: string;
}

export interface BrandResponse {
  data: Brand[];
  meta: Pagination;
}

interface Pagination {
  pagination: {
    total: number;
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    links: Link;
  }
}

interface Link {
  next: string;
}

export interface CategoryResponse {
  data: Category[];
  meta: Pagination;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

export function isSmBrand(object: any) {
  return !!(object.id && object.name && object.slug);
}

export interface Gallery {
  video: string;
  images: Image[];
}

interface Image {
  url: string;
  sequence: number;
}
interface Wholesale {
  minimum_quantity: number;
}

export interface Category {
  id: number;
  parent_id: number;
  referenceCode: string;
  name: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_h1: string;
  description: string;
  image_url: string;
  active: boolean;
}

export function isSmCategory(object: any) {
  return !!(object.id && object.name && object.slug && typeof object.active === 'boolean');
}

export enum Condition {
  NOVO = 'Novo',
  USADO = 'Usado',
}

// export interface ProductResponse SmReponse<Product>;

export interface SmResponse<T> {
  data: T;
}
