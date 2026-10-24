// Run with: node tests/smoke/attendance-navigation.mjs (requires Chrome and PHP).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'sdfp-navigation-'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(() => resolve(port)); });
});
const origin = `http://127.0.0.1:${port}`;
let php, chrome, socket;
let serverOutput = '';
try {
    php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public', 'tests/smoke/navigation-server.php'], {
        cwd: root, windowsHide: true, env: { ...process.env, SDFP_NAV_SMOKE_DIR: temporary }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    php.stdout.on('data', (data) => { serverOutput += data; });
    php.stderr.on('data', (data) => { serverOutput += data; });
    for (let attempt = 0; attempt < 100; attempt++) {
        try { const response = await fetch(`${origin}/login`); if (response.status === 200) break; }
        catch { /* Server is starting. */ }
        if (attempt === 99) throw new Error('Isolated PHP server did not start');
        await delay(100);
    }
    const endpoint = await new Promise((resolve, reject) => {
        chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--remote-debugging-port=0', `--user-data-dir=${path.join(temporary, 'chrome')}`, 'about:blank',
        ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        chrome.once('error', reject);
        const timeout = setTimeout(() => reject(new Error('Chrome did not expose a debugging endpoint')), 15000);
        chrome.stderr.on('data', (data) => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timeout); resolve(match[1]); }
        });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    const requests = [];
    const runtimeErrors = [];
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) {
            const callback = pending.get(message.id);
            if (callback) { pending.delete(message.id); message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result); }
        }
        if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
        if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request);
    };
    const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params) => command(method, params, sessionId);
    await cdp('Page.enable');
    await cdp('Network.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (expression) => {
        const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
        return result.result.value;
    };
    const until = async (expression, label) => {
        for (let attempt = 0; attempt < 400; attempt++) {
            if (await evaluate(expression)) return;
            await delay(50);
        }
        throw new Error(`Timed out: ${label}; runtime errors: ${runtimeErrors.join("; ")}; page: ${await evaluate("document.body?.innerText.slice(-2200)")}`);
    };
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const payrollRequests = (url) => requests.filter((request) => request.method === 'GET' && new URL(request.url).pathname === url).length;
    await cdp('Page.navigate', { url: `${origin}/_smoke/start` });
    await until(`document.querySelector('h1')?.textContent === 'Daily Time-In/Out'`, 'initial attendance page');

    const fill = async (selector, value) => {
        await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    };
    const select = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const clickText = text => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const closeToast = async () => { await evaluate(`document.querySelector('.app-notification .swal2-close')?.click()`); await until(`!document.querySelector('.app-notification')`, 'toast dismissed'); };
    await click('a[href="/bookings"]');
    await until(`document.querySelector('h1')?.textContent === 'Bookings & Reservations'`, 'booking register');
    await clickText('New booking');
    await until(`!!document.querySelector('#guest_name')`, 'reservation form');
    assert.equal(await evaluate(`document.querySelector('#quantity').readOnly && !document.querySelector('#guest_breakdown') && !document.querySelector('[role="dialog"]').textContent.includes('Rate / variant') && !Array.from(document.querySelector('#ticket_type_id').options).some(option => option.textContent.includes('Kiddie'))`), true, 'Adults/children must be always available, total guests automatic, and old kiddie pricing unavailable');
    await fill('#adult_count', '2');
    await fill('#child_count', '1');
    await fill('#new_child_age_0', '3');
    assert.equal(await evaluate(`document.querySelector('#quantity').value === '3' && document.querySelector('#guest_name').closest('form').textContent.includes('Total booking: ₱298.00')`), true, 'Two adults at149 plus a free three-year-old must total298');
    await fill('#child_count', '0');
    await fill('#guest_name', 'Honey Prospero');
    await fill('#contact_number', '0938 923 5912');
    await fill('#address', 'Ozamiz City');
    await fill('#adult_count', '2');
    await fill('#playtime_date', '2026-12-05');
    await select('#package_category', 'overnight');
    await until(`!document.querySelector('#ticket_type_id') && document.querySelector('#guest_name').closest('form').textContent.includes('1,600.00')`, 'overnight fee selected automatically');
    await fill('#visit_end_date', '2026-12-06');
    await fill('#start_time', '11:00');
    await fill('#remarks', 'None');
    await fill('#payment_amount', '750');
    await until(`!!document.querySelector('#paid_on')`, 'deposit date');
    await fill('#paid_on', '2026-10-15');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('3,200.00') && document.querySelector('#guest_name').closest('form').textContent.includes('2,450.00')`), true, 'Form must show 3200 total and 2450 balance');
    await evaluate(`document.querySelector('#guest_name').closest('form').requestSubmit()`);
    await until(`document.querySelector('.app-notification')?.textContent.includes('saved. Payment and balance')`, 'booking success notification');
    await until(`!document.querySelector('#guest_name')`, 'booking saved');
    const honeyRow = `Array.from(document.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Honey Prospero'))`;
    assert.equal(await evaluate(`(() => { const text = (${honeyRow}).textContent; return ['3,200.00', '750.00', '2,450.00', 'Dec 5, 2026', 'Dec 6, 2026', '11:00'].every(value => text.includes(value)); })()`), true, 'Register must show the exact sample reservation');
    await closeToast();
    await evaluate(`(${honeyRow}).querySelector('button').click()`);
    await until(`!!document.querySelector('#receipt_amount')`, 'booking detail and additional payment form');
    assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Ozamiz City') && document.querySelector('[role="dialog"]').textContent.includes('Oct 15, 2026')`), true, 'Detail must retain address and original payment date');
    await fill('#receipt_amount', '200');
    await select('#receipt_method', 'gcash');
    await evaluate(`document.querySelector('#receipt_amount').closest('form').requestSubmit()`);
    await until(`document.querySelector('.app-notification')?.textContent.includes('Payment recorded.')`, 'additional payment saved');
    await until(`document.querySelector('[role="dialog"]')?.textContent.includes('2,250.00')`, 'updated balance in open detail');
    await closeToast();
    await clickText('Close');
    await until(`!document.querySelector('[role="dialog"]')`, 'detail closed');
    await click('a[href="/packages"]');
    await until(`document.querySelector('h1')?.textContent === 'Packages & Rates'`, 'packages catalog');
    assert.equal(await evaluate(`(() => { const section = Array.from(document.querySelectorAll('section')).find(section => section.querySelector('h2')?.textContent === 'Ticket + Bilao'); return ['2,199.00', '4,299.00', '6,399.00', 'per bundle'].every(value => section.textContent.includes(value)); })()`), true, 'Bilao variants must display bundle prices');
    await clickText('Add rate or variant');
    await until(`!!document.querySelector('#pkg_code')`, 'new package variant form');
    await select('#pkg_category', 'ticket_bilao');
    await fill('#pkg_code', 'BILAO-6-TEST');
    await fill('#pkg_name', 'Ticket + Bilao');
    await fill('#pkg_variant', '6 persons');
    await select('#pkg_basis', 'per_booking');
    await fill('#pkg_included', '6');
    await fill('#pkg_price', '2599');
    await evaluate(`document.querySelector('#pkg_code').closest('form').requestSubmit()`);
    await until(`document.querySelector('.app-notification')?.textContent.includes('Package rate or variant created.')`, 'variant created');
    await closeToast();
    await click('a[href="/bookings"]');
    await until(`document.querySelector('h1')?.textContent === 'Bookings & Reservations'`, 'return to bookings');
    await clickText('New booking');
    await until(`!!document.querySelector('#quantity')`, 'new variant booking form');
    await fill('#adult_count', '6');
    await select('#package_category', 'ticket_bilao');
    const variant = await evaluate(`Array.from(document.querySelector('#ticket_type_id').options).find(option => option.textContent.includes('6 persons')).value`);
    await select('#ticket_type_id', variant);
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Total booking:') && document.querySelector('#guest_name').closest('form').textContent.includes('2,599.00') && document.querySelector('#package_quantity').value === '1'`), true, 'A new Bilao variant must be priced per bundle in bookings');
    await fill('#adult_count', '13');
    await select('#package_category', 'day_tour');
    await until(`!document.querySelector('#ticket_type_id') && document.querySelector('#guest_name').closest('form').textContent.includes('1,100.00')`, '13 guests automatically use1100 tier');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('14,300.00')`), true, '13-person Day Tour total');
    await fill('#adult_count', '14');
    await until(`!document.querySelector('#ticket_type_id') && document.querySelector('#guest_name').closest('form').textContent.includes('999.00')`, '14 guests automatically use999 tier');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('13,986.00')`), true, '14-person Day Tour total');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await delay(100);
    const phoneDialog = await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const rect = dialog.getBoundingClientRect(); const style = getComputedStyle(dialog); return { width: rect.width, left: rect.left, right: rect.right, viewport: innerWidth, cssWidth: style.width, maxWidth: style.maxWidth, transform: style.transform, className: dialog.className }; })()`);
    assert.ok(phoneDialog.width <= phoneDialog.viewport, `Booking dialog must fit mobile width: ${JSON.stringify(phoneDialog)}`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await clickText('Cancel');
    await until(`!document.querySelector('[role="dialog"]')`, 'cancel unsaved tier example');
    await cdp('Page.navigate', { url: `${origin}/bookings` });
    await until(`document.querySelector('h1')?.textContent === 'Bookings & Reservations'`, 'fresh register');
    const addFood = async (index, name) => {
        await clickText('Add item');
        const value = await evaluate(`Array.from(document.querySelector('#new_addon_${index}').options).find(option => option.textContent === ${JSON.stringify(name)}).value`);
        await select(`#new_addon_${index}`, value);
    };
    await clickText('New booking');
    await until(`!!document.querySelector('#guest_name')`, 'Maria form');
    assert.equal(await evaluate(`document.querySelector('#ticket_type_id').selectedOptions[0].textContent.includes('149.00')`), true, 'Free brochure must not become the default rate');
    await fill('#guest_name', 'Banawan, Maria Clarinda');
    await fill('#contact_number', '09129637159');
    await fill('#address', 'Mobod, Oroquieta City');
    await fill('#adult_count', '7');
    await fill('#playtime_date', '2026-10-18');
    await fill('#visit_end_date', '2026-10-18');
    await fill('#start_time', '10:00');
    const free = await evaluate(`Array.from(document.querySelector('#ticket_type_id').options).find(option => option.textContent.includes('Free Tickets Brochure')).value`);
    await select('#ticket_type_id', free);
    await select('#booking_brochure_offer', 'free_all_day');
    await fill('#promotion_reference', 'FREE TICKETS BROCHURE');
    await addFood(0, 'Bilao Boodle 1');
    await addFood(1, 'Tuna Kinilaw');
    await addFood(2, 'Tuna Panga');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Total booking: ₱1,967.00')`), true, 'Maria food must add to1967 despite free tickets');
    await evaluate(`document.querySelector('#guest_name').closest('form').requestSubmit()`);
    await until(`!document.querySelector('#guest_name')`, 'Maria saved');
    await closeToast();
    const mariaRow = `Array.from(document.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Banawan, Maria Clarinda'))`;
    assert.equal(await evaluate(`(${mariaRow}).textContent.includes('1,967.00')`), true, 'Maria row must display total');
    await clickText('New booking');
    await until(`!!document.querySelector('#guest_name')`, 'Shiela form');
    await fill('#guest_name', 'Shiela Marie Gadiano');
    await fill('#contact_number', '09067143929');
    await fill('#address', 'Pagadian City');
    await fill('#playtime_date', '2026-10-10');
    await fill('#visit_end_date', '2026-10-10');
    await fill('#start_time', '08:00');
    await select('#package_category', 'water_fun');
    assert.equal(await evaluate(`!document.querySelector('#ticket_type_id') && !document.querySelector('#guest_breakdown')`), true, 'Water Fun must not require a rate choice or guest checkbox');
    await fill('#adult_count', '4');
    await fill('#child_count', '1');
    assert.equal(await evaluate(`document.querySelector('#quantity').value`), '5', 'Adult and child counts must update total pax');
    await until(`!!document.querySelector('#new_child_age_0')`, 'Water Fun age field');
    assert.equal(await evaluate(`!!document.querySelector('#child_unit_price')`), false, 'Age-based packages must calculate child rates automatically');
    for (const [age, total] of [['0', '3,196.00'], ['4', '3,196.00'], ['5', '3,595.50'], ['8', '3,595.50'], ['9', '3,995.00']]) {
        await fill('#new_child_age_0', age);
        assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Total booking: ₱${total}')`), true, `Water Fun age${age} preview`);
    }
    await fill('#child_count', '2');
    await fill('#new_child_age_0', '4');
    await fill('#new_child_age_1', '5');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Total booking: ₱3,595.50') && document.querySelector('#quantity').value === '6'`), true, 'Different ages must receive independent child rates');
    await fill('#child_count', '1');
    await select('#package_category', 'admission');
    await fill('#new_child_age_0', '4');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Known charges: ₱596.00') && document.querySelector('#guest_name').closest('form').textContent.includes('age 4: to confirm')`), true, 'Ticket age4 must remain pending');
    await select('#package_category', 'water_fun');
    await fill('#new_child_age_0', '');
    await addFood(0, 'Cajun Mix');
    await addFood(1, 'Grilled Tuna Belly');
    await addFood(2, 'Rice');
    await fill('#new_addon_qty_2', '2');
    await addFood(3, 'Pineapple Juice');
    await fill('#new_addon_qty_3', '2');
    await fill('#food_serving_time', '11:00');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Known charges: ₱4,195.00') && document.querySelector('#guest_name').closest('form').textContent.includes('Final total and balance: To confirm')`), true, 'Unknown child/food rates must leave the final quote pending');
    await evaluate(`document.querySelector('#guest_name').closest('form').requestSubmit()`);
    await until(`!document.querySelector('#guest_name')`, 'Shiela saved');
    await closeToast();
    const shielaRow = `Array.from(document.querySelectorAll('tbody tr')).find(row => row.textContent.includes('Shiela Marie Gadiano'))`;
    assert.equal(await evaluate(`(${shielaRow}).textContent.includes('To confirm') && (${shielaRow}).textContent.includes('4,195.00')`), true, 'Register must flag pending prices');
    await evaluate(`(${shielaRow}).querySelector('button').click()`);
    await until(`!!document.querySelector('[role="dialog"]')`, 'Shiela details');
    assert.equal(await evaluate(`['4 adults + 1 children', 'Food serving time', '11:00', 'Grilled Tuna Belly', '2 cup(s)', 'To confirm'].every(text => document.querySelector('[role="dialog"]').textContent.includes(text))`), true, 'Details must retain counts, food quantities and serving time');
    await clickText('Edit food / confirm prices');
    await until(`!!document.querySelector('#edit_child_age_0')`, 'age confirmation editor');
    // Test-only prices: no real customer records are changed by this browser test.
    await fill('#edit_child_age_0', '5');
    assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('399.50')`), true, 'Age5 must receive the50percent Water Fun rate');
    await fill('#edit_addon_price_1', '450');
    await fill('#edit_addon_price_2', '25');
    await fill('#edit_addon_price_3', '40');
    await clickText('Save food and pricing');
    await until(`!document.querySelector('#edit_child_age_0') && document.querySelector('[role="dialog"]').textContent.includes('5,174.50')`, 'final age quote saved and refreshed');
    assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Final total and balance are awaiting')`), false, 'Final quote must clear pending status');
    await closeToast();
    await clickText('Close');
    await until(`!document.querySelector('[role="dialog"]')`, 'confirmed quote detail closed');
    await click('a[href="/packages"]');
    await until(`document.querySelector('h1')?.textContent === 'Packages & Rates'`, 'food catalog page');
    assert.equal(await evaluate(`document.body.textContent.includes('SDFP Child Policy 2026') && document.body.textContent.includes('ages 5–8: 50%') && document.body.textContent.includes('ages 6–10: 50%')`), true, 'Packages must show the published child policies');
    await clickText('Food & add-ons');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Edit food / service' && button.parentElement.textContent.includes('Grilled Tuna Belly')).click()`);
    await until(`!!document.querySelector('#food_price')`, 'food catalog price editor');
    await fill('#food_price', '123.45');
    await click('[role="dialog"] input[type="checkbox"]');
    await clickText('Save food item');
    await until(`!document.querySelector('#food_price')`, 'food catalog updated');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('h3')).find(heading => heading.textContent === 'Grilled Tuna Belly').parentElement.parentElement.textContent.includes('123.45') && Array.from(document.querySelectorAll('h3')).find(heading => heading.textContent === 'Grilled Tuna Belly').parentElement.parentElement.textContent.includes('Inactive')`), true, 'Catalog edit must persist price and availability');
    await closeToast();
    const previewDirectory = path.join(root, 'storage/app/responsive-previews');
    await evaluate(`localStorage.setItem('appearance', 'light'); document.documentElement.classList.remove('dark');`);
    await mkdir(previewDirectory, { recursive: true });
    const checkLayout = async (page, width, height = 900) => {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await delay(250);
        const layout = await evaluate(`(() => {
            const page = document.querySelector('[data-testid="${page}-page"]');
            const visible = element => !!element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
            const table = document.querySelector('[data-testid="${page}-table"]');
            const cards = document.querySelector('[data-testid="${page === 'bookings' ? 'booking' : 'attendance'}-cards"]');
            const scroll = table.querySelector('[role="region"]');
            const availableWidth = page.clientWidth - parseFloat(getComputedStyle(page).paddingLeft) - parseFloat(getComputedStyle(page).paddingRight);
            const root = page.getBoundingClientRect();
            const controls = Array.from(page.querySelectorAll('button, input, select, a')).filter(element => visible(element) && !element.closest('[role="region"]'));
            const overflow = controls.filter(element => { const rect = element.getBoundingClientRect(); return rect.left < root.left - 1 || rect.right > root.right + 1 || element.scrollWidth > element.clientWidth + 2; }).map(element => element.textContent.trim() || element.getAttribute('aria-label') || element.id);
            return { pageRight: root.right, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, availableWidth, tableVisible: visible(table), cardsVisible: visible(cards), scrollWidth: scroll.scrollWidth, scrollClient: scroll.clientWidth, overflow };
        })()`);
        assert.ok(layout.pageRight <= width + 1 && layout.documentWidth <= width + 1, `${page} ${width}px: page must fit viewport: ${JSON.stringify(layout)}`);
        assert.equal(layout.tableVisible, width >= 768, `${page} ${width}px: retain the original desktop table breakpoint`);
        assert.equal(layout.cardsVisible, !layout.tableVisible, `${page} ${width}px: exactly one register layout visible`);
        assert.deepEqual(layout.overflow, [], `${page} ${width}px: visible controls must fit without clipped labels`);
        if (layout.tableVisible) {
            for (const scrollEnd of [true]) {
                const actions = await evaluate(`(() => { const region = document.querySelector('[data-testid="${page}-table"] [role="region"]'); region.scrollLeft = ${scrollEnd ? 'region.scrollWidth' : '0'}; const bounds = region.getBoundingClientRect(); return Array.from(region.querySelectorAll('tbody tr td:last-child button')).filter(button => button.getBoundingClientRect().width > 0).map(button => { const rect = button.getBoundingClientRect(); return { text: button.textContent.trim(), fits: rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && button.scrollWidth <= button.clientWidth + 1 }; }); })()`);
                assert.ok(actions.length && actions.every(action => action.fits), `${page} ${width}px: row actions must be reachable by scrolling the table: ${JSON.stringify(actions)}`);
            }
        }
        return layout;
    };
    await click('a[href="/bookings"]');
    await until(`!!document.querySelector('[data-testid="bookings-page"]')`, 'responsive bookings page');
    for (const width of [320, 390, 640, 768, 1024, 1280, 1440, 1920]) await checkLayout('bookings', width);
    const expandedLayout = await checkLayout('bookings', 1280);
    await click('[data-sidebar="trigger"]');
    await delay(300);
    const collapsedLayout = await checkLayout('bookings', 1280);
    assert.equal(collapsedLayout.tableVisible, true, 'Desktop must keep its table when the sidebar collapses');
    assert.ok(collapsedLayout.availableWidth > expandedLayout.availableWidth, 'The table should use the extra width available after collapsing the sidebar');
    await click('[data-sidebar="trigger"]');
    await delay(300);
    await checkLayout('bookings', 1440);
    await evaluate(`document.querySelector('[data-testid="bookings-table"] [role="region"]').scrollLeft = 0`);
    await writeFile(path.join(previewDirectory, 'bookings-desktop.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await checkLayout('bookings', 390, 844);
    await writeFile(path.join(previewDirectory, 'bookings-phone.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await clickText('New booking');
    await until(`!!document.querySelector('#guest_name')`, 'phone booking dialog');
    assert.equal(await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const rect = dialog.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && dialog.scrollWidth <= dialog.clientWidth + 1; })()`), true, 'Phone booking form must fit and scroll vertically');
    await clickText('Cancel');
    await checkLayout('bookings', 1440);
    await click('a[href="/attendance"]');
    await until(`!!document.querySelector('[data-testid="attendance-page"]')`, 'responsive attendance page');
    for (const width of [320, 390, 640, 768, 1024, 1280, 1440, 1920]) await checkLayout('attendance', width);
    await checkLayout('attendance', 1440);
    await evaluate(`document.querySelector('[data-testid="attendance-table"]').scrollIntoView({ block: 'center' })`);
    await writeFile(path.join(previewDirectory, 'attendance-desktop.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await checkLayout('attendance', 390, 844);
    await evaluate(`document.querySelector('[data-testid="attendance-cards"]').scrollIntoView({ block: 'center' })`);
    await writeFile(path.join(previewDirectory, 'attendance-phone.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await evaluate(`Array.from(document.querySelectorAll('[data-testid="attendance-cards"] button')).find(button => button.textContent.includes('AM:')).click()`);
    await until(`Array.from(document.querySelectorAll('[data-testid="attendance-cards"] button')).some(button => button.textContent.includes('AM:') && button.textContent.includes('Present') && !button.disabled)`, 'mobile manual attendance still saves');
    await closeToast();
    await evaluate(`Array.from(document.querySelectorAll('[data-testid="attendance-cards"] button')).find(button => button.textContent.includes('CA / Others')).click()`);
    await until(`!!document.querySelector('[role="dialog"]')`, 'phone adjustment dialog');
    assert.equal(await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const rect = dialog.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && dialog.scrollWidth <= dialog.clientWidth + 1; })()`), true, 'Phone payroll adjustment form must fit');
    assert.deepEqual(runtimeErrors, [], 'Pages must have no browser runtime exceptions');
    console.log('Responsive layout: bookings and attendance at320–1920px, sidebar collapse, table scrolling, row actions, phone dialogs and mobile attendance save passed');
    console.log('Booking browser: Honey reservation/payments, package variants, bundle math, Day Tour tiers, mobile form, free brochure with paid food, adult/child pax, pending food/child quotes, serving time and later price confirmation passed');

} catch (error) {
    console.error(error.message);
    console.error(serverOutput.slice(-2500));
    process.exitCode = 1;
} finally {
    socket?.close();
    chrome?.kill();
    php?.kill();
    await delay(800);
    const resolvedTemporary = path.resolve(temporary);
    assert.ok(resolvedTemporary.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolvedTemporary).startsWith('sdfp-navigation-'));
    await rm(resolvedTemporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
