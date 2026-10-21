# Calculation and validation checks

Run `npm test` with Node.js 22 or newer. No packages need to be installed.
The suite covers loss-only decisions, bottom-up recalculation, zero-probability
paths, missing payoffs, invalid probabilities, probability totals, and the
controller's risk-profile validation gate. GitHub Actions runs it on pull requests
and pushes to `master`, without deployment secrets.

For a browser smoke check, serve `DecisionTree/` with a static web server:

1. Start a new tree. The incomplete-model warning should identify the empty root.
2. Add two end nodes with payoffs -100 and -20. The decision value should be -20.
3. Change a child with two outcomes to Chance. Give its outcomes probabilities
   0.25 and 0.75 and payoffs 100 and -20. Its expected value should be 10.
4. Change the first payoff to 200. That branch should now show 35, as should any
   ancestor for which it is the best choice.
5. Change the probabilities to 0 and 1. Risk Profile should retain the impossible
   outcome at zero probability rather than adding probability mass.
6. Clear a payoff, enter a probability outside 0–1, or make the probabilities sum
   to 0.9. Check that the warning identifies the problem, affected ancestor values
   read Incomplete, and Risk Profile stays closed until the model is corrected.

Probabilities are validated only on edges out of chance nodes. Values on decision
edges do not affect path probabilities. Probability totals allow a 1e-9 rounding
tolerance. Payoffs may be negative or zero but must be finite numbers.
