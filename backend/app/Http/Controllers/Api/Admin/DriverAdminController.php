<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DriverProfile;
use App\Models\EmployeeActivity;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DriverAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = User::role('driver')
            ->with(['driverProfile.zone:id,name_ar,name_en'])
            ->orderByDesc('id');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                    ->orWhere('phone', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%");
            });
        }

        $drivers = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $drivers->getCollection()->map(fn (User $u) => $this->serialize($u)),
            'meta' => [
                'total' => $drivers->total(),
                'per_page' => $drivers->perPage(),
                'current_page' => $drivers->currentPage(),
                'last_page' => $drivers->lastPage(),
            ],
            'stats' => $this->stats(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:120|unique:users,email',
            'password' => 'required|string|min:6',
            'vehicle' => 'nullable|string|max:120',
            'vehicle_plate' => 'nullable|string|max:60',
            'national_id' => 'nullable|string|max:60',
            'zone_id' => 'nullable|integer|exists:delivery_zones,id',
            'availability' => 'nullable|in:available,on_delivery,off_duty',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => Hash::make($data['password']),
            'is_active' => true,
        ]);
        $user->syncRoles(['driver']);

        DriverProfile::create([
            'user_id' => $user->id,
            'vehicle' => $data['vehicle'] ?? null,
            'vehicle_plate' => $data['vehicle_plate'] ?? null,
            'national_id' => $data['national_id'] ?? null,
            'zone_id' => $data['zone_id'] ?? null,
            'availability' => $data['availability'] ?? 'available',
        ]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'driver.created',
            'أضاف سائق "'.$user->name.'"',
            ['user_id' => $user->id],
        );

        return response()->json(['data' => $this->serialize($user->fresh()->load('driverProfile.zone'))], 201);
    }

    public function show(User $driver)
    {
        $driver->load('driverProfile.zone');

        return response()->json(['data' => $this->serialize($driver)]);
    }

    public function update(Request $request, User $driver)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'phone' => 'sometimes|string|max:30',
            'email' => 'nullable|email|max:120|unique:users,email,'.$driver->id,
            'password' => 'nullable|string|min:6',
            'vehicle' => 'nullable|string|max:120',
            'vehicle_plate' => 'nullable|string|max:60',
            'national_id' => 'nullable|string|max:60',
            'zone_id' => 'nullable|integer|exists:delivery_zones,id',
            'availability' => 'nullable|in:available,on_delivery,off_duty',
            'is_active' => 'sometimes|boolean',
        ]);

        $userFields = collect($data)->only(['name', 'phone', 'email', 'is_active'])->toArray();
        if (! empty($data['password'])) {
            $userFields['password'] = Hash::make($data['password']);
        }
        if ($userFields) {
            $driver->update($userFields);
        }

        $profile = $driver->driverProfile ?? new DriverProfile(['user_id' => $driver->id]);
        $profile->fill(collect($data)->only(['vehicle', 'vehicle_plate', 'national_id', 'zone_id', 'availability'])->toArray());
        $profile->user_id = $driver->id;
        $profile->save();

        EmployeeActivity::log(
            (int) $request->user()->id,
            'driver.updated',
            'عدل بيانات السائق "'.$driver->name.'"',
            ['user_id' => $driver->id],
        );

        return response()->json(['data' => $this->serialize($driver->fresh()->load('driverProfile.zone'))]);
    }

    public function destroy(Request $request, User $driver)
    {
        EmployeeActivity::log(
            (int) $request->user()->id,
            'driver.deleted',
            'حذف السائق "'.$driver->name.'"',
            ['user_id' => $driver->id],
        );
        $driver->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function stats(): array
    {
        $base = User::role('driver');

        return [
            'total' => (clone $base)->count(),
            'available' => DriverProfile::where('availability', 'available')->count(),
            'on_delivery' => DriverProfile::where('availability', 'on_delivery')->count(),
            'off_duty' => DriverProfile::where('availability', 'off_duty')->count(),
            'in_progress_orders' => Order::whereIn('status', ['preparing', 'shipped'])->count(),
        ];
    }

    public function assignDriver(Request $request, Order $order)
    {
        $data = $request->validate([
            'driver_id' => 'required|integer|exists:users,id',
        ]);

        $driver = User::with('driverProfile')->findOrFail($data['driver_id']);

        $order->update([
            'assigned_driver_id' => $driver->id,
            'status' => $order->status === 'new' ? 'preparing' : $order->status,
        ]);

        if ($driver->driverProfile) {
            $driver->driverProfile->update(['availability' => 'on_delivery']);
        }

        EmployeeActivity::log(
            (int) $request->user()->id,
            'order.assigned',
            'سند الطلب '.$order->order_number.' للسائق "'.$driver->name.'"',
            ['order_id' => $order->id, 'driver_id' => $driver->id],
        );

        return response()->json(['data' => ['ok' => true, 'order_id' => $order->id, 'driver_id' => $driver->id]]);
    }

    private function serialize(User $u): array
    {
        $p = $u->driverProfile;

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'is_active' => (bool) $u->is_active,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'profile' => $p ? [
                'availability' => $p->availability,
                'vehicle' => $p->vehicle,
                'vehicle_plate' => $p->vehicle_plate,
                'national_id' => $p->national_id,
                'completed_orders' => (int) $p->completed_orders,
                'rating' => (float) $p->rating,
                'zone' => $p->zone ? [
                    'id' => $p->zone->id,
                    'name_ar' => $p->zone->name_ar,
                    'name_en' => $p->zone->name_en,
                ] : null,
            ] : null,
        ];
    }
}
