<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Message::query()->with(['order:id,order_number', 'assignee:id,name']);

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                    ->orWhere('phone', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%")
                    ->orWhere('subject', 'like', "%$q%")
                    ->orWhere('body', 'like', "%$q%");
            });
        }

        if (($status = $request->string('status')->toString()) !== '') {
            $query->where('status', $status);
        }

        return response()->json([
            'data' => $query->latest()->paginate((int) $request->integer('per_page', 25))->items(),
            'meta' => [
                'total' => Message::count(),
                'new' => Message::where('status', 'new')->count(),
                'open' => Message::where('status', 'open')->count(),
                'replied' => Message::where('status', 'replied')->count(),
                'closed' => Message::where('status', 'closed')->count(),
            ],
        ]);
    }

    public function show(Message $message)
    {
        return response()->json([
            'data' => $message->load(['order:id,order_number', 'assignee:id,name', 'replies.user:id,name']),
        ]);
    }

    public function reply(Request $request, Message $message)
    {
        $data = $request->validate([
            'body' => 'required|string|max:5000',
            'channel' => 'nullable|in:note,whatsapp,email',
            'mark_replied' => 'boolean',
        ]);

        $reply = $message->replies()->create([
            'user_id' => $request->user()?->id,
            'body' => $data['body'],
            'channel' => $data['channel'] ?? 'note',
        ]);

        if (! empty($data['mark_replied']) || ($data['channel'] ?? 'note') !== 'note') {
            $message->update([
                'status' => 'replied',
                'replied_at' => now(),
            ]);
        } elseif ($message->status === 'new') {
            $message->update(['status' => 'open']);
        }

        return response()->json([
            'data' => $message->fresh()->load(['replies.user:id,name']),
            'reply' => $reply,
        ]);
    }

    public function updateStatus(Request $request, Message $message)
    {
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', Message::STATUSES),
        ]);

        $message->update([
            'status' => $data['status'],
            'replied_at' => $data['status'] === 'replied' ? now() : $message->replied_at,
        ]);

        return response()->json(['data' => $message->fresh()]);
    }

    public function assign(Request $request, Message $message)
    {
        $data = $request->validate([
            'assigned_to' => 'nullable|integer|exists:users,id',
        ]);

        $message->update(['assigned_to' => $data['assigned_to'] ?? null]);

        return response()->json(['data' => $message->fresh()->load('assignee:id,name')]);
    }

    public function destroy(Message $message)
    {
        $message->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
