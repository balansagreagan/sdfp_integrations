<?php

namespace App\Http\Controllers;

use App\Models\Brochure;
use App\Models\Guest;
use App\Support\BrochureProgramme;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BrochureController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->merge(['card_number' => strtoupper(trim((string) $request->input('card_number')))]);
        $couponKeys = [];
        foreach (BrochureProgramme::OFFERS as $type => $offer) {
            for ($number = 1; $number <= $offer['count']; $number++) {
                $couponKeys[] = $type.':'.$number;
            }
        }
        $data = $request->validate([
            'card_number' => ['required', 'string', 'max:60', 'regex:/^[A-Z0-9][A-Z0-9-]*$/', 'unique:brochures,card_number'],
            'guest_name' => ['required', 'string', 'max:150'],
            'contact_number' => ['required', 'string', 'max:30'],
            'source' => ['required', 'in:sold,previous'],
            'purchased_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'before_or_equal:'.Brochure::EXPIRY],
            'payment_method' => [Rule::requiredIf($request->input('source') === 'sold'), 'nullable', 'in:cash,gcash,bank_transfer,maya'],
            'reference' => [Rule::requiredIf($request->input('source') === 'previous'), 'nullable', 'string', 'max:255'],
            'unused_coupons' => ['present_if:source,previous', 'array', 'max:18'],
            'unused_coupons.*' => ['string', 'distinct', Rule::in($couponKeys)],
            'coupons_verified' => ['accepted_if:source,previous'],
        ]);
        if ($data['source'] === 'sold' && today()->toDateString() > Brochure::EXPIRY) {
            throw ValidationException::withMessages(['source' => 'This brochure promotion has expired.']);
        }
        DB::transaction(function () use ($data, $request) {
            $contact = preg_replace('/[\s()\-]/', '', $data['contact_number']);
            $guest = Guest::firstOrCreate(['contact_number' => $contact], ['full_name' => $data['guest_name']]);
            $brochure = Brochure::create([
                ...collect($data)->except(['guest_name', 'contact_number', 'unused_coupons', 'coupons_verified'])->all(),
                'guest_id' => $guest->id, 'expires_on' => Brochure::EXPIRY, 'price' => Brochure::PRICE,
                'amount_paid' => $data['source'] === 'sold' ? Brochure::PRICE : '0.00',
                'payment_method' => $data['source'] === 'sold' ? $data['payment_method'] : null,
                'recorded_by' => $request->user()->id,
            ]);
            foreach (BrochureProgramme::OFFERS as $type => $offer) {
                for ($number = 1; $number <= $offer['count']; $number++) {
                    $state = $data['source'] === 'sold' || in_array($type.':'.$number, $data['unused_coupons'] ?? [], true) ? 'unused' : 'unavailable';
                    $brochure->coupons()->create(compact('type', 'number', 'state'));
                }
            }
        });

        return back()->with('success', $data['source'] === 'sold' ? 'Brochure sold for ₱499. Its 18 coupons are ready to reserve.' : 'Previously purchased brochure registered. No new payment or revenue recorded.');
    }
}
