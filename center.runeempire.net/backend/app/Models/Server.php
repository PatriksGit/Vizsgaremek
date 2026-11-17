<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * One of the network's game servers (Lobby, Kingdoms, ...), in the website's
 * own database (Center). The rank shop shows which servers a rank gives
 * something on.
 *
 * @property int $id
 * @property string $name
 * @property int $sort_order
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['name', 'sort_order'])]
class Server extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * The ranks that give something on this server.
     *
     * @return BelongsToMany<Rank, $this>
     */
    public function ranks(): BelongsToMany
    {
        return $this->belongsToMany(Rank::class);
    }
}
