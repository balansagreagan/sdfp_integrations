<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\PageAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserAccessController extends Controller
{
    public const PAGES = PageAccess::PAGES;

    public const ROLE_PAGE_ACCESS = PageAccess::ROLE_PAGES;

    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        return Inertia::render('user-access/index', [
            'users' => User::query()
                ->with('employee.position')
                ->where('id', '!=', $request->user()->id)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role', 'status', 'page_access']),
            'pages' => self::PAGES,
            'rolePageAccess' => self::ROLE_PAGE_ACCESS,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($request);

        abort_if($user->isAdmin(), 422, 'Administrator access cannot be restricted.');

        $validated = $request->validate([
            'page_access' => ['present', 'nullable', 'array'],
            'page_access.*' => ['string', 'in:'.implode(',', array_keys(self::PAGES))],
        ]);

        // An empty list removes all page access; null restores the role defaults.
        $user->update(['page_access' => isset($validated['page_access']) ? array_values(array_unique($validated['page_access'])) : null]);

        return back()->with('success', "Page access updated for {$user->name}.");
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can manage user page access.');
    }
}
