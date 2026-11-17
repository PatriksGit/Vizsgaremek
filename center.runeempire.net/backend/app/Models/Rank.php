<?php

namespace App\Models;

use Database\Factories\RankFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * A rank the shop sells, in the website's own database (Center). group is the
 * LuckPerms group it gives; details is the "Mit kapsz?" text as Markdown;
 * gif_url and prefix_url are the banner and the in-game prefix image.
 *
 * @property int $id
 * @property string $group
 * @property string $name
 * @property string $details
 * @property string|null $gif_url
 * @property string|null $prefix_url
 * @property int $price_30
 * @property int $price_90
 * @property Carbon|null $season_ends_at
 * @property int $sort_order
 * @property string|null $color not a column: the in-game colour, set by RanksController from LuckPerms
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, Server> $servers
 */
#[Fillable(['group', 'name', 'details', 'gif_url', 'prefix_url', 'price_30', 'price_90', 'season_ends_at', 'sort_order'])]
class Rank extends Model
{
    /** @use HasFactory<RankFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_30' => 'integer',
            'price_90' => 'integer',
            'season_ends_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    /**
     * The servers this rank gives something on, in their own order.
     *
     * @return BelongsToMany<Server, $this>
     */
    public function servers(): BelongsToMany
    {
        return $this->belongsToMany(Server::class)->orderBy('servers.sort_order')->orderBy('servers.id');
    }
}
