<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The procedures work on the auth database: the plugin's accounts table
     * and our pending_registrations.
     */
    protected $connection = 'global';

    /**
     * Run the migrations.
     *
     * Every procedure is dropped and created again, so this is safe to run on
     * an auth database that already has them (the migrations log lives in the
     * web database). DELIMITER is a mysql client command, not SQL: through PDO
     * each statement is sent on its own instead.
     *
     * Every string parameter is declared with its column's character set and
     * collation. A bare VARCHAR parameter would take the database default
     * (utf8mb4_unicode_ci), and MySQL refuses to compare that with accounts'
     * utf8mb4_0900_ai_ci columns ("Illegal mix of collations"); against the
     * case-sensitive ascii_bin username it could also turn the lookup
     * case-insensitive. With matching types the procedures compare exactly
     * like the queries they replace.
     *
     * SQLite (the test suite) has no stored procedures, so it is skipped there.
     */
    public function up(): void
    {
        if (! $this->supportsProcedures()) {
            return;
        }

        foreach ($this->procedures() as $name => $definition) {
            DB::connection($this->getConnection())->unprepared("DROP PROCEDURE IF EXISTS {$name}");
            DB::connection($this->getConnection())->unprepared($definition);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->supportsProcedures()) {
            return;
        }

        foreach (array_keys($this->procedures()) as $name) {
            DB::connection($this->getConnection())->unprepared("DROP PROCEDURE IF EXISTS {$name}");
        }
    }

    private function supportsProcedures(): bool
    {
        return DB::connection($this->getConnection())->getDriverName() === 'mysql';
    }

    /**
     * The procedures by name, one for every query the application runs on
     * its own data. Laravel's own tables (cache, migrations,
     * personal_access_tokens) are framework internals and stay as Laravel
     * queries them.
     *
     * @return array<string, string>
     */
    private function procedures(): array
    {
        return [
            // ---------------------------------------------------------------
            // accounts (owned by the auth plugin)
            // ---------------------------------------------------------------

            // 1. The logged-in player, loaded on every request from the id in the session.
            'FindAccountById' => <<<'SQL'
                CREATE PROCEDURE FindAccountById(IN p_id BIGINT)
                BEGIN
                    SELECT id, uuid, username, display_name, password_hash, email, twofa_enabled, locked, created_at
                    FROM accounts
                    WHERE id = p_id
                    LIMIT 1;
                END
                SQL,

            // 2. Login: the account of a (lowercase) username; the password is checked in PHP.
            'FindAccountByUsername' => <<<'SQL'
                CREATE PROCEDURE FindAccountByUsername(
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin
                )
                BEGIN
                    SELECT id, uuid, username, display_name, password_hash, email, twofa_enabled, locked, created_at
                    FROM accounts
                    WHERE username = p_username
                    LIMIT 1;
                END
                SQL,

            // 3. Registration check: is the name taken? Returns found = 0 or 1.
            'AccountUsernameExists' => <<<'SQL'
                CREATE PROCEDURE AccountUsernameExists(
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin
                )
                BEGIN
                    SELECT EXISTS(SELECT 1 FROM accounts WHERE username = p_username) AS found;
                END
                SQL,

            // 4. Registration check: is the email taken? Returns found = 0 or 1.
            'AccountEmailExists' => <<<'SQL'
                CREATE PROCEDURE AccountEmailExists(
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
                )
                BEGIN
                    SELECT EXISTS(SELECT 1 FROM accounts WHERE email = p_email) AS found;
                END
                SQL,

            // 5. Verification: did someone take the name or the email meanwhile? Returns found = 0 or 1.
            'AccountUsernameOrEmailExists' => <<<'SQL'
                CREATE PROCEDURE AccountUsernameOrEmailExists(
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin,
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
                )
                BEGIN
                    SELECT EXISTS(
                        SELECT 1 FROM accounts WHERE username = p_username OR email = p_email
                    ) AS found;
                END
                SQL,

            // 6. A new account (the other columns keep the plugin's defaults). Returns its id.
            'CreateAccount' => <<<'SQL'
                CREATE PROCEDURE CreateAccount(
                    IN p_uuid CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin,
                    IN p_display_name VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci,
                    IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
                )
                BEGIN
                    INSERT INTO accounts (uuid, username, display_name, password_hash, email)
                    VALUES (p_uuid, p_username, p_display_name, p_password_hash, p_email);

                    SELECT LAST_INSERT_ID() AS id;
                END
                SQL,

            // 7. Password change: stores the new argon2id hash.
            'UpdateAccountPassword' => <<<'SQL'
                CREATE PROCEDURE UpdateAccountPassword(
                    IN p_id BIGINT,
                    IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
                )
                BEGIN
                    UPDATE accounts
                    SET password_hash = p_password_hash
                    WHERE id = p_id;
                END
                SQL,

            // ---------------------------------------------------------------
            // pending_registrations (ours, created by the earlier migrations)
            // ---------------------------------------------------------------

            // 8. Clears registrations whose code has expired. p_now comes from the
            //    backend, so it uses the same clock and time zone as expires_at.
            'DeleteExpiredPendingRegistrations' => <<<'SQL'
                CREATE PROCEDURE DeleteExpiredPendingRegistrations(IN p_now DATETIME)
                BEGIN
                    DELETE FROM pending_registrations
                    WHERE expires_at <= p_now;
                END
                SQL,

            // 9. The rows that already hold this name or this email (at most two).
            'FindPendingRegistrationsByUsernameOrEmail' => <<<'SQL'
                CREATE PROCEDURE FindPendingRegistrationsByUsernameOrEmail(
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci,
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                )
                BEGIN
                    SELECT id, username, display_name, email, password_hash, code_hash, owner_hash,
                           attempts, expires_at, created_at
                    FROM pending_registrations
                    WHERE username = p_username OR email = p_email;
                END
                SQL,

            // 10. A new registration waiting for its emailed code. Returns its id.
            'CreatePendingRegistration' => <<<'SQL'
                CREATE PROCEDURE CreatePendingRegistration(
                    IN p_username VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci,
                    IN p_display_name VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci,
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
                    IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
                    IN p_code_hash CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
                    IN p_owner_hash CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
                    IN p_expires_at DATETIME
                )
                BEGIN
                    INSERT INTO pending_registrations
                        (username, display_name, email, password_hash, code_hash, owner_hash, expires_at)
                    VALUES
                        (p_username, p_display_name, p_email, p_password_hash, p_code_hash, p_owner_hash, p_expires_at);

                    SELECT LAST_INSERT_ID() AS id;
                END
                SQL,

            // 11. The registration of an email, locked until the transaction ends, so
            //     parallel guesses are counted one by one. Call it inside a transaction.
            'FindPendingRegistrationByEmailForUpdate' => <<<'SQL'
                CREATE PROCEDURE FindPendingRegistrationByEmailForUpdate(
                    IN p_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                )
                BEGIN
                    SELECT id, username, display_name, email, password_hash, code_hash, owner_hash,
                           attempts, expires_at, created_at
                    FROM pending_registrations
                    WHERE email = p_email
                    LIMIT 1
                    FOR UPDATE;
                END
                SQL,

            // 12. Counts a wrong code.
            'UpdatePendingRegistrationAttempts' => <<<'SQL'
                CREATE PROCEDURE UpdatePendingRegistrationAttempts(IN p_id BIGINT UNSIGNED, IN p_attempts TINYINT UNSIGNED)
                BEGIN
                    UPDATE pending_registrations
                    SET attempts = p_attempts
                    WHERE id = p_id;
                END
                SQL,

            // 13. Removes one registration (used up, replaced, expired or too many wrong codes).
            'DeletePendingRegistration' => <<<'SQL'
                CREATE PROCEDURE DeletePendingRegistration(IN p_id BIGINT UNSIGNED)
                BEGIN
                    DELETE FROM pending_registrations
                    WHERE id = p_id;
                END
                SQL,
        ];
    }
};
