import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Employee, type Position } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Banknote,
    CheckCircle2,
    Clock,
    Edit2,
    LifeBuoy,
    Plus,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Staff Management',
        href: '/staff',
    },
];

interface StaffIndexProps {
    employees: Employee[];
    positions: Position[];
    stats: {
        totalStaff: number;
        activeOnDuty: number;
        lifeguardsCount: number;
        avgDailyRate: number;
    };
    isAdmin: boolean;
}

export default function StaffIndex({ employees = [], positions = [], stats, isAdmin = true }: StaffIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const matchesSearch =
                emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.contact_number && emp.contact_number.includes(searchQuery));

            const matchesPos =
                selectedPosition === 'all' ||
                emp.position?.title.toLowerCase() === selectedPosition.toLowerCase();

            return matchesSearch && matchesPos;
        });
    }, [employees, searchQuery, selectedPosition]);

    // Create Staff Form
    const createForm = useForm({
        first_name: '',
        last_name: '',
        contact_number: '',
        position_id: positions[0]?.id ? String(positions[0].id) : '',
        daily_rate: positions[0]?.base_daily_rate ? String(positions[0].base_daily_rate) : '400.00',
        hired_date: new Date().toISOString().split('T')[0],
        create_account: false,
        email: '',
        password: '',
        role: 'staff',
    });

    // Edit Staff Form
    const editForm = useForm({
        first_name: '',
        last_name: '',
        contact_number: '',
        position_id: '',
        daily_rate: '',
        status: 'active',
    });

    const handleOpenEdit = (emp: Employee) => {
        setEditingEmployee(emp);
        editForm.setData({
            first_name: emp.first_name,
            last_name: emp.last_name,
            contact_number: emp.contact_number || '',
            position_id: String(emp.position_id),
            daily_rate: String(emp.daily_rate),
            status: emp.status,
        });
    };

    const handlePositionChange = (posId: string) => {
        createForm.setData('position_id', posId);
        const pos = positions.find((p) => String(p.id) === posId);
        if (pos) {
            createForm.setData('daily_rate', String(pos.base_daily_rate));
        }
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('staff.store'), {
            onSuccess: () => {
                setIsAddModalOpen(false);
                createForm.reset();
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;

        editForm.put(route('staff.update', editingEmployee.id), {
            onSuccess: () => {
                setEditingEmployee(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Management · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header Title & Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Staff & Operations Team
                            </h1>
                            {isAdmin && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                                    Admin View
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Manage lifeguard credentials, front desk cashiers, utility crew, and weekly compensation rates.
                        </p>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 flex items-center gap-2 self-start sm:self-auto"
                        >
                            <UserPlus className="size-4" />
                            <span>Enroll Staff Member</span>
                        </Button>
                    )}
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-neutral-200/70 bg-gradient-to-br from-sky-50/50 to-white dark:border-neutral-800 dark:from-sky-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                Total Staff Count
                            </CardTitle>
                            <Users className="size-5 text-sky-600 dark:text-sky-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.totalStaff ?? employees.length}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Park operational workforce</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-emerald-50/50 to-white dark:border-neutral-800 dark:from-emerald-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                Active On Duty
                            </CardTitle>
                            <div className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <UserCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.activeOnDuty ?? employees.filter((e) => e.status === 'active').length}
                            </div>
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                                Available for weekly shifts
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-orange-50/50 to-white dark:border-neutral-800 dark:from-orange-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                Inflatable Lifeguards
                            </CardTitle>
                            <LifeBuoy className="size-5 text-orange-600 dark:text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                {stats?.lifeguardsCount ?? 2}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Water safety & dock monitoring</p>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200/70 bg-gradient-to-br from-indigo-50/50 to-white dark:border-neutral-800 dark:from-indigo-950/20 dark:to-neutral-900">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                Avg. Daily Rate
                            </CardTitle>
                            <Banknote className="size-5 text-indigo-600 dark:text-indigo-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                                ₱{Number(stats?.avgDailyRate ?? 420).toFixed(2)}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">Base rate for 8-hour shift</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input
                            placeholder="Search by staff name, code (EMP-001)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-neutral-50/50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-neutral-500">Position:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {['all', 'Lifeguard', 'Office Staff', 'Cashier', 'Utility'].map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => setSelectedPosition(pos)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedPosition === pos
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    {pos === 'all' ? 'All Roles' : pos}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Staff Roster Table */}
                <Card className="border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-neutral-200/80 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                <tr>
                                    <th className="px-6 py-3.5">Staff Code & Name</th>
                                    <th className="px-6 py-3.5">Position & Role</th>
                                    <th className="px-6 py-3.5">Daily Wage Rate</th>
                                    <th className="px-6 py-3.5">Portal Access</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-neutral-500">
                                            No staff members found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp) => {
                                        const initials = `${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`;
                                        const isLifeguard = emp.position?.title.toLowerCase() === 'lifeguard';
                                        const isOffice = emp.position?.title.toLowerCase().includes('office');
                                        const isCashier = emp.position?.title.toLowerCase().includes('cashier');

                                        return (
                                            <tr
                                                key={emp.id}
                                                className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                                            >
                                                {/* Code & Name */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="size-9 ring-1 ring-neutral-200 dark:ring-neutral-700">
                                                            <AvatarFallback
                                                                className={`text-xs font-bold ${
                                                                    isLifeguard
                                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                                                        : isOffice
                                                                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                                                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                                }`}
                                                            >
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                                {emp.first_name} {emp.last_name}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                                <span className="font-mono text-neutral-400">
                                                                    {emp.employee_code}
                                                                </span>
                                                                {emp.contact_number && (
                                                                    <span>· {emp.contact_number}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Position */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                                                            isLifeguard
                                                                ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/25'
                                                                : isOffice
                                                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-1 ring-sky-500/25'
                                                                  : isCashier
                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/25'
                                                                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                        }`}
                                                    >
                                                        {isLifeguard && <LifeBuoy className="size-3" />}
                                                        {emp.position?.title ?? 'Staff'}
                                                    </span>
                                                </td>

                                                {/* Daily Rate */}
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                                        ₱{Number(emp.daily_rate).toFixed(2)}
                                                    </div>
                                                    <div className="text-[11px] text-neutral-400">Per 8h shift</div>
                                                </td>

                                                {/* Login Account */}
                                                <td className="px-6 py-4">
                                                    {emp.user ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                                                <ShieldCheck className="size-3.5 text-emerald-500" />
                                                                <span className="truncate max-w-[140px]">{emp.user.email}</span>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                                                                Role: {emp.user.role}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center text-xs text-neutral-400 italic">
                                                            No web login
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            emp.status === 'active'
                                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                : emp.status === 'on_leave'
                                                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`size-1.5 rounded-full ${
                                                                emp.status === 'active'
                                                                    ? 'bg-emerald-500'
                                                                    : emp.status === 'on_leave'
                                                                      ? 'bg-amber-500'
                                                                      : 'bg-rose-500'
                                                            }`}
                                                        />
                                                        {emp.status === 'active'
                                                            ? 'Active'
                                                            : emp.status === 'on_leave'
                                                              ? 'On Leave'
                                                              : 'Terminated'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                {isAdmin && (
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenEdit(emp)}
                                                            className="h-8 px-2.5 text-xs font-medium"
                                                        >
                                                            <Edit2 className="mr-1.5 size-3" />
                                                            Edit
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Enroll Staff Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Enroll New Staff Member</DialogTitle>
                        <DialogDescription>
                            Create an employee record for park scheduling and weekly payroll.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCreate} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    required
                                    value={createForm.data.first_name}
                                    onChange={(e) => createForm.setData('first_name', e.target.value)}
                                    placeholder="e.g. Maria"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    required
                                    value={createForm.data.last_name}
                                    onChange={(e) => createForm.setData('last_name', e.target.value)}
                                    placeholder="e.g. Santos"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="position_id">Position</Label>
                                <select
                                    id="position_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.position_id}
                                    onChange={(e) => handlePositionChange(e.target.value)}
                                >
                                    {positions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title} (Base: ₱{Number(p.base_daily_rate).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="daily_rate">Daily Rate (₱)</Label>
                                <Input
                                    id="daily_rate"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={createForm.data.daily_rate}
                                    onChange={(e) => createForm.setData('daily_rate', e.target.value)}
                                    placeholder="400.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="contact_number">Contact Number</Label>
                            <Input
                                id="contact_number"
                                value={createForm.data.contact_number}
                                onChange={(e) => createForm.setData('contact_number', e.target.value)}
                                placeholder="09171234567"
                            />
                        </div>

                        {/* Account Access Toggle */}
                        <div className="border-t border-neutral-200/80 dark:border-neutral-800 pt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        Grant System Login Credentials
                                    </div>
                                    <p className="text-xs text-neutral-500">
                                        Allows employee to sign in to the SDFP web application.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="create_account"
                                    checked={createForm.data.create_account}
                                    onChange={(e) => createForm.setData('create_account', e.target.checked)}
                                    className="size-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500"
                                />
                            </div>

                            {createForm.data.create_account && (
                                <div className="space-y-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="account_email">Login Email</Label>
                                        <Input
                                            id="account_email"
                                            type="email"
                                            required={createForm.data.create_account}
                                            value={createForm.data.email}
                                            onChange={(e) => createForm.setData('email', e.target.value)}
                                            placeholder="employee@sdfp.ph"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="account_password">Initial Password</Label>
                                            <Input
                                                id="account_password"
                                                type="password"
                                                required={createForm.data.create_account}
                                                value={createForm.data.password}
                                                onChange={(e) => createForm.setData('password', e.target.value)}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="account_role">Assigned Role</Label>
                                            <select
                                                id="account_role"
                                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                                value={createForm.data.role}
                                                onChange={(e) => createForm.setData('role', e.target.value)}
                                            >
                                                <option value="staff">Staff (Desk & Sales Entry)</option>
                                                <option value="admin">Admin (Full Control)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="bg-sky-600 hover:bg-sky-500 text-white"
                            >
                                {createForm.processing ? 'Enrolling...' : 'Confirm Enrollment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Staff Modal */}
            <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            Edit Staff: {editingEmployee?.first_name} {editingEmployee?.last_name}
                        </DialogTitle>
                        <DialogDescription>
                            Update daily rate, assigned position, or employment status.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitEdit} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_first_name">First Name</Label>
                                <Input
                                    id="edit_first_name"
                                    required
                                    value={editForm.data.first_name}
                                    onChange={(e) => editForm.setData('first_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_last_name">Last Name</Label>
                                <Input
                                    id="edit_last_name"
                                    required
                                    value={editForm.data.last_name}
                                    onChange={(e) => editForm.setData('last_name', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_position_id">Position</Label>
                                <select
                                    id="edit_position_id"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={editForm.data.position_id}
                                    onChange={(e) => editForm.setData('position_id', e.target.value)}
                                >
                                    {positions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_daily_rate">Daily Rate (₱)</Label>
                                <Input
                                    id="edit_daily_rate"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={editForm.data.daily_rate}
                                    onChange={(e) => editForm.setData('daily_rate', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_contact_number">Contact Number</Label>
                            <Input
                                id="edit_contact_number"
                                value={editForm.data.contact_number}
                                onChange={(e) => editForm.setData('contact_number', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_status">Employment Status</Label>
                            <select
                                id="edit_status"
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                value={editForm.data.status}
                                onChange={(e) => editForm.setData('status', e.target.value)}
                            >
                                <option value="active">Active (On Schedule)</option>
                                <option value="on_leave">On Leave</option>
                                <option value="terminated">Terminated</option>
                            </select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingEmployee(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="bg-sky-600 hover:bg-sky-500 text-white"
                            >
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
