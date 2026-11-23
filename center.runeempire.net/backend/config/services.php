<?php

/*
 * Outside services' credentials (the GOOGLE_* lines in .env).
 */
return [

    /*
     * The Google OAuth client of the management area's sign-in (Socialite
     * reads this entry). The owner creates it in Google Cloud Console; its
     * redirect URI ends in /api/management/google/callback. No client id:
     * the sign-in answers management.google_unavailable.
     */
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID') ?: null,
        'client_secret' => env('GOOGLE_CLIENT_SECRET') ?: null,
        'redirect' => env('GOOGLE_REDIRECT_URI') ?: null,
    ],

];
