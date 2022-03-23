-- To run: 
-- sqlite3 <db_name>

-- Create Tables
-- S and T Integration Details
CREATE TABLE INTEGRATION(
  id integer NOT NULL PRIMARY KEY, 
  sellerName text, 
  sellerSId integer UNIQUE NOT NULL, 
  sellerSKey text, 
  sellerSSecret text, 
  sellerSStoreCode text, 
  sellerSStoreUrl text,
  sellerSAccessToken text,
  sellerSRefreshToken text,
  sellerSAccessExpirationDate integer,
  sellerSRefreshExpirationDate integer,
  sellerTId integer UNIQUE NOT NULL, 
  sellerTKey text, 
  sellerTSecret text, 
  sellerTStoreCode text, 
  sellerTStoreUrl text,
  sellerTAccessToken text,
  sellerTRefreshToken text,
  sellerTAccessExpirationDate integer,
  sellerTRefreshExpirationDate integer,
  active BOOLEAN NOT NULL CHECK (active IN (0, 1))
);

-- T Notification
CREATE TABLE NOTIFICATION(
  id integer NOT NULL PRIMARY KEY, 
  scopeName text NOT NULL,
  act text NOT NULL,
  scopeId integer NOT NULL,
  sellerId integer NOT NULL,
  appCode text NOT NULL,
  storeUrl text NOT NULL,
  integrationId integer NOT NULL,
  createDate integer NOT NULL,
  complete BOOLEAN NOT NULL CHECK (complete IN (0,1))
);
 -- Middleware T Credentials
CREATE TABLE T_DETAILS(
  id integer NOT NULL PRIMARY KEY, 
  'key' text NOT NULL,
  secret text NOT NULL
);

-- Integration x T Product x S Product
CREATE TABLE IPRODUCT(
  id integer NOT NULL PRIMARY KEY, 
  integrationId integer NOT NULL,
  tProductId integer UNIQUE NOT NULL,
  sProductId integer UNIQUE NOT NULL,
  createDate integer NOT NULL,
  updateDate integer, 
  state text NOT NULL, -- [C,U,D] CREATED, UPDATED, DELETED
  FOREIGN KEY(integrationId) REFERENCES INTEGRATION(id)
);

-- I Product(S Product x T Product) x S Sku x T Variant
CREATE TABLE IPRODUCT_SKU(
  id integer NOT NULL PRIMARY KEY,
  iProductId integer NOT NULL,
  sSkuId text UNIQUE NOT NULL,
  tVariantId integer UNIQUE NOT NULL,
  tStock integer NOT NULL,
  createDate integer NOT NULL,
  updateDate integer, 
  state text NOT NULL, -- [C,U,D] CREATED, UPDATED, DELETED
  FOREIGN KEY(iProductId) REFERENCES IPRODUCT(id)
);

-- Load
INSERT INTO INTEGRATION VALUES(
  1, 
  'SellerTest', 
  1, 
  'Skey1', 'Ssecret1', 'Scode1', 
  1, 
  'Tkey1', 'Tsecret1', 'Tcode1',
  1);

INSERT INTO NOTIFICATION VALUES(null, 'scope', 'act', 99, strftime('%s','now'));
INSERT INTO T_DETAILS VALUES(
  null, 
  'tKey1', 
  'tSecret1'
);

SELECT datetime(d1,'unixepoch')
FROM datetime_int;

-- Read
-- SELECT * FROM SM_USER WHERE id=1;
SELECT * FROM INTEGRATION;

-- Update Table definition
ALTER TABLE sharks ADD COLUMN age integer;

-- Update Values in a table
UPDATE SM_USER SET key = 'NEW KEY' WHERE id = 1;

-- Delete Values
DELETE FROM SM_USER WHERE id = 1;

-- Delete Table
DROP TABLE SM_USER;
DROP TABLE INTEGRATION;

