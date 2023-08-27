import express from 'express';
// import validateRequest from '../../middleware/middleware';
import { ProductController } from './product.controller';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

// import { CowValidation } from './product.validation';
const router = express.Router();

router.post(
  '/create-product',
  // validateRequest(CowValidation.createCowZodSchema),
  ProductController.createProduct
);
router.get('/', ProductController.getAllProducts);
// router.delete('/delete-cow/:id', CowController.deleteCow);

router.get(
  '/single-product/:id',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.getSingleProduct
);
router.delete(
  '/:id',
  // auth(ENUM_USER_ROLE.BUYER),
  ProductController.deleteSingleProduct
);
// router.patch(
//   '/update-cow/:id',
//   validateRequest(CowValidation.updateCowZodSchema),
//   CowController.updateCow
// );
export const ProductRoutes = router;
