import { z } from 'zod';
import { breed, category, label, location } from './offerProduct.interface';

const createProductZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'This is required field' }),
    age: z.number({ required_error: 'This is required field' }),
    price: z.number({ required_error: 'This is required field' }),
    location: z.enum([...location] as [string, ...string[]]),
    breed: z.enum([...breed] as [string, ...string[]]),
    weight: z.number({ required_error: 'This is required field' }),
    label: z.enum([...label] as [string, ...string[]]),
    category: z.enum([...category] as [string, ...string[]]),
    seller: z.string({ required_error: 'This is required field' }),
  }),
});

const updateProductZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'This is required field' }).optional(),
    age: z.number({ required_error: 'This is required field' }).optional(),
    price: z.number({ required_error: 'This is required field' }).optional(),
    location: z.enum([...location] as [string, ...string[]]).optional(),
    breed: z.enum([...breed] as [string, ...string[]]).optional(),
    weight: z.number({ required_error: 'This is required field' }).optional(),
    label: z.enum([...label] as [string, ...string[]]).optional(),
    category: z.enum([...category] as [string, ...string[]]).optional(),
    seller: z.string({ required_error: 'This is required field' }).optional(),
  }),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
};
