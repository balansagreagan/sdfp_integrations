// Run with: node tests/smoke/attendance-navigation.mjs (requires Chrome and PHP).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
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
        throw new Error(`Timed out: ${label}; runtime errors: ${runtimeErrors.join("; ")}; page: ${await evaluate("document.body?.innerText.slice(0, 600)")}`);
    };
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const payrollRequests = (url) => requests.filter((request) => request.method === 'GET' && new URL(request.url).pathname === url).length;
    await cdp('Page.navigate', { url: `${origin}/_smoke/start` });
    await until(`document.querySelector('h1')?.textContent === 'Daily Time-In/Out'`, 'initial attendance page');

    for (const [area, payroll] of [['park', '/payroll'], ['soaked', '/soaked-payroll']]) {
        if (area === 'soaked') {
            await evaluate(`const select = document.querySelector('#attendance-business'); select.value = 'soaked'; select.dispatchEvent(new Event('change', { bubbles: true }));`);
            await until(`document.querySelector('#attendance-business')?.value === 'soaked' && document.querySelector('tbody')?.textContent.includes('Soaked')`, 'Soaked employee register');
        }
        const nav = `a[href="${payroll}"]`;
        const beforeHover = payrollRequests(payroll);
        const point = await evaluate(`(() => { const box = document.querySelector(${JSON.stringify(nav)}).getBoundingClientRect(); return { x: box.x + 30, y: box.y + box.height / 2 }; })()`);
        await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
        await delay(350);
        assert.equal(payrollRequests(payroll), beforeHover, 'Hover must not cache payroll data');
        await evaluate(`Array.from(document.querySelectorAll('tbody button')).find(button => button.textContent.includes('AM:')).click()`);
        await until(`Array.from(document.querySelectorAll('tbody button')).some(button => (button.textContent.includes('AM:') && button.textContent.includes('Present')) && !button.disabled)`, 'saved AM attendance');
        await until(`document.querySelector('.app-notification')?.textContent.includes('Manual attendance saved. Payroll updated.')`, 'attendance success notification');
        await click(nav);
        await until(`document.querySelector(${JSON.stringify(nav)})?.getAttribute('aria-busy') === 'true'`, 'visible navigation loading state');
        await until(`document.querySelector('h1')?.textContent.includes('Weekly Payroll')`, 'payroll after recording');
        assert.ok(payrollRequests(payroll) > beforeHover, 'Payroll click must make a fresh GET');
        assert.equal(await evaluate(`document.querySelector('tbody').textContent.includes('200.00')`), true, 'Payroll must show the new half-day pay');
        assert.equal(await evaluate(`Array.from(document.querySelectorAll('tbody td')).filter(cell => cell.textContent.trim() === '4').length`), 1, 'Payroll must display recorded AM');
        await click('a[href="/attendance"]');
        await until(`document.querySelector('h1')?.textContent === 'Daily Time-In/Out'`, 'attendance after payroll');
        if (area === 'soaked') {
            await evaluate(`document.querySelector('#attendance-business').value = 'soaked'; document.querySelector('#attendance-business').dispatchEvent(new Event('change', { bubbles: true }));`);
            await until(`document.querySelector('tbody')?.textContent.includes('Soaked')`, 'Soaked register before reset');
        }
        await until(`Array.from(document.querySelectorAll('tbody button')).some(button => (button.textContent.includes('AM:') && button.textContent.includes('Present')))`, 'fresh attendance register');
        await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Reset Time-In/Out').click()`);
        await until(`document.querySelector('.swal2-popup:not(.swal2-toast)')?.textContent.includes('Reset attendance?')`, 'SweetAlert reset confirmation');
        if (area === 'park') {
            const postsBeforeCancel = requests.filter(request => request.url.includes('/attendance/reset-date')).length;
            await click('.swal2-cancel');
            await delay(100);
            assert.equal(requests.filter(request => request.url.includes('/attendance/reset-date')).length, postsBeforeCancel, 'Cancel must not reset attendance');
            await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Reset Time-In/Out').click()`);
            await until(`document.querySelector('.swal2-confirm')?.textContent === 'Reset attendance'`, 'reset confirmation after cancellation');
        }
        await click('.swal2-confirm');
        await until(`!Array.from(document.querySelectorAll('tbody button')).some(button => (button.textContent.includes('AM:') && button.textContent.includes('Present'))) && Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Reset Time-In/Out' && !button.disabled)`, 'reset completion');
        await until(`document.querySelector('.app-notification')?.textContent.includes('attendance record(s) reset')`, 'reset success notification');
        const beforeResetVisit = payrollRequests(payroll);
        await click(nav);
        await until(`document.querySelector('h1')?.textContent.includes('Weekly Payroll')`, 'payroll after reset');
        assert.ok(payrollRequests(payroll) > beforeResetVisit, 'Payroll must request fresh data after reset');
        assert.equal(await evaluate(`Array.from(document.querySelectorAll('tbody td')).filter(cell => cell.textContent.trim() === '4').length`), 0, 'Reset marks must disappear from payroll');
        assert.equal(await evaluate(`document.querySelector('tbody').textContent.includes('200.00')`), false, 'Reset pay must disappear from payroll');
        console.log(`${area}: fresh sidebar navigation, loading indicator, attendance entry and reset reflected in payroll passed`);
        await click('a[href="/attendance"]');
        await until(`document.querySelector('h1')?.textContent === 'Daily Time-In/Out'`, 'return to attendance');
    }
    const fill = async (selector, value) => {
        await evaluate(`(() => {
            const input = document.querySelector(${JSON.stringify(selector)});
            const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
            input.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
    };
    const clickText = (text) => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const toast = (message) => until(`document.querySelector('.app-notification')?.textContent.includes(${JSON.stringify(message)})`, `notification: ${message}`);
    const closeToast = async () => {
        await evaluate(`document.querySelector('.app-notification .swal2-close')?.click()`);
        await until(`!document.querySelector('.app-notification')`, 'dismiss notification');
    };
    await click('a[href="/inventory"]');
    await until(`document.querySelector('h1')?.textContent.includes('Park Inventory')`, 'inventory page');
    await clickText('Add Equipment Item');
    await until(`!!document.querySelector('#item_code')`, 'inventory create form');
    await fill('#item_code', 'SMOKE-ALERT');
    await fill('#name', 'Notification equipment');
    await evaluate(`document.querySelector('#item_code').closest('form').requestSubmit()`);
    await toast('Inventory item added to register.');
    await until(`!document.querySelector('#item_code')`, 'create dialog closes');
    await closeToast();
    await evaluate(`Array.from(document.querySelectorAll('tbody button')).find(button => button.textContent.includes('Adjust')).click()`);
    await until(`!!document.querySelector('#edit_qty')`, 'inventory update form');
    await fill('#edit_qty', '15');
    await evaluate(`document.querySelector('#edit_qty').closest('form').requestSubmit()`);
    await toast('Stock updated for Notification equipment.');
    await until(`!document.querySelector('#edit_qty')`, 'update dialog closes');
    await closeToast();
    await clickText('Add Equipment Item');
    await until(`!!document.querySelector('#item_code')`, 'duplicate item form');
    await fill('#item_code', 'SMOKE-ALERT');
    await fill('#name', 'Duplicate must fail');
    await evaluate(`document.querySelector('#item_code').closest('form').requestSubmit()`);
    await toast('The item code has already been taken.');
    assert.equal(await evaluate(`document.querySelector('.app-notification .swal2-title')?.textContent`), 'Please check your entries', 'Validation failure must show an error notification');
    assert.equal(await evaluate(`!!document.querySelector('#item_code')`), true, 'Validation must retain the form');
    await closeToast();
    await clickText('Cancel');
    await until(`!document.querySelector('#item_code')`, 'cancel create form');
    await click('a[href="/announcement"]');
    await until(`document.querySelector('h1')?.textContent.includes('Park Notices')`, 'announcement page');
    await clickText('Post Announcement');
    await until(`!!document.querySelector('#ann_title')`, 'announcement form');
    await fill('#ann_title', 'Notification test notice');
    await fill('#ann_content', 'This notice belongs to the isolated browser test.');
    await evaluate(`document.querySelector('#ann_title').closest('form').requestSubmit()`);
    await toast('Announcement posted to the park team.');
    await closeToast();
    await click('button[title="Delete announcement"]');
    await until(`document.querySelector('.swal2-confirm')?.textContent === 'Delete'`, 'delete confirmation');
    await click('.swal2-cancel');
    await until(`!document.querySelector('.swal2-popup:not(.swal2-toast)')`, 'delete cancelled');
    assert.equal(await evaluate(`document.body.textContent.includes('Notification test notice')`), true, 'Cancelling delete must keep the record');
    await click('button[title="Delete announcement"]');
    await until(`document.querySelector('.swal2-confirm')?.textContent === 'Delete'`, 'delete confirmation again');
    await click('.swal2-confirm');
    await toast('Announcement removed.');
    assert.equal(await evaluate(`document.querySelector('main')?.textContent.includes('Notification test notice') ?? document.body.textContent.includes('Notification test notice')`), false, 'Confirmed delete must remove the record');
    await closeToast();
    console.log('CRUD: create, update, validation error, delete confirmation and cancel notifications passed');
    const userMenuPoint = await evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Navigation Tester')); const box = button.getBoundingClientRect(); return { x: box.x + 30, y: box.y + box.height / 2 }; })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...userMenuPoint });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...userMenuPoint, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...userMenuPoint, button: 'left', clickCount: 1 });
    await until(`Array.from(document.querySelectorAll('[role="menuitem"]')).some(item => item.textContent.includes('Log out'))`, 'user menu');
    await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent.includes('Log out')).click()`);
    await toast('You have been logged out.');
    await cdp('Page.navigate', { url: `${origin}/login` });
    await until(`!!document.querySelector('#email')`, 'login form');
    await fill('#email', 'navigation@example.test');
    await fill('#password', 'incorrect-password');
    await evaluate(`document.querySelector('#email').closest('form').requestSubmit()`);
    await toast('These credentials do not match our records.');
    await closeToast();
    await fill('#password', 'smoke-test-only');
    await evaluate(`document.querySelector('#email').closest('form').requestSubmit()`);
    await toast('You are now logged in.');
    await until(`window.location.pathname === '/dashboard'`, 'authenticated dashboard');
    await closeToast();
    await click('a[href="/attendance"]');
    await until(`document.querySelector('h1')?.textContent === 'Daily Time-In/Out'`, 'attendance after login');
    assert.equal(await evaluate(`!!document.querySelector('.app-notification')`), false, 'Success notifications must not replay on ordinary navigation');
    console.log('Authentication: logout success, failed login, login success and no repeated notifications passed');

} catch (error) {
    console.error(error.message);
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
