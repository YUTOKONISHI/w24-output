import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { router, Link } from '@inertiajs/react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { SubmitButton } from '@/components/SubmitButton';

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();
  const [authError, setAuthError] = useState<string | null>(null);

  function onSubmit(data: LoginForm) {
    setAuthError(null);
    router.post('/app/login', data, {
      onError: (err) => {
        if (err.auth_error) {
          setAuthError(err.auth_error);
        } else {
          if (err.email) setError('email', { message: err.email });
          if (err.password) setError('password', { message: err.password });
        }
      },
    });
  }

  return (
    <AuthCard title="ログイン">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="メールアドレス"
          type="email"
          error={errors.email}
          {...register('email', { required: 'メールアドレスを入力してください' })}
        />
        <FormField
          label="パスワード"
          type="password"
          error={errors.password}
          {...register('password', {
            required: 'パスワードを入力してください',
            minLength: { value: 8, message: 'パスワードは8文字以上で入力してください' },
          })}
        />
        {authError && <p className="text-danger-600 text-sm">{authError}</p>}
        <SubmitButton isSubmitting={isSubmitting} label="ログイン" loadingLabel="ログイン中..." />
        <div className="flex justify-between text-sm mt-4">
          <Link href="/app/forgot-password" className="text-primary-700 hover:underline">
            パスワードをお忘れですか？
          </Link>
          <Link href="/app/register" className="text-primary-700 hover:underline">
            新規登録はこちら
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
