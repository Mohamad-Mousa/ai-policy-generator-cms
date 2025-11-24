export interface Phone {
  countryCode?: string;
  number?: string;
  nationalNumber?: string;
  formatted?: string;
  code?: string | number;
}

export interface ContactSettings {
  email: string;
  phone?: string | Phone | null;
}

export interface SettingSubscriptions {
  notifications: boolean;
  emails: boolean;
}

export interface Setting {
  _id?: string;
  contact: ContactSettings;
  subscriptions: SettingSubscriptions;
  privacyPolicy: string;
  termsAndConditions: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateSettingRequest {
  contact?: Partial<ContactSettings>;
  subscriptions?: Partial<SettingSubscriptions>;
  privacyPolicy?: string;
  termsAndConditions?: string;
}

