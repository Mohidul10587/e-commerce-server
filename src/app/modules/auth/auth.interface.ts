export type ILoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type ILoginUser = {
  phoneNumber: string;
  password: string;
};
