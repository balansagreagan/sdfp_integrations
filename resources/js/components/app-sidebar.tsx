import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavSection } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    Boxes,
    CalendarDays,
    ChartColumn,
    Clock,
    FileText,
    LayoutGrid,
    LifeBuoy,
    Megaphone,
    Package,
    Receipt,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from './app-logo';

const navSections: NavSection[] = [
    {
        label: 'Operations',
        items: [
            { title: 'Dashboard',        url: '/dashboard',        icon: LayoutGrid,   allowedRoles: ['admin', 'staff'] },
            { title: 'Bookings',          url: '/bookings',         icon: CalendarDays, allowedRoles: ['admin', 'staff'] },
            { title: 'Daily Sales & COH', url: '/daily-sales',      icon: Receipt,      allowedRoles: ['admin', 'staff'] },
            { title: 'Daily Time-In/Out', url: '/attendance',       icon: Clock,        allowedRoles: ['admin', 'staff', 'lifeguard'] },
            { title: 'Packages & Rates',  url: '/packages',         icon: Boxes,        allowedRoles: ['admin', 'staff'] },
            { title: 'Park Inventory',    url: '/inventory',        icon: Package,      allowedRoles: ['admin', 'staff'] },
        ],
    },
    {
        label: 'Management',
        items: [
            { title: 'Payroll & Shifts',  url: '/payroll',          icon: Wallet,       allowedRoles: ['admin', 'staff'] },
            { title: 'Reports & Audits',  url: '/reports',          icon: ChartColumn,  allowedRoles: ['admin'] },
            { title: 'Announcements',     url: '/announcement',     icon: Megaphone,    allowedRoles: ['admin', 'staff', 'lifeguard'] },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'Staff Management', url: '/staff', icon: Users, badge: 'Admin', adminOnly: true, allowedRoles: ['admin'] },
        ],
    },
];

const footerNavItems: NavItem[] = [
    { title: 'Operations Guide', url: '#', icon: FileText },
    { title: 'Safety Protocol',  url: '#', icon: LifeBuoy },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain sections={navSections} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}