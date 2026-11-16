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
     * The list with the backward-compatible names, so Etc/UTC, GMT or CET (valid
     * for RuneActivity's Java too) are kept rather than replaced by Budapest;
     * so is a fixed offset (Z, +01:00, +0100, +01), which Java accepts too.
     */
    'timezone' => in_array(env('RUNEACTIVITY_TIMEZONE'), DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)
        || preg_match('/\A(Z|[+-](0\d|1[0-8])(:?[0-5]\d)?)\z/', (string) env('RUNEACTIVITY_TIMEZONE')) === 1
        ? env('RUNEACTIVITY_TIMEZONE')
        : 'Europe/Budapest',

];
