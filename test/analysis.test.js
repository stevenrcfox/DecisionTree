const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyze, leaves } = require('../DecisionTree/analysis.js');
const end = (value, probability) => ({ Type: 'e', name: 'Payoff', ExpVal: value, Probability: probability });
const chance = (...children) => ({ Type: 'c', name: 'Chance', children });
const decision = (...children) => ({ Type: 'd', name: 'Decision', children });

test('browser scripts parse and the controller blocks invalid risk profiles', () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const html = fs.readFileSync(require('node:path').join(__dirname, '../DecisionTree/index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
        .filter(match => !/text\/ng-template|\bsrc=/.test(match[1]));
    assert.equal(scripts.length, 1);
    new vm.Script(scripts[0][2]);
    assert.match(html, /src="analysis.js"/);
    assert.match(html, /ng-repeat="issue in vm.validationIssues/);
    const source = scripts[0][2];
    const context = { DecisionAnalysis: { analyze, leaves }, treeData: [decision(end(null))] };
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('var ctrl ='), source.indexOf('var ModalInstanceCtrl =')), context);
    let opened = 0;
    let watch, listener;
    const controller = new context.ctrl({ $watch: (fn, cb) => { watch = fn; listener = cb; } }, {
        open: () => { opened++; return { rendered: { then() {} } }; }
    });
    listener(watch());
    assert.equal(controller.validationIssues.length, 1);
    controller.RiskProfile();
    assert.equal(opened, 0);
    context.treeData[0].children[0].ExpVal = 0;
    listener(watch());
    assert.equal(controller.validationIssues.length, 0);
    controller.RiskProfile();
    assert.equal(opened, 1);
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
