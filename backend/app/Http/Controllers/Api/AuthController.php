<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Storefront customer authentication and self-service.
 *
 * OTP flow (simplified/dev mode):
 *   1. POST /auth/request-otp {phone}  -> finds or creates the Customer,
 *      stores a 4-digit code with a 10-minute expiry, and returns the code
 *      in the response (swap in SMS/WhatsApp delivery later).
 *   2. POST /auth/verify-otp {phone, code} -> validates the code + expiry,
 *      clears it, and issues a Sanctum token scoped to the Customer.
 *
 * Protected routes rely on `auth:sanctum` + the `customer` middleware, which
 * guarantees the resolved party is a Customer (not an admin User).
 */
class AuthController extends Controller
{
    /**
     * Step 1 — request an OTP. Finds or creates the customer by phone.
     */
    public function requestOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $customer = Customer::firstOrCreate(
            ['phone' => $data['phone']],
            ['name' => ''],
        );

        if ($customer->is_blocked) {
            throw ValidationException::withMessages([
                'phone' => ['تم حظر هذا الحساب. يرجى التواصل مع الدعم.'],
            ]);
        }

        $code = $customer->generateOtp();

        // Simplified delivery: return the code directly so the storefront can
        // display it. When a real SMS/WhatsApp provider is wired in, the code
        // should be omitted from the response and sent through the channel.
        return response()->json([
            'data' => [
                'message' => 'تم إرسال رمز التحقق.',
                'otp' => $code,
                'expires_in_minutes' => Customer::OTP_TTL_MINUTES,
            ],
        ]);
    }

    /**
     * Step 2 — verify the OTP and issue a Sanctum token.
     */
    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'code' => ['required', 'string', 'max:8'],
        ]);

        $customer = Customer::where('phone', $data['phone'])->first();

        if (! $customer || ! $customer->verifyOtp($data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['رمز التحقق غير صحيح أو منتهي الصلاحية.'],
            ]);
        }

        if ($customer->is_blocked) {
            throw ValidationException::withMessages([
                'phone' => ['تم حظر هذا الحساب. يرجى التواصل مع الدعم.'],
            ]);
        }

        $customer->clearOtp();

        // Default the display name if the customer was created name-less.
        if (blank($customer->name)) {
            $customer->forceFill(['name' => 'عميل'])->save();
            $customer->refresh();
        }

        $token = $customer->createToken('customer')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'customer' => $customer->toAuthArray(),
            ],
        ]);
    }

    /**
     * Current authenticated customer + loyalty snapshot.
     */
    public function me(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        return response()->json(['data' => $customer->toAuthArray()]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    /**
     * Update editable profile fields.
     */
    public function updateProfile(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $customer->fill($data)->save();

        return response()->json(['data' => $customer->toAuthArray()]);
    }

    /**
     * Return the customer's saved delivery addresses.
     */
    public function addresses(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        return response()->json(['data' => $customer->addresses ?? []]);
    }

    /**
     * Replace the full address list (CRUD handled client-side).
     */
    public function updateAddresses(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $data = $request->validate([
            'addresses' => ['required', 'array', 'max:20'],
            'addresses.*.label' => ['required', 'string', 'max:60'],
            'addresses.*.state' => ['nullable', 'string', 'max:80'],
            'addresses.*.district' => ['nullable', 'string', 'max:80'],
            'addresses.*.details' => ['nullable', 'string', 'max:255'],
            'addresses.*.phone' => ['nullable', 'string', 'max:30'],
        ]);

        $customer->forceFill(['addresses' => $data['addresses']])->save();

        return response()->json(['data' => $customer->addresses]);
    }

    /**
     * Paginated order history for the authenticated customer.
     */
    public function orders(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $perPage = (int) $request->integer('per_page', 10);

        $paginator = Order::query()
            ->where('customer_id', $customer->id)
            ->with('items:id,order_id,name_ar,name_en,unit_price,quantity,line_total')
            ->latest()
            ->paginate($perPage);

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
}
