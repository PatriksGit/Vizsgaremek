<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Manager;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('delete:manager {email?}')]
#[Description('Remove a Google address from the managers list')]
class DeleteManager extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = Account::normalizeEmail((string) ($this->argument('email') ?? $this->ask('Email (exactly as Google shows it)')));

        if (! Manager::isListed($email)) {
            $this->components->info("{$email} is not a manager.");

            return self::SUCCESS;
        }

        if (! $this->confirm("Remove {$email} from the managers?", false)) {
            return self::SUCCESS;
        }

        Manager::query()->where('email', $email)->delete();
        $this->components->info("{$email} removed from the managers.");

        return self::SUCCESS;
    }
}
