<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Free admission is an offer against All Day Pass, not a separately sold ticket.
        // Keep the old rate and booking snapshots for historical records and imported data.
        DB::table('ticket_types')->where('code', 'FREE-BROCHURE')->update(['is_active' => false]);
    }

    public function down(): void
    {
        DB::table('ticket_types')->where('code', 'FREE-BROCHURE')->update(['is_active' => true]);
    }
};
