const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const directory = path.join(__dirname, '../DecisionTree');

test('static entry loads only existing local assets and no Angular runtime', () => {
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    assert.match(html, /type="module" src="app.js"/);
    assert.doesNotMatch(html, /angular|jquery|ng-app|bootstrap-dialogs/i);
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (!match[1].startsWith('https:')) assert.ok(fs.existsSync(path.join(directory, match[1])), match[1]);
    }
});
test('all committed browser modules parse without a build or installed packages', () => {
    for (const file of ['app.js', 'visuals.js', 'vendor/react/runtime.js']) {
        const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
            input: fs.readFileSync(path.join(directory, file), 'utf8'), encoding: 'utf8'
        });
        assert.equal(result.status, 0, file + ': ' + result.stderr);
    }
});
