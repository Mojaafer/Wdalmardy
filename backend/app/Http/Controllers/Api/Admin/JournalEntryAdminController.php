<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = JournalEntry::query()->with('creator:id,name');

        if ($from = $request->date('from')) {
            $query->where('date', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $query->where('date', '<=', $to);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where('description', 'like', "%$q%")
                ->orWhere('entry_number', 'like', "%$q%");
        }

        $perPage = (int) $request->integer('per_page', 25);
        $paginator = $query->latest('date')->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'description' => 'required|string|max:500',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:chart_of_accounts,id',
            'lines.*.type' => 'required|in:debit,credit',
            'lines.*.amount' => 'required|numeric|min:0.01',
            'lines.*.description' => 'nullable|string|max:500',
        ]);

        $totalDebit = collect($data['lines'])->where('type', 'debit')->sum('amount');
        $totalCredit = collect($data['lines'])->where('type', 'credit')->sum('amount');

        if (abs($totalDebit - $totalCredit) > 0.001) {
            return response()->json(['message' => 'مجموع المدين يجب أن يساوي مجموع الدائن'], 422);
        }

        return DB::transaction(function () use ($data, $request) {
            $entry = JournalEntry::create([
                'entry_number' => JournalEntry::nextNumber(),
                'description' => $data['description'],
                'date' => $data['date'],
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'type' => $line['type'],
                    'amount' => $line['amount'],
                    'description' => $line['description'] ?? null,
                ]);
            }

            return response()->json([
                'data' => $entry->load(['lines.account:id,code,name_ar', 'creator:id,name']),
            ], 201);
        });
    }

    public function show(JournalEntry $journalEntry)
    {
        return response()->json([
            'data' => $journalEntry->load(['lines.account:id,code,name_ar', 'creator:id,name']),
        ]);
    }

    public function destroy(JournalEntry $journalEntry)
    {
        $journalEntry->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
