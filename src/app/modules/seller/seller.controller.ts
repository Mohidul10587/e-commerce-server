/* eslint-disable no-unused-vars */

import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SellerService } from './seller.services';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { JwtPayload } from 'jsonwebtoken';

const createSeller: RequestHandler = catchAsync(async (req, res) => {
  const data = req.body;

  const result = await SellerService.createSeller(data);

  const { refreshToken, accessToken, sellerData } = result;

  const name = sellerData.name;
  const role = sellerData.role;
  const _id = sellerData._id;
  const email = sellerData.email;

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
    message: 'Seller account created Successfully!',
    data: finalResult,
  });
});

const loginSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerService.loginSeller(req.body);

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
    message: 'Seller logged in successfully!',
    data: others,
  });
});

const checkSeller = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }
  // Verify token
  const verifyUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);
  const { userId, role, name, email } = verifyUser as JwtPayload;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Seller logged in successfully!',
    data: { role, userId, name, email },
  });
});

export const SellerController = { createSeller, loginSeller, checkSeller };
