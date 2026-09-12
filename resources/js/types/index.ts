import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    badge?: string;
    adminOnly?: boolean;
    allowedRoles?: ('admin' | 'staff' | 'lifeguard')[];
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface AttendanceShiftStatus {
    am_status: 'present' | 'absent' | 'day_off' | null;
    pm_status: 'present' | 'absent' | 'day_off' | null;
    ot_hours: number;
}

export interface SidebarEmployee {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    position: { title: string } | null;
    daily_rate: number;
}

export interface SidebarSharedData {
    employees: SidebarEmployee[];
    todayShifts: Record<number, AttendanceShiftStatus>;
    currentPeriodId: number | null;
    today: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebar: SidebarSharedData;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'staff' | 'lifeguard' | string;
    user_type?: 'admin' | 'staff' | 'lifeguard' | string;
    employee?: Employee | null;
    status?: 'active' | 'inactive' | 'suspended' | string;
    avatar?: string;
    last_login_at?: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface Position {
    id: number;
    title: string;
    base_daily_rate: number | string;
    description?: string | null;
}

export interface Employee {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    contact_number?: string | null;
    position_id: number;
    position?: Position;
    daily_rate: number | string;
    user_id?: number | null;
    user?: User | null;
    status: 'active' | 'on_leave' | 'terminated';
    hired_date: string;
    created_at?: string;
    updated_at?: string;
}
