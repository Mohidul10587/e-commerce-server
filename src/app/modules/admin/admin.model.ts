/* eslint-disable @typescript-eslint/no-this-alias */
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../../config';
import { adminRole } from './admin.constant';
import { AdminModel, IAdmin } from './admin.interface';

const adminSchema = new Schema<IAdmin>({
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true /* select: 0*/ },
  role: { type: String, enum: adminRole, default: 'admin' },
  email: { type: String, unique: true, required: true, trim: true },
});

// Make the Hash Password
adminSchema.pre('save', async function () {
  const admin = this;
  admin.password = await bcrypt.hash(
    admin.password,
    Number(config.bycrypt_salt_rounds)
  );
});

// Check the admin exist or not
adminSchema.statics.isAdminExist = async function (email) {
  const adminExist = await Admin.findOne({ email });
  return adminExist;
};

// Check  Password of admin
adminSchema.statics.isPasswordMatched = async function (givenPass, savedPass) {
  const passMatched = await bcrypt.compare(givenPass, savedPass);
  return passMatched;
};

const Admin = model<IAdmin, AdminModel>('Admin', adminSchema);
export default Admin;
