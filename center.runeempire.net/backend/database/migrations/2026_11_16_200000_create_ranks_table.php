<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The ranks the shop sells (owner, 2026-11-16): in the database, so a later
     * management section can edit them without opening files.
     */
    public function up(): void
    {
        Schema::create('ranks', function (Blueprint $table) {
            $table->id();
            // The LuckPerms group the rank gives, as the stats name it.
            $table->string('group', 64)->charset('ascii')->collation('ascii_bin')->unique();
            $table->string('name', 64);
            // "Mit kapsz?" as Markdown.
            $table->text('details');
            $table->string('gif_url')->nullable();
            $table->unsignedInteger('price_30');
            $table->unsignedInteger('price_90');
            // A seasonal rank sells until then (UTC); null for the rest.
            $table->timestamp('season_ends_at')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ranks');
    }
};
