<?php

use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\StartRegistrationController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use Illuminate\Support\Facades\Route;

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

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', MeController::class)->name('me');
        Route::post('/logout', LogoutController::class)->name('logout');

        Route::put('/password', ChangePasswordController::class)
            ->middleware('throttle:password-change')
            ->name('password.update');
    });
});
