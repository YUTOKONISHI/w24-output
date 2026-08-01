import { useForm } from 'react-hook-form';
import { router } from '@inertiajs/react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { SubmitButton } from '@/components/SubmitButton';

type ResetPasswordForm = {
  email: string;
  password: string;
  password_confirmation: string;
};

type Props = {
  token: string;
  email: string;
};

export default function ResetPassword({ token, email }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    defaultValues: { email },
  });

  function onSubmit(data: ResetPasswordForm) {
    router.post('/app/reset-password', { ...data, token }, {
      onError: (err) => {
        if (err.email) setError('email', { message: err.email });
        if (err.password) setError('password', { message: err.password });
      },
    });
  }

  return (
    <AuthCard title="新しいパスワードを設定">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="メールアドレス"
          type="email"
          error={errors.email}
          {...register('email', { required: 'メールアドレスを入力してください' })}
        />
        <FormField
          label="新しいパスワード"
          type="password"
          error={errors.password}
          {...register('password', {
            required: 'パスワードを入力してください',
            minLength: { value: 8, message: 'パスワードは8文字以上で入力してください' },
          })}
        />
        <FormField
          label="新しいパスワード確認"
          type="password"
          error={errors.password_confirmation}
          {...register('password_confirmation', {
            required: 'パスワード確認を入力してください',
            validate: (value) => value === watch('password') || 'パスワードが一致しません',
          })}
        />
        <SubmitButton
          isSubmitting={isSubmitting}
          label="パスワードを更新"
          loadingLabel="更新中..."
        />
      </form>
    </AuthCard>
  );
}
