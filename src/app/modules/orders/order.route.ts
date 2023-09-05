import express from 'express';
import { OrderController } from './order.controller';

const router = express.Router();

router.post('/post_order', OrderController.postOrder);
router.get('/', OrderController.getAllOrders);

export const OrdersRoutes = router;
