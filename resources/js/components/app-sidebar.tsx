import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavSection } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
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
    ShieldCheck,
    Users,
    UtensilsCrossed,
    Wallet,
    Wrench,
} from 'lucide-react';
import AppLogo from './app-logo';

const navSections: NavSection[] = [
    {
        label: 'Operations',
        items: [
            { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid, allowedRoles: ['admin', 'staff'] },
            { title: 'Monitoring Center', url: '/monitoring', icon: Activity, allowedRoles: ['admin', 'staff', 'lifeguard'] },
            { title: 'Sales Reports', url: '/sales-reports', icon: ChartColumn, allowedRoles: ['admin', 'staff'] },
            { title: 'Bookings', url: '/bookings', icon: CalendarDays, allowedRoles: ['admin', 'staff'] },
            { title: 'Daily Sales & COH', url: '/daily-sales', icon: Receipt, allowedRoles: ['admin', 'staff'] },
            { title: 'Daily Time-In/Out', url: '/attendance', icon: Clock, allowedRoles: ['admin', 'staff'] },
            { title: 'Packages & Rates', url: '/packages', icon: Boxes, allowedRoles: ['admin', 'staff'] },
            { title: 'Park Inventory', url: '/inventory', icon: Package, allowedRoles: ['admin', 'staff'] },
            { title: 'Soaked Inventory', url: '/soaked-inventory', icon: UtensilsCrossed, allowedRoles: ['admin', 'staff'] },
            { title: 'Maintenance Reports', url: '/maintenance', icon: Wrench, allowedRoles: ['admin', 'staff', 'lifeguard'] },
        ],
    },
    {
        label: 'Management',
        items: [
            { title: 'Payroll & Shifts', url: '/payroll', icon: Wallet, allowedRoles: ['admin', 'staff'] },
            { title: 'SOAKED Payroll', url: '/soaked-payroll', icon: Wallet, allowedRoles: ['admin', 'staff'] },
            { title: 'Reports & Audits', url: '/reports', icon: ChartColumn, allowedRoles: ['admin'] },
            { title: 'Announcements', url: '/announcement', icon: Megaphone, allowedRoles: ['admin', 'staff', 'lifeguard'] },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'Staff Management', url: '/staff', icon: Users, badge: 'Admin', adminOnly: true, allowedRoles: ['admin'] },
            { title: 'SOAKED Staff', url: '/soaked-staff', icon: UtensilsCrossed, badge: 'Admin', adminOnly: true, allowedRoles: ['admin'] },
            { title: 'User Access', url: '/user-access', icon: ShieldCheck, badge: 'Admin', adminOnly: true, allowedRoles: ['admin'] },
        ],
    },
];

const footerNavItems: NavItem[] = [
    { title: 'Operations Guide', url: '#', icon: FileText },
    { title: 'Safety Protocol', url: '#', icon: LifeBuoy },
];

export function AppSidebar() {
    const allowedPages = usePage<SharedData>().props.auth.allowedPages ?? [];
    const home = allowedPages.includes('monitoring') ? '/monitoring' : `/${allowedPages[0] ?? 'settings/profile'}`;
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home}>
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
