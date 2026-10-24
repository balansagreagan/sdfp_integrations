import { confirmAction } from '@/lib/notifications';
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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    LifeBuoy,
    Megaphone,
    Plus,
    ShieldAlert,
    Trash2,
    Users,
    Waves,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Announcements', href: '/announcement' },
];

interface AnnouncementProps {
    id: number;
    title: string;
    content: string;
    category: string;
    priority: string;
    created_at: string;
    author?: { name: string; role: string };
}

interface AnnouncementsIndexProps {
    announcements: AnnouncementProps[];
    isAdmin: boolean;
}

export default function AnnouncementsIndex({ announcements = [], isAdmin = false }: AnnouncementsIndexProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const createForm = useForm({
        title: '',
        content: '',
        category: 'general',
        priority: 'normal',
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('announcement.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleDelete = async (id: number) => {
        if (!await confirmAction('Are you sure you want to remove this announcement?', { title: 'Delete announcement?', confirmText: 'Delete', danger: true })) return;
        router.delete(route('announcement.destroy', id), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Park Announcements & Safety Bulletins · SDFP" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                                Park Notices & Safety Bulletins
                            </h1>
                            <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30">
                                Team Bulletin
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Coordinate weather holds, marine tide conditions, lifeguard shift rotations, and operational notices.
                        </p>
                    </div>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 flex items-center gap-2 self-start sm:self-auto"
                    >
                        <Plus className="size-4" />
                        <span>Post Announcement</span>
                    </Button>
                </div>

                {/* Caluya Water Condition Live Advisory Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-950 p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <Waves className="size-5 text-sky-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base">Caluya Marine Operations Advisory</h3>
                                <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                                    Normal Operations
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-sky-100/80 leading-relaxed max-w-2xl">
                                Gentle waves (0.3m - 0.6m) · High Tide expected at 01:45 PM · Anchor ropes on the giant slide and trampoline are verified secure.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                        <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
                            <div className="text-[10px] uppercase text-sky-200">Water Temp</div>
                            <div className="font-bold text-sm">29°C</div>
                        </div>
                        <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
                            <div className="text-[10px] uppercase text-sky-200">Wind</div>
                            <div className="font-bold text-sm">8 knots E</div>
                        </div>
                    </div>
                </div>

                {/* Announcements Feed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {announcements.map((ann) => {
                        const isUrgent = ann.priority === 'urgent';
                        const isHigh = ann.priority === 'high';
                        const isWeather = ann.category === 'weather_hold';
                        const isSafety = ann.category === 'safety_protocol';

                        return (
                            <Card
                                key={ann.id}
                                className={`relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md ${
                                    isUrgent
                                        ? 'border-rose-500/40 bg-gradient-to-br from-rose-500/5 to-white dark:to-neutral-900 ring-1 ring-rose-500/20'
                                        : isHigh
                                          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-white dark:to-neutral-900 ring-1 ring-amber-500/20'
                                          : 'border-neutral-200/80 dark:border-neutral-800'
                                }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    isWeather
                                                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/25'
                                                        : isSafety
                                                          ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/25'
                                                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                }`}
                                            >
                                                {ann.category.replace('_', ' ')}
                                            </span>
                                            {isUrgent && (
                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                    Urgent
                                                </Badge>
                                            )}
                                        </div>

                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(ann.id)}
                                                className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                                                title="Delete announcement"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <CardTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50 mt-2">
                                        {ann.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                        {ann.content}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3 text-[11px] text-neutral-400">
                                        <span className="flex items-center gap-1">
                                            <Users className="size-3" />
                                            <span>Posted by {ann.author?.name || 'Admin'}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            <span>{ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Today'}</span>
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Post Announcement Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Post Team Notice</DialogTitle>
                        <DialogDescription>
                            Broadcast weather notices, safety rules, or shift updates to the staff.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="ann_title">Announcement Title</Label>
                            <Input
                                id="ann_title"
                                required
                                value={createForm.data.title}
                                onChange={(e) => createForm.setData('title', e.target.value)}
                                placeholder="e.g. Mandatory Life Vest Inspection at Gate 1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ann_category">Category</Label>
                                <select
                                    id="ann_category"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.category}
                                    onChange={(e) => createForm.setData('category', e.target.value)}
                                >
                                    <option value="general">General Team Notice</option>
                                    <option value="weather_hold">Weather & Tide Advisory</option>
                                    <option value="safety_protocol">Water Safety Protocol</option>
                                    <option value="shift_notice">Shift & Roster Notice</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ann_priority">Priority</Label>
                                <select
                                    id="ann_priority"
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                    value={createForm.data.priority}
                                    onChange={(e) => createForm.setData('priority', e.target.value)}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High Priority</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ann_content">Notice Message / Instructions</Label>
                            <textarea
                                id="ann_content"
                                rows={4}
                                required
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                                value={createForm.data.content}
                                onChange={(e) => createForm.setData('content', e.target.value)}
                                placeholder="Describe instructions or updates clearly for the team..."
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-sky-600 hover:bg-sky-500 text-white">
                                {createForm.processing ? 'Posting...' : 'Post Notice'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
