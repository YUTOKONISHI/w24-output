import { useForm } from 'react-hook-form';
import { resetPassword } from '@/features/auth/api';
import { AuthCard } from '@/shared/components/AuthCard';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

type ResetPasswordForm = {
  email: string;
  temporary_password: string;
  password: string;
  password_confirmation: string;
};

export default function ResetPassword() {
  const form = useForm<ResetPasswordForm>({
    defaultValues: {
      email: '',
      temporary_password: '',
      password: '',
      password_confirmation: '',
    },
  });
  const { isSubmitting } = form.formState;

  function onSubmit(data: ResetPasswordForm) {
    resetPassword(data, {
      onError: (err) => {
        (['email', 'temporary_password', 'password'] as const).forEach((field) => {
          if (err[field]) {
            form.setError(field, { message: err[field] });
          }
        });
      },
    });
  }

  return (
    <AuthCard
      title="新しいパスワードを設定"
      description="メールに記載された仮パスワードと、新しいパスワードを入力してください。"
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
          <FormField
            control={form.control}
            name="temporary_password"
            rules={{ required: '仮パスワードを入力してください' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>仮パスワード</FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="off" {...field} />
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
