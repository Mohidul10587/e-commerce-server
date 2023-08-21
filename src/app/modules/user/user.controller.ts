import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IUser } from './user.interface';
import { UserService } from './user.service';

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
      message: 'User updated successfully !',
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
};
