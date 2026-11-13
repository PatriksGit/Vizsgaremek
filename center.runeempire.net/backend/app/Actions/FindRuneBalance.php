<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;

class FindRuneBalance
{
    /**
     * The player's runes: their PlayerPoints balance. PlayerPoints creates the
     * row on the first join, so a player who never joined has 0.
     */
    public function handle(Account $account): int
    {
        return (int) PluginDatabase::table('playerpoints', 'playerpoints_points')->where('uuid', $account->uuid)->value('points');
    }
}
