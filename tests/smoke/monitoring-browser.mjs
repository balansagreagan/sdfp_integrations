import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'sdfp-monitoring-'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(() => resolve(port)); });
});
const origin = `http://127.0.0.1:${port}`;
let php, chrome, socket;
let serverOutput = '';
try {
    php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public', 'tests/smoke/monitoring-server.php'], {
        cwd: root, windowsHide: true, env: { ...process.env, SDFP_MONITORING_SMOKE_DIR: temporary }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    php.stdout.on('data', (data) => { serverOutput += data; });
    php.stderr.on('data', (data) => { serverOutput += data; });
    for (let i = 0; i < 100; i++) {
        try { if ((await fetch(`${origin}/login`)).status === 200) break; } catch { /* Starting. */ }
        if (i === 99) throw new Error('Test server did not start');
        await delay(100);
    }
    const endpoint = await new Promise((resolve, reject) => {
        chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--remote-debugging-port=0', `--user-data-dir=${path.join(temporary, 'chrome')}`, 'about:blank',
        ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        chrome.once('error', reject);
        const timeout = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
        chrome.stderr.on('data', (data) => { const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map();
    const runtimeErrors = [];
    let sequence = 0;
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) { const callback = pending.get(message.id); if (callback) { pending.delete(message.id); message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result); } }
        if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    };
    const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params) => command(method, params, sessionId);
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (expression) => {
        const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
        return result.result.value;
    };
    const until = async (expression, label) => {
        for (let i = 0; i < 300; i++) { if (await evaluate(expression)) return; await delay(50); }
        throw new Error(`Timed out ${label}: ${await evaluate('document.body?.innerText.slice(-1800)')}; runtime: ${runtimeErrors.join('; ')}`);
    };
    const clickText = (text) => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const labelInput = (label, tag = 'input') => `Array.from(document.querySelectorAll('[role="dialog"] label')).find(label => label.querySelector('span')?.textContent === ${JSON.stringify(label)}).querySelector(${JSON.stringify(tag)})`;
    const fillExpression = (input, value, tag = 'input') => evaluate(`(() => { const input = ${input}; Object.getOwnPropertyDescriptor(${tag === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'}.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const selectExpression = (input, value) => evaluate(`(() => { const input = ${input}; input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const navigate = async (url, title) => { await cdp('Page.navigate', { url: origin + url }); await until(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`, title); };
    const closeToast = () => evaluate(`document.querySelector('.app-notification .swal2-close')?.click()`);

    await navigate('/_smoke/login/1', 'Monitoring center');
    assert.ok(await evaluate(`document.body.textContent.includes('Low park supply') && document.body.textContent.includes('Private restaurant stock')`));
    await navigate('/inventory', 'Park Inventory & Equipment');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('section[aria-label="Inventory monitoring"] tbody tr')).length`), 1);
    await clickText('Update stock');
    await until(`!!document.querySelector('#edit_qty')`, 'stock form');
    await fillExpression(`document.querySelector('#edit_qty')`, '6');
    await evaluate(`document.querySelector('#edit_qty').closest('form').requestSubmit()`);
    await until(`!document.querySelector('[role="dialog"]')`, 'stock save');
    assert.ok(await evaluate(`document.querySelector('section[aria-label="Inventory monitoring"] tbody tr').textContent.includes('4 pcs')`));
    await closeToast();

    await navigate('/_smoke/login/2', 'Monitoring center');
    assert.ok(await evaluate(`!document.querySelector('a[href="/sales-reports"]') && !document.querySelector('a[href="/inventory"]')`));
    await navigate('/maintenance', 'Maintenance reports');
    await clickText('Submit report');
    await until(`!!document.querySelector('[role="dialog"] form')`, 'submission dialog');
    await fillExpression(labelInput('Equipment or facility name'), 'Main slide anchor');
    await fillExpression(labelInput('Issue description', 'textarea'), 'Loose fastener needs replacement.', 'textarea');
    await selectExpression(labelInput('Priority', 'select'), 'urgent');
    await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
    await until(`!document.querySelector('[role="dialog"]') && document.querySelector('tbody')?.textContent.includes('Main slide anchor')`, 'report submitted');
    await closeToast();
    await navigate('/_smoke/login/1', 'Monitoring center');
    await navigate('/maintenance', 'Maintenance reports');
    await clickText('Manage');
    await until(`!!document.querySelector('[role="dialog"] form')`, 'assignment dialog');
    await selectExpression(labelInput('Assign staff', 'select'), '3');
    await selectExpression(labelInput('Status', 'select'), 'in_progress');
    await clickText('Save update');
    await until(`!document.querySelector('[role="dialog"]') && document.querySelector('tbody')?.textContent.includes('Worker Tester')`, 'assignment saved');
    await closeToast();
    await navigate('/_smoke/login/3', 'Monitoring center');
    await navigate('/maintenance', 'Maintenance reports');
    await clickText('Manage');
    await until(`!!document.querySelector('[role="dialog"] form')`, 'worker update');
    await selectExpression(labelInput('Status', 'select'), 'resolved');
    await fillExpression(labelInput('Resolution notes (required)', 'textarea'), 'Replaced fastener and inspected anchor.', 'textarea');
    await clickText('Save update');
    await until(`!document.querySelector('[role="dialog"]') && document.querySelector('tbody')?.textContent.includes('Resolved')`, 'worker resolution saved');
    await closeToast();
    await navigate('/_smoke/login/4', 'Monitoring center');
    assert.ok(await evaluate(`!document.body.textContent.includes('Private restaurant stock') && !document.querySelector('a[href="/sales-reports"]') && !document.querySelector('a[href="/maintenance"]')`));
    await navigate('/_smoke/login/1', 'Monitoring center');
    await navigate('/sales-reports', 'Sales reports');
    assert.ok(await evaluate(`!!document.querySelector('input[type="month"]') && !!document.querySelector('a[href^="/sales-reports/export?"]')`));
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await navigate('/maintenance', 'Maintenance reports');
    await clickText('Submit report');
    await until(`!!document.querySelector('[role="dialog"]')`, 'mobile dialog');
    const bounds = await evaluate(`(() => { const r = document.querySelector('[role="dialog"]').getBoundingClientRect(); return { width: r.width, viewport: innerWidth }; })()`);
    assert.ok(bounds.width <= bounds.viewport, 'Maintenance dialog must fit a phone viewport');
    await until(`getComputedStyle(document.querySelector('[role="dialog"]')).opacity === '1'`, 'mobile dialog animation settled');
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(temporary, 'maintenance-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    assert.deepEqual(runtimeErrors, []);
    console.log('Browser checks passed: stock update, scoped navigation/data, staff report submission, admin assignment, worker resolution, sales report controls, mobile dialog, and no JavaScript exceptions.');
    console.log(`Screenshot: ${path.join(temporary, 'maintenance-mobile.png')}`);
} catch (error) {
    console.error(serverOutput.slice(-2500));
    throw error;
} finally {
    if (socket) socket.close();
    if (chrome) chrome.kill();
    if (php) php.kill();
    await delay(400);
    // Keep the screenshot and SQLite fixture for inspection; remove Chrome's temporary profile.
    const profile = path.resolve(temporary, 'chrome');
    if (!profile.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unexpected cleanup path');
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
