import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { router } from '@inertiajs/react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { SubmitButton } from '@/components/SubmitButton';

type LoginForm = {
  name: string;
  password: string;
};

export default function AdminLogin() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();
  const [authError, setAuthError] = useState<string | null>(null);

  function onSubmit(data: LoginForm) {
    setAuthError(null);
    router.post('/admin/login', data, {
      onError: (err) => {
        if (err.auth_error) {
          setAuthError(err.auth_error);
        } else {
          if (err.name) setError('name', { message: err.name });
          if (err.password) setError('password', { message: err.password });
        }
      },
    });
  }

  return (
    <AuthCard title="管理者ログイン">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="名前"
          type="text"
          error={errors.name}
          {...register('name', {
            required: '名前を入力してください',
          })}
        />
        <FormField
          label="パスワード"
          type="password"
          error={errors.password}
          {...register('password', {
            required: 'パスワードを入力してください',
          })}
        />
        {authError && <p className="text-danger-600 text-sm">{authError}</p>}
        <SubmitButton
          isSubmitting={isSubmitting}
          label="ログイン"
          loadingLabel="ログイン中..."
        />
      </form>
    </AuthCard>
  );
}