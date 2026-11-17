<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The network's game servers, and which of them each rank gives something
     * on (owner, 2026-11-17: chips like [Lobby] [Kingdoms] on the rank cards).
     * A server is added once (later in the management section) and ticked per
     * rank.
     */
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 32)->unique();
            // The order the chips are shown in.
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('rank_server', function (Blueprint $table) {
            $table->foreignId('rank_id')->constrained()->cascadeOnDelete();
            $table->foreignId('server_id')->constrained()->cascadeOnDelete();
            $table->primary(['rank_id', 'server_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rank_server');
        Schema::dropIfExists('servers');
    }
};
