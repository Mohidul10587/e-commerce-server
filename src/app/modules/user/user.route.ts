import express from 'express';

// import auth from '../../middleware/auth';
import validateRequest from '../../middleware/middleware';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
// import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

// router.post(
//   '/signup',
//   validateRequest(UserValidation.createUserZodSchema),
//   UserController.createUser
// );

router.get(
  '/current_user',
  auth(ENUM_USER_ROLE.BUYER),
  UserController.getCurrentUser
);

router.get(
  '/my-profile',
  // auth(ENUM_USER_ROLE.BUYER, USER_ROLE.SELLER),
  UserController.getMyProfile
);
router.patch(
  '/my-profile',
  // auth(USER_ROLE.BUYER, USER_ROLE.SELLER),
  UserController.myProfileUpdate
);

router.patch(
  '/update-user/:id',
  // auth(USER_ROLE.ADMIN),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateUser
);
router.get(
  '/',
  // auth(USER_ROLE.ADMIN),
  UserController.getUsers
);

router.get(
  '/single-user/:id',
  // auth(USER_ROLE.ADMIN),
  UserController.getSingleUsers
);

router.delete(
  '/delete-user/:id',
  // auth(USER_ROLE.ADMIN),
  UserController.deleteUsers
);

export const UserRoutes = router;
