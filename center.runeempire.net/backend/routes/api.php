<?php

use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\DisableTwoFactorController;
use App\Http\Controllers\Auth\EnableTwoFactorController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LoginTwoFactorController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Auth\StartRegistrationController;
use App\Http\Controllers\Auth\StartTwoFactorSetupController;
use App\Http\Controllers\Auth\VerifyPasswordResetCodeController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use App\Http\Controllers\DiscordWidgetController;
use App\Http\Controllers\MyFriendsController;
use App\Http\Controllers\MyStatsController;
use App\Http\Controllers\PlayerFriendsController;
use App\Http\Controllers\PlayerSearchController;
use App\Http\Controllers\PlayerSkinController;
use App\Http\Controllers\PlayerStatsController;
use App\Http\Controllers\RanksController;
use Illuminate\Support\Facades\Route;

// {player} in a path is a player name (RouteBindingServiceProvider); each route also pins it to
// Account::NAME_PATTERN, so anything else is a 404 before the database is asked.

// Public, like Discord's own widget; cached, so Discord is asked at most once a minute.
Route::get('/discord-widget', DiscordWidgetController::class)->name('discord-widget');

// Public, like skins in game: a player's skin as a PNG, for heads and the 3D figure.
// The name follows Account::NAME_PATTERN; anything else is a 404 before the controller.
Route::get('/players/{player}/skin', PlayerSkinController::class)
    ->where('player', '[A-Za-z0-9_]{3,16}')
    ->middleware('throttle:skins')
    ->name('players.skin');

// Public: the ranks the shop sells (the management section will edit them later).
Route::get('/ranks', RanksController::class)->name('ranks');

// The logged-in player's numbers and friends for the overview.
Route::get('/me/stats', MyStatsController::class)->middleware('auth:sanctum')->name('me.stats');
Route::get('/me/friends', MyFriendsController::class)->middleware('auth:sanctum')->name('me.friends');

// The Játékosok page, only for logged-in players (owner, 2026-11-18): the name search and another
// player's profile, which shows what that player's overview shows.
Route::middleware('auth:sanctum')->prefix('players')->name('players.')->group(function () {
    Route::get('/', PlayerSearchController::class)->middleware('throttle:player-search')->name('search');
    // One counter for both: a profile asks for its stats and its friends together.
    Route::middleware('throttle:player-profile')->group(function () {
        Route::get('/{player}/stats', PlayerStatsController::class)->where('player', '[A-Za-z0-9_]{3,16}')->name('stats');
        Route::get('/{player}/friends', PlayerFriendsController::class)->where('player', '[A-Za-z0-9_]{3,16}')->name('friends');
    });
});

Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('/register', StartRegistrationController::class)
        ->middleware('throttle:register')
        ->name('register');

    Route::post('/register/verify', VerifyRegistrationController::class)
        ->middleware('throttle:register-verify')
        ->name('register.verify');

    Route::post('/login', LoginController::class)
        ->middleware('throttle:login')
        ->name('login');

    // The second step of a 2FA account's login, on the session whose password checked out.
    Route::post('/login/two-factor', LoginTwoFactorController::class)
        ->middleware('throttle:two-factor')
        ->name('login.two-factor');

    // Open to guests: "not logged in" is an answer here, not an error.
    Route::get('/me', MeController::class)->name('me');

    // Forgotten password: open to guests and logged-in visitors alike.
    Route::post('/password/forgot', ForgotPasswordController::class)
        ->middleware('throttle:password-forgot')
        ->name('password.forgot');

    Route::post('/password/forgot/verify', VerifyPasswordResetCodeController::class)
        ->middleware('throttle:password-reset')
        ->name('password.forgot.verify');

    Route::post('/password/reset', ResetPasswordController::class)
        ->middleware('throttle:password-reset')
        ->name('password.reset');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', LogoutController::class)->name('logout');

        Route::put('/password', ChangePasswordController::class)
            ->middleware('throttle:password-change')
            ->name('password.update');

        // Switching 2FA on (a secret in the session, then a code from the app) and off (a code).
        Route::middleware('throttle:two-factor')->prefix('two-factor')->name('two-factor.')->group(function () {
            Route::post('/setup', StartTwoFactorSetupController::class)->name('setup');
            Route::post('/enable', EnableTwoFactorController::class)->name('enable');
            Route::post('/disable', DisableTwoFactorController::class)->name('disable');
        });
    });
});
