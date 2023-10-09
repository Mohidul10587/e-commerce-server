/* eslint-disable no-unused-vars */

import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { JwtPayload } from 'jsonwebtoken';
import { SellerService } from './seller.services';

const createSeller: RequestHandler = catchAsync(async (req, res) => {
  const data = req.body;

  const result = await SellerService.createSeller(data);
  const { refreshToken, accessToken, sellerData } = result;
  const name = sellerData.name;

  const role = sellerData.role;
  const email = sellerData.email;
  const _id = sellerData._id;
  const finalResult = {
    name,
    role,
    email,
    _id,
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
  const { userId, role } = verifyUser as JwtPayload;
  console.log(userId, role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Seller logged in successfully!',
    data: { role },
  });
});

export const SellerController = { createSeller, loginSeller, checkSeller };
