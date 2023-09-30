import express from 'express';
// import validateRequest from '../../middleware/middleware';
import { ProductController } from './product.controller';

// import { ProductValidation } from './product.validation';
const router = express.Router();

router.post(
  '/create-product',
  // validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct
);

router.get('/', ProductController.getAllProducts);
// router.delete('/delete-product/:id', ProductController.deleteProduct);

router.get(
  '/single-product/:id',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.getSingleProduct
);
router.get(
  '/category/:categoryName',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.getSingleCategoryProduct
);
router.get(
  '/sub_category/:sub_category',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.getSingleSubCategoryProduct
);

router.delete(
  '/:id',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.deleteSingleProduct
);
router.patch(
  '/update-product/:id',
  // validateRequest(ProductValidation.updateProductZodSchema),
  ProductController.updateProduct
);
export const ProductRoutes = router;
