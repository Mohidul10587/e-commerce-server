import express from 'express';
import { OfferProductController } from './offerProduct.controller';
// import validateRequest from '../../middleware/middleware';

// import { ProductValidation } from './product.validation';
const router = express.Router();

router.post(
  '/create-offer-product/:id',
  // validateRequest(ProductValidation.createProductZodSchema),
  OfferProductController.createOfferProduct
);

router.get('/', OfferProductController.getAllOfferProducts);
// // router.delete('/delete-product/:id', ProductController.deleteProduct);

// router.get(
//   '/single-product/:id',
//   // auth(ENUM_USER_ROLE.BUYER),
//   ProductController.getSingleProduct
// );
// router.get(
//   '/category/:categoryName',
//   // auth(ENUM_USER_ROLE.BUYER),
//   ProductController.getSingleCategoryProduct
// );
// router.get(
//   '/sub_category/:sub_category',
//   // auth(ENUM_USER_ROLE.BUYER),
//   ProductController.getSingleSubCategoryProduct
// );

// router.delete(
//   '/:id',
//   // auth(ENUM_USER_ROLE.BUYER),
//   ProductController.deleteSingleProduct
// );
// router.patch(
//   '/update-product/:id',
//   // validateRequest(ProductValidation.updateProductZodSchema),
//   ProductController.updateProduct
// );
export const OfferProductsRoutes = router;
