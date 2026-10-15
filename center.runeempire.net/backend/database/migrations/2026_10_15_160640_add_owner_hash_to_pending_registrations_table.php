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
     * owner_hash ties a pending registration to the browser session that
     * started it, so only that session can replace it before it expires.
     * Guarded with hasColumn for the same reason the table is guarded with
     * hasTable: the migrations log lives in the web database.
     */
    public function up(): void
    {
        $schema = Schema::connection($this->getConnection());

        if ($schema->hasColumn('pending_registrations', 'owner_hash')) {
            return;
        }

        $schema->table('pending_registrations', function (Blueprint $table) {
            $table->char('owner_hash', 64)->nullable()->after('code_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $schema = Schema::connection($this->getConnection());

        if (! $schema->hasColumn('pending_registrations', 'owner_hash')) {
            return;
        }

        $schema->table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn('owner_hash');
        });
    }
};
