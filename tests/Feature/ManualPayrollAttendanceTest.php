<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualPayrollAttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_manually_record_both_work_areas_without_counting_the_other_shift(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'staff']));
        $position = Position::create(['title' => 'Office Staff', 'base_daily_rate' => 400]);
        $period = PayrollPeriod::findOrCreateForDate('2026-10-16');

        foreach (['park', 'soaked'] as $area) {
            $employee = Employee::create([
                'employee_code' => $area, 'first_name' => 'Test', 'last_name' => $area,
                'position_id' => $position->id, 'daily_rate' => 400,
                'status' => 'active', 'hired_date' => '2026-01-01', 'work_area' => $area,
            ]);
            $url = '/attendance/manual-entry';
            $payload = ['work_area' => $area, 'employee_id' => $employee->id, 'payroll_period_id' => $period->id,
                'work_date' => '2026-10-16', 'shift_slot' => 'am', 'status' => 'present'];
            $this->post($url, $payload)->assertRedirect()->assertSessionHasNoErrors();
            $this->assertDatabaseHas('attendance_shifts', ['employee_id' => $employee->id,
                'am_status' => 'present', 'pm_status' => 'unrecorded', 'recorded_by' => auth()->id()]);
            $this->assertDatabaseHas('payroll_lines', ['employee_id' => $employee->id,
                'days_worked' => 0.5, 'gross_pay' => 200]);
            $this->post($url, array_merge($payload, ['work_area' => $area === 'park' ? 'soaked' : 'park']))->assertStatus(422);
            $period->update(['status' => 'approved']);
            $this->post($url, $payload)->assertRedirect()->assertSessionHas('error');
            $period->update(['status' => 'draft']);
        }
    }

    public function test_manual_register_is_available_but_self_service_clock_in_is_removed(): void
    {
        foreach (['admin', 'staff'] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]));
            $this->get('/attendance')->assertOk();
            $this->post('/attendance/time-in-out', [])->assertNotFound();
            $this->post('/payroll/shift', [])->assertNotFound();
            $this->post('/soaked-payroll/shift', [])->assertNotFound();
        }
    }
}
