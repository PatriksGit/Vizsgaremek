<?php

namespace App\Models;

use Database\Factories\AccountFactory;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A player account in the PAxAuth plugin's table on the global database.
 *
 * The schema is owned by the plugin: created_at is filled by the database
 * and there is no updated_at column.
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
     * Cap on a typed password before it is checked against a hash, so oversized
     * input never reaches argon2 (well above the 64-unit policy maximum).
     */
    public const PASSWORD_INPUT_MAX_LENGTH = 128;

    /**
     * The lowercase name PAxAuth looks accounts up by.
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
     * The password lives in PAxAuth's password_hash column.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * PAxAuth's accounts table has no remember token column, and "remember me" is not offered.
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
        ];
    }
}
