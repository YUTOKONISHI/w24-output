import { Link, router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { login } from '@/routes';
import password from '@/routes/password';

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPassword() {
  const form = useForm<ForgotPasswordForm>({ defaultValues: { email: '' } });
  const { isSubmitting } = form.formState;

  function onSubmit(data: ForgotPasswordForm) {
    router.post(password.email.url(), data, {
      onSuccess: () => toast.success('パスワードリセットメールを送信しました'),
      onError: (err) => {
        if (err.email) {
          form.setError('email', { message: err.email });
        }
      },
    });
  }

  return (
    <AuthCard
      title="パスワードをお忘れですか？"
      description="登録済みのメールアドレスを入力してください。パスワードリセットリンクをお送りします。"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            rules={{ required: 'メールアドレスを入力してください' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '送信中...' : 'リセットリンクを送信'}
          </Button>
          <div className="text-sm mt-4">
            <Link href={login.url()} className="text-primary-700 hover:underline">
              ログインに戻る
            </Link>
          </div>
        </form>
      </Form>
    </AuthCard>
  );
}
