/* eslint-disable no-unused-vars */

import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.services';
import config from '../../../config';

const createAdmin: RequestHandler = catchAsync(async (req, res) => {
  const adminData = req.body;
  const result = await AdminService.createAdmin(adminData);
  const name = result.name;

  const address = result.address;
  const role = result.role;
  const phoneNumber = result.phoneNumber;
  const _id = result._id;
  const finalResult = {
    name,
    role,
    phoneNumber,
    address,
    _id,
  };

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

export const AdminController = { createAdmin, loginAdmin };
