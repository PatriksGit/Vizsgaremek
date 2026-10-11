<?php

use App\Http\Controllers\Auth\RegisterController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => ['status' => 'ok']);

Route::post('/register', RegisterController::class)
    ->middleware('throttle:5,1')
    ->name('register');
