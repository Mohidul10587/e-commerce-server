import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IProduct, IProductFilters } from './product.interface';
import { Product } from './product.model';
import { productSearchableFields } from './product.constant';
import { OfferProduct } from '../offerProducts/offerProduct.model';

const createProduct = async (payloads: IProduct) => {
  console.log('this is payload ', payloads);
  const result = await Product.create(payloads);
  return result;
};

const getAllProducts = async (filters: IProductFilters) => {
  const { searchTerm, ...filtersData } = filters;
  const andConditions = [];
  console.log(searchTerm);
  if (searchTerm) {
    andConditions.push({
      $or: productSearchableFields.map(field => ({
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

const getSingleSellersProducts = async (
  filters: IProductFilters,
  sellerEmail: string
) => {
  console.log(sellerEmail);
  const { searchTerm, ...filtersData } = filters;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: productSearchableFields.map(field => ({
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
  andConditions.push({
    sellerEmail: sellerEmail,
  });
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  const result = await Product.find(whereConditions);

  return {
    data: result,
  };
};
const getSingleCategoryProduct = async (
  categoryName: string,
  filters: IProductFilters
) => {
  console.log(filters);
  const { searchTerm, brand, minPrice, maxPrice, ...otherFilters } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: productSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (brand) {
    // Split the brand string into an array of brand names
    const brandsArray = brand.split(',');

    // Add a condition to filter products by brand using the $in operator
    andConditions.push({
      brand: { $in: brandsArray },
    });
  }

  // Add a condition to filter products by minimum price using $gte
  if (minPrice) {
    andConditions.push({
      price: { $gte: parseFloat(minPrice) }, // Assuming 'price' is the field name for product price
    });
  }
  if (maxPrice) {
    andConditions.push({
      price: { $lte: parseFloat(maxPrice) }, // Assuming 'price' is the field name for product price
    });
  }

  if (Object.keys(otherFilters).length) {
    andConditions.push({
      $and: Object.entries(otherFilters).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  andConditions.push({
    category: categoryName,
  });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Product.find(whereConditions);

  return {
    data: result,
  };
};

const getSingleSubCategoryProduct = async (
  sub_category: string,
  filters: IProductFilters
) => {
  console.log(filters);
  const { searchTerm, brand, minPrice, maxPrice, ...otherFilters } = filters;
  console.log(minPrice, brand);
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: productSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (brand) {
    // Split the brand string into an array of brand names
    const brandsArray = brand.split(',');

    // Add a condition to filter products by brand using the $in operator
    andConditions.push({
      brand: { $in: brandsArray },
    });
  }

  // Add a condition to filter products by minimum price using $gte
  if (minPrice) {
    andConditions.push({
      price: { $gte: parseFloat(minPrice) }, // Assuming 'price' is the field name for product price
    });
  }
  if (maxPrice) {
    andConditions.push({
      price: { $lte: parseFloat(maxPrice) }, // Assuming 'price' is the field name for product price
    });
  }

  if (Object.keys(otherFilters).length) {
    andConditions.push({
      $and: Object.entries(otherFilters).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  andConditions.push({
    sub_category: sub_category,
  });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Product.find(whereConditions);

  return {
    data: result,
  };
};
const getSingleProduct = async (id: string) => {
  const result = await Product.findOne({ _id: Object(id) });

  return result;
};
const getSingleOfferProduct = async (id: string) => {
  const result = await OfferProduct.findOne({ _id: Object(id) });

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

const updateProduct = async (payload: Partial<IProduct>, id: string) => {
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
  getSingleSellersProducts,
  deleteSingleProduct,
  getSingleOfferProduct,
  getSingleProduct,
  getSingleCategoryProduct,
  getSingleSubCategoryProduct,
  updateProduct,
};
