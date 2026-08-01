import { useForm } from 'react-hook-form';
import { router, Link } from '@inertiajs/react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { SubmitButton } from '@/components/SubmitButton';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export default function Register() {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  function onSubmit(data: RegisterForm) {
    router.post('/app/register', data, {
      onError: (err) => {
        if (err.name) setError('name', { message: err.name });
        if (err.email) setError('email', { message: err.email });
        if (err.password) setError('password', { message: err.password });
      },
    });
  }

  return (
    <AuthCard title="新規登録">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="名前"
          type="text"
          error={errors.name}
          {...register('name', { required: '名前を入力してください' })}
        />
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
        <FormField
          label="パスワード確認"
          type="password"
          error={errors.password_confirmation}
          {...register('password_confirmation', {
            required: 'パスワード確認を入力してください',
            validate: (value) => value === watch('password') || 'パスワードが一致しません',
          })}
        />
        <SubmitButton isSubmitting={isSubmitting} label="新規登録" loadingLabel="登録中..." />
        <div className="flex justify-between text-sm mt-4">
          <Link href="/app/login" className="text-primary-700 hover:underline">
            ログインはこちら
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
