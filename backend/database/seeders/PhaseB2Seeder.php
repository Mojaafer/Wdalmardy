<?php

namespace Database\Seeders;

use App\Models\DeliveryZone;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

class PhaseB2Seeder extends Seeder
{
    public function run(): void
    {
        $zones = [
            ['name_ar' => 'الخرطوم', 'name_en' => 'Khartoum', 'fee' => 1500, 'estimated_minutes' => 60],
            ['name_ar' => 'بحري', 'name_en' => 'Bahri', 'fee' => 2000, 'estimated_minutes' => 75],
            ['name_ar' => 'أم درمان', 'name_en' => 'Omdurman', 'fee' => 2000, 'estimated_minutes' => 90],
            ['name_ar' => 'شرق النيل', 'name_en' => 'East Nile', 'fee' => 2500, 'estimated_minutes' => 120],
        ];

        foreach ($zones as $i => $z) {
            DeliveryZone::firstOrCreate(
                ['name_ar' => $z['name_ar']],
                array_merge($z, ['is_active' => true, 'sort_order' => $i]),
            );
        }

        $driver = User::where('email', 'driver@wadalmardi.com')->first();
        if ($driver) {
            $khartoum = DeliveryZone::where('name_ar', 'الخرطوم')->first();
            DriverProfile::updateOrCreate(
                ['user_id' => $driver->id],
                [
                    'zone_id' => $khartoum?->id,
                    'availability' => 'available',
                    'vehicle' => 'دراجة نارية',
                    'vehicle_plate' => 'KRT-1234',
                ],
            );
        }
    }
}
