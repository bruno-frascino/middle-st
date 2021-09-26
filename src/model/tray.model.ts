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
    object.app_code &&
    object.url_notification
  );
}

export type TrayKey = {
  sellerId: number;
  appCode: string;
};
