/* eslint-disable no-unused-vars */

import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.services';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { JwtPayload } from 'jsonwebtoken';

const createAdmin: RequestHandler = catchAsync(async (req, res) => {
  const data = req.body;

  const result = await AdminService.createAdmin(data);

  const { refreshToken, accessToken, adminData } = result;

  const name = adminData.name;
  const role = adminData.role;
  const _id = adminData._id;
  const email = adminData.email;

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
    message: 'Admin account created Successfully!',
    data: finalResult,
  });
});

const loginAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.loginAdmin(req.body);

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
    message: 'Admin logged in successfully!',
    data: others,
  });
});

const checkAdmin = catchAsync(async (req: Request, res: Response) => {
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
    message: 'Admin logged in successfully!',
    data: { role, userId, name, email },
  });
});

export const AdminController = { createAdmin, loginAdmin, checkAdmin };
