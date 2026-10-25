<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('cache:prune-expired')]
#[Description('Delete the expired rows of the database cache')]
class PruneExpiredCache extends Command
{
    /**
     * Execute the console command.
     *
     * Laravel's database cache deletes an expired row only when the same key
     * is read again, so the rate limiters' keys (one per name and IP, one per
     * email address) would pile up for good. Scheduled daily in bootstrap/app.php.
     */
    public function handle(): int
    {
        $store = config('cache.stores.database');

        $deleted = DB::connection($store['connection'])
            ->table($store['table'])
            ->where('expiration', '<=', now()->getTimestamp())
            ->delete();

        $this->components->info("Deleted {$deleted} expired cache rows.");

        return self::SUCCESS;
    }
}
