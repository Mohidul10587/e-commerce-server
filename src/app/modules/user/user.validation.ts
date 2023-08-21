import { z } from 'zod';
import { role } from './user.interface';

const createUserZodSchema = z.object({
  body: z.object({
    password: z.string({
      required_error: 'Password is required',
    }),
    role: z.enum([...role] as [string, ...string[]]),
    name: z.string({
      required_error: 'LastName is required',
    }),
    email: z.string({
      required_error: 'LastName is required',
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
      .object({
        firstName: z
          .string({
            required_error: 'FirstName is required',
          })
          .optional(),
        lastName: z
          .string({
            required_error: 'LastName is required',
          })
          .optional(),
      })
      .optional(),
    phoneNumber: z
      .string({
        required_error: 'PhoneNumber is required',
      })
      .optional(),
    address: z
      .string({
        required_error: 'Address  is required',
      })
      .optional(),
    budget: z
      .number({
        required_error: 'Budget  is required',
      })
      .optional(),
    income: z
      .number({
        required_error: 'Income  is required',
      })
      .optional(),
  }),
});
export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};
