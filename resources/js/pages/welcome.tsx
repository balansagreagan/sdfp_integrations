import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarDays, Megaphone, Package, Waves } from 'lucide-react';

const highlights = [
    {
        title: 'Packages',
        description: 'Set up and manage park packages, rates, and offerings for operations.',
        icon: Package,
    },
    {
        title: 'Bookings',
        description: 'Record and track bookings from the staff desk — not a public customer portal.',
        icon: CalendarDays,
    },
    {
        title: 'Announcements',
        description: 'Share schedules, weather holds, and internal notices with the team.',
        icon: Megaphone,
    },
    {
        title: 'On the water',
        description: 'Support day-to-day operations of the inflatable water park in Caluya.',
        icon: Waves,
    },
];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Home" />

            <div className="flex min-h-screen flex-col bg-[#041830] text-white">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
                    <Link href={route('home')} className="flex items-center gap-3">
                        <img
                            src="/sdfp.jpg"
                            alt="Sapang Dalaga Floating Playground"
                            className="size-12 rounded-xl object-cover shadow-lg ring-2 ring-white/20"
                        />
                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold tracking-wide">Sapang Dalaga Floating Playground</p>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-3 text-sm">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-full bg-orange-500 px-5 py-2 font-medium text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="rounded-full px-4 py-2 text-sky-100 hover:bg-white/10">
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-full bg-orange-500 px-5 py-2 font-medium text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="flex min-h-[calc(100svh-5rem)] items-center">
                        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-8 lg:grid-cols-2">
                        <div>
                            <p className="mb-3 text-sm font-medium tracking-[0.2em] text-sky-300 uppercase">Sapang Dalaga</p>
                            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                                Floating Playground on the water
                            </h1>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-sky-100/80">
                                The First floating inflatable water park in Misamis Occidental! Located in the scenic waters
                                of Caluya.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#041830] hover:bg-sky-100"
                                    >
                                        Open dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-400"
                                        >
                                            Create staff account
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                                        >
                                            Log in
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 rounded-[2rem] bg-sky-400/20 blur-2xl" />
                            <img
                                src="/sdfp.jpg"
                                alt="Sapang Dalaga Floating Playground logo"
                                className="relative w-full rounded-[1.75rem] object-cover shadow-2xl ring-1 ring-white/15"
                            />
                        </div>
                        </div>
                    </section>

                    <section className="border-t border-white/10 bg-[#062444]">
                        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
                            {highlights.map((item) => (
                                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <item.icon className="mb-4 size-8 text-orange-400" />
                                    <h2 className="text-lg font-semibold">{item.title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-sky-100/70">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-sky-200/60">
                    Sapang Dalaga Floating Playground · Staff portal for bookings, sales, and operations
                </footer>
            </div>
        </>
    );
}
