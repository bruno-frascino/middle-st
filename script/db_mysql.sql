-- Create Tables
-- S and T Integration Details
CREATE TABLE Integration(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, 
  sellerName VARCHAR(60),
  sellerSId INT UNSIGNED, 
  sellerSKey VARCHAR(255), 
  sellerSSecret VARCHAR(255),
  sellerSAccessToken VARCHAR(600),
  sellerSRefreshToken VARCHAR(600),
  sellerSAccessExpirationDate SMALLINT UNSIGNED,  -- unix time
  sellerSRefreshExpirationDate SMALLINT UNSIGNED,
  -- sellerTId INT UNSIGNED UNIQUE NOT NULL, 
  sellerTStoreCode VARCHAR(30) UNIQUE NOT NULL,
  sellerTStoreAccessCode VARCHAR(30),
  sellerTStoreAdminUser VARCHAR(30),
  sellerTStoreUrl VARCHAR(60),
  sellerTAccessToken VARCHAR(600),
  sellerTRefreshToken VARCHAR(600),
  sellerTAccessExpirationDate DATETIME,  -- YYYY-MM-DD hh:mm:ss
  sellerTRefreshExpirationDate DATETIME, -- YYYY-MM-DD hh:mm:ss
  createDate DATETIME NOT NULL,
  active BOOLEAN NOT NULL
);

-- T Notification
CREATE TABLE Notification(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, 
  scopeName VARCHAR(25) NOT NULL,
  act VARCHAR(15) NOT NULL,
  scopeId INT UNSIGNED NOT NULL,
  sellerId INT UNSIGNED NOT NULL,
  appCode VARCHAR(350) NOT NULL,   
  storeUrl VARCHAR(200) NOT NULL,
  integrationId INT UNSIGNED NOT NULL,
  createDate DATETIME NOT NULL,
  complete BOOLEAN NOT NULL,
  FOREIGN KEY (integrationId)
      REFERENCES Integration(id)
      ON DELETE CASCADE
);
--  -- Middleware T Credentials
-- CREATE TABLE T_CREDENTIALS(
--   id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, 
--   'key' text NOT NULL,
--   secret text NOT NULL
-- );

-- Integration x T Product x S Product
CREATE TABLE IProduct(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, 
  integrationId INT UNSIGNED NOT NULL,
  tProductId INT UNSIGNED UNIQUE NOT NULL,
  sProductId INT UNSIGNED UNIQUE NOT NULL,
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  state CHAR(1) NOT NULL, -- [C,U,D] CREATED, UPDATED, DELETED
  FOREIGN KEY(integrationId) 
    REFERENCES Integration(id)
    ON DELETE CASCADE
);

-- I Product(S Product x T Product) x S Sku x T Variant
CREATE TABLE IProduct_SKU(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  iProductId INT UNSIGNED NOT NULL,
  sSkuId VARCHAR(25) UNIQUE NOT NULL,
  tVariantId SMALLINT UNSIGNED UNIQUE NOT NULL,
  tStock INT UNSIGNED NOT NULL,
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  state CHAR(1) NOT NULL, -- [C,U,D] CREATED, UPDATED, DELETED
  FOREIGN KEY(iProductId) 
    REFERENCES IPRODUCT(id) 
    ON DELETE CASCADE
);

-- Load
INSERT INTO INTEGRATION(
  id,
  sellerName, 
  sellerSId, 
  sellerSKey, 
  sellerSSecret, 
  -- sellerSStoreCode, 
  -- sellerSStoreUrl,
  -- sellerSAccessToken,
  -- sellerSRefreshToken,
  -- sellerSAccessExpirationDate,
  -- sellerSRefreshExpirationDate,
  sellerTId, 
  -- sellerTKey, 
  -- sellerTSecret, 
  sellerTStoreCode, 
  sellerTStoreUrl,
  -- sellerTAccessToken,
  -- sellerTRefreshToken,
  -- sellerTAccessExpirationDate,
  -- sellerTRefreshExpirationDate,
  active
) 
VALUES(
  1,
  'Loja Test 1',
  1,
  'Iki7Q2W3xS7UZw0kNHvsGnmMpAE0tZ35',
  'uvL0Ksh2TKgFJKdKiXdVGiUuD0IRwsam',
  1, 
  '1225878',
  'Tray Url 1',
  1
  );

INSERT INTO NOTIFICATION VALUES(null, 'scope', 'act', 99, strftime('%s','now'));


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
DROP TABLE T_CREDENTIALS;

