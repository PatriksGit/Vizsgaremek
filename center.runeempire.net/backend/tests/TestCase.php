<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    /**
     * The accounts table belongs to the PAxAuth plugin, so there is no migration
     * for it here; tests rebuild its relevant columns on the in-memory
     * "global" connection.
     */
    protected function createAccountsTable(): void
    {
        Schema::connection('global')->create('accounts', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('username', 16)->unique();
            $table->string('display_name', 16)->default('');
            $table->string('password_hash');
            $table->string('registered_ip', 45)->default('0.0.0.0');
            $table->dateTime('created_at')->useCurrent();
        });
    }
}
