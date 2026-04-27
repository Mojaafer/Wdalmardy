<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'products.view', 'products.manage',
            'categories.view', 'categories.manage',
            'orders.view', 'orders.manage',
            'customers.view', 'customers.manage',
            'reports.view',
            'settings.manage',
            'users.manage',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions($permissions);

        $accountant = Role::firstOrCreate(['name' => 'accountant', 'guard_name' => 'web']);
        $accountant->syncPermissions([
            'dashboard.view',
            'orders.view', 'orders.manage',
            'customers.view',
            'reports.view',
        ]);

        $driver = Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'web']);
        $driver->syncPermissions([
            'orders.view',
            'orders.manage',
        ]);

        $branchStaff = Role::firstOrCreate(['name' => 'branch_staff', 'guard_name' => 'web']);
        $branchStaff->syncPermissions([
            'dashboard.view',
            'products.view', 'products.manage',
            'categories.view',
            'orders.view', 'orders.manage',
            'customers.view',
        ]);

        $user = User::updateOrCreate(
            ['email' => 'admin@wadalmardi.com'],
            [
                'name' => 'مدير النظام',
                'phone' => '+249123456789',
                'password' => bcrypt('password'),
                'is_active' => true,
            ],
        );
        $user->syncRoles(['admin']);

        $accountantUser = User::updateOrCreate(
            ['email' => 'accountant@wadalmardi.com'],
            [
                'name' => 'محاسب',
                'password' => bcrypt('password'),
                'is_active' => true,
            ],
        );
        $accountantUser->syncRoles(['accountant']);

        $driverUser = User::updateOrCreate(
            ['email' => 'driver@wadalmardi.com'],
            [
                'name' => 'مندوب توصيل',
                'phone' => '+249987654321',
                'password' => bcrypt('password'),
                'is_active' => true,
            ],
        );
        $driverUser->syncRoles(['driver']);
    }
}
