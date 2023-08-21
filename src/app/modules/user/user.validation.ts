import { z } from 'zod';
import { role } from './user.interface';

const createUserZodSchema = z.object({
  body: z.object({
    password: z.string({
      required_error: 'Password is required',
    }),
    role: z.enum([...role] as [string, ...string[]]),
    name: z.string({
      required_error: 'Name is required',
    }),
    email: z.string({
      required_error: 'Email is required',
    }),
  }),
});
const updateUserZodSchema = z.object({
  body: z.object({
    password: z
      .string({
        required_error: 'Password is required',
      })
      .optional(),
    role: z.enum([...role] as [string, ...string[]]).optional(),
    name: z
      .string({
        required_error: 'Name is required',
      })
      .optional(),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .optional(),
  }),
});
export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};
