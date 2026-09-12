import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export interface NavSection {
    label: string;
    items: NavItem[];
}

export function NavMain({ sections = [] }: { sections: NavSection[] }) {
    const page = usePage<SharedData>();
    const auth = page.props.auth as any;
    const userType: 'admin' | 'staff' | 'lifeguard' = auth?.user_type || auth?.user?.user_type || auth?.user?.role || 'staff';
    const isAdmin = userType === 'admin';

    return (
        <div className="flex flex-col gap-3 py-1">
            {sections.map((section) => {
                // Filter items based on allowedRoles or adminOnly
                const visibleItems = section.items.filter((item) => {
                    if (item.allowedRoles && item.allowedRoles.length > 0) {
                        return item.allowedRoles.includes(userType);
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
                                const isActive = page.url === item.url || page.url.startsWith(`${item.url}/`);

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
                                            <Link href={item.url} prefetch className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2.5">
                                                    {item.icon && (
                                                        <item.icon
                                                            className={`size-4 transition-colors ${
                                                                isActive ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-500 dark:text-neutral-400'
                                                            }`}
                                                        />
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                </div>
                                                {item.badge && (
                                                    <span
                                                        className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                            item.badge === 'Admin'
                                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
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
