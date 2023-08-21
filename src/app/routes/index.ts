import express from 'express';

import { ProductRoutes } from '../modules/products/product.route';
import { UserRoutes } from '../modules/user/user.route';
// import { Aut hRoutes } from '../modules/auth/auth.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  // {
  //   path: '/auth',
  //   route: AuthRoutes,
  // },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
