import { startSession } from 'mongoose';
import { ICartProduct } from './cart.interface';
import { CartProduct } from './cart.model';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';

const addProduct = async (payload: ICartProduct) => {
  let createdOrderId;

  const session = await startSession();

  try {
    session.startTransaction();

    // create order
    const createResult = await CartProduct.create([payload], { session });

    if (!createResult || createResult.length === 0) {
      throw new Error('Something went wrong. Please try again 4');
    }

    createdOrderId = createResult[0]._id;

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Something went wrong. Please try again 5'
    );
  } finally {
    session.endSession();
  }

  // finally order created successfully
  const result = await CartProduct.findOne({ _id: createdOrderId })
    .populate('product')
    .populate('buyer');

  return result;
};

// const getAllProducts = async (filters: IProductFilters) => {
//   const { searchTerm, ...filtersData } = filters;
//   const andConditions = [];

//   if (searchTerm) {
//     andConditions.push({
//       $or: cowSearchableFields.map(field => ({
//         [field]: {
//           $regex: searchTerm,
//           $options: 'i',
//         },
//       })),
//     });
//   }

//   if (Object.keys(filtersData).length) {
//     andConditions.push({
//       $and: Object.entries(filtersData).map(([field, value]) => ({
//         [field]: value,
//       })),
//     });
//   }

//   const whereConditions =
//     andConditions.length > 0 ? { $and: andConditions } : {};
//   const result = await Product.find(whereConditions);

//   return {
//     data: result,
//   };
// };

// const getSingleProduct = async (id: string) => {
//   const result = await Product.findOne({ _id: Object(id) });

//   console.log(result);
//   return result;
// };
// const deleteCow = async (id: string) => {
//   const isExist = await Product.findOne({ _id: Object(id) });

//   if (!isExist) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Product not found !');
//   }

//   const result = await Product.deleteOne({ _id: Object(id) }).populate(
//     'seller'
//   );
//   return result;
// };

// const updateCow = async (id: string, payload: Partial<IProduct>) => {
//   const isExist = await Product.findOne({ _id: Object(id) });

//   if (!isExist) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Product not found !');
//   }

//   const { ...userData } = payload;

//   const updatedUserData: Partial<IProduct> = { ...userData };

//   const result = await Product.findOneAndUpdate(
//     { _id: Object(id) },
//     updatedUserData,
//     {
//       new: true,
//     }
//   );
//   return result;
// };

export const CartService = {
  addProduct,
  // getAllProducts,
  // deleteCow,
  // getSingleProduct,
  // updateCow,
};
