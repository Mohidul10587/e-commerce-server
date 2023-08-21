import express from 'express';
// import validateRequest from '../../middleware/middleware';
import { ProductController } from './product.controller';

// import { CowValidation } from './product.validation';
const router = express.Router();

router.post(
  '/create-product',
  // validateRequest(CowValidation.createCowZodSchema),
  ProductController.createProduct
);
router.get('/', ProductController.getAllProducts);
// router.delete('/delete-cow/:id', CowController.deleteCow);

router.get('/single-product/:id', ProductController.getSingleProduct);
// router.patch(
//   '/update-cow/:id',
//   validateRequest(CowValidation.updateCowZodSchema),
//   CowController.updateCow
// );
export const ProductRoutes = router;
