<?php

use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\BarcodeAdminController;
use App\Http\Controllers\Api\Admin\CategoryAdminController;
use App\Http\Controllers\Api\Admin\CouponAdminController;
use App\Http\Controllers\Api\Admin\CustomerAdminController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DeliveryZoneAdminController;
use App\Http\Controllers\Api\Admin\DriverAdminController;
use App\Http\Controllers\Api\Admin\EmployeeAdminController;
use App\Http\Controllers\Api\Admin\InventoryAdminController;
use App\Http\Controllers\Api\Admin\InvoiceAdminController;
use App\Http\Controllers\Api\Admin\LoyaltyAdminController;
use App\Http\Controllers\Api\Admin\MessageAdminController;
use App\Http\Controllers\Api\Admin\NotificationAdminController;
use App\Http\Controllers\Api\Admin\OfferAdminController;
use App\Http\Controllers\Api\Admin\OrderAdminController;
use App\Http\Controllers\Api\Admin\PageAdminController;
use App\Http\Controllers\Api\Admin\ProductAdminController;
use App\Http\Controllers\Api\Admin\ReportsAdminController;
use App\Http\Controllers\Api\Admin\SettingAdminController;
use App\Http\Controllers\Api\Admin\SupplierAdminController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\LoyaltyController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SettingController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::bind('employee', fn ($value) => User::findOrFail($value));
Route::bind('driver', fn ($value) => User::findOrFail($value));

Route::get('/health', fn () => response()->json(['status' => 'ok']));

// Public storefront API
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/offers/active', [OfferController::class, 'active']);
Route::post('/coupons/validate', [CouponController::class, 'validate']);
Route::get('/delivery-zones', [DeliveryZoneController::class, 'index']);
Route::get('/loyalty/balance', [LoyaltyController::class, 'balance']);
Route::get('/pages', [PageController::class, 'index']);
Route::get('/pages/{slug}', [PageController::class, 'show']);
Route::post('/messages', [MessageController::class, 'store']);
Route::get('/settings', [SettingController::class, 'public_index']);

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

    Route::middleware('permission:offers.view')->group(function () {
        Route::get('/offers', [OfferAdminController::class, 'index']);
        Route::get('/offers/{offer}', [OfferAdminController::class, 'show']);
    });
    Route::middleware('permission:offers.manage')->group(function () {
        Route::post('/offers', [OfferAdminController::class, 'store']);
        Route::put('/offers/{offer}', [OfferAdminController::class, 'update']);
        Route::post('/offers/{offer}/toggle', [OfferAdminController::class, 'toggle']);
        Route::delete('/offers/{offer}', [OfferAdminController::class, 'destroy']);
    });

    Route::middleware('permission:coupons.view')->group(function () {
        Route::get('/coupons', [CouponAdminController::class, 'index']);
    });
    Route::middleware('permission:coupons.manage')->group(function () {
        Route::post('/coupons', [CouponAdminController::class, 'store']);
        Route::put('/coupons/{coupon}', [CouponAdminController::class, 'update']);
        Route::delete('/coupons/{coupon}', [CouponAdminController::class, 'destroy']);
    });

    Route::middleware('permission:suppliers.view')->group(function () {
        Route::get('/suppliers', [SupplierAdminController::class, 'index']);
        Route::get('/suppliers/{supplier}', [SupplierAdminController::class, 'show']);
    });
    Route::middleware('permission:suppliers.manage')->group(function () {
        Route::post('/suppliers', [SupplierAdminController::class, 'store']);
        Route::put('/suppliers/{supplier}', [SupplierAdminController::class, 'update']);
        Route::post('/suppliers/{supplier}/toggle', [SupplierAdminController::class, 'toggleStatus']);
        Route::delete('/suppliers/{supplier}', [SupplierAdminController::class, 'destroy']);
    });

    Route::middleware('permission:employees.view')->group(function () {
        Route::get('/employees', [EmployeeAdminController::class, 'index']);
        Route::get('/employees/{employee}', [EmployeeAdminController::class, 'show']);
        Route::get('/roles', [EmployeeAdminController::class, 'roles']);
        Route::get('/employees-activity', [EmployeeAdminController::class, 'recentActivity']);
    });
    Route::middleware('permission:employees.manage')->group(function () {
        Route::post('/employees', [EmployeeAdminController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeAdminController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeAdminController::class, 'destroy']);
        Route::post('/employees/{employee}/avatar', [EmployeeAdminController::class, 'uploadAvatar']);
        Route::delete('/employees/{employee}/avatar', [EmployeeAdminController::class, 'deleteAvatar']);
        Route::put('/roles/{role}/permissions', [EmployeeAdminController::class, 'syncRolePermissions']);
    });

    Route::middleware('permission:inventory.view')->group(function () {
        Route::get('/inventory/movements', [InventoryAdminController::class, 'movements']);
        Route::get('/inventory/low-stock', [InventoryAdminController::class, 'lowStock']);
    });
    Route::middleware('permission:inventory.manage')->group(function () {
        Route::post('/inventory/adjust', [InventoryAdminController::class, 'adjust']);
    });

    Route::middleware('permission:delivery.view')->group(function () {
        Route::get('/delivery/zones', [DeliveryZoneAdminController::class, 'index']);
        Route::get('/delivery/drivers', [DriverAdminController::class, 'index']);
        Route::get('/delivery/drivers/{driver}', [DriverAdminController::class, 'show']);
    });
    Route::middleware('permission:delivery.manage')->group(function () {
        Route::post('/delivery/zones', [DeliveryZoneAdminController::class, 'store']);
        Route::put('/delivery/zones/{zone}', [DeliveryZoneAdminController::class, 'update']);
        Route::delete('/delivery/zones/{zone}', [DeliveryZoneAdminController::class, 'destroy']);
        Route::post('/delivery/drivers', [DriverAdminController::class, 'store']);
        Route::put('/delivery/drivers/{driver}', [DriverAdminController::class, 'update']);
        Route::delete('/delivery/drivers/{driver}', [DriverAdminController::class, 'destroy']);
        Route::post('/orders/{order}/assign-driver', [DriverAdminController::class, 'assignDriver']);
    });

    Route::middleware('permission:pages.view')->group(function () {
        Route::get('/pages', [PageAdminController::class, 'index']);
        Route::get('/pages/{page}', [PageAdminController::class, 'show']);
    });
    Route::middleware('permission:pages.manage')->group(function () {
        Route::post('/pages', [PageAdminController::class, 'store']);
        Route::put('/pages/{page}', [PageAdminController::class, 'update']);
        Route::delete('/pages/{page}', [PageAdminController::class, 'destroy']);
    });

    Route::middleware('permission:messages.view')->group(function () {
        Route::get('/messages', [MessageAdminController::class, 'index']);
        Route::get('/messages/{message}', [MessageAdminController::class, 'show']);
    });
    Route::middleware('permission:messages.manage')->group(function () {
        Route::post('/messages/{message}/reply', [MessageAdminController::class, 'reply']);
        Route::post('/messages/{message}/status', [MessageAdminController::class, 'updateStatus']);
        Route::post('/messages/{message}/assign', [MessageAdminController::class, 'assign']);
        Route::delete('/messages/{message}', [MessageAdminController::class, 'destroy']);
    });

    Route::middleware('permission:invoices.view')->group(function () {
        Route::get('/invoices', [InvoiceAdminController::class, 'index']);
        Route::get('/invoices/{invoice}', [InvoiceAdminController::class, 'show']);
        Route::get('/invoices/{invoice}/pdf', [InvoiceAdminController::class, 'pdf']);
        Route::get('/invoices/{invoice}/whatsapp', [InvoiceAdminController::class, 'whatsappLink']);
    });
    Route::middleware('permission:invoices.manage')->group(function () {
        Route::post('/orders/{order}/invoice', [InvoiceAdminController::class, 'generate']);
        Route::post('/invoices/{invoice}/status', [InvoiceAdminController::class, 'updateStatus']);
        Route::delete('/invoices/{invoice}', [InvoiceAdminController::class, 'destroy']);
    });

    Route::middleware('permission:reports.view')->group(function () {
        Route::get('/reports/summary', [ReportsAdminController::class, 'summary']);
    });

    // Barcode management — reuses products.* permissions
    Route::middleware('permission:products.view')->group(function () {
        Route::get('/barcodes/summary', [BarcodeAdminController::class, 'summary']);
        Route::get('/barcodes', [BarcodeAdminController::class, 'index']);
        Route::get('/barcodes/lookup', [BarcodeAdminController::class, 'lookup']);
    });
    Route::middleware('permission:products.manage')->group(function () {
        Route::post('/barcodes/generate-missing', [BarcodeAdminController::class, 'generateMissing']);
    });

    // Loyalty — reuses customers.* permissions
    Route::middleware('permission:customers.view')->group(function () {
        Route::get('/loyalty/summary', [LoyaltyAdminController::class, 'summary']);
        Route::get('/loyalty/customers/{customer}', [LoyaltyAdminController::class, 'customer']);
    });
    Route::middleware('permission:customers.manage')->group(function () {
        Route::post('/loyalty/customers/{customer}/adjust', [LoyaltyAdminController::class, 'adjust']);
    });

    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('/settings', [SettingAdminController::class, 'index']);
        Route::put('/settings', [SettingAdminController::class, 'update']);
        Route::get('/settings/backup', [SettingAdminController::class, 'backup']);
    });

    // Notifications: any authenticated admin can read their own
    Route::get('/notifications', [NotificationAdminController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationAdminController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationAdminController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationAdminController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationAdminController::class, 'destroy']);
});
