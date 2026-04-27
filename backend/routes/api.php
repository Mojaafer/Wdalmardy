<?php

use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\CategoryAdminController;
use App\Http\Controllers\Api\Admin\CustomerAdminController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\OrderAdminController;
use App\Http\Controllers\Api\Admin\ProductAdminController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

// Public storefront API
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);

// Admin auth
Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class);

    Route::middleware('permission:products.view')->group(function () {
        Route::get('/products', [ProductAdminController::class, 'index']);
        Route::get('/products/{product}', [ProductAdminController::class, 'show']);
    });
    Route::middleware('permission:products.manage')->group(function () {
        Route::post('/products', [ProductAdminController::class, 'store']);
        Route::put('/products/{product}', [ProductAdminController::class, 'update']);
        Route::delete('/products/{product}', [ProductAdminController::class, 'destroy']);
    });

    Route::middleware('permission:categories.view')->group(function () {
        Route::get('/categories', [CategoryAdminController::class, 'index']);
        Route::get('/categories/{category}', [CategoryAdminController::class, 'show']);
    });
    Route::middleware('permission:categories.manage')->group(function () {
        Route::post('/categories', [CategoryAdminController::class, 'store']);
        Route::put('/categories/{category}', [CategoryAdminController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryAdminController::class, 'destroy']);
        Route::post('/categories/reorder', [CategoryAdminController::class, 'reorder']);
    });

    Route::middleware('permission:orders.view')->group(function () {
        Route::get('/orders', [OrderAdminController::class, 'index']);
        Route::get('/orders/{order}', [OrderAdminController::class, 'show']);
        Route::get('/orders/{order}/invoice', [OrderAdminController::class, 'invoicePdf']);
        Route::post('/orders/{order}/whatsapp-resend', [OrderAdminController::class, 'whatsappResend']);
    });
    Route::middleware('permission:orders.manage')->group(function () {
        Route::post('/orders/{order}/status', [OrderAdminController::class, 'updateStatus']);
    });

    Route::middleware('permission:customers.view')->group(function () {
        Route::get('/customers', [CustomerAdminController::class, 'index']);
        Route::get('/customers/{customer}', [CustomerAdminController::class, 'show']);
    });
    Route::middleware('permission:customers.manage')->group(function () {
        Route::post('/customers', [CustomerAdminController::class, 'store']);
        Route::put('/customers/{customer}', [CustomerAdminController::class, 'update']);
        Route::post('/customers/{customer}/block', [CustomerAdminController::class, 'block']);
        Route::delete('/customers/{customer}', [CustomerAdminController::class, 'destroy']);
    });
});
