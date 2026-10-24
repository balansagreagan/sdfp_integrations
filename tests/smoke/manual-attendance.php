<?php
$basePath = dirname(__DIR__, 2);
require $basePath.'/vendor/autoload.php';
$app = require $basePath.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'session.driver' => 'array']);
Illuminate\Support\Facades\DB::purge('sqlite');
foreach ([
    '0001_01_01_000000_create_users_table.php',
    '2026_09_06_000001_create_positions_and_employees_tables.php',
    '2026_09_06_000002_create_payroll_tables.php',
    '2026_09_11_094044_add_additions_to_payroll.php',
    '2026_09_19_000002_create_operating_day_closures_table.php',
    '2026_09_20_000001_add_soaked_workforce_fields_to_employees.php',
    '2026_09_24_000001_add_page_access_to_users_table.php',
] as $migration) {
    (require $basePath.'/database/migrations/'.$migration)->up();
}
$app->make('session')->start();
foreach (['payroll.shift', 'soaked-payroll.shift'] as $removedRoute) {
    if (Illuminate\Support\Facades\Route::has($removedRoute)) throw new RuntimeException('Payroll attendance mutation route must be removed');
}
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$user = App\Models\User::create(['name' => 'Recorder', 'email' => 'recorder@example.test', 'password' => 'test', 'role' => 'staff']);
$position = App\Models\Position::create(['title' => 'Office Staff', 'base_daily_rate' => 400]);
$controller = app(App\Http\Controllers\AttendanceController::class);
$period = App\Models\PayrollPeriod::findOrCreateForDate('2026-10-16');
foreach (['park', 'soaked'] as $area) {
    $employee = App\Models\Employee::create(['employee_code' => $area, 'first_name' => 'Test', 'last_name' => $area, 'position_id' => $position->id, 'daily_rate' => 400, 'status' => 'active', 'hired_date' => '2026-01-01', 'work_area' => $area]);
    $data = ['work_area' => $area, 'employee_id' => $employee->id, 'shift_slot' => 'am', 'status' => 'present', 'work_date' => '2026-10-16'];
    $submit = function($payload) use ($user, $controller) {
        $request = Illuminate\Http\Request::create('/attendance/manual-entry', 'POST', $payload);
        $request->setUserResolver(fn () => $user);
        return $controller->store($request);
    };
    $submit($data);
    $line = App\Models\PayrollLine::where('employee_id', $employee->id)->firstOrFail();
    check((float)$line->days_worked === 0.5 && (float)$line->gross_pay === 200.0, 'AM must count only half a day');
    $shift = App\Models\AttendanceShift::where('employee_id', $employee->id)->firstOrFail();
    check($shift->pm_status === 'unrecorded' && $shift->recorded_by === $user->id, 'Unentered PM must stay unrecorded');
    $submit(array_merge($data, ['status' => 'absent']));
    check($shift->fresh()->pm_status === 'unrecorded', 'Changing AM must leave PM unrecorded');
    $submit(array_merge($data, ['status' => 'unrecorded']));
    check($shift->fresh()->am_status === 'unrecorded' && $shift->fresh()->pm_status === 'unrecorded', 'A shift can be cleared independently');
    check((float)$line->fresh()->gross_pay === 0.0, 'Unrecorded shifts must not count as paid attendance');
    $submit(array_merge($data, ['shift_slot' => 'pm']));
    check($shift->fresh()->am_status === 'unrecorded', 'Entering PM first must leave AM unrecorded');
    $submit($data);
    check((float)$line->fresh()->gross_pay === 400.0, 'AM and PM must count a full day');
    $submit(array_merge($data, ['status' => 'absent']));
    check((float)$line->fresh()->gross_pay === 200.0, 'Attendance corrections must recalculate payroll');
    $period->update(['status' => 'approved']);
    $submit($data);
    check((float)$line->fresh()->gross_pay === 200.0, 'Approved payroll must stay locked');
    $period->update(['status' => 'draft']);
    App\Models\OperatingDayClosure::create(['work_date' => '2026-10-16', 'closed_by' => $user->id]);
    $submit($data);
    check((float)$line->fresh()->gross_pay === 200.0, 'Closed dates must reject entry');
    App\Models\OperatingDayClosure::query()->delete();
    $viewRequest = Illuminate\Http\Request::create('/attendance', 'GET', ['date' => '2026-10-16', 'work_area' => $area]);
    $viewRequest->setUserResolver(fn () => $user);
    $viewRequest->headers->set('X-Inertia', 'true');
    $props = $controller->index($viewRequest)->toResponse($viewRequest)->getData(true)['props'];
    check(count($props['employees']) === 1 && $props['employees'][0]['id'] === $employee->id, 'Register must show selected business employees');
    $payrollRoute = $area === 'soaked' ? 'soaked-payroll.index' : 'payroll.index';
    $payrollRequest = Illuminate\Http\Request::create($area === 'soaked' ? '/soaked-payroll' : '/payroll', 'GET', ['date' => '2026-10-16']);
    $payrollRequest->setUserResolver(fn () => $user);
    $payrollRequest->setRouteResolver(fn () => Illuminate\Support\Facades\Route::getRoutes()->getByName($payrollRoute));
    $payrollRequest->headers->set('X-Inertia', 'true');
    $payrollProps = app(App\Http\Controllers\PayrollController::class)->index($payrollRequest)->toResponse($payrollRequest)->getData(true)['props'];
    check(count($payrollProps['employees']) === 1 && $payrollProps['employees'][0]['id'] === $employee->id, 'Payroll must show matching business');
    check((float)$payrollProps['stats']['totalGross'] === 200.0, 'Manual entry must reflect in payroll totals');
    check($payrollProps['shiftsGrid'][$employee->id]['2026-10-16']['pm_status'] === 'present', 'Manual PM must reflect in payroll grid');
    echo $area.": manual AM/PM entry, correction, payroll recalculation, approved lock, closed date passed\n";
}
// Reset must affect only the selected business and date, including payroll totals.
$admin = App\Models\User::create(['name' => 'Admin', 'email' => 'admin@example.test', 'password' => 'test', 'role' => 'admin']);
$parkEmployee = App\Models\Employee::where('work_area', 'park')->firstOrFail();
$soakedEmployee = App\Models\Employee::where('work_area', 'soaked')->firstOrFail();
$parkLine = App\Models\PayrollLine::where('employee_id', $parkEmployee->id)->firstOrFail();
$parkLine->additions()->create(['addition_type' => 'others', 'description' => 'Keep allowance', 'amount' => 50]);
$parkLine->deductions()->create(['deduction_type' => 'cash_advance', 'description' => 'Keep deduction', 'amount' => 20]);
App\Models\AttendanceShift::where('employee_id', $parkEmployee->id)->whereDate('work_date', '2026-10-16')->update(['ot_hours' => 2]);
$olderRequest = Illuminate\Http\Request::create('/attendance/manual-entry', 'POST', ['employee_id' => $parkEmployee->id,
    'work_area' => 'park', 'work_date' => '2026-10-14', 'shift_slot' => 'am', 'status' => 'present']);
$olderRequest->setUserResolver(fn () => $user);
$controller->store($olderRequest);
check((float)$parkLine->fresh()->gross_pay === 525.0, 'Both recorded dates and overtime must contribute before resetting');
$reset = function($date, $area, $actor) use ($controller) {
    $request = Illuminate\Http\Request::create('/attendance/reset-date', 'POST', ['work_date' => $date, 'work_area' => $area]);
    $request->setUserResolver(fn () => $actor);
    return $controller->resetDate($request);
};
$reset('2026-10-16', 'park', $admin);
check(!App\Models\AttendanceShift::where('employee_id', $parkEmployee->id)->whereDate('work_date', '2026-10-16')->exists(), 'Reset must remove selected attendance');
check(App\Models\AttendanceShift::where('employee_id', $parkEmployee->id)->whereDate('work_date', '2026-10-14')->exists(), 'Reset must preserve other dates');
check(App\Models\AttendanceShift::where('employee_id', $soakedEmployee->id)->whereDate('work_date', '2026-10-16')->exists(), 'Reset must preserve the other business');
$parkLine->refresh();
check((float)$parkLine->days_worked === 0.5 && (float)$parkLine->gross_pay === 200.0 && (float)$parkLine->net_pay === 230.0, 'Reset must recalculate days, gross and net using remaining attendance');
check((float)$parkLine->total_ot_hours === 0.0, 'Reset must remove overtime from the selected date');
check((float)$parkLine->additions_total === 50.0 && (float)$parkLine->deductions_total === 20.0, 'Reset must preserve allowances and deductions');
$reset('2026-10-16', 'park', $admin);
check((float)$parkLine->fresh()->net_pay === 230.0, 'Repeating reset must not alter remaining payroll');
$period->update(['status' => 'approved']);
$reset('2026-10-14', 'park', $admin);
check(App\Models\AttendanceShift::where('employee_id', $parkEmployee->id)->whereDate('work_date', '2026-10-14')->exists(), 'Approved reset must not delete attendance');
$period->update(['status' => 'draft']);
try { $reset('2026-10-14', 'park', $user); throw new RuntimeException('Staff must not reset attendance'); }
catch (Symfony\Component\HttpKernel\Exception\HttpException $e) { check($e->getStatusCode() === 403, 'Staff reset rejected'); }
$reset('2026-10-14', 'park', $admin);
$reset('2026-10-16', 'soaked', $admin);
check((float)$parkLine->fresh()->gross_pay === 0.0 && (float)$parkLine->fresh()->net_pay === 30.0, 'After all attendance is reset only retained adjustments remain');
foreach (['park' => 'payroll.index', 'soaked' => 'soaked-payroll.index'] as $area => $routeName) {
    $request = Illuminate\Http\Request::create('/payroll', 'GET', ['date' => '2026-10-16']);
    $request->setUserResolver(fn () => $admin);
    $request->setRouteResolver(fn () => Illuminate\Support\Facades\Route::getRoutes()->getByName($routeName));
    $request->headers->set('X-Inertia', 'true');
    $props = app(App\Http\Controllers\PayrollController::class)->index($request)->toResponse($request)->getData(true)['props'];
    check(empty($props['shiftsGrid']) && (float)$props['stats']['totalGross'] === 0.0, 'Payroll must display no present marks after all recorded dates are reset');
}
echo "Reset: selected date and business, other dates retained, adjustments retained, totals recalculated, repeat reset, access restrictions and payroll display passed\n";
$lifeguard = App\Models\User::create(['name' => 'Guard', 'email' => 'guard@example.test', 'password' => 'test', 'role' => 'staff']);
$guardPosition = App\Models\Position::create(['title' => 'Lifeguard', 'base_daily_rate' => 400]);
App\Models\Employee::create(['employee_code' => 'guard', 'first_name' => 'Guard', 'last_name' => 'Test', 'position_id' => $guardPosition->id, 'daily_rate' => 400, 'status' => 'active', 'hired_date' => '2026-01-01', 'work_area' => 'park', 'user_id' => $lifeguard->id]);
$request = Illuminate\Http\Request::create('/attendance/manual-entry', 'POST', $data);
$request->setUserResolver(fn () => $lifeguard);
try { $controller->store($request); throw new RuntimeException('Lifeguard must not enter attendance'); }
catch (Symfony\Component\HttpKernel\Exception\HttpException $e) { check($e->getStatusCode() === 403, 'Lifeguard rejected'); }
echo "Employee self-service blocked\n";
