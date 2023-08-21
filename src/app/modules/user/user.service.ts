import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IUser } from './user.interface';
import { User } from './user.model';

const getAllUsers = async () => {
  const result = await User.find({});
  return result;
};

const getSingleUsers = async (id: string) => {
  const result = await User.findOne({ _id: Object(id) });
  return result;
};

const createUser = async (payloads: IUser) => {
  const result = User.create(payloads);
  return result;
};

const deleteUser = async (id: string) => {
  const isExist = await User.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found !');
  }

  const result = User.deleteOne({ _id: Object(id) });
  return result;
};

const updateUser = async (
  id: string,
  payload: Partial<IUser>
): Promise<IUser | null> => {
  const isExist = await User.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found !');
  }

  const result = await User.findOneAndUpdate({ _id: Object(id) }, payload, {
    new: true,
  });
  return result;
};

export const UserService = {
  createUser,
  getAllUsers,
  deleteUser,
  updateUser,
  getSingleUsers,
};
