<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pending registrations live in the auth database, next to PAxAuth's accounts.
     */
    protected $connection = 'global';

    /**
     * Run the migrations.
     *
     * Guarded with hasTable: the migrations log is kept in the default (web)
     * database, so a new or moved web database runs this again against an
     * auth database that already has the table.
     */
    public function up(): void
    {
        $schema = Schema::connection($this->getConnection());

        if ($schema->hasTable('pending_registrations')) {
            return;
        }

        $schema->create('pending_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('username', 16)->charset('ascii')->unique();
            $table->string('display_name', 16)->charset('ascii');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->char('code_hash', 64);
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
        Schema::connection($this->getConnection())->dropIfExists('pending_registrations');
    }
};
