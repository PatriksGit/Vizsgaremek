<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The staff log (owner, 2026-11-26): one row per action a manager took on
     * an account in the management area, in the website's own database
     * (Center). Names and addresses are copies made at the time, so a row
     * still reads right after an account changes. The accounts live on
     * another server (Auth), so there are no foreign keys.
     */
    public function up(): void
    {
        Schema::create('management_actions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('manager_account_id');
            $table->string('manager_name', 16);
            $table->string('manager_email');
            $table->string('action', 32);
            $table->unsignedBigInteger('target_account_id')->index();
            $table->string('target_name', 16);
            $table->string('old_value')->nullable();
            $table->string('new_value')->nullable();
            $table->dateTime('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('management_actions');
    }
};
