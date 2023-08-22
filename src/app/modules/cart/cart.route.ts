import express from 'express';
import { CartController } from './cart.controller';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

router.post(
  '/add_product_to_cart',
  auth(ENUM_USER_ROLE.BUYER),
  // validateRequest(CowValidation.createCowZodSchema),
  CartController.addProduct
);

// router.get('/', ProductController.getAllProducts);
// // router.delete('/delete-cow/:id', CowController.deleteCow);

// router.get(
//   '/single-product/:id',
//   auth(ENUM_USER_ROLE.BUYER),
//   ProductController.getSingleProduct
// );
// router.patch(
//   '/update-cow/:id',
//   validateRequest(CowValidation.updateCowZodSchema),
//   CowController.updateCow
// );
export const CartRoutes = router;
