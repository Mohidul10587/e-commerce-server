import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { IUser } from './user.interface';
import { User } from './user.model';

const getMyProfile = async (payload: JwtPayload) => {
  const result = await User.findById(payload.userId);
  return result;
};

// const myProfileUpdate = async (
//   verifyUser: JwtPayload,
//   payload: Partial<IUser>
// ): Promise<IUser | null> => {
//   const exitUser = await User.findById(verifyUser.userId);
//   if (!exitUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
//   }

//   // Check user is seller. can't update income and budget
//   if (payload.budget || payload.income || payload.role) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "You can't not update income, budget and role"
//     );
//   }

//   const { name, ...userData } = payload;

//   // Dynamic name handling
//   if (name && Object.keys(name).length > 0) {
//     Object.keys(name).forEach(key => {
//       exitUser.name[key as keyof typeof name] = name[key as keyof typeof name];
//     });
//   }

//   Object.assign(exitUser, userData);

//   const result = await exitUser.save();
//   return result;
// };

// get all users
const getAllUsers = async () => {
  const result = await User.find({});
  return result;
};
//  get a single user
const getSingleUsers = async (id: string) => {
  const result = await User.findOne({ _id: Object(id) });
  return result;
};

// create a user
const createUser = async (payloads: IUser) => {
  const result = User.create(payloads);
  return result;
};
// delete a user
const deleteUser = async (id: string) => {
  const isExist = await User.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found !');
  }

  const result = User.deleteOne({ _id: Object(id) });
  return result;
};

// Update a user
const updateUser = async (
  id: string,
  payload: Partial<IUser>
): Promise<IUser | null> => {
  const isExist = await User.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found !');
  }

  const { name, ...userData } = payload;

  const updatedUserData: Partial<IUser> = { ...userData };

  if (name && Object.keys(name).length > 0) {
    Object.keys(name).forEach(key => {
      const nameKey = `name.${key}` as keyof Partial<IUser>;
      (updatedUserData as any)[nameKey] = name[key as keyof typeof name];
    });
  }

  const result = await User.findOneAndUpdate(
    { _id: Object(id) },
    updatedUserData,
    {
      new: true,
    }
  );
  return result;
};

export const UserService = {
  createUser,
  getAllUsers,
  deleteUser,
  updateUser,
  getSingleUsers,
  getMyProfile,
  // myProfileUpdate,
};
