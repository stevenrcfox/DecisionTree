const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyze, leaves, strategies, dominates, recommendations } = require('../DecisionTree/analysis.js');
const end = (value, probability) => ({ Type: 'e', name: 'Payoff', ExpVal: value, Probability: probability });
const chance = (...children) => ({ Type: 'c', name: 'Chance', children });
const decision = (...children) => ({ Type: 'd', name: 'Decision', children });

test('validation distinguishes an incomplete model from a genuine zero payoff', () => {
    const root = decision(end(null));
    assert.equal(analyze(root).valid, false);
    root.children[0].ExpVal = 0;
    assert.equal(analyze(root).valid, true);
    assert.equal(strategies(root)[0].ev, 0);
});

test('selects the least loss when all choices are negative', () => {
    assert.equal(analyze(decision(end(-100), end(-20))).value, -20);
});
test('recalculates nested expected values bottom up after edits', () => {
    const branch = chance(end(100, .25), end(-20, .75));
    const root = decision(end(5), branch);
    assert.equal(analyze(root).value, 10);
    branch.children[0].ExpVal = 200;
    assert.equal(analyze(root).value, 35);
});
test('preserves zero probabilities at leaf and intermediate chance edges', () => {
    const nested = chance(end(100, .5), end(200, .5));
    nested.Probability = 0;
    const root = chance(nested, end(10, 1), end(999, 0));
    assert.equal(analyze(root).value, 10);
    assert.deepEqual(leaves(root).map(x => x.finalProbability), [0, 0, 1, 0]);
});
test('only chance edges contribute probabilities; leaf collection does not mutate the tree', () => {
    const root = decision(end(0, 0));
    const before = JSON.stringify(root);
    assert.equal(leaves(root)[0].finalProbability, 1);
    assert.equal(JSON.stringify(root), before);
    assert.equal(analyze(root).value, 0);
});
test('rejects missing, out-of-range and nonfinite probabilities', () => {
    for (const p of [undefined, null, '', -0.1, 1.1, NaN, Infinity]) {
        const root = chance(end(5, p));
        assert.equal(analyze(root).valid, false);
        assert.equal(root.ExpVal, null);
    }
});
test('rejects totals different from one but tolerates floating point rounding', () => {
    assert.equal(analyze(chance(end(1, .2), end(2, .7))).valid, false);
    assert.equal(analyze(chance(end(1, .1), end(2, .2), end(3, .7))).valid, true);
});
test('missing or nonfinite payoffs invalidate ancestors, while zero is valid', () => {
    for (const value of [undefined, null, '', NaN, Infinity]) {
        const root = decision(end(100), end(value));
        assert.equal(analyze(root).valid, false);
        assert.equal(root.ExpVal, null);
    }
    assert.equal(analyze(end(0)).valid, true);
});
test('empty internal nodes, unknown types, and end nodes with children are invalid', () => {
    for (const root of [decision(), chance(), { Type: 'unknown' }, { ...end(1), children: [end(2)] }]) {
        assert.equal(analyze(root).valid, false);
    }
});
test('validation identifies the branch and recovers after correction', () => {
    const root = decision(chance(end(null, 1)));
    assert.match(analyze(root).issues[0], /Decision > Chance > Payoff/);
    root.children[0].children[0].ExpVal = -5;
    assert.equal(analyze(root).value, -5);
    assert.equal(analyze(root).valid, true);
});

test('duplicate names keep strategies separate and renaming does not change their distributions', () => {
    const root = decision(chance(end(100, .5), end(500, .5)), end(250));
    analyze(root);
    const before = strategies(root);
    assert.equal(before.length, 2);
    assert.notEqual(before[0].id, before[1].id);
    root.children.forEach(child => { child.name = 'NewNode'; });
    assert.deepEqual(strategies(root).map(s => s.points), before.map(s => s.points));
});
test('screenshot tree has three strategies with normalized CDFs and only the nested dominant choice marked', () => {
    const better = chance(end(500, .5), end(100, .5));
    const worse = chance(end(500, .5), end(100, .3), end(-200, .2));
    const nested = decision(better, worse);
    nested.Probability = .5;
    const root = decision(chance(end(200, .5), nested), end(250));
    const analysis = analyze(root);
    const curves = strategies(root);
    assert.equal(curves.length, 3);
    assert.deepEqual(curves.map(s => s.ev), [250, 220, 250]);
    for (const curve of curves) {
        assert.equal(curve.points.at(-1).probability, 1);
        assert.ok(curve.points.every(p => p.probability >= 0 && p.probability <= 1));
    }
    const marks = recommendations(root, analysis);
    assert.equal(marks.get(better), 'chosen');
    assert.equal(marks.get(worse), 'dominated');
    assert.equal(marks.has(root.children[0]), false);
    assert.equal(marks.has(root.children[1]), false);
});
test('chance branches combine contingent choices into complete strategies', () => {
    const a = decision(end(0), end(10)); a.Probability = .5;
    const b = decision(end(20), end(30)); b.Probability = .5;
    const root = chance(a, b);
    analyze(root);
    assert.deepEqual(strategies(root).map(s => s.ev), [10, 15, 15, 20]);
});
test('crossing profiles and equal EVs do not produce branch recommendations', () => {
    const risky = chance(end(-100, .5), end(400, .5));
    const safe = end(100);
    const root = decision(risky, safe);
    const analysis = analyze(root);
    const profiles = strategies(root);
    assert.equal(dominates(profiles[0], profiles[1]), false);
    assert.equal(dominates(profiles[1], profiles[0]), false);
    assert.equal(recommendations(root, analysis).size, 0);
    const tied = decision(end(100), end(100));
    assert.equal(recommendations(tied, analyze(tied)).size, 0);
});
test('invalid models have no recommendations; issues remain attached to exact node objects', () => {
    const bad = end(1, -1);
    const root = decision(chance(bad), end(5));
    const analysis = analyze(root);
    assert.ok(analysis.nodeIssues.has(bad));
    assert.ok(analysis.invalid.has(root));
    assert.equal(recommendations(root, analysis).size, 0);
});
test('strategy enumeration limit reports overflow rather than silently omitting curves', () => {
    assert.throws(() => strategies(decision(end(1), end(2), end(3)), 2), /Too many strategies/);
});
test('zero probability subtrees do not create spurious strategies', () => {
    const impossible = decision(end(100), end(200)); impossible.Probability = 0;
    const root = chance(impossible, end(20, 1));
    analyze(root);
    assert.equal(strategies(root).length, 1);
    assert.equal(strategies(root)[0].ev, 20);
});

test('chance-only trees aggregate repeated payoffs into one normalized profile', () => {
    const root = chance(end(-5, .2), end(-5, .3), end(20, .5));
    analyze(root);
    assert.deepEqual(strategies(root)[0].points, [{ value: -5, probability: .5 }, { value: 20, probability: 1 }]);
});
test('later decision trade-offs prevent a premature recommendation', () => {
    const flexible = decision(end(-100), end(300));
    const root = decision(flexible, end(200));
    const marks = recommendations(root, analyze(root));
    assert.equal(marks.has(flexible), false);
    assert.equal(marks.has(root.children[1]), false);
    assert.equal(marks.get(flexible.children[1]), 'chosen');
});
test('the supplied example fixture yields the expected strategy distributions', () => {
    const fs = require('node:fs');
    const root = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, 'fixtures/nested-decisions.tree'), 'utf8'))[0];
    assert.equal(analyze(root).valid, true);
    assert.deepEqual(strategies(root).map(s => s.ev), [250, 220, 250]);
});
