import express from 'express';

import { ProductRoutes } from '../modules/products/product.route';
import { UserRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { CartRoutes } from '../modules/cart/cart.route';
import { OrdersRoutes } from '../modules/orders/order.route';
import { OfferProductsRoutes } from '../modules/offerProducts/offerProduct.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { SellerRoutes } from '../modules/seller/seller.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/offerProducts',
    route: OfferProductsRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/seller',
    route: SellerRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/cartProducts',
    route: CartRoutes,
  },
  {
    path: '/orders',
    route: OrdersRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
