import { useMutation } from '@tanstack/react-query';
import { changePassword, type ChangePasswordPayload } from '@/api/auth';

/** POST /api/users/change-password. Requires the current password; the new one is never sent anywhere else. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}
