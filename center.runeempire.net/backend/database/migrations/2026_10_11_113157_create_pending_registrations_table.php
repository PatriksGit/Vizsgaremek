<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Registrations waiting for their emailed code, in the website's own
     * database (Center). owner_hash ties a pending registration to the browser
     * session that started it, so only that session can replace it before it
     * expires. The unique index names are what StartRegistration reads to tell
     * whether the name or the email was taken at the same moment.
     */
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('username', 16)->charset('ascii')->unique();
            $table->string('display_name', 16)->charset('ascii');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->char('code_hash', 64);
            $table->char('owner_hash', 64)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('expires_at')->index();
            $table->dateTime('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
