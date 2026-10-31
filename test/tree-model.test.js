const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../DecisionTree/tree-model.js');
const demo = require('../DecisionTree/job-demo.js');
const analysis = require('../DecisionTree/analysis.js');

test('edits produce isolated drafts; cancelling needs no model rollback', () => {
    const original = demo.createTree();
    const edited = model.update(original, '1.1', { name: 'Edited', ExpVal: 0 });
    assert.equal(model.find(original, '1.1').node.name, 'Nearby job');
    assert.equal(model.find(edited, '1.1').node.ExpVal, 0);
});
test('adding a child converts a terminal into a chance node without mutating the original', () => {
    const original = demo.createTree();
    const edited = model.addChild(original, '1.1');
    assert.equal(model.find(original, '1.1').node.Type, 'e');
    assert.equal(model.find(edited, '1.1').node.Type, 'c');
    assert.equal(model.find(edited, '1.1.1').node.ExpVal, null);
    assert.equal(analysis.analyze(edited[0]).valid, false);
});
test('delete removes actual model data and never reuses deleted node identities', () => {
    let tree = model.addChild(model.create(), '1');
    tree = model.addChild(tree, '1');
    tree = model.remove(tree, '1.1');
    tree = model.addChild(tree, '1');
    assert.equal(model.find(tree, '1.1'), null);
    assert.ok(model.find(tree, '1.3'));
    assert.throws(() => model.remove(tree, '1'), /root/);
});
test('deleting the last outcome converts its non-root parent to an incomplete terminal', () => {
    let tree = model.addChild(demo.createTree(), '1.1');
    tree = model.remove(tree, '1.1.1');
    assert.equal(model.find(tree, '1.1').node.Type, 'e');
    assert.equal(model.find(tree, '1.1').node.ExpVal, null);
});
test('legacy JSON round trips preserve distributions and tolerate missing or duplicate IDs', () => {
    const tree = demo.createTree();
    delete tree[0].identifier;
    tree[0].children[0].identifier = tree[0].children[1].identifier;
    const loaded = model.parse(JSON.stringify(tree));
    assert.notEqual(loaded[0].children[0].identifier, loaded[0].children[1].identifier);
    assert.equal(loaded[0].identifier, '1');
    assert.deepEqual(analysis.strategies(loaded[0]).map(p => p.ev), [35000, 38800]);
    assert.deepEqual(model.parse(model.serialize(loaded)), loaded);
});
test('loading malformed files fails before replacing a current tree', () => {
    for (const text of ['bad JSON', 'null', '[]', '[{},{}]', '{"Type":"x"}', '{"Type":"d","children":{}}']) {
        assert.throws(() => model.parse(text), /Could not load/);
    }
});
test('serialization excludes circular layout references and preserves zero and negative values', () => {
    const tree = demo.createTree();
    tree[0].children[0].parent = tree[0];
    tree[0].children[0].ExpVal = 0;
    tree[0].children[1].children[0].children[0].ExpVal = -50;
    const loaded = model.parse(model.serialize(tree));
    assert.equal(loaded[0].children[0].ExpVal, 0);
    assert.equal(model.find(loaded, '1.2.1.1').node.ExpVal, -50);
    assert.equal(loaded[0].children[0].parent, undefined);
});
test('blank numeric inputs stay incomplete rather than silently becoming zero', () => {
    assert.equal(model.number(''), null);
    assert.equal(model.number('nonsense'), null);
    assert.equal(model.number('0'), 0);
    assert.equal(model.number('-25.5'), -25.5);
});
test('normal saving persists compatible JSON and reports storage failure', () => {
    let saved;
    const tree = demo.createTree();
    const json = model.save(tree, { setItem(key, value) { assert.equal(key, 'tree'); saved = value; } }, false);
    assert.equal(json, saved);
    assert.deepEqual(model.parse(saved), model.prepare(tree));
    assert.throws(() => model.save(tree, null, false), /unavailable/);
    assert.throws(() => model.save(tree, { setItem() { throw new Error('Full'); } }, false), /Full/);
});
