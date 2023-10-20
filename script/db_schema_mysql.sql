DROP TABLE Notification;
DROP TABLE IProduct_SKU;
DROP TABLE IProduct;
DROP TABLE Integration;

-- Create Tables
-- S and T Integration Details
CREATE TABLE Integration(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, 
  sellerName VARCHAR(60), 
  sellerSKey VARCHAR(255), 
  sellerSSecret VARCHAR(255),
  sellerSAccessToken VARCHAR(600),
  sellerSRefreshToken VARCHAR(600),
  sellerSAccessExpirationDate INT UNSIGNED,  -- unix time
  sellerSRefreshExpirationDate INT UNSIGNED,
  sellerTStoreCode BIGINT UNSIGNED UNIQUE NOT NULL,
  sellerTStoreAccessCode VARCHAR(100),
  sellerTStoreAdminUser VARCHAR(30),
  sellerTStorePath VARCHAR(90),
  sellerTAccessToken VARCHAR(600),
  sellerTRefreshToken VARCHAR(600),
  sellerTAccessExpirationDate INT UNSIGNED,  -- unix time
  sellerTRefreshExpirationDate INT UNSIGNED, -- unix time
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
    REFERENCES IProduct(id) 
    ON DELETE CASCADE
);
