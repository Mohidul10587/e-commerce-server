import { Model } from 'mongoose';

export const location = [
  'Dhaka',
  'Chattogram',
  'Barishal',
  'Rajshahi',
  'Sylhet',
  'Comilla',
  'Rangpur',
  'Mymensingh',
];

export const breed = [
  'Brahman',
  'Nellore',
  'Sahiwal',
  'Gir',
  'Indigenous',
  'Tharparkar',
  'Kankrej',
];
export const label = ['For sale', 'Sold out'];
export const category = ['Dairy', 'Beef', 'Dual Purpose'];

export type IProduct = {
  name: string;
  unit: string;
  category: string;
  sub_category: string;
  description: string;
  price: number;
  image: string[] | undefined;
  quantity: number;
  brand: string;
};

export type IProductFilters = {
  searchTerm?: string;
  name?: string;
  brand?: string;

  breed?: string;
  category?: string;
  maxPrice?: string;
  minPrice?: string;
  maxWeight?: string;
  minWeight?: string;
};

export type CowModel = Model<IProduct, Record<string, unknown>>;
