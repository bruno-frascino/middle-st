// Example:
// {
//   "seller_id"=>391250,
//   "scope_id"=>4375797,
//   "scope_name"=>"order",
//   "act"=>"update",
//   "app_code"=>"718",
//   "url_notification"=>"https://suaurldenotificacao"
// }

// ESCOPO Notificacao
// Tipos 	            Descrição
// product	          N de produto.
// product_price	    N de preço de produto.
// product_stock	    N de estoque de produto.
// variant	          N de variação do produto.
// variant_price	    N de preço da variação.
// variant_stock	    N de estoque da variação.
// order	            N de pedido.
// customer	          N de cliente.

export enum Scope {
  PRODUCT = 'product',
  PRODUCT_PRICE = 'product_price',
  PRODUCT_STOCK = 'product_stock',
  VARIANT = 'variant',
  VARIANT_PRICE = 'variant_price',
  VARIANT_STOCK = 'variant_stock',
  ORDER = 'order',
  CUSTOMER = 'customer',
}

export enum Act {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
}

export interface Notification {
  seller_id: number;
  scope_id: number; // Código do escopo da notificação
  scope_name: string; // Nome do escopo notificado.
  act: string; // TODO - Enum // insert | update | delete
}

// TODO - Identify which ones are optional
export function isNotification(object: any) {
  return !!(object.seller_id && object.scope_id && object.scope_name && object.act && validAction(object.act));
}

export interface TrayKey {
  sellerId: number;
  scopeId: number;
  appCode: string;
}

function validAction(act: string) {
  return act === Act.INSERT || act === Act.UPDATE || act === Act.DELETE;
}

export interface TrayToken {
  code: number; // http code: 200
  message: string;
  access_token: string;
  refresh_token: string;
  date_expiration_access_token: string; // '2021-03-02 14:58:21';
  date_expiration_refresh_token: string; // '2021-04-01 11:58:21';
  date_activated: string; // '2021-03-02 11:58:21';
  api_host: string; // 'https://urldaloja.com.br/web_api';
  store_id: number;
}

export interface Product {
  Product: {
    id: number;
    ean: string;
    modified: string; // 2019-01-21 09:22:21
    slug: string; // produto-teste
    ncm: string;
    name: string;
    title: string;
    description: string;
    description_small: string;
    price: number;
    cost_price: number;
    promotional_price: number;
    start_promotion: string;
    end_promotion: string;
    brand: string;
    model: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    cubic_weight: number;
    stock: number;
    category_id: number; // Código da categoria principal do produto
    available: number; // produto disponivel - Tabela A
    availability: string; // disponibilidade do produto - "Disponível em 3 dia útil"
    reference: string;
    hot: number; // produto em destaque - tabela E
    release: number; // produto lancamento - tabela D
    additional_button: number; // botao adicional do produto
    has_variation: number; // Tabela F
    has_acceptance_terms: number; // Produto com termo de aceitação (Veja Tabela G)
    has_buy_together: number; // Produto com compre junto (Veja Tabela H)
    additional_message: string;
    warranty: string;
    rating: number;
    count_rating: number; // Valor da classificação do produto
    quantity_sold: number;
    ProductImage: Image[];
    image: number; // produto com imagem
    url: UrlType;
    created: string;
    Properties: Properties;
    payment_option: string; // "R$ 9,70 à vista com desconto Boleto - Yapay",
    related_categories: number[]; // Categorias adicionais do produto
    release_date: string;
    shortcut: string; // atalho do produto
    virtual_product: number; // tabela I
    minimum_stock: number;
    minimum_stock_alert: number;
    promotion_id: number;
    included_items: string; // informacao adicional 2
    related_products: number[]; // produtos relacionados
    free_shipping: number; // Produto com frete grátis (Veja Tabela C)
    current_price: number;
    ipi: number;
    acceptance_term_option: number; // Opção do termo de aceitação do produto
    acceptance_term: number;
    warranty_days: number;
    availability_days: number;
    metatag: TypeContent[];
    Variant: number[]; // TODO Confirm this
    is_kit: number; // 0 | 1
    activation_date: string;
    deactivation_date: string;
    dollar_cost_price: number;
    brand_id: number; // codigo da marca
    category_name: string;
    payment_options_details: PaymentDetails[];
    //   [
    //     {
    //         "display_name": "Boleto - Yapay",
    //         "type": "bank_billet",
    //         "plots": "1",
    //         "value": "9.70",
    //         "tax": "0.00"
    //     }
    // ],
    video: string;
    percentage_discount: number;
    upon_request: number; // 0 | 1
    available_for_purchase: number; // 0 | 1
    all_categories: number[];
    // TODO - check this type - no pattern
    AdditionalInfos: [{ [key: string]: [key: string] }];
  };
}

interface Image {
  http: string;
  https: string;
  thumbs: Thumbs;
}

interface Thumbs {
  '30': UrlType;
  '90': UrlType;
  '180': UrlType;
}
interface UrlType {
  http: string;
  https: string;
}

// TODO - Understand this type better
interface Properties {
  [key: string]: [key: string];
}
// Example:
// "Properties": {
//   "Teste Caracteristica": [
//       "PP"
//   ]
// },

interface TypeContent {
  type: string;
  content: string;
}

export interface Variant {
  Variant: {
    id: number; //            code_sky
    ean: string; //           barcode
    order: string; //         Tray
    product_id: number; //    Tray
    price: number; //         PriceDetail.sale
    cost_price: number; //    PriceDetail.regular
    stock: number; //         stock
    minimum_stock: number; // Tray
    available: number; //     status
    reference: string; //     Tray
    weight: number; //        Dimension.weight
    cubic_weight: number; //  Tray
    length: number; //        Dimension.length
    width: number; //         Dimension.width
    height: number; //        Dimension.height
    // '2019-01-01';
    start_promotion: Date; //                    Tray
    // '2019-01-10';
    end_promotion: Date; //                      Tray
    promotional_price: number; //                Tray
    payment_option: string; //                   Tray
    payment_option_details: PaymentDetails[]; // Tray
    illustrative_image: string; //               Tray
    Sku: TypeValueImage[]; // TODO Confirm these
    // quantity_sold: '10';
    // color_id_1: '23';
    // color_id_2: '0';
    VariantImage: Image[]; // Gallery?
  };
}
interface TypeValueImage {
  type: string;
  value: string;
  image: string;
  image_secure: string;
}
interface PaymentDetails {
  display_name: string;
  type: string;
  plots: number;
  value: number;
  tax: number;
}
