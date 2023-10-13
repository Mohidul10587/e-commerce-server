import express from 'express';
import { UserController } from './user.controller';
const router = express.Router();

router.post(
  '/create-user',
  // validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

router.post(
  '/login',
  // validateRequest(UserValidation.loginZodSchema),
  UserController.loginUser
);
router.get(
  '/checkUser',
  // validateRequest(UserValidation.loginZodSchema),
  UserController.checkUser
);
router.get(
  '/',
  // validateRequest(UserValidation.loginZodSchema),
  UserController.getAllUsers
);
router.delete(
  '/deleteUser/:id',
  // validateRequest(UserValidation.loginZodSchema),
  UserController.deleteUser
);
export const UserRoutes = router;
