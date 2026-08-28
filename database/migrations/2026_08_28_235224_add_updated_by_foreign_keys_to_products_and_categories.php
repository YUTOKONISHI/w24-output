<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['products', 'categories'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('updated_by')->references('id')->on('admin');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['products', 'categories'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['updated_by']);
            });
        }
    }
};
