import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative min-h-svh overflow-hidden bg-[#041830] text-white">
            <div className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="pointer-events-none absolute right-[-8%] bottom-[-12%] size-80 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="pointer-events-none absolute top-[30%] left-[40%] size-56 rounded-full bg-sky-300/10 blur-3xl" />

            <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl lg:grid-cols-2">
                <div className="flex flex-col items-center px-6 pt-10 text-center lg:items-start lg:justify-center lg:px-12 lg:pt-0 lg:text-left">
                    <Link href={route('home')} className="mb-8 flex items-center gap-3 lg:mb-14">
                        <AppLogoIcon className="size-11 rounded-full object-cover ring-2 ring-white/20" />
                        <span className="text-lg font-medium tracking-wide sm:text-xl">Sapang Dalaga Floating Playground</span>
                    </Link>

                    <h1 className="max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{title}</h1>
                    <p className="mt-4 max-w-md text-sm text-sky-100/80 sm:text-base">{description}</p>
                </div>

                <div className="flex items-center justify-center px-6 py-8 lg:px-10">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 text-[#041830] shadow-xl sm:p-8 [&_input]:h-11 [&_input]:rounded-lg [&_input]:border-slate-200 [&_input]:bg-white [&_input]:shadow-none [&_input]:focus-visible:ring-orange-500 [&_input]:focus-visible:ring-offset-0 [&_input:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff]">
                        {children}
                    </div>
                </div>
            </div>

            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-sky-200/50">
                © {new Date().getFullYear()} Sapang Dalaga Floating Playground. All rights reserved.
            </p>
        </div>
    );
}
