import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export interface NavSection {
    label: string;
    items: NavItem[];
}

export function NavMain({ sections = [] }: { sections: NavSection[] }) {
    const page = usePage<SharedData>();
    const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
    const currentPath = page.url.split('?')[0];
    const auth = page.props.auth;
    const userType = auth?.user_type || auth?.user?.user_type || auth?.user?.role || 'staff';
    const isAdmin = userType === 'admin';
    const pageAccess: string[] | null = auth?.user?.page_access ?? null;

    return (
        <div className="flex flex-col gap-3 py-1">
            {sections.map((section) => {
                // Filter items based on allowedRoles or adminOnly
                const visibleItems = section.items.filter((item) => {
                    if (auth.allowedPages) return auth.allowedPages.includes(item.url.replace(/^\//, '').split('/')[0]);
                    if (!isAdmin && pageAccess !== null) {
                        const pageKey = item.url.replace(/^\//, '').split('/')[0];
                        return pageAccess.includes(pageKey);
                    }
                    if (item.allowedRoles && item.allowedRoles.length > 0) {
                        return item.allowedRoles.some((role) => role === userType);
                    }
                    return !item.adminOnly || isAdmin;
                });

                if (visibleItems.length === 0) return null;

                return (
                    <SidebarGroup key={section.label} className="px-2 py-0">
                        <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                            {section.label}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {visibleItems.map((item) => {
                                const isActive = currentPath === item.url || currentPath.startsWith(`${item.url}/`);

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={`transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-sky-500/10 font-medium text-sky-600 dark:bg-sky-500/20 dark:text-sky-300'
                                                    : 'hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
                                            }`}
                                        >
                                            <Link
                                                href={item.url}
                                                onBefore={() => {
                                                    router.flushAll();
                                                }}
                                                onStart={() => setLoadingUrl(item.url)}
                                                onFinish={() => setLoadingUrl((current) => (current === item.url ? null : current))}
                                                aria-busy={loadingUrl === item.url}
                                                className="flex w-full items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    {loadingUrl === item.url ? (
                                                        <LoaderCircle className="size-4 animate-spin" aria-label="Loading page" />
                                                    ) : (
                                                        item.icon && (
                                                            <item.icon
                                                                className={`size-4 transition-colors ${
                                                                    isActive
                                                                        ? 'text-sky-600 dark:text-sky-400'
                                                                        : 'text-neutral-500 dark:text-neutral-400'
                                                                }`}
                                                            />
                                                        )
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                </div>
                                                {item.badge && (
                                                    <span
                                                        className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                                            item.badge === 'Admin'
                                                                ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400'
                                                                : 'bg-neutral-200/70 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                                        }`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
        </div>
    );
}
