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
  app_code: string; // unico por loja, usado para acessar a api
  url_notification: string;
}

// TODO - Identify which ones are optional
export function isNotification(object: any) {
  return !!(
    object.seller_id &&
    object.scope_id &&
    object.scope_name &&
    object.act &&
    validAction(object.act) &&
    object.app_code &&
    object.url_notification
  );
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
