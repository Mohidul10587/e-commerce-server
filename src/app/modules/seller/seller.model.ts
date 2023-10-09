/* eslint-disable @typescript-eslint/no-this-alias */
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../../config';
import { sellerRole } from './seller.constant';
import { SellerModel, ISeller } from './seller.interface';

const sellerSchema = new Schema<ISeller>({
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true /* select: 0*/ },
  role: { type: String, enum: sellerRole, default: 'seller' },
  email: { type: String, unique: true, required: true, trim: true },
});

// Make the Hash Password
sellerSchema.pre('save', async function () {
  const seller = this;
  seller.password = await bcrypt.hash(
    seller.password,
    Number(config.bycrypt_salt_rounds)
  );
});

// Check the seller exist or not
sellerSchema.statics.isSellerExist = async function (email) {
  const sellerExist = await Seller.findOne({ email });
  return sellerExist;
};

// Check  Password of seller
sellerSchema.statics.isPasswordMatched = async function (givenPass, savedPass) {
  const passMatched = await bcrypt.compare(givenPass, savedPass);
  return passMatched;
};

const Seller = model<ISeller, SellerModel>('Seller', sellerSchema);
export default Seller;
