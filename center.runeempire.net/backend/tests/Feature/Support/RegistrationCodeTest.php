<?php

namespace Tests\Feature\Support;

use App\Support\RegistrationCode;
use Tests\TestCase;

class RegistrationCodeTest extends TestCase
{
    public function test_generates_the_configured_number_of_digits(): void
    {
        config(['auth.registration_code.length' => 8]);

        $this->assertMatchesRegularExpression('/\A\d{8}\z/', RegistrationCode::generate());
    }

    public function test_hash_matches_only_the_same_code(): void
    {
        $hash = RegistrationCode::hash('012345');

        $this->assertSame(64, strlen($hash));
        $this->assertTrue(RegistrationCode::matches('012345', $hash));
        $this->assertFalse(RegistrationCode::matches('12345', $hash), 'Leading zeros are part of the code.');
        $this->assertFalse(RegistrationCode::matches('012346', $hash));
    }
}
