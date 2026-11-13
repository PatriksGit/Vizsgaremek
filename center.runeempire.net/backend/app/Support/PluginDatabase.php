<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class PluginDatabase
{
    /**
     * A table of a game plugin's database (config database.plugins), read
     * through the global connection with the database name in front, so one
     * request reads every plugin over one connection.
     */
    public static function table(string $plugin, string $table): Builder
    {
        return DB::connection('global')->table(config("database.plugins.{$plugin}").'.'.$table);
    }
}
