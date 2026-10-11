<?php

use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => ['status' => 'ok']);

Route::post('/register', RegisterController::class)
    ->middleware('throttle:register')
    ->name('register');

Route::post('/register/verify', VerifyRegistrationController::class)
    ->middleware('throttle:10,1')
    ->name('register.verify');
