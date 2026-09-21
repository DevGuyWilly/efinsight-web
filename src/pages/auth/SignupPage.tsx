import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isApiError } from '@/api/client';
import { Alert } from '@/components/feedback/Alert';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/stores/auth';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.'),
  lastName: z.string().trim().min(1, 'Enter your last name.'),
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});
type FormValues = z.infer<typeof schema>;

const FIELDS = ['firstName', 'lastName', 'email', 'password'] as const;

export default function SignupPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerAccount({ ...values, email: values.email.trim() });
      // New accounts have no bank yet: next step is connecting one.
      navigate('/onboarding/bank', { replace: true });
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
        // "Email already exists" comes back without a field name.
        if (!placed && /email/i.test(e.message)) {
          setError('email', { message: e.message });
          placed = true;
        }
        if (!placed) setFormError(e.message);
      } else {
        setFormError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      }
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-ink-blue-3">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <Alert tone="error" title="Couldn’t create your account">
            {formError}
          </Alert>
        ) : null}
        <div className="flex gap-3">
          <Field label="First name" autoComplete="given-name" placeholder="Jamie" error={errors.firstName?.message} {...register('firstName')} />
          <Field label="Last name" autoComplete="family-name" placeholder="Carter" error={errors.lastName?.message} {...register('lastName')} />
        </div>
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
          autoComplete="new-password"
          hint="Use at least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-2">
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Create account
          </Button>
        </div>
        <span className="text-xs leading-normal text-ink-gray-5">
          By creating an account you agree to the{' '}
          <a href="#" className="text-ink-blue-3">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-ink-blue-3">
            Privacy policy
          </a>
          .
        </span>
      </form>
    </AuthShell>
  );
}
