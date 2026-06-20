<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;

class ChartOfAccountAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = ChartOfAccount::query()->with('parent:id,code,name_ar');

        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name_ar', 'like', "%$q%")
                    ->orWhere('name_en', 'like', "%$q%")
                    ->orWhere('code', 'like', "%$q%");
            });
        }

        $accounts = $query->orderBy('sort_order')->orderBy('code')->get();

        return response()->json([
            'data' => $accounts,
            'meta' => [
                'types' => ChartOfAccount::TYPES,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:20|unique:chart_of_accounts,code',
            'name_ar' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'type' => 'required|in:'.implode(',', ChartOfAccount::TYPES),
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'integer|min:0',
        ]);

        $account = ChartOfAccount::create($data);

        return response()->json(['data' => $account->load('parent:id,code,name_ar')], 201);
    }

    public function show(ChartOfAccount $chartOfAccount)
    {
        return response()->json(['data' => $chartOfAccount->load('parent:id,code,name_ar', 'children')]);
    }

    public function update(Request $request, ChartOfAccount $chartOfAccount)
    {
        $data = $request->validate([
            'code' => 'sometimes|string|max:20|unique:chart_of_accounts,code,'.$chartOfAccount->id,
            'name_ar' => 'sometimes|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'type' => 'sometimes|in:'.implode(',', ChartOfAccount::TYPES),
            'parent_id' => 'nullable|exists:chart_of_accounts,id',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'integer|min:0',
        ]);

        $chartOfAccount->update($data);

        return response()->json(['data' => $chartOfAccount->fresh()->load('parent:id,code,name_ar')]);
    }

    public function destroy(ChartOfAccount $chartOfAccount)
    {
        if ($chartOfAccount->children()->exists()) {
            return response()->json(['message' => 'لا يمكن حذف حساب رئيسي لديه حسابات فرعية'], 422);
        }

        $chartOfAccount->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
