import { Function } from './function';

export interface Privilege {
  _id: string;
  function: Function;
  adminType: string;
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PrivilegePermission {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

