<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query()->withCount('orders');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                    ->orWhere('phone', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%");
            });
        }

        if (($status = $request->string('status')->toString()) !== '') {
            match ($status) {
                'active' => $query->where('is_blocked', false)->where('total_orders', '>', 0),
                'inactive' => $query->where('total_orders', 0),
                'blocked' => $query->where('is_blocked', true),
                default => null,
            };
        }

        if ($city = $request->string('city')->toString()) {
            $query->where('city', $city);
        }

        $perPage = (int) $request->integer('per_page', 15);

        return response()->json([
            'data' => $query->latest()->paginate($perPage)->items(),
            'meta' => [
                'total_customers' => Customer::count(),
                'active' => Customer::where('is_blocked', false)->where('total_orders', '>', 0)->count(),
                'blocked' => Customer::where('is_blocked', true)->count(),
                'total_orders' => (int) Customer::sum('total_orders'),
                'total_sales' => (float) Customer::sum('total_spent'),
            ],
        ]);
    }

    public function show(Customer $customer)
    {
        $customer->load(['orders' => fn ($q) => $q->latest()->limit(20)]);
        $customer->setAttribute('tier', $customer->tier());

        return response()->json(['data' => $customer]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:30|unique:customers,phone',
            'email' => 'nullable|email|max:120',
            'city' => 'nullable|string|max:80',
        ]);

        $customer = Customer::create($data);

        return response()->json(['data' => $customer], 201);
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'phone' => 'sometimes|string|max:30|unique:customers,phone,'.$customer->id,
            'email' => 'nullable|email|max:120',
            'city' => 'nullable|string|max:80',
        ]);

        $customer->update($data);

        return response()->json(['data' => $customer]);
    }

    public function block(Request $request, Customer $customer)
    {
        $customer->update(['is_blocked' => ! $customer->is_blocked]);

        return response()->json(['data' => $customer]);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json(['data' => ['ok' => true]]);
    }
}
