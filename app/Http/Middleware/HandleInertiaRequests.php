<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\ViewErrorBag;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        if ($user) {
            $user->loadMissing('employee.position');
        }

        return array_merge(parent::share($request), [
            'notification' => fn () => $this->notification($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
                'user_type' => $user?->user_type ?? 'guest',
                'allowedPages' => $user?->accessiblePages() ?? [],
            ],
        ]);
    }

    private function notification(Request $request): ?array
    {
        $session = $request->session();
        $type = null;
        $message = null;
        $title = null;

        if ($session->has('error')) {
            $type = 'error';
            $message = $session->get('error');
            $title = 'Action could not be completed';
        } elseif (($errors = $session->get('errors')) instanceof ViewErrorBag && $errors->any()) {
            $type = 'error';
            $message = implode("\n", array_unique($errors->all()));
            $title = 'Please check your entries';
        } else {
            foreach (['success' => 'Success', 'warning' => 'Please note', 'info' => 'Information'] as $key => $label) {
                if ($session->has($key)) {
                    $type = $key;
                    $message = $session->get($key);
                    $title = $label;
                    break;
                }
            }
            if (! $type && is_string($session->get('status'))) {
                $type = 'success';
                $title = 'Success';
                $message = $session->get('status') === 'verification-link-sent'
                    ? 'A new verification link has been sent to your email address.'
                    : $session->get('status');
            }
        }

        return $type && is_string($message) && $message !== ''
            ? ['id' => (string) Str::uuid(), 'type' => $type, 'title' => $title, 'message' => $message]
            : null;
    }
}
