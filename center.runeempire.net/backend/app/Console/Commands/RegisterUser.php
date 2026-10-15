<?php

namespace App\Console\Commands;

use App\Actions\RegisterAccount;
use App\Http\Requests\RegisterRequest;
use App\Models\Account;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

#[Signature('user:register {username?} {email?} {--password=}')]
#[Description('Register a new user')]
class RegisterUser extends Command
{
    /**
     * Execute the console command.
     *
     * Admin tool: the account is created immediately, without an email code.
     */
    public function handle(RegisterAccount $registerAccount): int
    {
        $username = $this->argument('username') ?? $this->ask('Username');
        $email = $this->argument('email') ?? $this->ask('Email');
        $password = $this->option('password');
        $confirmation = $password;

        if ($password === null) {
            $password = $this->secret('Password');
            $confirmation = $this->secret('Confirm password');
        }

        // Validated exactly like the endpoint, email normalized the same way. The
        // terms are for players registering on the website; an admin creating
        // an account here has nothing to accept.
        $validator = Validator::make(
            [
                'display_name' => $username,
                'email' => is_string($email) ? Account::normalizeEmail($email) : $email,
                'password' => $password,
                'password_confirmation' => $confirmation,
            ],
            Arr::except((new RegisterRequest)->rules(), 'terms'),
        );

        try {
            $validated = $validator->validate();
            $account = $registerAccount->handle($validated['display_name'], $validated['email'], Hash::make($validated['password']));
        } catch (ValidationException $exception) {
            foreach (Arr::flatten($exception->errors()) as $message) {
                $this->components->error($message);
            }

            return self::FAILURE;
        }

        $this->components->info("User [{$account->display_name}] registered.");

        return self::SUCCESS;
    }
}
