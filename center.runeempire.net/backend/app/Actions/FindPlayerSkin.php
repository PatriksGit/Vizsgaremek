<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Database\Query\Builder;

class FindPlayerSkin
{
    /**
     * Steve, the skin Minecraft gives a player without one: Mojang's own
     * texture of it.
     */
    public const string DEFAULT_SKIN_HASH = '1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a713eb810b';

    /**
     * The Mojang texture hash of the skin the player wears in game, read from
     * SkinRestorer the way it picks one on join: the skin the player chose
     * (a premium player's, an image URL's or a custom one), otherwise the
     * premium account of the same name, otherwise Steve.
     *
     * Only a hash is returned, never a stored URL: whatever the database
     * holds, the server only ever downloads from textures.minecraft.net.
     */
    public function handle(Account $account): string
    {
        $chosen = $this->table('players')->where('uuid', $account->uuid)->first();

        $value = match ($chosen?->skin_type) {
            'PLAYER' => $this->table('player_skins')->where('uuid', $chosen->skin_identifier)->value('value'),
            'URL' => $this->table('url_skins')
                ->where('url', $chosen->skin_identifier)
                ->when($chosen->skin_variant !== null, fn (Builder $query) => $query->where('skin_variant', $chosen->skin_variant))
                ->value('value'),
            'CUSTOM' => $this->table('custom_skins')->where('name', $chosen->skin_identifier)->value('value'),
            default => null,
        };

        // No skin chosen (or a row that only remembers a dismissed warning): the name's premium account.
        if ($value === null && ($chosen?->skin_identifier === null)) {
            $premiumUuid = $this->table('cache')->where('name', $account->display_name)->value('uuid');

            if ($premiumUuid !== null) {
                $value = $this->table('player_skins')->where('uuid', $premiumUuid)->value('value');
            }
        }

        return self::textureHash($value) ?? self::DEFAULT_SKIN_HASH;
    }

    /**
     * The hash in a stored texture value (base64 of Mojang's profile JSON),
     * or null when the value is missing or its skin is not on Mojang's
     * texture server.
     */
    private static function textureHash(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $url = data_get(json_decode((string) base64_decode($value, true), true), 'textures.SKIN.url');

        if (is_string($url) && preg_match('#\Ahttps?://textures\.minecraft\.net/texture/([0-9a-f]{32,64})\z#', $url, $match)) {
            return $match[1];
        }

        return null;
    }

    private function table(string $table): Builder
    {
        return PluginDatabase::table('skinrestorer', $table);
    }
}
