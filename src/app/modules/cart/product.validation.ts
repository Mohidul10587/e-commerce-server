import { z } from 'zod';
import { category, label } from './cart.interface';

const createCowZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'This is required field' }),
    age: z.number({ required_error: 'This is required field' }),
    price: z.number({ required_error: 'This is required field' }),

    weight: z.number({ required_error: 'This is required field' }),
    label: z.enum([...label] as [string, ...string[]]),
    category: z.enum([...category] as [string, ...string[]]),
    seller: z.string({ required_error: 'This is required field' }),
  }),
});

const updateCowZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'This is required field' }).optional(),
    age: z.number({ required_error: 'This is required field' }).optional(),
    price: z.number({ required_error: 'This is required field' }).optional(),

    weight: z.number({ required_error: 'This is required field' }).optional(),
    label: z.enum([...label] as [string, ...string[]]).optional(),
    category: z.enum([...category] as [string, ...string[]]).optional(),
    seller: z.string({ required_error: 'This is required field' }).optional(),
  }),
});

export const CowValidation = {
  createCowZodSchema,
  updateCowZodSchema,
};
