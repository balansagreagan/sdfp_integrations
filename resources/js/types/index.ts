import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    user_type?: string;
    allowedPages?: string[];
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
    am_status: 'present' | 'absent' | 'day_off' | 'unrecorded' | null;
    pm_status: 'present' | 'absent' | 'day_off' | 'unrecorded' | null;
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

export interface AppNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
}

export interface SharedData {
    notification?: AppNotification | null;
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
    page_access?: string[] | null;
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
    work_area?: 'park' | 'soaked';
    soaked_assignment?: string | null;
    scheduled_start_time?: string | null;
    scheduled_end_time?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface TicketType {
    id: number;
    code: string;
    name: string;
    category: string;
    variant_name: string | null;
    price: number | string | null;
    pricing_basis: 'per_person' | 'per_booking';
    min_pax: number;
    max_pax: number | null;
    included_pax: number | null;
    duration_hours: number | null;
    duration_label: string | null;
    description: string | null;
    is_active: boolean;
    booking_items_count?: number;
    child_pricing: 'confirm' | 'same' | 'custom' | 'age_based';
    child_price: string | null;
}

export interface AddOnItem {
    id: number;
    code: string;
    name: string;
    unit: string;
    price: string | null;
    is_active: boolean;
    brochure_scope?: 'other' | 'restaurant' | 'water_rides' | 'hotel' | 'drink_bundle';
}

export interface ChildPolicy {
    key: string;
    year: number;
    summary: string;
    regular_price?: string;
    bands: { min: number; max: number | null; percent: number | null; label: string }[];
}
