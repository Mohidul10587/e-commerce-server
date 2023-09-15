import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { productFilterableFields } from './product.constant';
import { IProduct } from './product.interface';
import { ProductService } from './product.service';
import multer from 'multer';
import { Express } from 'express';
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, uniqueSuffix + '-' + file.originalname);
//   },
// });

// const uploadImages = multer({
//   storage: storage,
//   fileFilter: function (req, file, cb) {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only images are allowed.'));
//     }
//   },
// }).array('images', 4); // Allow up to 2 images, 'images' corresponds to the field name in your HTML form

const createProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads: IProduct = req.body;
    console.log(payloads);
    try {
      const result = await ProductService.createProduct(payloads);
      sendResponse<IProduct>(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Successfully created a product',
        data: result,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: 'Error creating product' });
    }
    // uploadImages(req, res, async err => {
    //   if (err) {
    //     console.log(err);
    //     return res.status(500).json({ message: 'Error uploading images' });
    //   }

    //   const payloads: IProduct = req.body;

    //   // Get the filenames of the uploaded images
    //   const imageFiles = req.files as Express.Multer.File[];
    //   const imageNames = imageFiles.map(file => file.filename);

    //   // Attach the image filenames to the payloads
    //   payloads.image = imageNames;

    //   try {
    //     const result = await ProductService.createProduct(payloads);
    //     sendResponse<IProduct>(res, {
    //       statusCode: httpStatus.OK,
    //       success: true,
    //       message: 'Successfully created a product',
    //       data: result,
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     res
    //       .status(500)
    //       .json({ success: false, message: 'Error creating product' });
    //   }
    // });
  }
);

const getAllProducts: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, productFilterableFields);
    const results = await ProductService.getAllProducts(filters);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Products',
      data: results,
    });
  }
);

const getSingleCategoryProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const categoryName = req.params.categoryName;
    const filters = pick(req.query, productFilterableFields);
    const result = await ProductService.getSingleCategoryProduct(
      categoryName,
      filters
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Successfully retrieve Products of ${categoryName}`,
      data: result,
    });
  }
);

const getSingleSubCategoryProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const sub_category = req.params.sub_category;
    const filters = pick(req.query, productFilterableFields);
    const result = await ProductService.getSingleSubCategoryProduct(
      sub_category,
      filters
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Successfully retrieve Products of ${sub_category}`,
      data: result,
    });
  }
);

const getSingleProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await ProductService.getSingleProduct(id);
    sendResponse<IProduct>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Successfully retrieve Products of ${id}`,
      data: result,
    });
  }
);

const deleteSingleProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const cows = await ProductService.deleteSingleProduct(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully deleted the Products',
      data: cows,
    });
  }
);

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getSingleCategoryProduct,
  deleteSingleProduct,
  getSingleSubCategoryProduct,
};
