import '../css/app.css';

import { NotificationCenter } from '@/components/notification-center';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <App {...props}>
                {({ Component, key, props: pageProps }) => (
                    <>
                        <NotificationCenter />
                        <Component key={key} {...pageProps} />
                    </>
                )}
            </App>,
        );
    },
    progress: {
        color: '#0284c7',
        delay: 0,
        showSpinner: true,
    },
});

// This will set light / dark mode on load...
initializeTheme();
