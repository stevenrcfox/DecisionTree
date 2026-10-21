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
        var nodeIssues = new Map();
        var invalid = new Set();
        function visit(node, path) {
            var start = issues.length;
            var children = node.children || [];
            function issue(message, target) {
                target = target || node;
                issues.push(path + ': ' + message);
                if (!nodeIssues.has(target)) nodeIssues.set(target, []);
                nodeIssues.get(target).push(message);
            }
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
                        if (!probability(child.Probability)) issue('Outcome ' + (index + 1) + ' needs a probability between 0 and 1.', child);
                    });
                    var sum = children.reduce(function (total, child) { return total + (number(child.Probability) ? child.Probability : 0); }, 0);
                    if (valid && Math.abs(sum - 1) > tolerance) issue('Outcome probabilities must total 1 (currently ' + Number(sum.toPrecision(12)) + ').');
                }
                node.ExpVal = issues.length !== start ? null : node.Type === 'd'
                    ? Math.max.apply(null, values)
                    : children.reduce(function (sum, child, index) { return sum + values[index] * child.Probability; }, 0);
                if (node.ExpVal !== null && !number(node.ExpVal)) {
                    issue('Calculated value exceeds the supported numeric range.');
                    node.ExpVal = null;
                }
            } else issue('Choose a valid node type.');
            if (issues.length !== start) invalid.add(node);
            return issues.length === start ? node.ExpVal : null;
        }
        var value = visit(root, root.name || 'Root');
        return { issues: issues, value: value, valid: issues.length === 0, nodeIssues: nodeIssues, invalid: invalid };
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
    // A strategy specifies a choice at every reachable decision. Chance nodes
    // combine independent contingent choices with a Cartesian product.
    function strategies(root, limit) {
        limit = limit || 256;
        function bounded(items) {
            if (items.length > limit) throw new Error('Too many strategies to display (limit ' + limit + '). Simplify the tree or inspect a smaller subtree.');
            return items;
        }
        function visit(node, path) {
            if (node.Type === 'e') return [{ id: path, label: '', outcomes: [{ value: node.ExpVal, probability: 1 }] }];
            if (node.Type === 'd') {
                return bounded(node.children.flatMap(function (child, index) {
                    var edge = path + '.' + (index + 1);
                    return visit(child, edge).map(function (strategy) {
                        return { id: edge + ':' + strategy.id, label: (node.name || 'Decision') + ' [' + path + '] → ' + (child.name || 'Choice') + ' [' + edge + ']' + (strategy.label ? '; ' + strategy.label : ''), outcomes: strategy.outcomes };
                    });
                }));
            }
            var combined = [{ id: path, label: '', outcomes: [] }];
            node.children.forEach(function (child, index) {
                if (child.Probability === 0) return;
                var options = visit(child, path + '.' + (index + 1));
                if (combined.length * options.length > limit) bounded(new Array(limit + 1));
                combined = combined.flatMap(function (base) {
                    return options.map(function (option) {
                        return { id: base.id + '|' + option.id, label: [base.label, option.label].filter(Boolean).join('; '), outcomes: base.outcomes.concat(option.outcomes.map(function (outcome) {
                            return { value: outcome.value, probability: outcome.probability * child.Probability };
                        })) };
                    });
                });
            });
            return combined;
        }
        return visit(root, '1').map(function (strategy) {
            var mass = new Map();
            strategy.outcomes.forEach(function (o) { mass.set(o.value, (mass.get(o.value) || 0) + o.probability); });
            var total = strategy.outcomes.reduce(function (sum, o) { return sum + o.probability; }, 0);
            var cumulative = 0;
            strategy.points = Array.from(mass).sort(function (a, b) { return a[0] - b[0]; }).map(function (entry) {
                cumulative += entry[1] / total;
                return { value: entry[0], probability: Math.min(1, cumulative) };
            });
            strategy.ev = strategy.outcomes.reduce(function (sum, o) { return sum + o.value * o.probability / total; }, 0);
            strategy.label = strategy.label || 'Outcomes';
            return strategy;
        });
    }
    function dominates(a, b) {
        var thresholds = Array.from(new Set(a.points.concat(b.points).map(function (p) { return p.value; })));
        var strict = false;
        for (var x of thresholds) {
            var cdf = function (s) { return s.points.reduce(function (v, p) { return p.value <= x ? p.probability : v; }, 0); };
            var difference = cdf(a) - cdf(b);
            if (difference > tolerance) return false;
            if (difference < -tolerance) strict = true;
        }
        return strict;
    }
    function recommendations(root, analysis) {
        var marks = new Map();
        function visit(node) {
            (node.children || []).forEach(visit);
            if (node.Type !== 'd' || analysis.invalid.has(node) || node.children.length < 2) return;
            try {
                var profiles = node.children.map(function (child) { return strategies(child); });
                var winner = node.children.findIndex(function (candidate, i) {
                    return node.children.every(function (other, j) {
                        return i === j || (candidate.ExpVal > other.ExpVal && profiles[i].every(function (a) {
                            return profiles[j].every(function (b) { return dominates(a, b); });
                        }));
                    });
                });
                if (winner >= 0) node.children.forEach(function (child, i) { marks.set(child, i === winner ? 'chosen' : 'dominated'); });
            } catch (error) { /* Enumeration limit: leave branches unmarked. */ }
        }
        visit(root);
        return marks;
    }
    return { analyze: analyze, leaves: leaves, strategies: strategies, dominates: dominates, recommendations: recommendations };
}));
