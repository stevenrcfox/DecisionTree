# DecisionTree roadmap

DecisionTree helps people compare choices under uncertainty using net payoffs,
probabilities, expected values, and strategy risk profiles. This roadmap adapts
an earlier feature-planning document to the current application. It is a
prioritised backlog of ideas, not a release schedule or a promise that every
item will be implemented.

## Already available

- Interactive decision, chance, and end nodes, with standard and cluster layouts.
- Expected values calculated from the leaves upward, including negative payoffs.
- Validation of missing payoffs, probability ranges and totals, and incomplete
  branches, with explanations and red highlights on the tree.
- Separate cumulative risk profiles for complete strategies, independent of
  node names, with labels and expected values.
- Conservative branch recommendations requiring higher expected value and
  first-order stochastic dominance.
- Downloadable JSON-based `.tree` files, browser-local saving, and SVG export.
- A guided job-and-commute example with protected demo mode and reload recovery.
- Automated calculation, validation, and walkthrough regression tests.

The demo recovery mechanism protects entry into the example; it is not general
autosave, version history, or cloud synchronisation.

## Near-term priorities

### Sensitivity analysis

- Vary one payoff or probability and show the effect on expected values.
- Identify break-even thresholds where the preferred decision changes.
- Visualise sensitivity ranges and identify the most influential assumptions.
- Define how changing one chance probability adjusts the remaining outcomes so
  totals stay at 1; do not silently assume that outcomes are independent.
- Extend to multiple assumptions and scenarios once the one-variable interaction
  is understood.

### Saving and recovery — design discussion required

- Decide how autosave, explicit Save, downloadable files, and recovery fit together.
- Explore named projects and a list of locally saved trees.
- Show saved/unsaved state and protect against accidental replacement.
- Introduce a versioned file format with validation and migration of older files.
- Explore history, comparison, and restoring earlier versions.
- Preserve portable file downloads regardless of any future account features.

### Undo and redo — design discussion required

- Agree which edits form a single undoable action.
- Cover payoff/probability edits, adding or deleting branches, and structural changes.
- Define the relationship between undo history, autosave, recovery, and New/Load.

### Model clarity

- Add descriptions, assumptions, and decision rationale without cluttering the tree.
- Expand examples and explain MECE outcomes and conditional probabilities.
- State the payoff unit and time horizon so values can be compared consistently.
- Keep terminal payoffs as net outcomes incorporating costs and returns.
  Separate cost/revenue inputs would need an explicit design, not an assumed
  expansion to multiple values per node.
- Improve guidance when valid strategies have crossing risk profiles.

## Further analysis and reporting

- Per-strategy minimum, maximum, probability-weighted mean, standard deviation,
  and outcome percentiles. Do not pool mutually exclusive strategies or use an
  unweighted average of terminal nodes.
- Distinguish outcome ranges/percentiles from confidence intervals, which require
  an explicit statistical estimation model.
- Expected value of perfect information (EVPI), with a clear definition of which
  uncertainty is revealed and which decision can respond to it.
- Risk preferences and utility-based comparisons with explicit assumptions.
- PDF reports containing the tree, inputs, calculations, strategy curves, and rationale.
- Spreadsheet export with formulas and traceable assumptions.
- Additional import/export formats and batch operations where there is a clear use case.

## Navigation and visualisation

- Zoom and pan, collapsible branches, node search/filtering, and keyboard shortcuts.
- Better spacing and readable long labels on different screen sizes.
- Additional compact or radial layouts if they improve practical navigation.
- Optional value/probability/risk colouring and custom icons while preserving
  node-type meaning and accessible error indicators.
- Extend existing tooltips and highlighting rather than treating them as missing features.

## Templates and reuse

- A small library of correctly structured decision scenarios.
- Custom templates, reusable subtrees, and example sharing.
- Comparison of alternative models and recorded assumptions.

## Accounts and collaboration — later design work

- Introduce login when it enables a useful capability, such as cross-device
  projects or deliberate sharing.
- Define storage, ownership, permissions, and recovery before adding cloud sync.
- Explore read-only sharing, comments/discussions, and access controls before
  considering simultaneous multi-user editing.
- Keep a useful local workflow available without an account.

## Possible integrations

The earlier planning document also identified complementary tool categories:
Monte Carlo simulation, statistical analysis, spreadsheets, diagramming,
project/risk management, decision logs, documentation, and shared workspaces.
These are potential import/export or integration directions, not dependencies
or selected vendors. Choose specific integrations only for demonstrated user needs.

## Implementation principles

Preserve calculation correctness and file compatibility as features evolve.
Add meaningful regression tests for numerical and workflow changes. Keep the
public [README](README.md) focused on using the product and document verification
in [TESTING.md](TESTING.md).

An older standalone React/Bootstrap 5 prototype is a source of ideas, not the
current implementation or an agreed framework migration. Prototype behaviours
and reporting calculations need review before reuse.
