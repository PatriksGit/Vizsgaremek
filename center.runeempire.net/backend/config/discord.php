<?php

/*
 * The Discord server shown on the overview, from config.yml's discord section
 * (discord.guild-id -> DISCORD_GUILD_ID).
 */
return [

    /*
     * The server's ID, with its widget turned on (Server settings > Widget).
     * Empty: the overview says Discord is unavailable.
     */
    'guild_id' => env('DISCORD_GUILD_ID'),

];
