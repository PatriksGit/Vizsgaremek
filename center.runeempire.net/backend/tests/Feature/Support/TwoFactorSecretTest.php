<?php

namespace Tests\Feature\Support;

use App\Support\TwoFactorSecret;
use Tests\TestCase;

class TwoFactorSecretTest extends TestCase
{
    /** RuneAuth's LOCAL TEST key (seed-auth-test.sql), a throwaway key, never a production one. */
    private const RUNEAUTH_TEST_KEY = '9crpsancpRx3tu8qLTL9Dc2VcKP8aC3chZJdqbEO0BU=';

    private const UUID = 'de2f74e3-a2d8-3f74-b1df-e95c86bc176a';

    private const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.two_factor.key' => self::RUNEAUTH_TEST_KEY]);
    }

    /** Interop: the SpikeTotp row RuneAuth's own tests seed, encrypted by RuneAuth (Java). */
    public function test_opens_a_secret_runeauth_encrypted(): void
    {
        $stored = 'enc:F37f2VXrbBVRLEQAs/lKyCSJKuJBlzr9xqRH/9DJDiK6UGD0299e5sOjDGIl3IS8OFx048I+PTEZfX3b';

        $this->assertSame(self::SECRET, TwoFactorSecret::open($stored, self::UUID));
    }

    public function test_seals_in_the_contract_form_and_opens_it_again(): void
    {
        $stored = TwoFactorSecret::seal(self::SECRET, self::UUID);

        $this->assertStringStartsWith('enc:', $stored);
        // nonce 12 + ciphertext (32 bytes of Base32 text) + tag 16
        $this->assertSame(12 + 32 + 16, strlen(base64_decode(substr($stored, 4), true)));
        $this->assertSame(self::SECRET, TwoFactorSecret::open($stored, self::UUID));
        $this->assertLessThanOrEqual(255, strlen($stored), 'accounts.twofa_secret is varchar(255)');
    }

    public function test_a_secret_is_bound_to_its_account(): void
    {
        $stored = TwoFactorSecret::seal(self::SECRET, self::UUID);

        $this->assertNull(TwoFactorSecret::open($stored, '70404374-69da-35c1-82bc-fcf925aa903a'));
    }

    public function test_never_opens_with_another_or_a_missing_key(): void
    {
        $stored = TwoFactorSecret::seal(self::SECRET, self::UUID);

        config(['auth.two_factor.key' => base64_encode(str_repeat("\1", 32))]);
        $this->assertNull(TwoFactorSecret::open($stored, self::UUID));

        config(['auth.two_factor.key' => null]);
        $this->assertNull(TwoFactorSecret::open($stored, self::UUID));
        $this->assertFalse(TwoFactorSecret::available());
    }

    public function test_reads_only_the_encrypted_form(): void
    {
        // A plain Base32 value (an old PAxAuth form) is not read: no production row has one.
        $this->assertNull(TwoFactorSecret::open(self::SECRET, self::UUID));
        $this->assertNull(TwoFactorSecret::open('enc:***', self::UUID));
        $this->assertNull(TwoFactorSecret::open('enc:AAAA', self::UUID));
        $this->assertNull(TwoFactorSecret::open(null, self::UUID));
    }
}
