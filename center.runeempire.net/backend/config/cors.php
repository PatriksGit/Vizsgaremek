<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/cors.php.
 */
return [

    /*
     * Origins of the React frontend allowed to call the API.
     */
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')),

];
