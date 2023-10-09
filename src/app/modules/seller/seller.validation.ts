import { z } from 'zod';
import { sellerRole } from './seller.constant';

const createSellerZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required!' }),
    email: z.string({ required_error: 'Phone number is required!' }),
    role: z.enum([...sellerRole] as [string, ...string[]]).optional(),
    password: z.string({ required_error: 'Password is required!' }),
  }),
});

const loginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Phone is required!' }),
    password: z.string({ required_error: 'Password is required!' }),
  }),
});

export const SellerValidation = {
  createSellerZodSchema,
  loginZodSchema,
};
