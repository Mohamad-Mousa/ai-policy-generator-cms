import { FunctionKeys } from './FunctionKeys';

export interface FunctionItem {
  functionKey: FunctionKeys;
  functionId: string;
}

export const Functions: Record<FunctionKeys, FunctionItem> = {
  [FunctionKeys.admins]: {
    functionKey: FunctionKeys.admins,
    functionId: '691e3fb1f946cf16db928d40',
  },
  [FunctionKeys.adminTypes]: {
    functionKey: FunctionKeys.adminTypes,
    functionId: '691e3fb2f946cf16db928d45',
  },
  [FunctionKeys.userLogs]: {
    functionKey: FunctionKeys.userLogs,
    functionId: '691e3fb2f946cf16db928d4b',
  },
  [FunctionKeys.settings]: {
    functionKey: FunctionKeys.settings,
    functionId: '691e3fb3f946cf16db928d4e',
  },
  [FunctionKeys.dashboard]: {
    functionKey: FunctionKeys.dashboard,
    functionId: '6921ecbb87ce8d9f132a864c',
  },
};
