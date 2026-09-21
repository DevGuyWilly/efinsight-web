import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isApiError } from '@/api/client';
import { Alert } from '@/components/feedback/Alert';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { STORAGE_KEYS } from '@/lib/config';
import { readString } from '@/lib/storage';
import { useAuth } from '@/stores/auth';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await signIn(email, password);
      // The route guard sends users who haven't finished setup on to the right onboarding step.
      navigate(from && from.startsWith('/app') ? from : '/app/dashboard', { replace: true });
    } catch (e) {
      if (isApiError(e) && e.status === 401) {
        setFormError({ title: 'Couldn’t log in', message: 'Email or password is incorrect. Check them and try again.' });
        setError('password', { message: 'Check your password.' });
      } else {
        setFormError({
          title: 'Couldn’t log in',
          message: e instanceof Error ? e.message : 'Something went wrong. Try again.',
        });
      }
    }
  });

  return (
    <AuthShell
      title="Log in"
      subtitle={
        <>
          New to EFinSight?{' '}
          <Link to="/signup" className="text-ink-blue-3">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {sessionExpired && !formError ? (
          <Alert tone="info" title="Your session expired">
            Log in again to continue.
            {readString(STORAGE_KEYS.advisorDraft, 'session') ? ' The question you were typing in the advisor has been kept.' : ''}
          </Alert>
        ) : null}
        {formError ? (
          <Alert tone="error" title={formError.title}>
            {formError.message}
          </Alert>
        ) : null}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-2">
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Log in
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
