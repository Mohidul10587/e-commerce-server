import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IProduct, IProductFilters } from './product.interface';
import { Product } from './product.model';
import { cowSearchableFields } from './product.constant';

const createProduct = async (payloads: IProduct) => {
  console.log(payloads);
  const result = await Product.create(payloads);
  return result;
};

const getAllProducts = async (filters: IProductFilters) => {
  const { searchTerm, ...filtersData } = filters;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: cowSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  const result = await Product.find(whereConditions);

  return {
    data: result,
  };
};

const getSingleCategoryProduct = async (categoryName: string) => {
  const result = await Product.find({ category: categoryName });

  return result;
};
const getSingleSubCategoryProduct = async (sub_category: string) => {
  const result = await Product.find({ sub_category });

  return result;
};
const getSingleProduct = async (id: string) => {
  const result = await Product.findOne({ _id: Object(id) });

  return result;
};
const deleteSingleProduct = async (id: string) => {
  const isExist = await Product.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found !');
  }

  const result = await Product.deleteOne({ _id: Object(id) }).populate(
    'seller'
  );
  return result;
};

const updateCow = async (id: string, payload: Partial<IProduct>) => {
  const isExist = await Product.findOne({ _id: Object(id) });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found !');
  }

  const { ...userData } = payload;

  const updatedUserData: Partial<IProduct> = { ...userData };

  const result = await Product.findOneAndUpdate(
    { _id: Object(id) },
    updatedUserData,
    {
      new: true,
    }
  );
  return result;
};

export const ProductService = {
  createProduct,
  getAllProducts,
  deleteSingleProduct,
  getSingleProduct,
  getSingleCategoryProduct,
  getSingleSubCategoryProduct,
  updateCow,
};
