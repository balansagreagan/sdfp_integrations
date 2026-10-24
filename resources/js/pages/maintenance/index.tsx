import { FormErrors } from '@/components/form-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Wrench } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Status = 'open' | 'in_progress' | 'resolved';
type Priority = 'normal' | 'high' | 'urgent';
type Person = { id: number; name: string };
type Report = {
    id: number;
    asset_name: string;
    description: string;
    location: string;
    status: Status;
    priority: Priority;
    assigned_to: number | null;
    due_date: string | null;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    reporter: Person | null;
    assignee: Person | null;
    updates: { id: number; status: Status; notes: string | null; user: Person | null; assignee: Person | null; created_at: string }[];
};
type Props = {
    reports: { data: Report[]; current_page: number; last_page: number; total: number; prev_page_url: string | null; next_page_url: string | null };
    stats: { open: number; inProgress: number; resolved: number; overdue: number };
    filters: { status?: string; priority?: string; search?: string };
    inventoryItems: { id: number; name: string; inventory_location: string }[];
    assignees: Person[];
    isAdmin: boolean;
    currentUserId: number;
};
const statusLabels: Record<Status, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{label}</span>
            {children}
        </label>
    );
}

export default function MaintenanceReports({ reports, stats, filters, inventoryItems, assignees, isAdmin, currentUserId }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Report | null>(null);
    const createForm = useForm({ asset_name: '', location: 'park', inventory_item_id: '' as number | '', description: '', priority: 'normal' });
    const filterForm = useForm({ search: filters.search ?? '', status: filters.status ?? '', priority: filters.priority ?? '' });
    const updateForm = useForm({
        status: 'open' as Status,
        assigned_to: '' as number | '',
        priority: 'normal' as Priority,
        due_date: '',
        resolution_notes: '',
    });
    const canUpdate = selected && (isAdmin || selected.assigned_to === currentUserId);
    const showReport = (report: Report) => {
        updateForm.clearErrors();
        updateForm.setData({
            status: report.status,
            assigned_to: report.assigned_to ?? '',
            priority: report.priority,
            due_date: report.due_date ?? '',
            resolution_notes: report.resolution_notes ?? '',
        });
        setSelected(report);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Maintenance Reports', href: '/maintenance' }]}>
            <Head title="Maintenance Reports" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Wrench className="size-6 text-sky-600" />
                            Maintenance reports
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {isAdmin
                                ? 'Review staff submissions, assign repairs, and track completion.'
                                : 'Report equipment or facility issues and follow reports you submitted or were assigned.'}
                        </p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Submit report
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        [stats.open, 'Open reports'],
                        [stats.inProgress, 'In progress'],
                        [stats.resolved, 'Resolved'],
                        [stats.overdue, 'Overdue'],
                    ].map(([value, label]) => (
                        <Card key={label}>
                            <CardContent className="p-5">
                                <p className="text-muted-foreground text-sm">{label}</p>
                                <p className="mt-2 text-2xl font-semibold">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-4">
                        <form
                            className="flex flex-wrap items-end gap-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                filterForm.get('/maintenance', { preserveState: true, preserveScroll: true });
                            }}
                        >
                            <div className="min-w-48 flex-1">
                                <Field label="Search reports">
                                    <Input
                                        placeholder="Equipment, facility, or issue"
                                        value={filterForm.data.search}
                                        onChange={(event) => filterForm.setData('search', event.target.value)}
                                    />
                                </Field>
                            </div>
                            <Field label="Status">
                                <select
                                    className={inputClass}
                                    value={filterForm.data.status}
                                    onChange={(event) => filterForm.setData('status', event.target.value)}
                                >
                                    <option value="">All statuses</option>
                                    {Object.entries(statusLabels).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Priority">
                                <select
                                    className={inputClass}
                                    value={filterForm.data.priority}
                                    onChange={(event) => filterForm.setData('priority', event.target.value)}
                                >
                                    <option value="">All priorities</option>
                                    {['normal', 'high', 'urgent'].map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                            </Field>
                            <Button variant="outline" disabled={filterForm.processing}>
                                Apply filters
                            </Button>
                        </form>
                        <FormErrors errors={filterForm.errors} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Report register</CardTitle>
                        <CardDescription>{reports.total} reports in this view. Open a report to see its details and update history.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-muted-foreground border-b text-xs">
                                    <tr>
                                        {['Equipment / facility', 'Priority', 'Status', 'Reported by', 'Assigned to', 'Due date', ''].map(
                                            (label, index) => (
                                                <th key={index} className="px-3 py-3">
                                                    {label || <span className="sr-only">Actions</span>}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.data.map((report) => (
                                        <tr key={report.id} className="hover:bg-muted/40 border-b last:border-0">
                                            <td className="px-3 py-4">
                                                <button className="text-left font-medium hover:underline" onClick={() => showReport(report)}>
                                                    {report.asset_name}
                                                </button>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    #{report.id} · {report.location === 'park' ? 'Park' : 'Restaurant'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-4">
                                                <Badge variant={report.priority === 'urgent' ? 'destructive' : 'outline'}>{report.priority}</Badge>
                                            </td>
                                            <td className="px-3 py-4">
                                                <Badge variant={report.status === 'resolved' ? 'secondary' : 'outline'}>
                                                    {statusLabels[report.status]}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-4">{report.reporter?.name ?? 'Former user'}</td>
                                            <td className="px-3 py-4">{report.assignee?.name ?? 'Unassigned'}</td>
                                            <td className="px-3 py-4">{report.due_date ?? 'Not scheduled'}</td>
                                            <td className="px-3 py-4">
                                                <Button size="sm" variant="outline" onClick={() => showReport(report)}>
                                                    {isAdmin || report.assigned_to === currentUserId ? 'Manage' : 'View'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!reports.data.length && (
                                        <tr>
                                            <td colSpan={7} className="text-muted-foreground p-10 text-center">
                                                No maintenance reports match this view.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3">
                            <Button size="sm" variant="outline" disabled={!reports.prev_page_url} asChild={!!reports.prev_page_url}>
                                {reports.prev_page_url ? <Link href={reports.prev_page_url}>Previous</Link> : 'Previous'}
                            </Button>
                            <span className="text-muted-foreground text-xs">
                                Page {reports.current_page} of {reports.last_page}
                            </span>
                            <Button size="sm" variant="outline" disabled={!reports.next_page_url} asChild={!!reports.next_page_url}>
                                {reports.next_page_url ? <Link href={reports.next_page_url}>Next</Link> : 'Next'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submit a maintenance report</DialogTitle>
                        <DialogDescription>
                            Describe the issue so an administrator can assign the repair to the appropriate staff member.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            createForm.post('/maintenance', {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setCreateOpen(false);
                                    createForm.reset();
                                },
                            });
                        }}
                    >
                        <FormErrors errors={createForm.errors} />
                        <Field label="Location">
                            <select
                                className={inputClass}
                                value={createForm.data.location}
                                onChange={(event) => createForm.setData({ ...createForm.data, location: event.target.value, inventory_item_id: '' })}
                            >
                                <option value="park">Park</option>
                                <option value="soaked_restaurant">Soaked Restaurant</option>
                            </select>
                        </Field>
                        {inventoryItems.length > 0 && (
                            <Field label="Link an inventory item (optional)">
                                <select
                                    className={inputClass}
                                    value={createForm.data.inventory_item_id}
                                    onChange={(event) => {
                                        const item = inventoryItems.find((item) => item.id === Number(event.target.value));
                                        createForm.setData({
                                            ...createForm.data,
                                            inventory_item_id: item?.id ?? '',
                                            asset_name: item?.name ?? createForm.data.asset_name,
                                        });
                                    }}
                                >
                                    <option value="">Facility or other equipment</option>
                                    {inventoryItems
                                        .filter((item) => item.inventory_location === createForm.data.location)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                </select>
                            </Field>
                        )}
                        <Field label="Equipment or facility name">
                            <Input
                                required
                                maxLength={150}
                                value={createForm.data.asset_name}
                                onChange={(event) => createForm.setData('asset_name', event.target.value)}
                                placeholder="e.g. Main slide anchor or kitchen refrigerator"
                            />
                        </Field>
                        <Field label="Issue description">
                            <textarea
                                className={inputClass}
                                required
                                maxLength={5000}
                                rows={4}
                                value={createForm.data.description}
                                onChange={(event) => createForm.setData('description', event.target.value)}
                                placeholder="What needs attention, where it is, and what you observed"
                            />
                        </Field>
                        <Field label="Priority">
                            <select
                                className={inputClass}
                                value={createForm.data.priority}
                                onChange={(event) => createForm.setData('priority', event.target.value)}
                            >
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={createForm.processing}>Submit report</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!selected}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Report #{selected?.id}: {selected?.asset_name}
                        </DialogTitle>
                        <DialogDescription>
                            Submitted {selected ? new Date(selected.created_at).toLocaleString() : ''} by {selected?.reporter?.name ?? 'Former user'}
                        </DialogDescription>
                    </DialogHeader>
                    <p className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">{selected?.description}</p>
                    {selected?.resolved_at && (
                        <p className="text-muted-foreground text-sm">Resolved {new Date(selected.resolved_at).toLocaleString()}</p>
                    )}
                    {canUpdate && (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (!selected) return;
                                updateForm.transform((data) => (isAdmin ? data : { status: data.status, resolution_notes: data.resolution_notes }));
                                updateForm.put(`/maintenance/${selected.id}`, { preserveScroll: true, onSuccess: () => setSelected(null) });
                            }}
                        >
                            <FormErrors errors={updateForm.errors} />
                            {isAdmin && (
                                <>
                                    <Field label="Assign staff">
                                        <select
                                            className={inputClass}
                                            value={updateForm.data.assigned_to}
                                            onChange={(event) =>
                                                updateForm.setData('assigned_to', event.target.value ? Number(event.target.value) : '')
                                            }
                                        >
                                            <option value="">Unassigned</option>
                                            {assignees.map((staff) => (
                                                <option key={staff.id} value={staff.id}>
                                                    {staff.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Priority">
                                            <select
                                                className={inputClass}
                                                value={updateForm.data.priority}
                                                onChange={(event) => updateForm.setData('priority', event.target.value as Priority)}
                                            >
                                                {['normal', 'high', 'urgent'].map((priority) => (
                                                    <option key={priority}>{priority}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Due date">
                                            <Input
                                                type="date"
                                                value={updateForm.data.due_date}
                                                onChange={(event) => updateForm.setData('due_date', event.target.value)}
                                            />
                                        </Field>
                                    </div>
                                </>
                            )}
                            <Field label="Status">
                                <select
                                    className={inputClass}
                                    value={updateForm.data.status}
                                    onChange={(event) => updateForm.setData('status', event.target.value as Status)}
                                >
                                    {Object.entries(statusLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={updateForm.data.status === 'resolved' ? 'Resolution notes (required)' : 'Progress notes'}>
                                <textarea
                                    className={inputClass}
                                    rows={3}
                                    maxLength={5000}
                                    required={updateForm.data.status === 'resolved'}
                                    value={updateForm.data.resolution_notes}
                                    onChange={(event) => updateForm.setData('resolution_notes', event.target.value)}
                                />
                            </Field>
                            <Button disabled={updateForm.processing}>Save update</Button>
                        </form>
                    )}
                    <section className="space-y-3 border-t pt-4">
                        <h2 className="font-semibold">Update history</h2>
                        {selected?.updates.map((update) => (
                            <div key={update.id} className="border-l-2 pl-3 text-sm">
                                <p className="font-medium">
                                    {statusLabels[update.status]} · {update.user?.name ?? 'Former user'}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {new Date(update.created_at).toLocaleString()} ·{' '}
                                    {update.assignee ? `Assigned to ${update.assignee.name}` : 'Unassigned'}
                                </p>
                                {update.notes && <p className="mt-1 whitespace-pre-wrap">{update.notes}</p>}
                            </div>
                        ))}
                    </section>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
