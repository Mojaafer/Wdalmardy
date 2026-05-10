<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmployeeActivity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class EmployeeAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->with('roles')->orderByDesc('id');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                    ->orWhere('email', 'like', "%$q%")
                    ->orWhere('phone', 'like', "%$q%");
            });
        }
        if ($role = $request->string('role')->toString()) {
            $query->whereHas('roles', fn ($r) => $r->where('name', $role));
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $u) => $this->serialize($u)),
            'meta' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
            'stats' => $this->stats(),
        ]);
    }

    public function stats(): array
    {
        return [
            'total' => User::count(),
            'active' => User::where('is_active', true)->count(),
            'inactive' => User::where('is_active', false)->count(),
            'roles' => Role::count(),
            'logins_today' => EmployeeActivity::where('action', 'auth.login')
                ->whereDate('occurred_at', now()->toDateString())
                ->count(),
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:60',
            'password' => 'required|string|min:6',
            'role' => 'required|string|exists:roles,name',
            'is_active' => 'sometimes|boolean',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
        ]);
        $user->syncRoles([$data['role']]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'employee.created',
            'أضاف موظف "'.$user->name.'" بدور '.$data['role'],
            ['user_id' => $user->id, 'role' => $data['role']],
        );

        return response()->json(['data' => $this->serialize($user->fresh('roles'))], 201);
    }

    public function show(User $employee)
    {
        return response()->json([
            'data' => $this->serialize($employee->load('roles')),
            'permissions' => $employee->getAllPermissions()->pluck('name'),
            'activity' => EmployeeActivity::where('user_id', $employee->id)
                ->orderByDesc('occurred_at')
                ->limit(50)
                ->get()
                ->map(fn (EmployeeActivity $a) => [
                    'id' => $a->id,
                    'action' => $a->action,
                    'description' => $a->description,
                    'occurred_at' => $a->occurred_at?->toIso8601String(),
                    'ip_address' => $a->ip_address,
                ]),
        ]);
    }

    public function update(Request $request, User $employee)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'email' => 'sometimes|email|unique:users,email,'.$employee->id,
            'phone' => 'nullable|string|max:60',
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|string|exists:roles,name',
            'is_active' => 'sometimes|boolean',
        ]);

        $update = collect($data)->only(['name', 'email', 'phone', 'is_active'])->all();
        if (! empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }
        $employee->update($update);

        if (! empty($data['role'])) {
            $employee->syncRoles([$data['role']]);
        }

        EmployeeActivity::log(
            (int) $request->user()->id,
            'employee.updated',
            'عدّل بيانات الموظف "'.$employee->name.'"',
            ['user_id' => $employee->id],
        );

        return response()->json(['data' => $this->serialize($employee->fresh('roles'))]);
    }

    public function destroy(Request $request, User $employee)
    {
        if ($employee->id === $request->user()->id) {
            return response()->json(['message' => 'لا يمكن حذف حسابك الشخصي.'], 422);
        }
        EmployeeActivity::log(
            (int) $request->user()->id,
            'employee.deleted',
            'حذف الموظف "'.$employee->name.'"',
            ['user_id' => $employee->id],
        );
        $employee->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function roles()
    {
        return response()->json([
            'data' => Role::with('permissions')->get()->map(fn (Role $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'label' => $this->roleLabel($r->name),
                'users_count' => $r->users()->count(),
                'permissions' => $r->permissions->pluck('name'),
            ]),
            'permissions' => Permission::all()->groupBy(fn (Permission $p) => explode('.', $p->name)[0])
                ->map(fn ($items, $group) => $items->pluck('name')),
        ]);
    }

    public function syncRolePermissions(Request $request, string $role)
    {
        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $r = Role::where('name', $role)->firstOrFail();
        $r->syncPermissions($data['permissions']);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'role.permissions',
            'حدّث صلاحيات دور '.$this->roleLabel($role),
            ['role' => $role, 'permissions' => $data['permissions']],
        );

        return response()->json(['data' => ['ok' => true]]);
    }

    private function roleLabel(string $name): string
    {
        return match ($name) {
            'admin' => 'مدير',
            'accountant' => 'محاسب',
            'driver' => 'مندوب توصيل',
            'branch_staff' => 'موظف فرع',
            default => $name,
        };
    }

    public function uploadAvatar(Request $request, User $employee)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:2048',
        ]);

        if ($employee->avatar_path && ! str_starts_with($employee->avatar_path, 'http')) {
            Storage::disk('public')->delete($employee->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $employee->update(['avatar_path' => $path]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'employee.avatar_updated',
            'حدّث صورة الموظف "'.$employee->name.'"',
            ['user_id' => $employee->id],
        );

        return response()->json(['data' => $this->serialize($employee->fresh('roles'))]);
    }

    public function deleteAvatar(Request $request, User $employee)
    {
        if ($employee->avatar_path && ! str_starts_with($employee->avatar_path, 'http')) {
            Storage::disk('public')->delete($employee->avatar_path);
        }
        $employee->update(['avatar_path' => null]);

        EmployeeActivity::log(
            (int) $request->user()->id,
            'employee.avatar_removed',
            'حذف صورة الموظف "'.$employee->name.'"',
            ['user_id' => $employee->id],
        );

        return response()->json(['data' => $this->serialize($employee->fresh('roles'))]);
    }

    /**
     * Recent activity across all employees, for the /admin/permissions feed.
     */
    public function recentActivity(Request $request)
    {
        $limit = min(200, max(1, (int) $request->integer('limit', 50)));

        $rows = EmployeeActivity::with('user:id,name,avatar_path')
            ->orderByDesc('occurred_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $rows->map(fn (EmployeeActivity $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'description' => $a->description,
                'occurred_at' => $a->occurred_at?->toIso8601String(),
                'ip_address' => $a->ip_address,
                'user' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                    'avatar_url' => $a->user->avatarUrl(),
                ] : null,
            ]),
        ]);
    }

    private function serialize(User $u): array
    {
        $role = $u->roles->first();

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'avatar_url' => $u->avatarUrl(),
            'is_active' => (bool) $u->is_active,
            'role' => $role?->name,
            'role_label' => $role ? $this->roleLabel($role->name) : null,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
