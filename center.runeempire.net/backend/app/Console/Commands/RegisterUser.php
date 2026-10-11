<?php

namespace App\Console\Commands;

use App\Actions\RegisterAccount;
use App\Http\Requests\RegisterRequest;
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

        $validator = Validator::make(
            RegisterRequest::normalize([
                'display_name' => $username,
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $confirmation,
            ]),
            (new RegisterRequest)->rules(),
            attributes: ['display_name' => 'username'],
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
