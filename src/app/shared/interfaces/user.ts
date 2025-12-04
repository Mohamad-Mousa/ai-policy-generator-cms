import { Admin } from './admin';
import { Privilege } from './privilege';

export interface User {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface UserAuthenticated {
  admin: Admin;
  accessToken: string;
  refreshToken: string;
  privileges: Privilege[];
}

