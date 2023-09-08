import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IUser } from './user.interface';
import { UserService } from './user.service';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import config from '../../../config';
import { JwtPayload } from 'jsonwebtoken';

const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  // Get token
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  // Verify token
  const verifyUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);

  //   Set verified user for next middleware
  const { userId, name } = verifyUser as JwtPayload;
  const userData = {
    userId,
    name,
  };
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User's information retrieved successfully",
    data: userData,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMyProfile(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User's information retrieved successfully",
    data: result,
  });
});

const myProfileUpdate = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.myProfileUpdate(req.user, req.body);

  sendResponse<IUser>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My profile updated successfully!',
    data: result,
  });
});

const getUsers = async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully get users',
    data: result,
  });
};

const getSingleUsers = async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await UserService.getSingleUsers(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully get a single users',
    data: result,
  });
};

const createUser: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads = req.body;

    const result = await UserService.createUser(payloads);

    sendResponse<IUser>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully create user',
      data: result,
    });
  }
);

const deleteUsers: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;

    const result = await UserService.deleteUser(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully deleted user',
      data: result,
    });
  }
);

const updateUser: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const updatedData = req.body;

    const result = await UserService.updateUser(id, updatedData);

    sendResponse<IUser>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Student updated successfully !',
      data: result,
    });
  }
);

export const UserController = {
  createUser,
  getUsers,
  deleteUsers,
  updateUser,
  getSingleUsers,
  getMyProfile,
  myProfileUpdate,
  getCurrentUser,
};
