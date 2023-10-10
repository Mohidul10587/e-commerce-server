import { z } from 'zod';
import { userRole } from './user.constant';

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required!' }),
    email: z.string({ required_error: 'Phone number is required!' }),
    role: z.enum([...userRole] as [string, ...string[]]).optional(),
    password: z.string({ required_error: 'Password is required!' }),
  }),
});

const loginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Phone is required!' }),
    password: z.string({ required_error: 'Password is required!' }),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  loginZodSchema,
};
