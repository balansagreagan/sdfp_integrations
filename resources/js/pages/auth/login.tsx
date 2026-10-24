import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Log in to your account." description="Staff portal only. This system is not for customers.">
            <Head title="Log in" />

            {status && <div className="mb-4 text-sm font-medium text-green-600">{status}</div>}

            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-500">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="email@example.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="password" className="text-xs font-medium text-slate-500">
                            Password
                        </Label>
                        {canResetPassword && (
                            <TextLink href={route('password.request')} className="text-xs text-slate-500 no-underline hover:underline" tabIndex={5}>
                                Forgot password?
                            </TextLink>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        required
                        tabIndex={2}
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Password"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox id="remember" name="remember" tabIndex={3} />
                    <Label htmlFor="remember" className="text-sm font-normal text-slate-600">
                        Remember me
                    </Label>
                </div>

                <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-sm text-slate-500 sm:text-left">
                        Don't have an account?{' '}
                        <TextLink href={route('register')} className="font-semibold text-orange-500 no-underline hover:underline" tabIndex={5}>
                            Sign up
                        </TextLink>
                    </p>
                    <Button
                        type="submit"
                        className="h-10 w-full rounded-full bg-orange-500 px-8 text-white hover:bg-orange-400 sm:w-auto"
                        tabIndex={4}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Login
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
