<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::query()->with('creator:id,name');

        if ($category = $request->string('category')->toString()) {
            $query->where('category', $category);
        }

        if ($from = $request->date('from')) {
            $query->where('date', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('date', '<=', $to);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('description', 'like', "%$q%");
            });
        }

        $perPage = (int) $request->integer('per_page', 25);
        $paginator = $query->latest('date')->paginate($perPage);

        $totalByCategory = Expense::selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'total_amount' => (float) Expense::sum('amount'),
                'by_category' => $totalByCategory->map(fn ($v) => (float) $v),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => 'required|in:'.implode(',', Expense::CATEGORIES),
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'date' => 'required|date',
            'receipt_path' => 'nullable|string|max:255',
        ]);

        $data['created_by'] = $request->user()->id;

        $expense = Expense::create($data);

        return response()->json(['data' => $expense], 201);
    }

    public function show(Expense $expense)
    {
        return response()->json(['data' => $expense->load('creator:id,name')]);
    }

    public function update(Request $request, Expense $expense)
    {
        $data = $request->validate([
            'category' => 'sometimes|in:'.implode(',', Expense::CATEGORIES),
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'date' => 'sometimes|date',
            'receipt_path' => 'nullable|string|max:255',
        ]);

        $expense->update($data);

        return response()->json(['data' => $expense->fresh()]);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
