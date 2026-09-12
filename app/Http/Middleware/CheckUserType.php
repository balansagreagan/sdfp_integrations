<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserType
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$allowedTypes
     */
    public function handle(Request $request, Closure $next, string ...$allowedTypes): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        $userType = $user->user_type;

        // Admin has superuser access to everything
        if ($userType === 'admin') {
            return $next($request);
        }

        if (in_array($userType, $allowedTypes, true)) {
            return $next($request);
        }

        // If lifeguard attempts to access unauthorized pages, redirect to their home (attendance)
        if ($userType === 'lifeguard') {
            return redirect()->route('attendance.index')->with('error', 'Lifeguard access is restricted to Daily Time-In/Out and Announcements.');
        }

        abort(403, 'Unauthorized. Your user role (' . ucfirst($userType) . ') cannot access this resource.');
    }
}
