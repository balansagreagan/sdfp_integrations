// Run with: node tests/smoke/brochure-browser.mjs (requires Chrome and PHP).
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
    php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public', 'tests/smoke/brochure-server.php'], {
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

    await clickText('Sell / register brochure');
    await until(`!!document.querySelector('#brochure_card_number')`, 'brochure sale form');
    await fill('#brochure_card_number', 'BROWSER-001');
    await fill('#brochure_guest_name', 'Browser Purchaser');
    await fill('#brochure_contact_number', '09123456789');
    await evaluate(`document.querySelector('#brochure_card_number').closest('form').requestSubmit()`);
    await until(`!document.querySelector('#brochure_card_number')`, 'brochure sale saved');
    await until(`document.querySelector('.app-notification')?.textContent.includes('499')`, 'brochure receipt notification');
    await closeToast();
    assert.equal(await evaluate(`document.querySelector('[data-testid="brochure-sales"]').textContent.includes('BROWSER-001')`), true);
    await clickText('New booking');
    await until(`!!document.querySelector('#booking_brochure_card')`, 'brochure booking form');
    const card = await evaluate(`Array.from(document.querySelector('#booking_brochure_card').options).find(option => option.textContent.includes('BROWSER-001')).value`);
    await select('#booking_brochure_card', card);
    const coupon = await evaluate(`Array.from(document.querySelector('#booking_brochure_coupon').options).find(option => option.textContent.includes('Free all-day')).value`);
    await select('#booking_brochure_coupon', coupon);
    await fill('#guest_name', 'Brochure Browser Guest');
    await fill('#contact_number', '09999999999');
    await fill('#address', 'Dipolog');
    await fill('#playtime_date', '2026-10-26');
    await fill('#quantity', '7');
    assert.equal(await evaluate(`document.querySelector('#quantity').readOnly`), false, 'Coupon guest count must be editable');
    assert.equal(await evaluate(`!!document.querySelector('#adult_count')`), false, 'No guessed adult count for brochure guests');
    assert.equal(await evaluate(`document.querySelector('#guest_name').closest('form').textContent.includes('Total booking: \u20b10.00')`), true, 'Free admission must not recharge499; actual form: ' + await evaluate(`document.querySelector('#guest_name').closest('form').textContent.slice(-1800)`));
    for (const width of [390, 1600]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        assert.equal(await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const r = dialog.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && dialog.scrollWidth <= dialog.clientWidth + 1; })()`), true, 'Brochure form must fit at' + width);
    }
    await evaluate(`document.querySelector('#guest_name').closest('form').requestSubmit()`);
    await until(`!document.querySelector('#guest_name')`, 'free brochure reservation saved');
    await until(`document.body.textContent.includes('Brochure Browser Guest')`, 'reservation listed');
    assert.equal(await evaluate(`document.querySelector('[data-testid="brochure-sales"]').textContent.includes('17 unused coupons')`), true, 'Exactly one coupon is reserved');
    await closeToast();
    await cdp('Page.navigate', { url: `${origin}/daily-sales` });
    await until(`document.body.textContent.includes('Brochure BROWSER-001')`, 'brochure receipt in daily sales');
    assert.deepEqual(runtimeErrors, [], 'Brochure flow must have no browser exceptions');
    console.log('Brochure browser: sale499, single coupon reservation,7 guests without age guessing, no second499 charge,390/1600px layouts and Daily Sales receipt passed');
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
