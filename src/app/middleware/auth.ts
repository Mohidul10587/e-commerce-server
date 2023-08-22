import { NextFunction, Request, Response } from 'express';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

import config from '../../config';
import { JwtPayload } from 'jsonwebtoken';
import { jwtHelpers } from '../../helpers/jwtHelpers';

const auth =
  (...requireRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token
      const token = req.headers.authorization;
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      // Verify token
      const verifyUser = jwtHelpers.verifyToken(
        token,
        config.jwt.secret as string
      );

      //   Set verified user for next middleware
      const { userId, role } = verifyUser as JwtPayload;
      req.user = { userId, role };

      // Check role exit in required roles
      if (requireRoles.length > 0 && !requireRoles.includes(role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden!');
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
