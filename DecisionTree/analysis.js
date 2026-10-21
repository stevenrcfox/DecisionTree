(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DecisionAnalysis = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    var tolerance = 1e-9;
    function number(value) { return typeof value === 'number' && Number.isFinite(value); }
    function probability(value) { return number(value) && value >= 0 && value <= 1; }

    // Visit children first so ancestors never use values from a previous render.
    function analyze(root) {
        var issues = [];
        function visit(node, path) {
            var start = issues.length;
            var children = node.children || [];
            function issue(message) { issues.push(path + ': ' + message); }
            var values = children.map(function (child, index) {
                return visit(child, path + ' > ' + (child.name || 'Node ' + (index + 1)));
            });
            if (node.Type === 'e') {
                if (children.length) issue('End nodes cannot have children.');
                if (!number(node.ExpVal)) issue('Enter a finite payoff value (zero is valid).');
            } else if (node.Type === 'c' || node.Type === 'd') {
                if (!children.length) issue('Add at least one outcome or choice.');
                if (node.Type === 'c' && children.length) {
                    var valid = children.every(function (child) { return probability(child.Probability); });
                    children.forEach(function (child, index) {
                        if (!probability(child.Probability)) issue('Outcome ' + (index + 1) + ' needs a probability between 0 and 1.');
                    });
                    var sum = children.reduce(function (total, child) { return total + (number(child.Probability) ? child.Probability : 0); }, 0);
                    if (valid && Math.abs(sum - 1) > tolerance) issue('Outcome probabilities must total 1 (currently ' + sum + ').');
                }
                node.ExpVal = issues.length !== start ? null : node.Type === 'd'
                    ? Math.max.apply(null, values)
                    : children.reduce(function (sum, child, index) { return sum + values[index] * child.Probability; }, 0);
                if (node.ExpVal !== null && !number(node.ExpVal)) {
                    issue('Calculated value exceeds the supported numeric range.');
                    node.ExpVal = null;
                }
            } else issue('Choose a valid node type.');
            return issues.length === start ? node.ExpVal : null;
        }
        var value = visit(root, root.name || 'Root');
        return { issues: issues, value: value, valid: issues.length === 0 };
    }

    function leaves(root) {
        var result = [];
        function visit(node, chance, choices) {
            if (node.Type === 'e') {
                result.push(Object.assign({}, node, { finalProbability: chance, choices: choices.join(' & ') || node.name, choicelist: choices.slice() }));
                return;
            }
            (node.children || []).forEach(function (child) {
                visit(child, chance * (node.Type === 'c' ? child.Probability : 1), node.Type === 'd' ? choices.concat(child.name) : choices);
            });
        }
        visit(root, 1, []);
        return result;
    }
    return { analyze: analyze, leaves: leaves };
}));
