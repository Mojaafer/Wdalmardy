<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    public const STATUSES = ['draft', 'issued', 'paid', 'cancelled', 'refunded'];

    public const PAYMENT_METHODS = ['cod', 'whatsapp', 'cash', 'transfer', 'other'];

    protected $fillable = [
        'invoice_number',
        'order_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'subtotal',
        'discount_amount',
        'delivery_fee',
        'total',
        'status',
        'payment_method',
        'issued_at',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Generate next invoice number in the format INV-YYMMDD-NNN.
     */
    public static function nextNumber(?Carbon $for = null): string
    {
        $for ??= now();
        $prefix = 'INV-'.$for->format('ymd');

        return DB::transaction(function () use ($prefix) {
            $last = static::where('invoice_number', 'like', $prefix.'-%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('invoice_number');

            $next = 1;
            if ($last && preg_match('/-(\d+)$/', $last, $m)) {
                $next = ((int) $m[1]) + 1;
            }

            return sprintf('%s-%03d', $prefix, $next);
        });
    }

    /**
     * Build an invoice from an order. Snapshots all the customer + line-item data.
     */
    public static function fromOrder(Order $order, ?int $createdByUserId = null, ?string $paymentMethod = null): self
    {
        $order->loadMissing('items.product');

        $address = trim(($order->address_state ? $order->address_state.' / ' : '')
            .($order->address_district ? $order->address_district.' - ' : '')
            .($order->address_details ?? ''));

        $invoice = static::create([
            'invoice_number' => static::nextNumber(),
            'order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'customer_email' => $order->customer_email,
            'customer_address' => $address ?: null,
            'subtotal' => $order->subtotal,
            'discount_amount' => $order->discount_amount ?? 0,
            'delivery_fee' => $order->delivery_fee,
            'total' => $order->total,
            'status' => 'issued',
            'payment_method' => $paymentMethod ?? ($order->payment_method ?? 'cod'),
            'issued_at' => now(),
            'created_by' => $createdByUserId,
        ]);

        foreach ($order->items as $item) {
            $invoice->items()->create([
                'product_id' => $item->product_id,
                'product_name' => $item->product_name ?? optional($item->product)->name_ar ?? 'منتج',
                'product_unit' => optional($item->product)->unit ?? null,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ]);
        }

        return $invoice;
    }
}
