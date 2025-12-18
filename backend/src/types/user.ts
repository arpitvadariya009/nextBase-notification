export interface RegisterUserBody {
  email: string;
  password: string;
  username: string;
}

export interface LoginUserBody {
  email: string;
  password: string;
}

export interface UserResponse {
  success: boolean;
  message: string;
  token?: string;
  id?: string;
  username?: string;
}

export interface GetAllUsersResponse {
  success: boolean;
  count?: number;
  users?: Array<{
    _id: string;
    email: string;
    username: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  message?: string;
}