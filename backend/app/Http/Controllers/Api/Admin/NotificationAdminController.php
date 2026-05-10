<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\AdminNotificationRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationAdminController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()?->id;
        $query = AdminNotification::query()->forUser($userId);

        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }

        if ($request->boolean('unread')) {
            $query->unreadFor($userId);
        }

        $items = $query->latest()
            ->with(['reads' => fn ($q) => $q->where('user_id', $userId)])
            ->limit($request->integer('limit', 50))
            ->get();

        // Surface a per-user `read_at` so the frontend doesn't need to know about the pivot
        $items->each(function (AdminNotification $n) {
            $read = $n->reads->first();
            $n->setAttribute('read_at', $read?->read_at);
            $n->unsetRelation('reads');
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'total' => AdminNotification::forUser($userId)->count(),
                'unread' => AdminNotification::forUser($userId)->unreadFor($userId)->count(),
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $userId = $request->user()?->id;

        return response()->json([
            'unread' => AdminNotification::forUser($userId)->unreadFor($userId)->count(),
        ]);
    }

    public function markRead(Request $request, AdminNotification $notification)
    {
        $userId = $request->user()?->id;
        if ($userId === null || ! $notification->isVisibleTo($userId)) {
            abort(403);
        }

        $read = AdminNotificationRead::firstOrCreate(
            ['notification_id' => $notification->id, 'user_id' => $userId],
            ['read_at' => now()],
        );

        $notification->setAttribute('read_at', $read->read_at);

        return response()->json(['data' => $notification]);
    }

    public function markAllRead(Request $request)
    {
        $userId = $request->user()?->id;
        if ($userId === null) {
            abort(403);
        }

        $unreadIds = AdminNotification::forUser($userId)
            ->unreadFor($userId)
            ->pluck('id');

        if ($unreadIds->isEmpty()) {
            return response()->json(['data' => ['marked_read' => 0]]);
        }

        $now = now();
        $rows = $unreadIds->map(fn ($id) => [
            'notification_id' => $id,
            'user_id' => $userId,
            'read_at' => $now,
        ])->all();

        // insertOrIgnore tolerates concurrent reads from the same user
        DB::table('admin_notification_reads')->insertOrIgnore($rows);

        return response()->json(['data' => ['marked_read' => count($rows)]]);
    }

    public function destroy(Request $request, AdminNotification $notification)
    {
        $userId = $request->user()?->id;
        if ($userId === null || ! $notification->isVisibleTo($userId)) {
            abort(403);
        }

        if ($notification->user_id === null) {
            // Global notification — deleting would remove it for every admin.
            // Treat "delete" as "dismiss for me" by inserting a read row instead.
            AdminNotificationRead::firstOrCreate(
                ['notification_id' => $notification->id, 'user_id' => $userId],
                ['read_at' => now()],
            );

            return response()->json(['data' => ['dismissed' => true]]);
        }

        // User-specific notification — only the owner gets here, so safe to delete.
        $notification->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
