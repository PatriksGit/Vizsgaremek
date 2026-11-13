<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AccountFactory;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A player account in the Auth database's accounts table (global connection).
 *
 * The table is shared with the Rune Gateway and RuneAuth and changed by hand,
 * never by a migration: created_at is filled by the database and there is no
 * updated_at column. Only the columns the website uses are listed; locked
 * comes from RuneAuth's account_locks table (the lock relation).
 *
 * @property int $id
 * @property string $uuid
 * @property string $username
 * @property string $display_name
 * @property string $password_hash
 * @property string|null $email
 * @property bool $twofa_enabled
 * @property-read bool $locked
 * @property-read AccountLock|null $lock
 * @property-read CarbonImmutable|null $created_at
 */
#[Connection('global')]
#[Table('accounts')]
#[WithoutTimestamps]
#[Fillable(['uuid', 'username', 'display_name', 'password_hash', 'email'])]
#[Hidden(['password_hash', 'twofa_secret'])]
class Account extends Model implements AuthenticatableContract
{
    /** @use HasFactory<AccountFactory> */
    use Authenticatable, HasFactory;

    /**
     * Minecraft name rules: 3-16 ASCII letters, digits or underscores.
     */
    public const NAME_PATTERN = '/\A[A-Za-z0-9_]{3,16}\z/';

    /**
     * ASCII-only address with a dotted domain, for every request that takes
     * an email. ASCII keeps lowercasing an exact match under MySQL's accent-
     * insensitive collations (otherwise "pátrik@…" would find "patrik@…" and
     * count as a different address in rate limits), and rules out addresses
     * that would only bounce (localhost, IP literals, spaces).
     */
    public const EMAIL_PATTERN = '/\A[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+\z/';

    /**
     * Cap on a typed password before it is checked against a hash, so oversized
     * input never reaches argon2 (well above the 64-unit policy maximum).
     */
    public const PASSWORD_INPUT_MAX_LENGTH = 128;

    /**
     * The lowercase name accounts are looked up by (the website, the Rune Gateway and RuneAuth).
     */
    public static function usernameFor(string $displayName): string
    {
        return strtolower($displayName);
    }

    /**
     * Emails are stored and compared trimmed and lowercased, so one address
     * cannot back two accounts through different casing.
     */
    public static function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    /**
     * The UUID an offline-mode Minecraft server assigns to this name
     * (Java's UUID.nameUUIDFromBytes("OfflinePlayer:" + name)). Case-sensitive.
     */
    public static function offlineUuid(string $displayName): string
    {
        $hash = md5('OfflinePlayer:'.$displayName, true);
        $hash[6] = chr(ord($hash[6]) & 0x0F | 0x30);
        $hash[8] = chr(ord($hash[8]) & 0x3F | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($hash), 4));
    }

    /**
     * Whether the account may be used on the website: not locked by staff,
     * and without two-factor authentication, which the website cannot check
     * yet (it would let the password alone in).
     */
    public function canUseWebsite(): bool
    {
        return ! $this->locked && ! $this->twofa_enabled;
    }

    /**
     * The staff lock on this account, if any (RuneAuth's account_locks row).
     *
     * @return HasOne<AccountLock, $this>
     */
    public function lock(): HasOne
    {
        return $this->hasOne(AccountLock::class, 'uuid', 'uuid');
    }

    /**
     * The password lives in the password_hash column.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * The accounts table has no remember token column, and "remember me" is not offered.
     */
    public function getRememberTokenName(): string
    {
        return '';
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password_hash' => 'hashed',
            'twofa_enabled' => 'boolean',
        ];
    }

    /**
     * Whether staff locked the account: a lock is a row in account_locks,
     * not a column of accounts. Loaded once per model, on first use.
     *
     * @return Attribute<bool, never>
     */
    protected function locked(): Attribute
    {
        return Attribute::get(fn (): bool => $this->lock !== null);
    }

    /**
     * When the account was created, in UTC. MySQL fills created_at from its
     * own clock, which runs on the server's local time (the global
     * connection's clock_timezone), unlike the UTC times RuneAuth writes
     * itself (last_login_at); read as UTC, an evening registration would show
     * the next day.
     *
     * @return Attribute<?CarbonImmutable, never>
     */
    protected function createdAt(): Attribute
    {
        return Attribute::get(fn (?string $value): ?CarbonImmutable => $value === null
            ? null
            : CarbonImmutable::parse($value, config('database.connections.global.clock_timezone'))->utc());
    }
}
