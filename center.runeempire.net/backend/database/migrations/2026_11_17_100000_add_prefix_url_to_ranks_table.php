<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The rank's in-game prefix image (the ItemsAdder glyph), shown in the
     * shop's "Így néz ki rajtad" preview. Stored like the GIF's address, so
     * the management section can upload it later (owner, 2026-11-17).
     */
    public function up(): void
    {
        Schema::table('ranks', function (Blueprint $table) {
            $table->string('prefix_url')->nullable()->after('gif_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ranks', function (Blueprint $table) {
            $table->dropColumn('prefix_url');
        });
    }
};
