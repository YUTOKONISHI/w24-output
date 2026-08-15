import { Link, router } from '@inertiajs/react';
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
import { login } from '@/routes';
import register from '@/routes/register';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export default function Register() {
  const form = useForm<RegisterForm>({
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });
  const { isSubmitting } = form.formState;

  function onSubmit(data: RegisterForm) {
    router.post(register.store.url(), data, {
      onError: (err) => {
        (['name', 'email', 'password'] as const).forEach((field) => {
          if (err[field]) {
            form.setError(field, { message: err[field] });
          }
        });
      },
    });
  }

  return (
    <AuthCard title="新規登録">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: '名前を入力してください' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>名前</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                <FormLabel>パスワード</FormLabel>
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
                <FormLabel>パスワード確認</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '登録中...' : '新規登録'}
          </Button>
          <div className="flex justify-between text-sm mt-4">
            <Link href={login.url()} className="text-primary-700 hover:underline">
              ログインはこちら
            </Link>
          </div>
        </form>
      </Form>
    </AuthCard>
  );
}
