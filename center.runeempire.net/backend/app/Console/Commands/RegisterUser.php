<?php

namespace App\Console\Commands;

use App\Actions\RegisterAccount;
use App\Http\Requests\RegisterRequest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

#[Signature('user:register {username?} {--password=}')]
#[Description('Register a new user')]
class RegisterUser extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RegisterAccount $registerAccount): int
    {
        $username = $this->argument('username') ?? $this->ask('Username');
        $password = $this->option('password');
        $confirmation = $password;

        if ($password === null) {
            $password = $this->secret('Password');
            $confirmation = $this->secret('Confirm password');
        }

        $validator = Validator::make(
            RegisterRequest::withUsername([
                'display_name' => $username,
                'password' => $password,
                'password_confirmation' => $confirmation,
            ]),
            (new RegisterRequest)->rules(),
            attributes: ['display_name' => 'username'],
        );

        try {
            $validated = $validator->validate();
            $account = $registerAccount->handle($validated['display_name'], $validated['password']);
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
