DROP TABLE Notification;
DROP TABLE IProduct_SKU;
DROP TABLE IProduct;
DROP TABLE Integration;
-- DROP TABLE Brand_Map;
DROP TABLE SBrand;
DROP TABLE TBrand;
-- DROP TABLE Category_Map;
DROP TABLE IError;
DROP TABLE SCategory;
DROP TABLE TCategory;


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

CREATE TABLE IError(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(400),
  createDate DATETIME NOT NULL,
  updateDate DATETIME
);

CREATE TABLE SBrand(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brandId INT UNSIGNED UNIQUE NOT NULL,
  name VARCHAR(100),
  slug VARCHAR(100),
  seoTitle VARCHAR(100),
  seoDescription VARCHAR(200),
  seoKeywords VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL
);

CREATE TABLE SCategory(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  categoryId INT UNSIGNED UNIQUE NOT NULL,
  parentId INT UNSIGNED,
  referenceCode VARCHAR(20),
  name VARCHAR(100),
  slug VARCHAR(100),
  seoTitle VARCHAR(100),
  seoDescription VARCHAR(200),
  seoKeywords VARCHAR(100),
  seoH1 VARCHAR(100),
  description VARCHAR(200),
  imageUrl VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL
);

CREATE TABLE TCategory(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  categoryId INT UNSIGNED UNIQUE NOT NULL,
  parentId INT UNSIGNED,
  name VARCHAR(100),
  smallDescription VARCHAR(300),
  slug VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL
);

CREATE TABLE TBrand(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brandId INT UNSIGNED UNIQUE NOT NULL,
  brand VARCHAR(100),
  slug VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL
);

-- T Brand <-> S Brand
CREATE TABLE SBrand_x_TBrand(
  sId INT UNSIGNED UNIQUE NOT NULL,
  sBrandId INT UNSIGNED UNIQUE NOT NULL,
  sBrandName VARCHAR(100) NOT NULL,
  tId INT UNSIGNED UNIQUE NOT NULL,
  tBrandId INT UNSIGNED UNIQUE,
  tBrandName VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL,
  PRIMARY KEY (sId, tId),
  FOREIGN KEY (sId)
      REFERENCES SBrand(id)
      ON DELETE CASCADE,
  FOREIGN KEY (tId)
      REFERENCES TBrand(id)
      ON DELETE CASCADE
);

-- T Category <-> S Category
CREATE TABLE SCategory_x_TCategory(
  sId INT UNSIGNED UNIQUE NOT NULL,
  sCategoryId INT UNSIGNED UNIQUE NOT NULL,
  sCategoryName VARCHAR(100) NOT NULL,
  tId INT UNSIGNED UNIQUE NOT NULL,
  tCategoryId INT UNSIGNED UNIQUE,
  tCategoryName VARCHAR(100),
  createDate DATETIME NOT NULL,
  updateDate DATETIME, 
  active BOOLEAN NOT NULL,
  PRIMARY KEY (sId, tId),
  FOREIGN KEY (sId)
      REFERENCES SCategory(id)
      ON DELETE CASCADE,
  FOREIGN KEY (tId)
      REFERENCES TCategory(id)
      ON DELETE CASCADE
);

-- CREATE TABLE SBrandAction(
--   id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
--   brandId INT UNSIGNED NOT NULL,
--   action VARCHAR(6),
--   slug VARCHAR(100),
--   seoTitle VARCHAR(100),
--   seoDescription VARCHAR(200),
--   seoKeywords VARCHAR(100)
--   createDate DATETIME NOT NULL,
--   updateDate DATETIME, 
-- );
