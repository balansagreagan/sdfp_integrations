import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Create a staff account." description="Staff registration only. Customers cannot use this system.">
            <Head title="Register" />
            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-1.5">
                    <Label htmlFor="name" className="text-xs font-medium text-slate-500">
                        Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing}
                        placeholder="Full name"
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-500">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        tabIndex={2}
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled={processing}
                        placeholder="email@example.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-500">
                        Password
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        tabIndex={3}
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        disabled={processing}
                        placeholder="Password"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="password_confirmation" className="text-xs font-medium text-slate-500">
                        Confirm password
                    </Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        required
                        tabIndex={4}
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        disabled={processing}
                        placeholder="Confirm password"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-sm text-slate-500 sm:text-left">
                        Already have an account?{' '}
                        <TextLink href={route('login')} className="font-semibold text-orange-500 no-underline hover:underline" tabIndex={6}>
                            Log in
                        </TextLink>
                    </p>
                    <Button
                        type="submit"
                        className="h-10 w-full rounded-full bg-orange-500 px-8 text-white hover:bg-orange-400 sm:w-auto"
                        tabIndex={5}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Sign up
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
