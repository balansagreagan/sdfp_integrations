import { showNotification } from '@/lib/notifications';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export function NotificationCenter() {
    const { notification } = usePage<SharedData>().props;

    useEffect(() => {
        showNotification(notification);
    }, [notification]);

    useEffect(() => {
        const removeInvalid = router.on('invalid', (event) => {
            event.preventDefault();
            const status = event.detail.response.status;
            const message = ({
                401: 'Please log in again to continue.',
                403: 'You do not have permission to perform this action.',
                404: 'The requested record or page could not be found.',
                419: 'Your session expired. Refresh this page and try again.',
                422: 'The action could not be completed. Check the details and try again.',
                429: 'Too many requests. Please wait a moment and try again.',
            } as Record<number, string>)[status] ?? 'The server could not complete this request. Please try again.';
            showNotification({ id: `request-${Date.now()}-${Math.random()}`, type: 'error', title: 'Request failed', message });
        });
        const removeException = router.on('exception', (event) => {
            event.preventDefault();
            showNotification({ id: `request-${Date.now()}-${Math.random()}`, type: 'error', title: 'Connection problem', message: 'The request could not be completed. Check your connection and try again.' });
        });
        return () => { removeInvalid(); removeException(); };
    }, []);

    return null;
}
