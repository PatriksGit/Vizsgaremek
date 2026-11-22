<?php

namespace Tests\Feature\Support;

use App\Support\Totp;
use Tests\TestCase;

class TotpTest extends TestCase
{
    /** Base32 of the RFC 4226 test secret "12345678901234567890" (also RuneAuth's test secret). */
    private const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    /**
     * RFC 4226 Appendix D: the 6-digit HOTP values of counters 0-9. TOTP is
     * HOTP with the 30-second time step as the counter.
     */
    public function test_matches_the_rfc_4226_test_vectors(): void
    {
        $expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];

        foreach ($expected as $step => $code) {
            $this->assertSame($code, Totp::code(self::SECRET, $step), "counter $step");
        }
    }

    public function test_accepts_the_current_step_and_one_step_of_drift_either_way(): void
    {
        $now = 30 * 1000 + 10; // step 1000

        $this->assertSame(1000, Totp::match(self::SECRET, Totp::code(self::SECRET, 1000), $now));
        $this->assertSame(999, Totp::match(self::SECRET, Totp::code(self::SECRET, 999), $now));
        $this->assertSame(1001, Totp::match(self::SECRET, Totp::code(self::SECRET, 1001), $now));
        $this->assertNull(Totp::match(self::SECRET, Totp::code(self::SECRET, 998), $now));
        $this->assertNull(Totp::match(self::SECRET, Totp::code(self::SECRET, 1002), $now));
    }

    public function test_refuses_anything_but_six_digits(): void
    {
        $code = Totp::code(self::SECRET, 1000);

        $this->assertNull(Totp::match(self::SECRET, ' '.$code, 30_000));
        $this->assertNull(Totp::match(self::SECRET, substr($code, 1), 30_000));
        $this->assertNull(Totp::match(self::SECRET, '', 30_000));
    }

    public function test_a_new_secret_is_32_base32_characters_and_differs_each_time(): void
    {
        $secret = Totp::newSecret();

        $this->assertMatchesRegularExpression('/\A[A-Z2-7]{32}\z/', $secret);
        $this->assertNotSame($secret, Totp::newSecret());
    }

    public function test_the_otpauth_url_names_the_issuer_and_the_player(): void
    {
        $this->assertSame(
            'otpauth://totp/RuneEmpire:PatrikT?secret='.self::SECRET.'&issuer=RuneEmpire&algorithm=SHA1&digits=6&period=30',
            Totp::otpauthUrl(self::SECRET, 'PatrikT', 'RuneEmpire'),
        );
    }
}
