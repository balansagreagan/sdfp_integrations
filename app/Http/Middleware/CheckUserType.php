<?php

namespace App\Http\Middleware;

use App\Support\PageAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserType
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$allowedTypes): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        $userType = $user->user_type;

        abort_unless($user->status === 'active', 403, 'This account is not active.');

        $page = explode('/', trim($request->path(), '/'))[0];
        if (isset(PageAccess::PAGES[$page]) || in_array($page, PageAccess::ADMIN_PAGES, true)) {
            abort_unless($user->canAccessPage($page), 403, 'You do not have access to this page.');

            return $next($request);
        }

        // Admin has superuser access to everything
        if ($userType === 'admin') {
            return $next($request);
        }

        // A non-null page list is an administrator-defined per-user override.
        // It takes precedence over the user's role and protects both page views and mutations.
        if ($user->page_access !== null) {
            $page = explode('/', trim($request->path(), '/'))[0];

            if (in_array($page, $user->page_access, true)) {
                return $next($request);
            }

            abort(403, 'You do not have access to this page.');
        }

        if (in_array($userType, $allowedTypes, true)) {
            return $next($request);
        }

        // If lifeguard attempts to access unauthorized pages, redirect to their home (announcements)
        if ($userType === 'lifeguard') {
            return redirect()->route('announcement.index')->with('error', 'Lifeguard access is restricted to Announcements.');
        }

        abort(403, 'Unauthorized. Your user role ('.ucfirst($userType).') cannot access this resource.');
    }
}
