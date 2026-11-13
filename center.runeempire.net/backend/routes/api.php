<?php

use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Auth\StartRegistrationController;
use App\Http\Controllers\Auth\VerifyPasswordResetCodeController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use App\Http\Controllers\DiscordWidgetController;
use App\Http\Controllers\PlayerSkinController;
use Illuminate\Support\Facades\Route;

// Public, like Discord's own widget; cached, so Discord is asked at most once a minute.
Route::get('/discord-widget', DiscordWidgetController::class)->name('discord-widget');

// Public, like skins in game: a player's skin as a PNG, for heads and the 3D figure.
// The name follows Account::NAME_PATTERN; anything else is a 404 before the controller.
Route::get('/players/{name}/skin', PlayerSkinController::class)
    ->where('name', '[A-Za-z0-9_]{3,16}')
    ->middleware('throttle:skins')
    ->name('players.skin');

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
    });
});
