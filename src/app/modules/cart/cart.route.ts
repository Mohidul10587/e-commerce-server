import express from 'express';
import { ENUM_USER_ROLE } from '../../../enums/user';
import auth from '../../middleware/auth';
import { CartController } from './cart.controller';

const router = express.Router();

router.post(
  '/add_product_to_cart',
  auth(ENUM_USER_ROLE.BUYER),
  // validateRequest(ProductValidation.createProductZodSchema),
  CartController.addProduct
);

router.get('/:buyerEmail', CartController.getAllCartProducts);

router.delete(
  '/:id',
  // validateRequest(CartController.updateProductZodSchema),
  CartController.deleteCartProduct
);

router.post(
  '/payment',
  // auth(ENUM_USER_ROLE.BUYER),
  // validateRequest(ProductValidation.createProductZodSchema),
  CartController.paymentIntent
);
export const CartRoutes = router;
