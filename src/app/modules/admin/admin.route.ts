import express from 'express';
import { AdminController } from './admin.controller';
const router = express.Router();

router.post(
  '/create-admin',
  // validateRequest(AdminValidation.createAdminZodSchema),
  AdminController.createAdmin
);

router.post(
  '/login',
  // validateRequest(AdminValidation.loginZodSchema),
  AdminController.loginAdmin
);
router.get(
  '/checkAdmin',
  // validateRequest(AdminValidation.loginZodSchema),
  AdminController.checkAdmin
);
export const AdminRoutes = router;
