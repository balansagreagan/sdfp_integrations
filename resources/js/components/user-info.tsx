import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const isAdmin = user?.role === 'admin';

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-neutral-800">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="rounded-lg bg-sky-800 text-white font-semibold text-xs">
                    {getInitials(user?.name ?? 'SDFP')}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                            isAdmin
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 ring-1 ring-sky-500/30'
                        }`}
                    >
                        {user?.role || 'staff'}
                    </span>
                </div>
                {showEmail && <span className="text-muted-foreground truncate text-xs">{user?.email}</span>}
            </div>
        </>
    );
}
