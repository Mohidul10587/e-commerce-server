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

router.get('/:userId', CartController.getAllCartProducts);

router.delete(
  '/:id',
  // validateRequest(CartController.updateCowZodSchema),
  CartController.deleteCartProduct
);
export const CartRoutes = router;
