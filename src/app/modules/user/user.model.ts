/* eslint-disable @typescript-eslint/no-this-alias */
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../../config';
import { userRole } from './user.constant';
import { UserModel, IUser } from './user.interface';

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true /* select: 0*/ },
  role: { type: String, enum: userRole, default: 'user' },
  email: { type: String, unique: true, required: true, trim: true },
});

// Make the Hash Password
userSchema.pre('save', async function () {
  const user = this;
  user.password = await bcrypt.hash(
    user.password,
    Number(config.bycrypt_salt_rounds)
  );
});

// Check the user exist or not
userSchema.statics.isUserExist = async function (email) {
  const userExist = await User.findOne({ email });
  return userExist;
};

// Check  Password of user
userSchema.statics.isPasswordMatched = async function (givenPass, savedPass) {
  const passMatched = await bcrypt.compare(givenPass, savedPass);
  return passMatched;
};

const User = model<IUser, UserModel>('User', userSchema);
export default User;
