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

Clone or download this repository, then serve the `DecisionTree/` directory with a local static web server and open `index.html` in your browser. There is no build step or application backend. An internet connection is needed to load the JavaScript and CSS dependencies from their CDNs.

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

The application lives in [`DecisionTree/index.html`](DecisionTree/index.html) and uses D3, AngularJS, jQuery, and Bootstrap. It can be hosted by a static web server; the repository also contains Azure Static Web Apps deployment workflows in [`.github/workflows/`](.github/workflows/).

To report an issue, include the steps to reproduce it and, where possible, a small example tree with any sensitive information removed.
