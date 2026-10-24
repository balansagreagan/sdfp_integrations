<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Child admission is calculated from the selected regular ticket and the age policy.
        // Keep this old rate and its sold booking items for historical records.
        DB::table('ticket_types')->where('code', 'KIDDIE-2HR')->update(['is_active' => false]);
    }

    public function down(): void
    {
        DB::table('ticket_types')->where('code', 'KIDDIE-2HR')->update(['is_active' => true]);
    }
};
