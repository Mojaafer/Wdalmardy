<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * Public contact-form submission.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:120',
            'subject' => 'nullable|string|max:200',
            'body' => 'required|string|max:5000',
            'order_number' => 'nullable|string|max:40',
        ]);

        $orderId = null;
        if (! empty($data['order_number'])) {
            $orderId = Order::where('order_number', $data['order_number'])->value('id');
        }

        $message = Message::create([
            'subject' => $data['subject'] ?? null,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'body' => $data['body'],
            'source' => 'contact_form',
            'status' => 'new',
            'order_id' => $orderId,
        ]);

        return response()->json([
            'data' => [
                'id' => $message->id,
                'received' => true,
            ],
        ], 201);
    }
}
