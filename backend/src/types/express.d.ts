import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthUser {
      userId: string;
      organizationId: string;
      role: UserRole | "admin" | "user";
      email: string;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
