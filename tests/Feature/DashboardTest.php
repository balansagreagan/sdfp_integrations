<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertOk();
    }

    public function test_authenticated_users_can_visit_platform_pages()
    {
        $this->actingAs(User::factory()->create());

        $this->get('/daily-sales')->assertOk();
        $this->get('/inventory')->assertOk();
        $this->get('/packages')->assertOk();
        $this->get('/bookings')->assertOk();
        $this->get('/payroll')->assertOk();
        $this->get('/reports')->assertOk();
        $this->get('/announcement')->assertOk();
    }
}
