<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmployeeActivity;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SupplierAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()->orderByDesc('id');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                    ->orWhere('phone', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%");
            });
        }
        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $suppliers = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $suppliers->getCollection()->map(fn (Supplier $s) => $this->serialize($s)),
            'meta' => [
                'total' => $suppliers->total(),
                'per_page' => $suppliers->perPage(),
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
            ],
            'stats' => $this->stats(),
        ]);
    }

    public function stats(): array
    {
        return [
            'total' => Supplier::count(),
            'active' => Supplier::where('status', 'active')->count(),
            'paused' => Supplier::where('status', 'paused')->count(),
            'open_orders' => 0,
            'total_purchases' => (float) Supplier::sum('total_purchases'),
        ];
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $supplier = Supplier::create($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'supplier.created',
            'أضاف مورد "'.$supplier->name.'"',
            ['supplier_id' => $supplier->id],
        );

        return response()->json(['data' => $this->serialize($supplier)], 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json(['data' => $this->serialize($supplier)]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $this->validatedData($request);
        $supplier->update($data);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'supplier.updated',
            'عدّل بيانات المورد "'.$supplier->name.'"',
            ['supplier_id' => $supplier->id],
        );

        return response()->json(['data' => $this->serialize($supplier->fresh())]);
    }

    public function destroy(Request $request, Supplier $supplier)
    {
        EmployeeActivity::log(
            (int) $request->user()->id,
            'supplier.deleted',
            'حذف المورد "'.$supplier->name.'"',
            ['supplier_id' => $supplier->id],
        );
        $supplier->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function toggleStatus(Request $request, Supplier $supplier)
    {
        $next = $supplier->status === 'active' ? 'paused' : 'active';
        $supplier->update(['status' => $next]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'supplier.status',
            ($next === 'active' ? 'فعّل' : 'أوقف').' المورد "'.$supplier->name.'"',
            ['supplier_id' => $supplier->id, 'status' => $next],
        );

        return response()->json(['data' => $this->serialize($supplier)]);
    }

    public function uploadLogo(Request $request, Supplier $supplier)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        if ($supplier->logo && !str_starts_with($supplier->logo, 'http')) {
            Storage::disk('public')->delete($supplier->logo);
        }

        $file = $request->file('logo');
        $filename = 'supplier_'.$supplier->id.'_'.time().'.'.$file->extension();
        $file->storeAs('public/suppliers', $filename);

        $supplier->update(['logo' => 'suppliers/'.$filename]);

        return response()->json(['data' => $this->serialize($supplier->fresh())]);
    }

    public function deleteLogo(Request $request, Supplier $supplier)
    {
        if ($supplier->logo && !str_starts_with($supplier->logo, 'http')) {
            Storage::disk('public')->delete($supplier->logo);
        }

        $supplier->update(['logo' => null]);

        return response()->json(['data' => $this->serialize($supplier->fresh())]);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:200',
            'contact_person' => 'nullable|string|max:200',
            'business_type' => 'nullable|string|max:200',
            'email' => 'nullable|email|max:200',
            'phone' => 'nullable|string|max:60',
            'address' => 'nullable|string|max:500',
            'tax_number' => 'nullable|string|max:60',
            'logo' => 'nullable|string|max:500',
            'registered_at' => 'nullable|date',
            'status' => 'sometimes|in:active,paused,archived',
            'performance_rating' => 'sometimes|numeric|min:0|max:5',
            'notes' => 'nullable|string',
        ]);
    }

    private function serialize(Supplier $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'contact_person' => $s->contact_person,
            'business_type' => $s->business_type,
            'email' => $s->email,
            'phone' => $s->phone,
            'address' => $s->address,
            'tax_number' => $s->tax_number,
            'logo' => $s->logoUrl(),
            'registered_at' => $s->registered_at?->toDateString(),
            'status' => $s->status,
            'performance_rating' => (float) $s->performance_rating,
            'total_purchases' => (float) $s->total_purchases,
            'current_balance' => (float) $s->current_balance,
            'orders_count' => (int) $s->orders_count,
            'last_order_at' => $s->last_order_at?->toDateString(),
            'notes' => $s->notes,
            'created_at' => $s->created_at?->toIso8601String(),
        ];
    }
}
