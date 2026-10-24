import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

interface Props {
    users: User[];
    pages: Record<string, string>;
    rolePageAccess: Record<string, string[]>;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User Access', href: '/user-access' }];

function UserPermissions({ user, pages, rolePageAccess }: { user: User; pages: Record<string, string>; rolePageAccess: Record<string, string[]> }) {
    const hasCustomAccess = user.page_access !== null && user.page_access !== undefined;
    const positionLabel = user.employee?.position?.title ?? user.role;
    const form = useForm<{ page_access: string[] }>({ page_access: user.page_access ?? rolePageAccess[user.user_type ?? user.role] ?? [] });
    const toggle = (key: string, checked: boolean) =>
        form.setData('page_access', checked ? [...form.data.page_access, key] : form.data.page_access.filter((item) => item !== key));

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">{user.name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">{positionLabel}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-3 text-sm">
                    {hasCustomAccess
                        ? 'Custom access is active for this user.'
                        : 'These checks show the access currently granted by this user’s role.'}{' '}
                    Select exactly the pages this user may open; saving creates a custom access rule. Leaving every option unchecked blocks all
                    application pages.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(pages).map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={form.data.page_access.includes(key)} onCheckedChange={(checked) => toggle(key, checked === true)} />{' '}
                            {label}
                        </label>
                    ))}
                </div>
                <Button
                    className="mt-5 w-full sm:w-auto"
                    disabled={form.processing}
                    onClick={() => form.put(`/user-access/${user.id}`, { preserveScroll: true })}
                >
                    Save access
                </Button>
                {hasCustomAccess && (
                    <Button
                        className="mt-3 w-full sm:ml-3 sm:w-auto"
                        variant="outline"
                        disabled={form.processing}
                        onClick={() => {
                            router.put(
                                `/user-access/${user.id}`,
                                { page_access: null },
                                {
                                    preserveScroll: true,
                                    onSuccess: () => form.setData('page_access', rolePageAccess[user.user_type ?? user.role] ?? []),
                                },
                            );
                        }}
                    >
                        Restore role defaults
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function UserAccessIndex({ users, pages, rolePageAccess }: Props) {
    const sdfpEmployees = users.filter((user) => user.employee?.work_area !== 'soaked');
    const soakedEmployees = users.filter((user) => user.employee?.work_area === 'soaked');

    const section = (title: string, description: string, members: User[]) => (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {members.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {members.map((user) => (
                        <UserPermissions key={user.id} user={user} pages={pages} rolePageAccess={rolePageAccess} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-muted-foreground py-6 text-sm">No employee accounts are available in this group.</CardContent>
                </Card>
            )}
        </section>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Access" />
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <ShieldCheck className="size-7 shrink-0 text-sky-600" />
                    <div>
                        <h1 className="text-2xl font-semibold sm:text-3xl">User page access</h1>
                        <p className="text-muted-foreground text-sm">Control which protected pages each individual user can access.</p>
                    </div>
                </div>
                {section('SDFP Employees', 'Accounts assigned to SDFP park operations.', sdfpEmployees)}
                {section('SOAKED Employees', 'Accounts assigned to SOAKED restaurant operations.', soakedEmployees)}
            </div>
        </AppLayout>
    );
}
