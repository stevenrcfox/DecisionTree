# Calculation, model and application checks

Run `npm test` with Node.js 22 or newer. No packages need to be installed.

The suite also checks the static entry's local assets and parses the committed
browser modules, including React, without executing a build.
The suite covers loss-only decisions, bottom-up recalculation, zero-probability
paths, missing payoffs, invalid probabilities, probability totals, and the
immutable editor drafts, deletion, file compatibility, and storage isolation.
The browser smoke check below covers the UI's risk-profile validation gate.
GitHub Actions runs it on pull requests
and pushes to `master`, without deployment secrets.

For a browser smoke check, serve `DecisionTree/` with a static web server:

1. Start a new tree. The empty root should have a red outline, bold label and a
   warning marker. Hover for its error or click to see details in the editor.
2. Add two end nodes with payoffs -100 and -20. The decision value should be -20.
3. Change a child with two outcomes to Chance. Give its outcomes probabilities
   0.25 and 0.75 and payoffs 100 and -20. Its expected value should be 10.
4. Change the first payoff to 200. That branch should now show 35, as should any
   ancestor for which it is the best choice.
5. Change the probabilities to 0 and 1. Risk Profile should retain the impossible
   outcome at zero probability rather than adding probability mass.
6. Clear a payoff, enter a probability outside 0–1, or make the probabilities sum
   to 0.9. Check that red styling identifies the problem, affected ancestor values
   read Incomplete, and Risk Profile stays closed until the model is corrected.

Probabilities are validated only on edges out of chance nodes. Values on decision
edges do not affect path probabilities. Probability totals allow a 1e-9 rounding
tolerance. Payoffs may be negative or zero but must be finite numbers.

## Strategy profiles and dominance

Load `test/fixtures/nested-decisions.tree` to reproduce the nested decision
example. Risk Profile should show three labelled strategies with EVs 250, 220,
and 250. Every curve ends at cumulative probability 1. The nested choice c2 is
bold and c1 has a red ×; the root alternatives are unmarked. Rename choices to
the same name and confirm the three curves remain separate.

Strategies use structural branch paths as identities; names are display labels.
At chance nodes, strategies combine the contingent choices in each reachable
outcome. Zero-probability subtrees do not add strategies. Payoffs at the same
value are combined, and each curve is normalized to absorb the probability-sum
rounding tolerance accepted by validation.

Recommendations require strictly higher EV and first-order stochastic dominance:
the preferred CDF is never above the other CDF and is below it at some threshold
(probability tolerance 1e-9). For branches containing later decisions, marking is
conservative: every strategy in the preferred branch must dominate every strategy
in every alternative. Crossing curves, EV ties, invalid models, or excessive
strategy counts leave the decision unmarked. Markings do not delete or prune data.

Enumeration is limited to 256 strategies per subtree to bound combinatorial
growth. The chart reports the limit instead of silently dropping strategies;
recommendations for an over-limit decision are omitted.

## Job walkthrough

Choose Demo / walkthrough. Follow the 14 steps, including actual edits and adding
Car with two outcomes. The final three profiles have EVs £35,000 (Nearby), £38,000
(Train), and £39,400 (Car). Train and Car cross, so neither is marked dominant.
Check Back, Skip, Finish, Restart, and window resizing. Popup targets should
follow SVG groups and the node editor without covering its form controls.

Before starting, give your own tree a distinctive unsaved name. Verify Return
to my tree restores it; repeat with a page reload during the tour. Downloading
the example must not overwrite the normal local-storage tree. Test blocked/full
session storage: demo entry should fail before switching trees. New/Load must
remain disabled while demo mode is active.

The tour uses the vendored MIT-licensed Driver.js 1.3.6; no new CDN or build step
is needed. Unit tests cover sample values, crossing distributions, isolated
restarts, reload recovery, and storage failures.
