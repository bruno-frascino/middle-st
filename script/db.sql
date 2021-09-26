-- Create Tables
CREATE TABLE INTEGRATION(
  id integer NOT NULL PRIMARY KEY, 
  sellerName text, 
  sellerSId integer UNIQUE, 
  sellerSKey text, 
  sellerSSecret text, 
  sellerSStoreCode text, 
  sellerTId integer UNIQUE, 
  sellerTKey text, 
  sellerTSecret text, 
  sellerTStoreCode text, 
  active BOOLEAN NOT NULL CHECK (active IN (0, 1))
);

CREATE TABLE NOTIFICATION(
  id integer NOT NULL PRIMARY KEY, 
  scopeName text NOT NULL,
  act text NOT NULL,
  scopeId integer NOT NULL,
  sellerId integer NOT NULL,
  appCode text NOT NULL,
  createDate integer NOT NULL
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

