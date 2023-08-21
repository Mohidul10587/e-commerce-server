import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IUser } from '../user/user.interface';

import { ILoginResponse, ILoginUser } from './auth.interface';

import config from '../../../config';
import { JwtPayload, Secret } from 'jsonwebtoken';
import Admin from '../admin/admin.model';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { User } from '../user/user.model';

// sign up a user

const signup = async (payload: IUser): Promise<IUser | null> => {
  const result = await User.create(payload);
  return result;
};

// log in a user
const loginUser = async (payload: ILoginUser): Promise<ILoginResponse> => {
  // Check user exit's
  const user = new User();
  const userData = await user.isUserExit(payload.phoneNumber);
  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // compare the password
  const isMatchedPassword =
    userData?.password &&
    (await user.isPasswordMatched(payload.password, userData.password));
  if (!isMatchedPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password doesn't match !");
  }

  // generate access and refresh token
  const { _id, role } = userData;
  const accessToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );
  const refreshToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
    },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

// generate a new access  token

const refreshToken = async (
  payload: string
): Promise<ILoginResponse | null> => {
  // Verify token
  let verifyToken = null;
  try {
    verifyToken = jwtHelpers.verifyToken(
      payload,
      config.jwt.refresh_secret as string
    );
  } catch (error) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid refresh token!');
  }

  const { userId } = verifyToken as JwtPayload;

  // Check user existed or not
  const user = (await Admin.findById(userId)) || User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User Not Found!');
  }

  // generate a new access token
  const newAccessToken = jwtHelpers.createToken(
    {
      userId: user._id,
      role: user.role,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  return {
    accessToken: newAccessToken,
  };
};

export const AuthService = {
  signup,
  loginUser,
  refreshToken,
};
