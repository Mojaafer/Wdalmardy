<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards storefront customer routes. Runs after `auth:sanctum` (which
 * resolves the token's morphable tokenable) and rejects any request where
 * the authenticated party is not a Customer — keeping admin User tokens
 * out of customer-facing endpoints.
 */
class EnsureCustomerMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Customer) {
            return response()->json([
                'message' => 'صلاحية غير كافية. يرجى تسجيل الدخول كعميل.',
            ], 401);
        }

        if ($user->is_blocked) {
            return response()->json([
                'message' => 'تم حظر هذا الحساب. يرجى التواصل مع الدعم.',
            ], 403);
        }

        return $next($request);
    }
}
