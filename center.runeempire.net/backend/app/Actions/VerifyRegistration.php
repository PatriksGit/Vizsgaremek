<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Support\RegistrationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyRegistration
{
    public function __construct(private RegisterAccount $registerAccount) {}

    /**
     * Redeem an emailed code: turn the pending registration into a PAxAuth account.
     *
     * A missing, expired or wrong code gets one shared message, so the endpoint
     * does not reveal whether an address has a pending registration.
     *
     * The whole check runs on the locked row, so parallel wrong guesses are
     * counted one by one and cannot push the row past the attempt limit.
     * Errors are returned, not thrown, inside the transaction: throwing would
     * roll back the attempt count and the deletion of the pending row.
     *
     * @throws ValidationException
     */
    public function handle(string $email, string $code): Account
    {
        $result = DB::connection('global')->transaction(function () use ($email, $code): Account|ValidationException {
            $pending = PendingRegistration::query()->where('email', $email)->lockForUpdate()->first();

            if ($pending === null || $pending->expires_at->isPast()) {
                return self::invalidCode();
            }

            $maxAttempts = config('auth.registration_code.max_attempts');

            if ($pending->attempts >= $maxAttempts) {
                $pending->delete();

                return self::invalidCode();
            }

            if (! RegistrationCode::matches($code, $pending->code_hash)) {
                $pending->attempts++;
                $pending->attempts >= $maxAttempts ? $pending->delete() : $pending->save();

                return self::invalidCode();
            }

            $pending->delete();

            $taken = Account::query()
                ->where('username', $pending->username)
                ->orWhere('email', $pending->email)
                ->exists();

            if ($taken) {
                return ValidationException::withMessages([
                    'email' => 'Ez a név vagy e-mail cím időközben foglalt lett, regisztrálj újra.',
                ]);
            }

            return $this->registerAccount->handle($pending->display_name, $pending->email, $pending->password_hash);
        }, attempts: 3);

        if ($result instanceof ValidationException) {
            throw $result;
        }

        return $result;
    }

    private static function invalidCode(): ValidationException
    {
        return ValidationException::withMessages(['code' => 'A kód érvénytelen vagy lejárt.']);
    }
}
