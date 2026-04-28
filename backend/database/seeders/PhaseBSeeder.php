<?php

namespace Database\Seeders;

use App\Models\Coupon;
use App\Models\Offer;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class PhaseBSeeder extends Seeder
{
    public function run(): void
    {
        Offer::firstOrCreate(['title' => 'عروض مذهلة'], [
            'type' => 'banner',
            'title_en' => 'Amazing Deals',
            'description' => 'حتى 50% خصم على أكثر من 1000 منتج',
            'description_en' => 'Up to 50% off on 1000+ products',
            'discount_value' => 50,
            'discount_unit' => 'percent',
            'scope' => 'all',
            'banner_link' => '/ar/store',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'is_active' => true,
            'priority' => 100,
        ]);

        Offer::firstOrCreate(['title' => 'عرض اليوم'], [
            'type' => 'daily',
            'title_en' => 'Today\'s Deal',
            'description' => 'خصم 20% على جميع المنتجات اليوم فقط',
            'discount_value' => 20,
            'discount_unit' => 'percent',
            'scope' => 'all',
            'starts_at' => now()->startOfDay(),
            'ends_at' => now()->endOfDay(),
            'is_active' => true,
            'priority' => 90,
        ]);

        Offer::firstOrCreate(['title' => 'عرض الأسبوع'], [
            'type' => 'weekly',
            'title_en' => 'Weekly Offer',
            'description' => 'خصم 15% على المواد الغذائية',
            'discount_value' => 15,
            'discount_unit' => 'percent',
            'scope' => 'category',
            'scope_id' => 1,
            'starts_at' => now()->startOfWeek(),
            'ends_at' => now()->endOfWeek(),
            'is_active' => true,
            'priority' => 80,
        ]);

        Coupon::firstOrCreate(['code' => 'WELCOME10'], [
            'type' => 'percent',
            'value' => 10,
            'max_discount' => 2000,
            'min_order_amount' => 5000,
            'max_uses' => 500,
            'applies_to' => 'new_customers',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonths(3),
            'is_active' => true,
        ]);

        Coupon::firstOrCreate(['code' => 'SUMMER20'], [
            'type' => 'percent',
            'value' => 20,
            'max_discount' => 1000,
            'min_order_amount' => 0,
            'is_active' => true,
        ]);

        Coupon::firstOrCreate(['code' => 'FREESHIP'], [
            'type' => 'free_shipping',
            'value' => 0,
            'min_order_amount' => 10000,
            'is_active' => true,
        ]);

        Supplier::firstOrCreate(['name' => 'شركة النيل للتجارة'], [
            'business_type' => 'تجارة عامة - مواد غذائية',
            'email' => 'info@alnil-trade.com',
            'phone' => '0912345678',
            'address' => 'الخرطوم - السوق المركزي',
            'registered_at' => '2023-02-15',
            'status' => 'active',
            'performance_rating' => 4.5,
            'total_purchases' => 285450.00,
            'current_balance' => 25000.00,
            'orders_count' => 18,
            'last_order_at' => now()->subDays(7)->toDateString(),
            'notes' => 'المورد ملتزم بالتسليم وجودة المنتجات ممتازة',
        ]);

        Supplier::firstOrCreate(['name' => 'مؤسسة الشروق'], [
            'business_type' => 'مواد غذائية',
            'email' => 'info@shorouq.com',
            'phone' => '0998877665',
            'address' => 'الخرطوم بحري',
            'registered_at' => '2023-04-01',
            'status' => 'active',
            'performance_rating' => 4.0,
            'total_purchases' => 195680.25,
            'current_balance' => 12500.00,
            'orders_count' => 12,
            'last_order_at' => now()->subDays(10)->toDateString(),
        ]);

        Supplier::firstOrCreate(['name' => 'الحديث للتوزيع'], [
            'business_type' => 'منظفات ومستلزمات',
            'phone' => '0911223344',
            'address' => 'أم درمان',
            'registered_at' => '2023-06-12',
            'status' => 'active',
            'performance_rating' => 3.8,
            'total_purchases' => 168300.00,
            'current_balance' => 0,
            'orders_count' => 9,
            'last_order_at' => now()->subDays(20)->toDateString(),
        ]);

        Supplier::firstOrCreate(['name' => 'دار الإمداد'], [
            'business_type' => 'ألبان ومخبوزات',
            'phone' => '0922334455',
            'address' => 'الخرطوم - الرياض',
            'registered_at' => '2023-08-21',
            'status' => 'paused',
            'performance_rating' => 3.0,
            'total_purchases' => 96750.00,
            'current_balance' => 18750.00,
            'orders_count' => 6,
            'last_order_at' => now()->subDays(45)->toDateString(),
        ]);
    }
}
