<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Manager;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('create:manager {email?}')]
#[Description('Add a Google address to the managers list')]
class CreateManager extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = Account::normalizeEmail((string) ($this->argument('email') ?? $this->ask('Email (exactly as Google shows it)')));

        if (preg_match(Account::EMAIL_PATTERN, $email) !== 1) {
            $this->components->error("[{$email}] is not a valid email address.");

            return self::FAILURE;
        }

        if (Manager::isListed($email)) {
            $this->components->info("{$email} is already a manager.");

            return self::SUCCESS;
        }

        if (! $this->confirm("Make {$email} a manager?", false)) {
            return self::SUCCESS;
        }

        Manager::create(['email' => $email]);
        $this->components->info("{$email} is now a manager.");

        return self::SUCCESS;
    }
}
