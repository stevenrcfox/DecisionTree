import { createElement as h, Fragment, useState, useRef, useEffect, useLayoutEffect, createPortal, flushSync, createRoot } from './vendor/react/runtime.js';
import { createTreeRenderer, renderRiskProfile } from './visuals.js';

const Model = window.TreeModel, Analysis = window.DecisionAnalysis, Demo = window.JobDemo;
function storage(name) { try { return window[name]; } catch { return null; } }
const localStore = storage('localStorage'), sessionStore = storage('sessionStorage');
const laidOut = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
function initialState() {
    try {
        const recovered = Demo.recover(sessionStore), saved = recovered ? null : localStore?.getItem('tree');
        return { tree: recovered ? Model.prepare(recovered) : saved ? Model.parse(saved) : Model.create(), demo: false, modal: null, error: '', expanded: false };
    } catch (error) {
        return { tree: Model.create(), demo: false, modal: null, error: error.message + ' Existing saved data has not been overwritten.', expanded: false };
    }
}
function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function field(label, id, control) { return h('div', { className: 'mb-3' }, h('label', { className: 'form-label', htmlFor: id }, label), control); }
function button(label, onClick, style = 'outline-secondary', extra = {}) { return h('button', { type: 'button', className: 'btn btn-' + style, onClick, ...extra }, label); }

function Dialog({ modal, demo, onReady, onShown, onHidden, onClose, children, footer }) {
    const element = useRef(null), callbacks = useRef({ onShown, onHidden });
    callbacks.current = { onShown, onHidden };
    useLayoutEffect(() => {
        const el = element.current, opener = document.activeElement;
        const instance = new window.bootstrap.Modal(el, { focus: !demo });
        const shown = () => callbacks.current.onShown(), hidden = () => callbacks.current.onHidden();
        el.addEventListener('shown.bs.modal', shown); el.addEventListener('hidden.bs.modal', hidden);
        onReady(instance); instance.show();
        return () => {
            el.removeEventListener('shown.bs.modal', shown); el.removeEventListener('hidden.bs.modal', hidden);
            instance.hide(); instance.dispose(); onReady(null);
            if (!demo && opener?.isConnected) opener.focus();
        };
    }, []);
    const titleId = 'modal-title-' + modal.key;
    return createPortal(h('div', { className: 'modal', ref: element, tabIndex: -1, role: 'dialog', 'aria-labelledby': titleId },
        h('div', { className: 'modal-dialog modal-dialog-scrollable' + (modal.kind === 'risk' ? ' modal-lg' : '') },
            h('div', { className: 'modal-content' },
                h('div', { className: 'modal-header' }, h('h2', { className: 'modal-title fs-5', id: titleId }, modal.title),
                    h('button', { type: 'button', className: 'btn-close', 'aria-label': 'Close dialog', onClick: onClose })),
                h('div', { className: 'modal-body', id: modal.kind === 'risk' ? 'riskcontainer' : undefined }, children),
                h('div', { className: 'modal-footer flex-wrap gap-2' }, footer)))), document.body);
}
function RiskChart({ profiles }) {
    const chart = useRef(null);
    useLayoutEffect(() => { renderRiskProfile(chart.current, profiles); return () => chart.current?.replaceChildren(); }, [profiles]);
    return h(Fragment, null,
        h('p', null, 'Each curve represents a complete strategy, including choices at later decisions. Lower cumulative probability at a payoff threshold means less probability of an outcome at or below that value.'),
        h('div', { id: 'risklegend' }), h('div', { ref: chart, className: 'risk-chart' }));
}

export function App() {
    const [state, setState] = useState(initialState);
    const current = useRef(state); current.current = state;
    // Derived calculations never mutate React's stored model or editor draft.
    const view = Model.clone(state.modal?.tree || state.tree), report = Analysis.analyze(view[0]);
    const liveTree = useRef(view); liveTree.current = view;
    const canvas = useRef(null), renderer = useRef(null), modalInstance = useRef(null);
    const modalReady = useRef(null), closing = useRef(null), nextKey = useRef(0);
    const demoSession = useRef(null), tour = useRef({ instance: null, generation: 0, running: false });
    if (!demoSession.current) demoSession.current = Demo.session(sessionStore);
    const actions = useRef({});
    function change(patch) { flushSync(() => setState(value => ({ ...value, ...patch }))); }
    function refreshTour() {
        const instance = tour.current.instance;
        if (!instance?.isActive()) return;
        const target = instance.getActiveElement();
        if (target && !target.isConnected) instance.drive(instance.getActiveIndex()); else instance.refresh();
    }
    useLayoutEffect(() => {
        renderer.current = createTreeRenderer(canvas.current, id => actions.current.edit(id));
        return () => renderer.current.destroy();
    }, []);
    useLayoutEffect(() => {
        renderer.current.render(view, state.demo);
        const frame = requestAnimationFrame(refreshTour);
        return () => cancelAnimationFrame(frame);
    }, [state.tree, state.modal?.tree, state.demo]);
    useEffect(() => () => tour.current.instance?.destroy(), []);

    function open(kind, extra = {}) {
        const title = { node: 'Edit Node', settings: 'Display Settings', load: 'Open File', risk: 'Risk Profile' }[kind];
        const promise = new Promise(resolve => { modalReady.current = resolve; });
        change({ modal: { kind, title, key: ++nextKey.current, ...extra }, error: '' });
        return promise.then(laidOut);
    }
    function edit(id) {
        if (!Model.find(liveTree.current, id)) return Promise.reject(new Error('This node is no longer in the tree.'));
        return open('node', { id, tree: Model.clone(liveTree.current) });
    }
    actions.current.edit = edit;
    function close(accepted = true, replacement = null) {
        if (!current.current.modal || !modalInstance.current) return laidOut();
        const promise = new Promise(resolve => { closing.current = { accepted, replacement, resolve }; });
        modalInstance.current.hide();
        return promise.then(laidOut);
    }
    function hidden() {
        const modal = current.current.modal, outcome = closing.current || { accepted: false };
        closing.current = null;
        const patch = { modal: null };
        if (outcome.accepted && modal?.tree) patch.tree = modal.tree;
        if (outcome.accepted && modal?.loaded) patch.tree = modal.loaded;
        if (outcome.accepted && outcome.replacement) patch.tree = outcome.replacement;
        change(patch); outcome.resolve?.();
    }
    function updateDraft(transform) { const modal = current.current.modal; change({ modal: { ...modal, tree: transform(modal.tree) } }); }
    function risk() {
        if (!Analysis.analyze(liveTree.current[0]).valid) {
            change({ error: 'Correct the red branches before viewing a risk profile.' });
            return Promise.reject(new Error('Correct the red branches before viewing a risk profile.'));
        }
        try { return open('risk', { profiles: Analysis.strategies(liveTree.current[0]) }); }
        catch (error) { return open('risk', { profileError: error.message }); }
    }
    function startDemo() {
        if (!window.driver?.js?.driver) { change({ error: 'The walkthrough could not load. Your tree has not been changed.' }); return; }
        const token = ++tour.current.generation; tour.current.instance?.destroy();
        try { change({ tree: demoSession.current.begin(current.current.tree), demo: true, modal: null, error: '' }); }
        catch (error) { change({ error: 'Could not protect your current tree. ' + error.message }); return; }
        tour.current.running = true;
        const check = () => { if (!current.current.demo || token !== tour.current.generation || !tour.current.running) throw new Error('The walkthrough has ended.'); };
        tour.current.instance = Demo.createTour(window.driver.js.driver, {
            tree: () => liveTree.current,
            edit: id => { check(); return actions.current.edit(id); }, closeEditor: () => close(true),
            restore: json => { check(); change({ tree: Model.parse(json) }); return laidOut(); },
            risk: () => { check(); return risk(); },
            message: message => { const el = document.getElementById('tour-step-error'); if (el) el.textContent = message; },
            stopped: () => { if (token === tour.current.generation) tour.current.running = false; }
        });
        laidOut().then(() => { if (token === tour.current.generation && tour.current.running) tour.current.instance.drive(); });
    }
    async function endDemo() {
        ++tour.current.generation; tour.current.running = false; tour.current.instance?.destroy(); await close(false);
        try { const original = demoSession.current.end(); if (original) change({ tree: Model.prepare(original), demo: false, modal: null, error: '' }); }
        catch (error) { change({ error: error.message }); }
    }
    function save() {
        let json;
        try { json = Model.save(liveTree.current, localStore, current.current.demo); change({ error: '' }); }
        catch (error) { json = Model.serialize(liveTree.current); change({ error: error.message + ' A downloadable copy has been requested.' }); }
        download(current.current.demo ? 'job-and-commute-example.tree' : 'decisiontree.tree', json, 'application/json');
    }
    async function loadFile() {
        const modal = current.current.modal;
        if (!modal.file) { change({ modal: { ...modal, error: 'Select a .tree or JSON file first.' } }); return; }
        try {
            const loaded = Model.parse(await modal.file.text());
            if (current.current.modal?.key !== modal.key) return;
            change({ modal: { ...modal, loaded } }); await close(true);
        } catch (error) {
            if (current.current.modal?.key === modal.key) change({ modal: { ...modal, error: error.message } });
        }
    }
    function exportImage() { download('decisiontree.svg', new XMLSerializer().serializeToString(renderer.current.element()), 'image/svg+xml'); }
    const navItems = [
        ['New', () => { if (!state.demo) change({ tree: Model.create(), error: '' }); }, state.demo],
        ['Load', () => { if (!state.demo) open('load'); }, state.demo], ['Save', save], ['Export Image', exportImage],
        ['Display Settings', () => open('settings', { tree: Model.clone(liveTree.current) })],
        ['Risk Profile', () => { risk().catch(() => {}); }], ['Demo / walkthrough', startDemo]
    ];
    let body, footer;
    const modal = state.modal;
    if (modal?.kind === 'node') {
        const { node, parent } = Model.find(view, modal.id);
        const issues = report.nodeIssues.get(node) || (report.invalid.has(node) ? ['Contains an invalid or incomplete descendant. Follow the red branches to find it.'] : []);
        const set = changes => updateDraft(tree => Model.update(tree, modal.id, changes));
        const hasChildren = !!node.children?.length;
        body = h(Fragment, null,
            issues.length ? h('div', { className: 'alert alert-warning', role: 'alert' }, h('ul', { className: 'mb-0' }, issues.map((issue, i) => h('li', { key: i }, issue)))) : null,
            field('Node Name', 'node-name', h('input', { id: 'node-name', className: 'form-control', value: node.name, onChange: e => set({ name: e.target.value }) })),
            parent ? field('Type', 'node-type', h('select', { id: 'node-type', className: 'form-select', value: node.Type, onChange: e => set({ Type: e.target.value }) },
                (hasChildren ? [['d', 'Decision'], ['c', 'Chance']] : [['e', 'End']]).map(([value, text]) => h('option', { value, key: value }, text)))) : null,
            parent?.Type === 'c' ? field('Probability', 'node-probability', h(Fragment, null,
                h('input', { id: 'node-probability', className: 'form-control', type: 'number', min: 0, max: 1, step: 'any', value: node.Probability ?? '', onChange: e => set({ Probability: Model.number(e.target.value) }) }),
                h('div', { className: 'form-text' }, 'Use 0 to 1. Probabilities under the same chance node must total 1.'))) : null,
            node.Type === 'e' ? field('Value', 'node-value', h('input', { id: 'node-value', className: 'form-control', type: 'number', step: 'any', value: node.ExpVal ?? '', onChange: e => set({ ExpVal: Model.number(e.target.value) }) })) : null);
        footer = h(Fragment, null, h('div', { className: 'me-auto d-flex flex-wrap gap-2' },
            button('Add Child Node', () => updateDraft(tree => Model.addChild(tree, modal.id)), 'primary'),
            button('Delete Node', () => close(true, Model.remove(modal.tree, modal.id)), 'outline-danger', { disabled: !parent })),
            button('OK', () => close(true), 'primary'), button('Cancel', () => close(false)));
    } else if (modal?.kind === 'settings') {
        body = h(Fragment, null,
            field('Line Type', 'line-style', h('select', { id: 'line-style', className: 'form-select', value: view[0].LineStyle, onChange: e => updateDraft(tree => Model.update(tree, tree[0].identifier, { LineStyle: e.target.value })) },
                [['a', 'Angle'], ['s', 'Square'], ['c', 'Curve']].map(([value, text]) => h('option', { value, key: value }, text)))),
            field('Tree layout', 'tree-style', h('select', { id: 'tree-style', className: 'form-select', value: view[0].TreeStyle, onChange: e => updateDraft(tree => Model.update(tree, tree[0].identifier, { TreeStyle: e.target.value })) },
                [['tree', 'Standard'], ['cluster', 'Cluster (end nodes aligned)']].map(([value, text]) => h('option', { value, key: value }, text)))));
        footer = h(Fragment, null, button('OK', () => close(true), 'primary'), button('Cancel', () => close(false)));
    } else if (modal?.kind === 'load') {
        body = h(Fragment, null, modal.error ? h('p', { role: 'alert', className: 'alert alert-warning' }, modal.error) : null,
            field('Select File', 'tree-file', h('input', { id: 'tree-file', type: 'file', className: 'form-control', accept: '.tree,.json,application/json', onChange: e => change({ modal: { ...modal, file: e.target.files[0], error: '' } }) })));
        footer = h(Fragment, null, button('OK', loadFile, 'primary'), button('Cancel', () => close(false)));
    } else if (modal?.kind === 'risk') {
        body = modal.profileError ? h('p', { role: 'alert' }, modal.profileError) : h(RiskChart, { profiles: modal.profiles });
        footer = button('OK', () => close(true), 'primary');
    }
    return h(Fragment, null,
        h('nav', { className: 'navbar navbar-expand-lg bg-body-tertiary border-bottom mb-3', 'aria-label': 'Main navigation' },
            h('div', { className: 'container-fluid' }, h('span', { className: 'navbar-brand' }, 'DecisionTree'),
                h('button', { className: 'navbar-toggler', type: 'button', 'aria-label': 'Toggle navigation', 'aria-expanded': state.expanded, 'aria-controls': 'main-menu', onClick: () => change({ expanded: !state.expanded }) }, h('span', { className: 'navbar-toggler-icon' })),
                h('div', { id: 'main-menu', className: 'collapse navbar-collapse' + (state.expanded ? ' show' : '') },
                    h('ul', { className: 'navbar-nav flex-wrap' }, navItems.map(([label, action, disabled]) => h('li', { className: 'nav-item', key: label },
                        h('button', { type: 'button', className: 'nav-link', disabled: !!disabled, onClick: action, id: label === 'Risk Profile' ? 'risk-profile-menu' : undefined }, label))))))),
        state.error ? h('p', { role: 'alert', className: 'alert alert-warning mx-3' }, state.error) : null,
        state.demo ? h('section', { id: 'demo-controls', 'aria-label': 'Job example controls' }, h('strong', null, 'Job and commute example · annual net income (£)'),
            h('p', null, 'Illustrative figures: take-home income minus commuting costs. Travel time is not priced. Your previous tree is protected; returning or reloading restores it.'),
            h('div', { className: 'd-flex flex-wrap gap-2' }, button('Return to my tree', endDemo, 'primary'), button('Download example', save), button('Restart example and walkthrough', startDemo))) : null,
        h('p', { className: 'text-body-secondary mx-3 small' }, '⚠ Red outlines indicate invalid or incomplete branches; hover or click a node for details. Bold branches have higher EV and a dominant risk profile; × marks dominated alternatives.'),
        h('div', { id: 'container', ref: canvas }),
        modal ? h(Dialog, { key: modal.key, modal, demo: state.demo, onReady: instance => { modalInstance.current = instance; }, onShown: () => { modalReady.current?.(); modalReady.current = null; }, onHidden: hidden, onClose: () => close(false), footer }, body) : null);
}
createRoot(document.getElementById('root')).render(h(App));
