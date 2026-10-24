import type { AppNotification } from '@/types';
import Swal from 'sweetalert2';

const shown = new Set<string>();

export function showNotification(notification: AppNotification | null | undefined) {
    if (!notification || shown.has(notification.id)) return;
    shown.add(notification.id);
    // Keep replay protection for recent history entries without growing indefinitely.
    if (shown.size > 200) shown.delete(shown.values().next().value!);
    void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: notification.type,
        titleText: notification.title,
        text: notification.message,
        showConfirmButton: false,
        showCloseButton: true,
        timer: notification.type === 'success' ? 4000 : 9000,
        timerProgressBar: true,
        customClass: { container: 'app-alert-container', popup: 'app-notification' },
        didOpen: (popup) => {
            popup.addEventListener('mouseenter', Swal.stopTimer);
            popup.addEventListener('mouseleave', Swal.resumeTimer);
        },
    });
}

export async function confirmAction(message: string, options: { title?: string; confirmText?: string; danger?: boolean } = {}) {
    // Keep the alert inside an existing dialog's focus scope when a form is open.
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]');
    const result = await Swal.fire({
        target: dialogs.length ? dialogs[dialogs.length - 1] : document.body,
        titleText: options.title ?? 'Confirm action',
        text: message,
        icon: options.danger ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonText: options.confirmText ?? 'Continue',
        cancelButtonText: 'Cancel',
        confirmButtonColor: options.danger ? '#e11d48' : '#0284c7',
        cancelButtonColor: '#64748b',
        focusCancel: true,
        reverseButtons: true,
        heightAuto: false,
        customClass: { container: 'app-alert-container' },
    });
    return result.isConfirmed;
}
