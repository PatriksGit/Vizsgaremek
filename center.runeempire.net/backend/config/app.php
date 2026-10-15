<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/app.php.
 */
return [

    /*
     * Players get Hungarian messages (lang/hu); English stays the fallback
     * for any line lang/hu does not have.
     */
    'locale' => env('APP_LOCALE', 'hu'),

];
