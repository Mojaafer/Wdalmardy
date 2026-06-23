<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/docs', fn () => view('swagger'));
Route::get('/openapi.yaml', function () {
    return response()->file(public_path('openapi.yaml'), [
        'Content-Type' => 'text/yaml; charset=utf-8',
    ]);
});
