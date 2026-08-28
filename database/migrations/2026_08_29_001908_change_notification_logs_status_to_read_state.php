<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('notification_logs')->whereIn('status', ['sent', 'failed'])->update(['status' => 'read']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('notification_logs')->whereIn('status', ['unread', 'read'])->update(['status' => 'sent']);
    }
};
