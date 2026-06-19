<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->filteredQuery($request)->with('user:id,name,email')->orderByDesc('id');
        $logs = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => $this->serialize($log)),
            'meta' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ],
            'stats' => [
                'total' => AuditLog::count(),
                'created' => AuditLog::where('event', 'created')->count(),
                'updated' => AuditLog::where('event', 'updated')->count(),
                'deleted' => AuditLog::where('event', 'deleted')->count(),
            ],
            'entity_types' => AuditLog::query()
                ->select('auditable_type')
                ->distinct()
                ->orderBy('auditable_type')
                ->pluck('auditable_type')
                ->map(fn (?string $type) => $this->entityLabel($type)),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filename = 'audit-log-'.now()->format('Ymd-His').'.csv';
        $rows = $this->filteredQuery($request)->with('user:id,name,email')->orderByDesc('id');

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'event', 'entity_type', 'entity_id', 'user', 'ip_address', 'old_values', 'new_values', 'created_at']);
            $rows->chunk(200, function ($chunk) use ($out) {
                foreach ($chunk as $log) {
                    fputcsv($out, [
                        $log->id,
                        $log->event,
                        $this->entityLabel($log->auditable_type),
                        $log->auditable_id,
                        $log->user?->name,
                        $log->ip_address,
                        json_encode($log->old_values, JSON_UNESCAPED_UNICODE),
                        json_encode($log->new_values, JSON_UNESCAPED_UNICODE),
                        $log->created_at?->toIso8601String(),
                    ]);
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filteredQuery(Request $request): Builder
    {
        return AuditLog::query()
            ->when($request->string('event')->toString(), fn ($q, $event) => $q->where('event', $event))
            ->when($request->string('entity_type')->toString(), function ($q, $entity) {
                $class = str_starts_with($entity, 'App\\') ? $entity : 'App\\Models\\'.$entity;
                $q->where('auditable_type', $class);
            })
            ->when($request->string('q')->toString(), function ($q, $term) {
                $q->where(function ($w) use ($term) {
                    $w->where('auditable_type', 'like', "%$term%")
                        ->orWhere('auditable_id', $term)
                        ->orWhere('ip_address', 'like', "%$term%")
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$term%")->orWhere('email', 'like', "%$term%"));
                });
            })
            ->when($request->date('from'), fn ($q, $from) => $q->where('created_at', '>=', $from->startOfDay()))
            ->when($request->date('to'), fn ($q, $to) => $q->where('created_at', '<=', $to->endOfDay()));
    }

    private function serialize(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'event' => $log->event,
            'entity_type' => $this->entityLabel($log->auditable_type),
            'entity_class' => $log->auditable_type,
            'entity_id' => $log->auditable_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'url' => $log->url,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->toIso8601String(),
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
            ] : null,
        ];
    }

    private function entityLabel(?string $type): string
    {
        return $type ? class_basename($type) : 'System';
    }
}
