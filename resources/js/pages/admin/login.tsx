import { router } from '@inertiajs/react';
import { useState } from 'react';
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
import admin from '@/routes/admin';

type LoginForm = {
  name: string;
  password: string;
};

export default function AdminLogin() {
  const form = useForm<LoginForm>({ defaultValues: { name: '', password: '' } });
  const { isSubmitting } = form.formState;
  const [authError, setAuthError] = useState<string | null>(null);

  function onSubmit(data: LoginForm) {
    setAuthError(null);

    // routes/web.php の POST /admin/login には名前が付いていないため Wayfinder が
    // 生成しない。URL の同じ GET 側の定義を使う。
    router.post(admin.login.url(), data, {
      onError: (err) => {
        if (err.auth_error) {
          setAuthError(err.auth_error);

          return;
        }

        (['name', 'password'] as const).forEach((field) => {
          if (err[field]) {
            form.setError(field, { message: err[field] });
          }
        });
      },
    });
  }

  return (
    <AuthCard title="管理者ログイン">
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
            name="password"
            rules={{ required: 'パスワードを入力してください' }}
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
          {authError && <p className="text-danger-600 text-sm">{authError}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
