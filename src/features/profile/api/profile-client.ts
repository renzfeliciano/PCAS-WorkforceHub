import { apiRequest } from "@/lib/api-client";
import type { AppUser } from "@/types/user";

export const profileClient = {
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<AppUser>("/api/v1/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
