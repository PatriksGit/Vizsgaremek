<?php

/*
 * How the website reads RuneActivity, the network's playtime and login streak
 * plugin (RUNEACTIVITY_TIMEZONE in .env).
 */
return [

    /*
     * The time zone RuneActivity counts its days and its Monday-to-Sunday
     * week in (its config.yml `timezone`): the website must cut days the
     * same way. A typo falls back to Budapest instead of breaking the overview.
     */
    'timezone' => in_array(env('RUNEACTIVITY_TIMEZONE'), timezone_identifiers_list(), true)
        ? env('RUNEACTIVITY_TIMEZONE')
        : 'Europe/Budapest',

];
