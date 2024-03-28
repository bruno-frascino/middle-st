import { IdObject, Product as TProduct, Variant } from '../../model/tray.model';
import { Condition, Product as SProduct, Sku } from '../../model/sm.model';
import { ErrorCategory, MiddleError } from '../../shared/errors/MiddleError';
import log from '../../logger';
import { getSBrandByTBrandId, getSCategoriesByTCategories } from '../../db/db';
import { getTrayVariant } from '../tray.service';
import { Integration } from '../../model/db.model';
import { convertStringToUnixTime, getCurrentUnixTime } from '../../shared/utils/utils';

// TODO - Product conversion
export async function convertToSProduct(tProduct: TProduct, integration: Integration): Promise<SProduct> {
  // id ?? TODO - Create vs Update
  // const attributes = []; // check example in SM to try to correlate to tray

  // SIMPLE conversion
  const {
    available,
    brand_id,
    // brand,
    category_id,
    // category_name,
    related_categories,
    // all_categories,
    created,
    description,
    ean,
    free_shipping,
    metatag,
    height,
    length,
    model,
    price,
    slug,
    promotional_price,
    reference,
    stock,
    name,
    title,
    video,
    weight,
    width,
    ProductImage,
    Properties, // TODO check
    payment_option, // check field
    has_variation,
    Variant, // convert
  } = tProduct.Product;

  // const images = [];
  // if (ProductImage && ProductImage.length > 0) {
  const images =
    ProductImage &&
    ProductImage.length > 0 &&
    ProductImage.map((productImage, index) => {
      return {
        url: productImage.https,
        sequence: index + 1,
      };
    });
  // for (let i = 0; i < ProductImage.length; i += 1) {
  //   const productImage = ProductImage[i];
  //   images.push({
  //     url: productImage.https,
  //     sequence: i + 1,
  //   });
  // }
  // }

  const categories = await convertToSCategories({ category_id, related_categories });
  const sBrandId = await convertToSBrand(brand_id);
  let sSkus: Sku[] | undefined = [] as Sku[];
  if (has_variation) {
    sSkus = await convertTVariants(Variant, integration);
  }

  const sProduct: SProduct = {
    // id: 0, // check
    title: name,
    publish: true, // default?
    active: true, // default? would get to this point?
    slug,
    old_url: '', // no related field
    description,
    categories,
    attributes: [], // check // TODO
    brand_id: sBrandId,
    model,
    reference_code: reference, // reference to the product
    block: '', // no related field
    created_at: created,
    condition: Condition.NOVO, // check
    supports_seller_contact: true, // hardcoded
    url_video: video,
    shipping: {
      free: free_shipping === 1,
      enabled: true,
    },
    seo: {
      // metatag maybe - Check with Tray
      title: '',
      description: metatag?.description,
      keywords: metatag?.type,
    },
    // No related fields from Tray
    // google_shopping: {
    //   enable: false,
    //   mpn: '',
    //   age_group: '', // infant
    //   gender: '', // male
    //   google_product_category: '',
    // },
    gallery: {
      video,
      images: images || [],
    },

    skus: sSkus ?? [],
  };

  return sProduct;
}

export async function convertTVariants(variants: IdObject[], integration: Integration): Promise<Sku[] | undefined> {

  try {
    if (variants && variants.length > 0) {
      const promises = variants.map((var_) => {
        return getTrayVariant(Number.parseInt(var_.id, 10), integration);
      });
      const trayVariants = await Promise.all(promises);

      if (trayVariants) {
        // convert to SM Skus
        const sSkus = [] as Sku[];
        trayVariants.forEach(tVariant => {
          const {
            stock,
            ean,
            available,
            width,
            weight,
            length,
            height,
            price,
            promotional_price,
            end_promotion,
            start_promotion,
          } = tVariant.Variant;

          const dimensions = {
            weight,
            height,
            width,
            length,
          }

          const startPromoDate = convertStringToUnixTime(start_promotion.toISOString());
          const endPromoDate = convertStringToUnixTime(end_promotion.toISOString());
          const now = getCurrentUnixTime();
          const activePromotion = now >= startPromoDate && now < endPromoDate;

          const smPrice = {
            retail: {
              regular: price,
              sale: activePromotion ? promotional_price : price,
            }
          }

          const sku = {
            stock,
            barcode: ean,
            code_sku: '', // reference?
            status: available ? 'ACTIVE' : 'INACTIVE',
            unity_type: '', // TODO - check for some default value
            unity_quantity: 0, // TODO - check for some default value
            extra_days_to_delivery: 0, // TODO - check for some default value
            dimensions,
            prices: smPrice,
            // variants: Variant[]; //
          }

          sSkus.push(sku);
        });
        return sSkus;
      }
    }

    return undefined;
  } catch (error) {
    log.error(`Error on converting T Variants to S Skus: ${error}`)
  }
}

export async function convertToSBrand(tBrandId: number) {

  const sBrands = await getSBrandByTBrandId(tBrandId);

  if (!sBrands || (Array.isArray(sBrands) && sBrands.length === 0)) {
    const error = `No T Brand could be converted for tBrandId: ${tBrandId}`;
    log.error(error);
    throw new MiddleError(error, ErrorCategory.BUS);
  }

  return sBrands[0].brandId;
}

export async function convertToSCategories({
  category_id,
  related_categories,
}: {
  category_id: number;
  related_categories: number[];
}): Promise<number[]> {
  // no undefined values
  const categoriesToBeConverted = [...related_categories, category_id].filter(Boolean);

  const convertedCategories = categoriesToBeConverted.length > 0
    ? await getSCategoriesByTCategories(categoriesToBeConverted)
    : [];

  if (!convertedCategories || convertedCategories.length === 0) {
    const errorMsg = `No T categories could be converted - categoriesToBeConverted: ${categoriesToBeConverted}`;
    log.error(errorMsg);
    throw new MiddleError(errorMsg, ErrorCategory.BUS);
  }

  const convertedTids = convertedCategories
    .map(sCategory => sCategory.tCategoryId)
    .filter(Boolean) as number[];

  const categoriesNotFound = categoriesToBeConverted.filter(toBeConv => !convertedTids.includes(toBeConv));

  if (categoriesNotFound && categoriesNotFound.length > 0) {
    log.error(`Some categories could not be converted - categoriesToBeConverted: ${categoriesToBeConverted} and categoriesNotFound: ${categoriesNotFound}`);
  }

  return convertedTids;
}

// TODO consider removing as we convert by Id only
// async function convertToSCategoryByName(tCategoryName: string) {
//   const categoryMap = {}; // await getCategoryMapByTName({ tCategoryName });
//   log.warn(`S Category found: ${JSON.stringify(categoryMap)}`);
//   //
//   if (!categoryMap || (Array.isArray(categoryMap) && categoryMap.length === 0)) {
//     const error = `Could not find a Category for ${tCategoryName}`;
//     throw new MiddleError(error, ErrorCategory.BUS);
//   }
//   // Get S Id
//   // const { sCategoryId } = categoryMap;
//   // Get new S Id and add new record to Map
//   return 1;
// }

// TODO check if this has any dependency
// async function getSCategorybyTId(tCategoryId: number) {
//   const sCategories = await getSCategoryByTCategoryId(tCategoryId);
//   // log.warn(`S Category found: ${JSON.stringify(categoryMap)}`);
//   // fail if not found
//   if (!sCategories || (Array.isArray(sCategories) && sCategories.length === 0)) {
//     const error = `Could not find an SM Category for T category id ${tCategoryId}`;
//     log.error(error);
//     // throw new MiddleError(error, ErrorCategory.BUS);
//     return null;
//   }

//   return sCategories[0];
// }

export function convertToSSku(variant: Variant) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { Variant } = variant;
  const sku: Sku = {
    code_sku: Variant.id.toString(),
    barcode: Variant.ean,
    prices: {
      retail: {
        regular: Variant.cost_price,
        sale: Variant.price,
      },
    },
    stock: Variant.stock,
    status: Variant.available === 1 ? 'ACTIVE' : 'INACTIVE',
    // TODO: Check default values - dummy for now as they don't exist in Tray
    unity_type: '',
    unity_quantity: 0,
    extra_days_to_delivery: 0,
    dimensions: {
      weight: Variant.weight,
      height: Variant.height,
      width: Variant.width,
      length: Variant.length,
    },
    // TODO - how to translate TRAY variant to this variant
    variants: [],
    // variants: Variant[];
    // {
    //   id: number;
    //   name: string; // "Tamanho",
    //   value: string; // "M"
    // }

    // TRAY fields without a clear correspondent in SM
    // order: string; //         Tray
    // product_id: number; //    Tray
    // minimum_stock: number; // Tray
    // reference: string; //     Tray
    // cubic_weight: number; //  Tray
    // // '2019-01-01';
    // start_promotion: Date; //                    Tray
    // // '2019-01-10';
    // end_promotion: Date; //                      Tray
    // promotional_price: number; //                Tray
    // payment_option: string; //                   Tray
    // payment_option_details: PaymentDetails[]; // Tray
    // illustrative_image: string; //               Tray
    // Sku: TypeValueImage[]; // TODO Confirm these
    // VariantImage: Image[]; // Gallery?
  };

  return sku;
}
