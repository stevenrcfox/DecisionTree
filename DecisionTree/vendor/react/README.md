# React browser runtime

React and React DOM 19.3.1, bundled with their pinned scheduler dependency into
`runtime.js`. MIT licenses and extracted license comments are included.

The app imports this committed module directly. Serving or editing it requires
no npm installation, JSX compiler, framework CLI, or build step.

Optional regeneration for maintainers: `npm ci`, then `node scripts/vendor-react.mjs`.
Exact source package versions and integrity hashes are recorded in package-lock.json.
