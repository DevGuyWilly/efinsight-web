import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { isApiError } from '@/api/client';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords don’t match.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

const FIELDS = ['currentPassword', 'newPassword'] as const;

interface ChangePasswordFormProps {
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => Promise<unknown>;
  onDone: () => void;
}

/** Expanded by the "Change password" button in Settings; collapses itself on success or Cancel. */
export function ChangePasswordForm({ onSubmit, onDone }: ChangePasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await onSubmit({ currentPassword, newPassword });
      setDone(true);
    } catch (e) {
      if (isApiError(e) && e.kind === 'http') {
        let placed = false;
        for (const f of FIELDS) {
          const msg = e.fieldErrors[f];
          if (msg) {
            setError(f, { message: msg });
            placed = true;
          }
        }
        if (!placed) setFormError(e.message);
      } else {
        setFormError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      }
    }
  });

  if (done) {
    return (
      <Alert
        tone="success"
        title="Password updated"
        actions={
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        }
      >
        Use your new password next time you log in.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {formError ? (
        <Alert tone="error" title="Couldn’t change your password">
          {formError}
        </Alert>
      ) : null}
      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="Use at least 8 characters."
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting} iconLeft={<KeyRound size={16} strokeWidth={1.5} aria-hidden="true" />}>
          Update password
        </Button>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
