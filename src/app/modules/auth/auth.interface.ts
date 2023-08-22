export type ILoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type ILoginUser = {
  email: string;
  password: string;
};
