import { Secret } from 'jsonwebtoken';
import { IUser, IUserLoginResponse, ILoginUser } from './user.interface';
import User from './user.model';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';

const createUser = async (payload: IUser) => {
  const userData = await User.create(payload);
  // create access and refresh token
  const { _id, role, name, email } = userData;

  const accessToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
      name,
      email,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
      name,
      email,
    },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string
  );

  return {
    userData,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUser): Promise<IUserLoginResponse> => {
  const userData = await User.isUserExist(payload.email);
  // Check user
  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No user found!');
  }

  // Check password
  const isMatchedPassword =
    userData?.password &&
    (await User.isPasswordMatched(payload.password, userData.password));
  if (!isMatchedPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password doesn't match !");
  }

  // create access and refresh token
  const { _id, role, name, email } = userData;

  const accessToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
      name,
      email,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtHelpers.createToken(
    {
      userId: _id,
      role: role,
      name,
      email,
    },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const UserService = { createUser, loginUser };
