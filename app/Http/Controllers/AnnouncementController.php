<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    /**
     * Display park announcements, weather holds, and safety bulletins.
     */
    public function index(Request $request): Response
    {
        $announcements = Announcement::with('author:id,name,role')
            ->orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('announcements/index', [
            'announcements' => $announcements,
            'isAdmin' => $request->user()->role === 'admin',
        ]);
    }

    /**
     * Store a newly created announcement.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'category' => ['required', 'string', 'in:weather_hold,safety_protocol,shift_notice,general'],
            'priority' => ['required', 'string', 'in:normal,high,urgent'],
        ]);

        Announcement::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'is_active' => true,
            'author_id' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Announcement posted to the park team.');
    }

    /**
     * Remove an announcement.
     */
    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();
        return redirect()->back()->with('success', 'Announcement removed.');
    }
}
