import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { router, Link } from '@inertiajs/react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { SubmitButton } from '@/components/SubmitButton';

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPassword() {
  const [status, setStatus] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>();

  function onSubmit(data: ForgotPasswordForm) {
    router.post('/app/forgot-password', data, {
      onSuccess: () => setStatus('パスワードリセットメールを送信しました'),
      onError: (err) => {
        if (err.email) setError('email', { message: err.email });
      },
    });
  }

  return (
    <AuthCard
      title="パスワードをお忘れですか？"
      description="登録済みのメールアドレスを入力してください。パスワードリセットリンクをお送りします。"
    >
      {status && <p className="text-success-600 text-sm mb-4">{status}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="メールアドレス"
          type="email"
          error={errors.email}
          {...register('email', { required: 'メールアドレスを入力してください' })}
        />
        <SubmitButton
          isSubmitting={isSubmitting}
          label="リセットリンクを送信"
          loadingLabel="送信中..."
        />
        <div className="text-sm mt-4">
          <Link href="/app/login" className="text-primary-700 hover:underline">
            ログインに戻る
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
