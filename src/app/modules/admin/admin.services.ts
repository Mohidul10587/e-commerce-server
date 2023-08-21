import { Secret } from 'jsonwebtoken';
import { IAdmin, IAdminLoginResponse, ILoginAdmin } from './admin.interface';
import Admin from './admin.model';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';

const createAdmin = async (payload: IAdmin) => {
  const data = await Admin.create(payload);
  return data;
};

const loginAdmin = async (
  payload: ILoginAdmin
): Promise<IAdminLoginResponse> => {
  const adminData = await Admin.isAdminExist(payload.phoneNumber);
  // Check admin
  if (!adminData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No admin found!');
  }

  // Check password
  const isMatchedPassword =
    adminData?.password &&
    (await Admin.isPasswordMatched(payload.password, adminData.password));
  if (!isMatchedPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password doesn't match !");
  }

  // create access and refresh token
  const { _id, role } = adminData;

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

export const AdminService = { createAdmin, loginAdmin };
