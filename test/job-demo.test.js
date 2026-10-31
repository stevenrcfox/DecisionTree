const { test } = require('node:test');
const assert = require('node:assert/strict');
const demo = require('../DecisionTree/job-demo.js');
const analysis = require('../DecisionTree/analysis.js');
function memory() {
    const values = new Map();
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
test('the initial job example is valid, fresh, and has two meaningful strategies', () => {
    const tree = demo.createTree();
    assert.equal(analysis.analyze(tree[0]).valid, true);
    assert.deepEqual(analysis.strategies(tree[0]).map(s => s.ev), [35000, 38800]);
    demo.find(tree, '1.1').name = 'Changed';
    assert.equal(demo.find(demo.createTree(), '1.1').name, 'Nearby job');
});
test('demo edits and restarts cannot change the original tree or its saved storage key', () => {
    const storage = memory(); storage.setItem('tree', 'existing saved data');
    const session = demo.session(storage);
    const original = demo.createTree(); original[0].name = 'Unsaved user work';
    const sample = session.begin(original);
    sample[0].name = 'Demo edits';
    session.begin(sample);
    assert.equal(session.end(), original);
    assert.equal(original[0].name, 'Unsaved user work');
    assert.equal(storage.getItem('tree'), 'existing saved data');
    assert.equal(demo.recover(storage), null);
});
test('reload recovers unsaved original work including circular parent pointers', () => {
    const storage = memory();
    const original = demo.createTree();
    original[0].children[0].parent = original[0];
    demo.session(storage).begin(original);
    const recovered = demo.recover(storage);
    assert.equal(recovered[0].name, 'Which job?');
    assert.equal(recovered[0].children[0].name, 'Nearby job');
    assert.equal(demo.recover(storage), null);
});
test('storage failure prevents demo entry and leaves the original untouched', () => {
    const original = demo.createTree();
    const storage = { setItem() { throw new Error('Storage full'); } };
    assert.throws(() => demo.session(storage).begin(original), /Storage full/);
    assert.equal(original[0].name, 'Which job?');
    assert.throws(() => demo.session(null).begin(original), /protect/);
    assert.equal(demo.recover(null), null);
});
test('the guided probability correction and car exercise yield crossing profiles', () => {
    const tree = demo.createTree();
    demo.find(tree, '1.2.1.2').Probability = .4;
    assert.equal(analysis.analyze(tree[0]).valid, false);
    demo.find(tree, '1.2.1.1').Probability = .6;
    demo.find(tree, '1.2').children.push({ name: 'Car', Type: 'c', identifier: '1.2.2', children: [
        { name: 'Typical costs', Type: 'e', Probability: .9, ExpVal: 40000 },
        { name: 'Major repairs', Type: 'e', Probability: .1, ExpVal: 34000 }
    ] });
    assert.equal(analysis.analyze(tree[0]).valid, true);
    const profiles = analysis.strategies(tree[0]);
    assert.deepEqual(profiles.map(s => s.ev), [35000, 38000, 39400]);
    assert.equal(analysis.dominates(profiles[1], profiles[2]), false);
    assert.equal(analysis.dominates(profiles[2], profiles[1]), false);
    assert.equal(analysis.recommendations(tree[0], analysis.analyze(tree[0])).size, 0);
});
test('bundled walkthrough scripts parse and vendor license is included', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const vm = require('node:vm');
    new vm.Script(fs.readFileSync(path.join(__dirname, '../DecisionTree/job-demo.js'), 'utf8'));
    assert.match(fs.readFileSync(path.join(__dirname, '../DecisionTree/vendor/driver/license'), 'utf8'), /MIT/);
});

test('Back restores the earlier example checkpoint rather than replaying instructions over later edits', async () => {
    let config, activeIndex = 0, tree = demo.createTree();
    const host = {
        tree: () => tree,
        closeEditor: async () => {},
        restore: async json => { tree = JSON.parse(json); }
    };
    const tour = demo.createTour(options => {
        config = options;
        return { isActive: () => true, getActiveIndex: () => activeIndex, drive: index => { activeIndex = index; } };
    }, host);
    activeIndex = 4;
    demo.find(tree, '1.2.1.2').Probability = .4;
    config.onHighlighted();
    demo.find(tree, '1.2.1.1').Probability = .6;
    activeIndex = 6;
    config.onPrevClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(activeIndex, 4);
    assert.equal(demo.find(tree, '1.2.1.1').Probability, .8);
    assert.equal(analysis.analyze(tree[0]).valid, false);
    assert.ok(tour);
});

test('download in demo mode never writes the normal local storage tree', () => {
    const model = require('../DecisionTree/tree-model.js');
    const storage = memory(); storage.setItem('tree', 'original');
    assert.deepEqual(JSON.parse(model.save(demo.createTree(), storage, true)), demo.createTree());
    assert.equal(storage.getItem('tree'), 'original');
});
