import express from 'express';
import { SellerController } from './seller.controller';
const router = express.Router();

router.post(
  '/create-seller',
  // validateRequest(SellerValidation.createSellerZodSchema),
  SellerController.createSeller
);

router.post(
  '/login',
  // validateRequest(SellerValidation.loginZodSchema),
  SellerController.loginSeller
);
router.get(
  '/checkSeller',
  // validateRequest(SellerValidation.loginZodSchema),
  SellerController.checkSeller
);
export const SellerRoutes = router;
