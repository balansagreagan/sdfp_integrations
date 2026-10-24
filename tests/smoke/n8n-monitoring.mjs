import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const directory = new URL('../../SDFP-n8n-workflows/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const errors = read('SDFP-Website-Error-Monitoring.json');
const uptime = read('SDFP-Website-Uptime-Monitor.json');
const node = (workflow, name) => workflow.nodes.find(item => item.name === name);
const evaluate = (expression, $json) => Function('$json', '$now', `return (${expression.slice(3, -2).trim()});`)($json, '2026-10-18T12:00:00Z');
const condition = (workflow, name, data) => evaluate(node(workflow, name).parameters.conditions.conditions[0].leftValue, data);
const body = { source: 'sdfp-website', severity: 'high', error_type: 'RuntimeException', occurred_at: '2026-10-18T12:00:00Z' };

for (const severity of ['low', 'medium', 'high', 'critical', 'HIGH']) {
    const data = { body: { ...body, severity } };
    assert.equal(condition(errors, 'Validate Error Report', data), true);
    assert.equal(condition(errors, 'Serious Error?', data), ['high', 'critical'].includes(severity.toLowerCase()));
}
for (const field of Object.keys(body)) {
    const incomplete = { ...body };
    delete incomplete[field];
    assert.equal(condition(errors, 'Validate Error Report', { body: incomplete }), false);
}
for (const patch of [{ source: {} }, { source: ' ' }, { severity: 'urgent' }, { occurred_at: 'yesterday' }, { error_type: ['error'] }]) {
    assert.equal(condition(errors, 'Validate Error Report', { body: { ...body, ...patch } }), false);
}
assert.equal(condition(errors, 'Validate Error Report', {}), false);
const text = evaluate(node(errors, 'Telegram Alert').parameters.text, { body: { ...body, error_type: '<error>&' } });
assert.ok(text.includes('\nType: &lt;error&gt;&amp;\n'));
assert.ok(!text.includes('\\n'));

assert.equal(condition(uptime, 'Healthy?', { statusCode: 200, body: { status: 'ok' } }), true);
for (const response of [{ error: 'connection refused' }, {}, { statusCode: 500, body: { status: 'ok' } }, { statusCode: 200, body: { status: 'down' } }, { statusCode: 200, body: '<html>' }]) {
    assert.equal(condition(uptime, 'Healthy?', response), false);
}
assert.equal(node(uptime, 'Check Laravel Health').onError, 'continueRegularOutput');
assert.equal(uptime.connections['Check Laravel Health'].main[0][0].node, 'Healthy?');
assert.equal(uptime.connections['Healthy?'].main[1][0].node, 'Telegram Uptime Alert');
assert.equal(node(uptime, 'Every 5 Minutes').parameters.rule.interval[0].minutesInterval, 5);
assert.equal(node(errors, 'Webhook').parameters.authentication, 'headerAuth');
for (const workflow of [errors, uptime]) {
    assert.equal(workflow.active, false);
    for (const outputs of Object.values(workflow.connections)) {
        for (const output of outputs.main) {
            for (const connection of output) assert.ok(node(workflow, connection.node));
        }
    }
}
console.log('n8n monitoring passed: validation, high/critical routing, message formatting, health and connection-failure routing.');
