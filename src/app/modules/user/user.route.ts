import express from 'express';
import validateRequest from '../../middleware/middleware';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = express.Router();

router.post(
  '/signup',
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);
router.patch(
  '/update-user/:id',
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateUser
);
router.get('/', UserController.getUsers);
router.get('/single-user/:id', UserController.getSingleUsers);

router.delete('/delete-user/:id', UserController.deleteUsers);

export const UserRoutes = router;
