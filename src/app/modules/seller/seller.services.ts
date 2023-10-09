import { Secret } from 'jsonwebtoken';

import { jwtHelpers } from '../../../helpers/jwtHelpers';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import {
  ILoginSeller,
  ISeller,
  ISellerLoginResponse,
} from './seller.interface';
import Seller from './seller.model';

const createSeller = async (payload: ISeller) => {
  const sellerData = await Seller.create(payload);
  // create access and refresh token
  const { _id, role } = sellerData;

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
    sellerData,
    accessToken,
    refreshToken,
  };
};

const loginSeller = async (
  payload: ILoginSeller
): Promise<ISellerLoginResponse> => {
  const sellerData = await Seller.isSellerExist(payload.email);
  // Check seller
  if (!sellerData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No seller found!');
  }

  // Check password
  const isMatchedPassword =
    sellerData?.password &&
    (await Seller.isPasswordMatched(payload.password, sellerData.password));
  if (!isMatchedPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password doesn't match !");
  }

  // create access and refresh token
  const { _id, role } = sellerData;

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

export const SellerService = { createSeller, loginSeller };
