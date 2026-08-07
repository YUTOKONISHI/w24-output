import { router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
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
  const form = useForm<ResetPasswordForm>({
    defaultValues: { email, password: '', password_confirmation: '' },
  });
  const { isSubmitting } = form.formState;

  function onSubmit(data: ResetPasswordForm) {
    router.post('/app/reset-password', { ...data, token }, {
      onError: (err) => {
        (['email', 'password'] as const).forEach((field) => {
          if (err[field]) {
            form.setError(field, { message: err[field] });
          }
        });
      },
    });
  }

  return (
    <AuthCard title="新しいパスワードを設定">
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
          <FormField
            control={form.control}
            name="password"
            rules={{
              required: 'パスワードを入力してください',
              minLength: { value: 8, message: 'パスワードは8文字以上で入力してください' },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password_confirmation"
            rules={{
              required: 'パスワード確認を入力してください',
              validate: (value) =>
                value === form.getValues('password') || 'パスワードが一致しません',
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード確認</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '更新中...' : 'パスワードを更新'}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
