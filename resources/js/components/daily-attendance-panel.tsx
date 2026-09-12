import { type AttendanceShiftStatus, type SharedData, type SidebarEmployee } from "@/types";
import { useForm, usePage } from "@inertiajs/react";
import { CheckCircle2, Clock, Moon, Sun, Users } from "lucide-react";
import { useState } from "react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    useSidebar,
} from "./ui/sidebar";

type ShiftSlot = "am" | "pm";
type ShiftStatus = "present" | "absent" | "day_off";

function ShiftButton({
    slot,
    status,
    onClick,
    loading,
    disabled,
}: {
    slot: ShiftSlot;
    status: ShiftStatus | null | undefined;
    onClick: () => void;
    loading: boolean;
    disabled: boolean;
}) {
    const isPresent = status === "present";
    const isAbsent = status === "absent";
    const Icon = slot === "am" ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading || disabled}
            title={`${slot.toUpperCase()} — ${status ?? "not recorded"}`}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-md w-10 h-10 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 border
                ${
                    isPresent
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-400"
                        : isAbsent
                          ? "bg-rose-500 border-rose-400 text-white shadow-sm shadow-rose-500/30 hover:bg-rose-400"
                          : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                }
                ${(loading || disabled) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
            <Icon className="size-3.5" />
            <span>{slot}</span>
            {isPresent && (
                <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-300 border border-white dark:border-neutral-900 flex items-center justify-center">
                    <CheckCircle2 className="size-2 text-emerald-800" />
                </span>
            )}
        </button>
    );
}

export function DailyAttendancePanel() {
    const { props } = usePage<SharedData>();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const sidebarData = props.sidebar;
    const employees: SidebarEmployee[] = sidebarData?.employees ?? [];
    const todayShifts: Record<number, AttendanceShiftStatus> = sidebarData?.todayShifts ?? {};
    const today = sidebarData?.today ?? new Date().toISOString().split("T")[0];

    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    const { post, processing } = useForm({});

    const handleToggle = (
        employeeId: number,
        slot: ShiftSlot,
        currentStatus: ShiftStatus | null | undefined
    ) => {
        // Cycle: null → present → absent → present
        const nextStatus: ShiftStatus = currentStatus === "present" ? "absent" : "present";
        const key = `${employeeId}-${slot}`;
        setLoadingKey(key);

        // Use router.post directly so we can send arbitrary data
        const formData = new FormData();
        formData.append("employee_id", String(employeeId));
        formData.append("shift_slot", slot);
        formData.append("status", nextStatus);

        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") ?? "";

        fetch(route("attendance.store"), {
            method: "POST",
            headers: {
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
                "X-Inertia": "true",
                "X-Inertia-Version": "",
            },
            body: formData,
        })
            .then((res) => {
                if (res.ok || res.status === 302) {
                    // Trigger Inertia page refresh to reload shared props
                    window.location.reload();
                }
            })
            .catch(() => {})
            .finally(() => setLoadingKey(null));
    };

    if (isCollapsed) return null;

    const dayLabel = new Date(today + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "long",
        month: "short",
        day: "numeric",
    });

    return (
        <SidebarGroup className="px-2 py-0 mb-1">
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500 mb-1 flex items-center gap-1.5">
                <Clock className="size-3" />
                Daily Time-In/Out
            </SidebarGroupLabel>

            {/* Date badge */}
            <div className="mx-1 mb-2 flex items-center gap-1.5 rounded-md bg-sky-500/10 dark:bg-sky-500/15 px-2.5 py-1.5 border border-sky-500/20">
                <Users className="size-3 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 truncate">
                    {dayLabel}
                </span>
            </div>

            {/* Employee list */}
            <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto pr-0.5 scrollbar-thin">
                {employees.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-3">No active staff.</p>
                )}
                {employees.map((emp) => {
                    const shift = todayShifts[emp.id];
                    const amKey = `${emp.id}-am`;
                    const pmKey = `${emp.id}-pm`;

                    return (
                        <div
                            key={emp.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                        >
                            {/* Avatar initial */}
                            <div className="shrink-0 size-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white">
                                {emp.first_name[0]}{emp.last_name[0]}
                            </div>

                            {/* Name + position */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
                                    {emp.last_name}, {emp.first_name}
                                </p>
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight">
                                    {emp.position?.title ?? "Staff"}
                                </p>
                            </div>

                            {/* AM/PM buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                                <ShiftButton
                                    slot="am"
                                    status={shift?.am_status}
                                    loading={loadingKey === amKey}
                                    disabled={processing || loadingKey !== null}
                                    onClick={() => handleToggle(emp.id, "am", shift?.am_status)}
                                />
                                <ShiftButton
                                    slot="pm"
                                    status={shift?.pm_status}
                                    loading={loadingKey === pmKey}
                                    disabled={processing || loadingKey !== null}
                                    onClick={() => handleToggle(emp.id, "pm", shift?.pm_status)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-2 mx-1 flex items-center gap-3 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Present
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-rose-500 inline-block" />
                    Absent
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-neutral-200 dark:bg-neutral-700 inline-block" />
                    Unset
                </span>
            </div>
        </SidebarGroup>
    );
}
