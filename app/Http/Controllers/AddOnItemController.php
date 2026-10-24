<?php

namespace App\Http\Controllers;

use App\Models\AddOnItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AddOnItemController extends Controller
{
    private function validated(Request $request, bool $creating): array
    {
        if ($creating) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }

        return $request->validate([
            ...($creating ? ['code' => ['required', 'string', 'max:30', 'unique:add_on_items,code']] : []),
            'name' => ['required', 'string', 'max:150'],
            'unit' => ['required', 'string', 'max:30'],
            'price' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
            'is_active' => ['required', 'boolean'],
            'brochure_scope' => ['sometimes', 'required', 'in:other,restaurant,water_rides,hotel,drink_bundle'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        AddOnItem::create($this->validated($request, true));

        return back()->with('success', 'Food add-on created. A blank price means it must be confirmed when booking.');
    }

    public function update(Request $request, AddOnItem $addon): RedirectResponse
    {
        $addon->update($this->validated($request, false));

        return back()->with('success', 'Food add-on updated. Existing booked prices have been kept.');
    }
}
