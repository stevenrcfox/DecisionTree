# DecisionTree

A browser-based tool for exploring decisions under uncertainty. Build a tree of choices, uncertain outcomes, probabilities, and payoffs to compare options using expected values and risk profiles.

## What you can do

- Create and edit decision, chance, and end nodes in an interactive diagram.
- Enter outcome probabilities and payoff values.
- Inspect expected values and view cumulative risk profiles for alternative choices.
- Save and load trees as `.tree` files containing JSON.
- Export the tree as an SVG image.
- Adjust the tree layout and connecting lines.

## Getting started

Clone or download this repository, then serve the `DecisionTree/` directory with a local static web server and open `index.html` in your browser. There is no build step or application backend. React, Bootstrap and the walkthrough are bundled locally; an internet connection is needed for D3's pinned CDN script. Opening the HTML directly as a `file://` URL is not supported because the app uses JavaScript modules.

1. Choose **New** to start a tree.
2. Click a node to edit its name, add child nodes, and configure the available node fields.
3. Use decision nodes for choices, chance nodes for uncertain outcomes, and end nodes for payoffs. Enter probabilities as fractions between 0 and 1; outcomes under each chance node should total 1.
4. Open **Risk Profile** to explore the distribution of outcomes across choices.
5. Choose **Save** to download your tree, **Load** to reopen one, or **Export Image** to download an SVG.

## Guided example

Choose **Demo / walkthrough** to load a job-and-commute example and start an
optional guided tour. Compare annual take-home income minus travel costs, edit
probabilities, resolve a validation error, and add a Car alternative with two
outcomes before comparing risk profiles. All figures are illustrative; travel
time is not priced.

**Skip walkthrough** leaves the example open for exploration. **Back** revisits
an earlier example state. **Return to my tree** restores your previous work,
including unsaved edits; reloading during the demo also restores it using a
temporary copy in session storage. **Download example** saves a `.tree` file
without replacing your normal saved tree. New and Load are unavailable until
you return. Restart resets only the example.

## Saving your work

**Save** downloads a `.tree` file and also stores the tree in the browser's local storage. The app attempts to restore that saved tree when reopened in the same browser and site. Keep downloaded copies of work you want to retain: browser storage can be cleared and does not sync across devices.

## Development

The application uses React/React DOM 19.3.1, Bootstrap 5.3.8 and D3 7.9.0. React owns application state, forms and dialogs; D3 owns only the SVG contents of its containers. AngularJS, jQuery and the transitional dialog adapter are no longer used.

- [`app.js`](DecisionTree/app.js): React UI and walkthrough integration.
- [`tree-model.js`](DecisionTree/tree-model.js): immutable editing, file loading and saving.
- [`visuals.js`](DecisionTree/visuals.js): D3 tree and risk-profile rendering.
- [`analysis.js`](DecisionTree/analysis.js): shared calculation and validation logic.

Run `npm test` with Node.js 22 or newer; tests need no package installation. To refresh the committed React runtime only, run `npm ci` then `npm run vendor:react`. This optional maintainer task is not required to edit application code, serve the site, or deploy. No JSX compiler or framework CLI is used. Azure still deploys the static `DecisionTree/` directory without an application build.

Node and settings dialogs use drafts: OK applies changes; Cancel, Escape and the close button discard them. Existing JSON `.tree` files and the browser's saved-tree key remain compatible.

To report an issue, include the steps to reproduce it and, where possible, a small example tree with any sensitive information removed.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned improvements, ideas under consideration,
and the design questions around saving, undo/redo, and future collaboration.
