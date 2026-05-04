<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\Request;

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
            $query->unread();
        }

        $items = $query->latest()->limit($request->integer('limit', 50))->get();

        return response()->json([
            'data' => $items,
            'meta' => [
                'total' => AdminNotification::forUser($userId)->count(),
                'unread' => AdminNotification::forUser($userId)->unread()->count(),
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $userId = $request->user()?->id;

        return response()->json([
            'unread' => AdminNotification::forUser($userId)->unread()->count(),
        ]);
    }

    public function markRead(Request $request, AdminNotification $notification)
    {
        $notification->update(['read_at' => now()]);

        return response()->json(['data' => $notification->fresh()]);
    }

    public function markAllRead(Request $request)
    {
        $userId = $request->user()?->id;

        $count = AdminNotification::forUser($userId)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['data' => ['marked_read' => $count]]);
    }

    public function destroy(AdminNotification $notification)
    {
        $notification->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
