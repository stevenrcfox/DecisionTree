(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.JobDemo = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    var backupKey = 'decisiontree.demoBackup';
    function createTree() {
        return [{ name: 'Which job?', Type: 'd', identifier: '1', TreeStyle: 'tree', LineStyle: 'a', children: [
            { name: 'Nearby job', Type: 'e', identifier: '1.1', ExpVal: 35000 },
            { name: 'Higher-paying job', Type: 'd', identifier: '1.2', children: [
                { name: 'Train', Type: 'c', identifier: '1.2.1', children: [
                    { name: 'Normal service', Type: 'e', identifier: '1.2.1.1', Probability: .8, ExpVal: 39600 },
                    { name: 'Substantial disruption', Type: 'e', identifier: '1.2.1.2', Probability: .2, ExpVal: 35600 }
                ] }
            ] }
        ] }];
    }
    function serialize(tree) {
        return JSON.stringify(tree, function (key, value) { return key === 'parent' ? undefined : value; });
    }
    function recover(storage) {
        if (!storage) return null;
        try {
            var json = storage.getItem(backupKey);
            if (!json) return null;
            var tree = JSON.parse(json);
            if (!Array.isArray(tree) || !tree[0]) return null;
            storage.removeItem(backupKey);
            return tree;
        } catch (error) { return null; }
    }
    function session(storage) {
        var original;
        return {
            begin: function (tree) {
                if (!original) {
                    if (!storage) throw new Error('The walkthrough needs session storage to protect your current tree. Enable browser storage and try again.');
                    // Write the recovery copy before switching away from the user's work.
                    storage.setItem(backupKey, serialize(tree));
                    original = tree;
                }
                return createTree();
            },
            end: function () {
                if (!original) return null;
                storage.removeItem(backupKey);
                var tree = original;
                original = null;
                return tree;
            }
        };
    }
    function find(tree, id) {
        function visit(node) {
            if (node.identifier === id) return node;
            for (var child of node.children || []) { var match = visit(child); if (match) return match; }
            return null;
        }
        return visit(tree[0]);
    }
    function createTour(driverFactory, host) {
        var tour, pending = false;
        var checkpoints = new Map();
        function go(action) {
            if (pending) return;
            pending = true;
            Promise.resolve().then(function () { if (tour.isActive()) return action(); }).then(function () {
                if (tour.isActive()) tour.moveNext();
            }).catch(function (error) {
                host.message(error.message || 'Please complete this step first.');
            }).finally(function () { pending = false; });
        }
        function node(id) { return function () { return document.querySelector('[data-node-id="' + id + '"]'); }; }
        function step(element, title, description, next) {
            var result = { popover: { title: title, description: description, side: 'right', align: 'center' } };
            if (element) result.element = element;
            if (next) result.popover.onNextClick = function () { go(next); };
            return result;
        }
        function check(condition, message) { if (!condition) throw new Error(message); }
        function edit(id) { return function () { return host.edit(id); }; }
        function apply(checkInput, nextId) {
            return function () {
                checkInput();
                return host.closeEditor().then(function () { if (nextId) return host.edit(nextId); });
            };
        }
        function get(id) { return find(host.tree(), id); }
        var car = '1.2.2';
        var steps = [
            step(null, 'Try a job decision', 'Compare a nearby job with a higher-paying job and a longer commute. All figures are illustrative annual take-home income minus commuting costs, in £. Travel time is not priced. Your current tree is protected; Return to my tree restores it. Back revisits an earlier example state; Skip leaves the example open.'),
            step(node('1'), 'Decisions are yours to make', 'Red squares represent choices you control. Nearby job pays £36,000 after tax with £1,000 travel costs: net £35,000. The higher-paying job pays £42,000 before commuting costs.'),
            step(node('1.2.1'), 'Chance means uncertainty', 'Train has two MECE outcomes: normal service (80%) or substantial disruption (20%). Annual commuting costs are £2,400 or £6,400, giving net payoffs £39,600 or £35,600. These are complete annual scenarios, not individual journeys. Next opens the disruption outcome.', edit('1.2.1.2')),
            step('.modal-content', 'Try changing a probability', 'Change Probability from 0.2 to <strong>0.4</strong>. Leave the payoff at £35,600. Next applies the edit. You can also click OK before Next.', apply(function () {
                check(get('1.2.1.2').Probability === .4, 'Enter 0.4 in Probability, then choose Next.');
            })),
            step(node('1.2.1'), 'Notice the red branch', 'The train outcomes now total 1.2. An outcome distribution must cover all possibilities exactly once: mutually exclusive, collectively exhaustive. Red outlines flag the problem and affected ancestors. Next opens Normal service.', edit('1.2.1.1')),
            step('.modal-content', 'Make the outcomes add to one', 'Change Probability to <strong>0.6</strong>. With disruption at 0.4, the probabilities total 1. Next applies the edit; Train will have expected net income £38,000.', apply(function () {
                check(get('1.2.1.1').Probability === .6 && get('1.2.1.2').Probability === .4, 'Use 0.6 for normal service and 0.4 for disruption.');
            })),
            step(node('1.2'), 'Add a commuting choice', 'Train or Car is a decision, not a random event. Next opens the higher-paying job so you can add Car as a sibling of Train.', edit('1.2')),
            step('.modal-content', 'Add one child', 'Click <strong>Add Child Node</strong> once. This creates a second commuting choice. Next applies the change and opens the new node.', apply(function () {
                check(get('1.2').children.length === 2, 'Add exactly one child next to Train, then choose Next.');
            }, car)),
            step('.modal-content', 'Give Car two uncertain outcomes', 'Set Node Name to <strong>Car</strong>, then click <strong>Add Child Node</strong> twice. Adding outcomes turns this end node into a chance node. Next opens the first outcome.', apply(function () {
                check(get(car).name.trim().toLowerCase() === 'car' && (get(car).children || []).length === 2, 'Name this node Car and add two child outcomes.');
                check(get(car).Type === 'c', 'Car should be a Chance node.');
            }, car + '.1')),
            step('.modal-content', 'Typical car costs', 'Name this outcome <strong>Typical costs</strong>, enter Probability <strong>0.9</strong>, and Value <strong>40000</strong> (£42,000 minus £2,000 annual costs). Next opens the other outcome.', apply(function () {
                var n = get(car + '.1');
                check(n.name.trim().toLowerCase() === 'typical costs' && n.Probability === .9 && n.ExpVal === 40000, 'Use Typical costs, probability 0.9, and value 40000.');
            }, car + '.2')),
            step('.modal-content', 'Major repairs', 'Name this outcome <strong>Major repairs</strong>, enter Probability <strong>0.1</strong>, and Value <strong>34000</strong> (£42,000 minus £8,000 total annual costs, including repairs). Typical costs means a year without major repairs; these outcomes are MECE.', apply(function () {
                var n = get(car + '.2');
                check(n.name.trim().toLowerCase() === 'major repairs' && n.Probability === .1 && n.ExpVal === 34000, 'Use Major repairs, probability 0.1, and value 34000.');
            })),
            step(node('1.2'), 'Expected value is not the whole story', 'Car now has EV £39,400 versus Train £38,000. But its worst outcome is lower. Their risk profiles cross, so neither branch gets a dominance mark. Next opens all three strategy curves.', function () { return host.risk(); }),
            step('#riskcontainer', 'Compare the distributions', 'Each coloured curve is one strategy: Nearby job, Higher-paying job with Train, or Higher-paying job with Car. Lower CDF means less chance of a payoff at or below that threshold. The crossing curves expose the trade-off that EV alone hides.', function () { return host.closeEditor(); }),
            step('#demo-controls', 'Keep exploring', 'You have built a decision, modelled uncertainty, fixed probabilities, and compared risk. Download example saves a .tree file without overwriting your own saved tree. Finish or Skip leaves this example open; Return to my tree restores your work.')
        ];
        tour = driverFactory({
            steps: steps, animate: false, showProgress: true, allowClose: true,
            overlayClickBehavior: function () {}, allowKeyboardControl: false,
            nextBtnText: 'Next', prevBtnText: 'Back', doneBtnText: 'Finish',
            popoverClass: 'job-tour', stagePadding: 8,
            onHighlighted: function () { checkpoints.set(tour.getActiveIndex(), serialize(host.tree())); },
            onPopoverRender: function (popover) {
                var skip = document.createElement('button');
                skip.type = 'button'; skip.textContent = 'Skip walkthrough';
                skip.addEventListener('click', function () { tour.destroy(); });
                popover.footerButtons.prepend(skip);
                var error = document.createElement('p');
                error.id = 'tour-step-error'; error.setAttribute('role', 'alert');
                popover.description.appendChild(error);
            },
            onPrevClick: function () {
                // Editing steps depend on their predecessor opening the editor.
                // Close it first, and reopen as needed when moving forward again.
                if (pending) return;
                host.closeEditor().then(function () {
                    var index = tour.getActiveIndex();
                    var previous = index - 1;
                    while (previous > 0 && steps[previous].element === '.modal-content') previous--;
                    previous = Math.max(0, previous);
                    return host.restore(checkpoints.get(previous)).then(function () { if (tour.isActive()) tour.drive(previous); });
                });
            },
            onDestroyed: function () { host.stopped(); }
        });
        return tour;
    }
    return { createTree: createTree, serialize: serialize, recover: recover, session: session, find: find, createTour: createTour };
}));
