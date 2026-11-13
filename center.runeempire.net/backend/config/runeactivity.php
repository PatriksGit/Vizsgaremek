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
     * for RuneActivity's Java too) are kept rather than replaced by Budapest.
     */
    'timezone' => in_array(env('RUNEACTIVITY_TIMEZONE'), DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)
        ? env('RUNEACTIVITY_TIMEZONE')
        : 'Europe/Budapest',

];
