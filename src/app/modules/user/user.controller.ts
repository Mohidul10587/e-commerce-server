/* eslint-disable no-unused-vars */

import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.services';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { JwtPayload } from 'jsonwebtoken';

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const data = req.body;

  const result = await UserService.createUser(data);

  const { refreshToken, accessToken, userData } = result;

  const name = userData.name;
  const role = userData.role;
  const _id = userData._id;
  const email = userData.email;

  const finalResult = {
    role,
    name,
    _id,
    email,
    accessToken,
  };
  // refresh token set into cookies
  const options = {
    secure: config.env === 'production',
    httpOnly: true,
  };
  res.cookie('refreshToken', refreshToken, options);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User account created Successfully!',
    data: finalResult,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.loginUser(req.body);

  const { refreshToken, ...others } = result;

  // refresh token set into cookies
  const options = {
    secure: config.env === 'production',
    httpOnly: true,
  };
  res.cookie('refreshToken', refreshToken, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully!',
    data: others,
  });
});

const checkUser = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }
  // Verify token
  const verifyUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);
  const { userId, role, name, email } = verifyUser as JwtPayload;
  console.log(verifyUser);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully!',
    data: { role, userId, name, email },
  });
});

export const UserController = { createUser, loginUser, checkUser };
