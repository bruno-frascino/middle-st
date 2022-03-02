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
  code_sku: string; //                id ?
  barcode: string; //                 ean
  prices: Price; //                   price && cost_price
  stock: number; //                   stock
  status: string; //                  "INACTIVE" | ACTIVE  // available
  unity_type: string; //              SM
  unity_quantity: number; //          SM
  extra_days_to_delivery: number; //  SM
  dimensions: Dimension; //           weight, length, width, height
  variants: Variant[];
}
export interface Product {
  id: number;
  title: string;
  publish: boolean;
  categories: number[];
  attributes: number[]; // TODO - check type here?
  description: string;
  brand_id: number;
  model: string;
  reference_code: string;
  condition: string; // Novo | Usado
  min_wholesale_quantity: number;
  url_video: string;
  shipping: Shipping;
  seo: Seo;
  google_shopping: GoogleShopping;
  skus: Sku[];
}

export enum Condition {
  NOVO = 'Novo',
  USADO = 'Usado',
}

// export interface ProductResponse SmReponse<Product>;

export interface SmResponse<T> {
  data: T;
}
