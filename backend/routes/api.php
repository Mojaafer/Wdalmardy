<?php

use App\Http\Controllers\Api\Admin\AuditLogAdminController;
use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\BarcodeAdminController;
use App\Http\Controllers\Api\Admin\BranchAdminController;
use App\Http\Controllers\Api\Admin\CategoryAdminController;
use App\Http\Controllers\Api\Admin\ChartOfAccountAdminController;
use App\Http\Controllers\Api\Admin\CouponAdminController;
use App\Http\Controllers\Api\Admin\CustomerAdminController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DeliveryZoneAdminController;
use App\Http\Controllers\Api\Admin\DriverAdminController;
use App\Http\Controllers\Api\Admin\EmployeeAdminController;
use App\Http\Controllers\Api\Admin\ExpenseAdminController;
use App\Http\Controllers\Api\Admin\InventoryAdminController;
use App\Http\Controllers\Api\Admin\InventoryAuditAdminController;
use App\Http\Controllers\Api\Admin\InvoiceAdminController;
use App\Http\Controllers\Api\Admin\JournalEntryAdminController;
use App\Http\Controllers\Api\Admin\LoyaltyAdminController;
use App\Http\Controllers\Api\Admin\MessageAdminController;
use App\Http\Controllers\Api\Admin\NotificationAdminController;
use App\Http\Controllers\Api\Admin\OfferAdminController;
use App\Http\Controllers\Api\Admin\OrderAdminController;
use App\Http\Controllers\Api\Admin\PageAdminController;
use App\Http\Controllers\Api\Admin\PosSaleAdminController;
use App\Http\Controllers\Api\Admin\PosSessionAdminController;
use App\Http\Controllers\Api\Admin\ProductAdminController;
use App\Http\Controllers\Api\Admin\PurchaseOrderAdminController;
use App\Http\Controllers\Api\Admin\ReportsAdminController;
use App\Http\Controllers\Api\Admin\SettingAdminController;
use App\Http\Controllers\Api\Admin\StockTransferAdminController;
use App\Http\Controllers\Api\Admin\SupplierAdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\LoyaltyController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\WishlistController;
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
Route::middleware('throttle:'.(int) env('RATE_LIMIT_ORDERS', 20).',1')->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);
});
Route::get('/offers/active', [OfferController::class, 'active']);
Route::post('/coupons/validate', [CouponController::class, 'validate']);
Route::get('/delivery-zones', [DeliveryZoneController::class, 'index']);
Route::get('/loyalty/balance', [LoyaltyController::class, 'balance']);
Route::get('/pages', [PageController::class, 'index']);
Route::get('/pages/{slug}', [PageController::class, 'show']);
Route::middleware('throttle:30,1')->group(function () {
    Route::post('/messages', [MessageController::class, 'store']);
});
Route::get('/settings', [SettingController::class, 'public_index']);
Route::get('/products/{productId}/reviews', [ReviewController::class, 'index'])->whereNumber('productId');

// Customer auth — public OTP endpoints (throttled tightly to deter abuse)
Route::middleware('throttle:'.(int) env('RATE_LIMIT_OTP', 5).',1')->group(function () {
    Route::prefix('auth')->controller(AuthController::class)->group(function () {
        Route::post('/request-otp', 'requestOtp');
        Route::post('/verify-otp', 'verifyOtp');
    });
});

Route::prefix('auth')->controller(AuthController::class)->middleware(['auth:sanctum', 'customer'])->group(function () {
    Route::get('/me', 'me');
    Route::post('/logout', 'logout');
    Route::put('/profile', 'updateProfile');
    Route::get('/addresses', 'addresses');
    Route::put('/addresses', 'updateAddresses');
    Route::get('/orders', 'orders');
    Route::get('/orders/{orderId}', 'showOrder')->whereNumber('orderId');
    Route::post('/orders/{orderId}/cancel', 'cancelOrder')->whereNumber('orderId');
    Route::post('/products/{productId}/reviews', [ReviewController::class, 'store'])->whereNumber('productId');
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/{productId}', [WishlistController::class, 'toggle'])->whereNumber('productId');
});

// Admin auth — throttled aggressively to mitigate brute force
Route::middleware('throttle:'.(int) env('RATE_LIMIT_LOGIN', 10).',1')
    ->post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    Route::middleware('permission:dashboard.view')->get('/dashboard', DashboardController::class);

    Route::middleware('permission:products.view')->group(function () {
        Route::get('/products', [ProductAdminController::class, 'index']);
        Route::get('/products/{product}', [ProductAdminController::class, 'show']);
    });
    Route::middleware('permission:products.manage')->group(function () {
        Route::post('/products', [ProductAdminController::class, 'store']);
        Route::put('/products/{product}', [ProductAdminController::class, 'update']);
        Route::delete('/products/{product}', [ProductAdminController::class, 'destroy']);
        Route::post('/products/{product}/image', [ProductAdminController::class, 'uploadImage']);
        Route::delete('/products/{product}/image', [ProductAdminController::class, 'deleteImage']);
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
        Route::post('/categories/{category}/image', [CategoryAdminController::class, 'uploadImage']);
        Route::delete('/categories/{category}/image', [CategoryAdminController::class, 'deleteImage']);
    });

    Route::middleware('permission:orders.view')->group(function () {
        Route::get('/orders', [OrderAdminController::class, 'index']);
        Route::get('/orders/{order}', [OrderAdminController::class, 'show']);
        Route::get('/orders/{order}/invoice', [OrderAdminController::class, 'invoicePdf']);
        Route::post('/orders/{order}/whatsapp-resend', [OrderAdminController::class, 'whatsappResend']);
    });
    Route::middleware('permission:orders.manage')->group(function () {
        Route::post('/orders/{order}/status', [OrderAdminController::class, 'updateStatus']);
        Route::post('/orders/{order}/assign-branch', [OrderAdminController::class, 'assignBranch']);
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
        Route::post('/offers/{offer}/banner', [OfferAdminController::class, 'uploadBanner']);
        Route::delete('/offers/{offer}/banner', [OfferAdminController::class, 'deleteBanner']);
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
        Route::post('/suppliers/{supplier}/logo', [SupplierAdminController::class, 'uploadLogo']);
        Route::delete('/suppliers/{supplier}/logo', [SupplierAdminController::class, 'deleteLogo']);
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
        Route::get('/inventory/audit-sessions', [InventoryAuditAdminController::class, 'index']);
        Route::get('/inventory/audit-sessions/{session}', [InventoryAuditAdminController::class, 'show']);
    });
    Route::middleware('permission:inventory.manage')->group(function () {
        Route::post('/inventory/adjust', [InventoryAdminController::class, 'adjust']);
        Route::post('/inventory/audit-sessions', [InventoryAuditAdminController::class, 'store']);
        Route::put('/inventory/audit-sessions/{session}/items/{item}', [InventoryAuditAdminController::class, 'updateItem']);
        Route::post('/inventory/audit-sessions/{session}/close', [InventoryAuditAdminController::class, 'close']);
    });

    // Inter-branch stock transfers
    Route::middleware('permission:inventory.view')->group(function () {
        Route::get('/stock-transfers', [StockTransferAdminController::class, 'index']);
        Route::get('/stock-transfers/{transfer}', [StockTransferAdminController::class, 'show']);
    });
    Route::middleware('permission:inventory.manage')->group(function () {
        Route::post('/stock-transfers', [StockTransferAdminController::class, 'store']);
        Route::post('/stock-transfers/{transfer}/dispatch', [StockTransferAdminController::class, 'dispatch']);
        Route::post('/stock-transfers/{transfer}/receive', [StockTransferAdminController::class, 'receive']);
        Route::post('/stock-transfers/{transfer}/cancel', [StockTransferAdminController::class, 'cancel']);
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

    // Expenses
    Route::middleware('permission:expenses.view')->group(function () {
        Route::get('/expenses', [ExpenseAdminController::class, 'index']);
        Route::get('/expenses/{expense}', [ExpenseAdminController::class, 'show']);
    });
    Route::middleware('permission:expenses.manage')->group(function () {
        Route::post('/expenses', [ExpenseAdminController::class, 'store']);
        Route::put('/expenses/{expense}', [ExpenseAdminController::class, 'update']);
        Route::delete('/expenses/{expense}', [ExpenseAdminController::class, 'destroy']);
    });

    // Chart of Accounts
    Route::middleware('permission:chart_of_accounts.view')->group(function () {
        Route::get('/chart-of-accounts', [ChartOfAccountAdminController::class, 'index']);
        Route::get('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountAdminController::class, 'show']);
    });
    Route::middleware('permission:chart_of_accounts.manage')->group(function () {
        Route::post('/chart-of-accounts', [ChartOfAccountAdminController::class, 'store']);
        Route::put('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountAdminController::class, 'update']);
        Route::delete('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountAdminController::class, 'destroy']);
    });

    // Journal Entries
    Route::middleware('permission:journal_entries.view')->group(function () {
        Route::get('/journal-entries', [JournalEntryAdminController::class, 'index']);
        Route::get('/journal-entries/{journalEntry}', [JournalEntryAdminController::class, 'show']);
    });
    Route::middleware('permission:journal_entries.manage')->group(function () {
        Route::post('/journal-entries', [JournalEntryAdminController::class, 'store']);
        Route::delete('/journal-entries/{journalEntry}', [JournalEntryAdminController::class, 'destroy']);
    });

    // Purchase Orders
    Route::middleware('permission:purchase_orders.view')->group(function () {
        Route::get('/purchase-orders', [PurchaseOrderAdminController::class, 'index']);
        Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderAdminController::class, 'show']);
    });
    Route::middleware('permission:purchase_orders.manage')->group(function () {
        Route::post('/purchase-orders', [PurchaseOrderAdminController::class, 'store']);
        Route::post('/purchase-orders/{purchaseOrder}/status', [PurchaseOrderAdminController::class, 'updateStatus']);
        Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrderAdminController::class, 'destroy']);
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
        Route::get('/settings/backups', [SettingAdminController::class, 'backups']);
        Route::post('/settings/hero-image', [SettingAdminController::class, 'uploadHeroImage']);
        Route::delete('/settings/hero-image', [SettingAdminController::class, 'deleteHeroImage']);
        Route::post('/settings/logo', [SettingAdminController::class, 'uploadLogo']);
        Route::delete('/settings/logo', [SettingAdminController::class, 'deleteLogo']);
    });

    Route::middleware('permission:branches.view')->group(function () {
        Route::get('/branches', [BranchAdminController::class, 'index']);
    });
    Route::middleware('permission:branches.manage')->group(function () {
        Route::post('/branches', [BranchAdminController::class, 'store']);
        Route::put('/branches/{branch}', [BranchAdminController::class, 'update']);
        Route::delete('/branches/{branch}', [BranchAdminController::class, 'destroy']);
    });

    Route::middleware('permission:audit_logs.view')->group(function () {
        Route::get('/audit-log', [AuditLogAdminController::class, 'index']);
    });
    Route::middleware('permission:audit_logs.export')->group(function () {
        Route::get('/audit-log/export', [AuditLogAdminController::class, 'export']);
    });

    // POS — cashier app
    Route::middleware('permission:pos.operate')->group(function () {
        Route::get('/pos/products/search', [PosSaleAdminController::class, 'lookupProduct']);
        Route::get('/pos/sessions/current', [PosSessionAdminController::class, 'current']);
        Route::post('/pos/sessions', [PosSessionAdminController::class, 'open']);
        Route::post('/pos/sessions/{session}/close', [PosSessionAdminController::class, 'close']);
        Route::get('/pos/sales', [PosSaleAdminController::class, 'index']);
        Route::get('/pos/sales/{sale}', [PosSaleAdminController::class, 'show']);
        Route::post('/pos/sales', [PosSaleAdminController::class, 'store']);
    });
    Route::middleware('permission:pos.manage')->group(function () {
        Route::get('/pos/sessions', [PosSessionAdminController::class, 'index']);
        Route::get('/pos/sessions/{session}', [PosSessionAdminController::class, 'show']);
        Route::get('/pos/z-report', [PosSessionAdminController::class, 'zReport']);
        Route::post('/pos/sales/{sale}/void', [PosSaleAdminController::class, 'void']);
    });

    // Notifications: any authenticated admin can read their own
    Route::get('/notifications', [NotificationAdminController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationAdminController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationAdminController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationAdminController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationAdminController::class, 'destroy']);
});
