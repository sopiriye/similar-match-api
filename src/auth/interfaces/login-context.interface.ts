import { MerchantStatus, UserRole } from '@prisma/client';

export interface LoginUser {
  id: string;
  email: string;
  role: UserRole;
  merchantProfile?: {
    id: string;
    businessName: string;
    status: MerchantStatus;
    verifiedAt: Date | null;
  } | null;
}

export interface LoginContext {
  accessToken: string;
  user: LoginUser;
}
