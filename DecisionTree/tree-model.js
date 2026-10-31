(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TreeModel = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    function serialize(tree) {
        return JSON.stringify(tree, function (key, value) {
            return ['parent', 'depth', 'x', 'y'].includes(key) ? undefined : value;
        });
    }
    function clone(tree) { return JSON.parse(serialize(tree)); }
    function create() {
        return [{ name: 'Top Level', Type: 'd', identifier: '1', TreeStyle: 'tree', LineStyle: 'a', ExpVal: null, children: [] }];
    }
    function prepare(input) {
        var tree = clone(Array.isArray(input) ? input : [input]);
        if (tree.length !== 1 || !tree[0]) throw new Error('Choose a file containing one decision tree.');
        var ids = new Set();
        function visit(node, path, depth) {
            if (depth > 150) throw new Error('This tree is too deeply nested to display.');
            if (!node || typeof node !== 'object' || !['d', 'c', 'e'].includes(node.Type)) throw new Error('Each node must have a Decision, Chance, or End type.');
            if (node.children !== undefined && !Array.isArray(node.children)) throw new Error('Node children must be a list.');
            if (typeof node.name !== 'string') node.name = 'Unnamed node';
            var id = typeof node.identifier === 'string' && node.identifier ? node.identifier : path;
            while (ids.has(id)) id += '-copy';
            ids.add(id); node.identifier = id;
            (node.children || []).forEach(function (child, i) { visit(child, path + '.' + (i + 1), depth + 1); });
        }
        visit(tree[0], '1', 0);
        tree[0].TreeStyle = tree[0].TreeStyle === 'cluster' ? 'cluster' : 'tree';
        tree[0].LineStyle = ['a', 's', 'c'].includes(tree[0].LineStyle) ? tree[0].LineStyle : 'a';
        return tree;
    }
    function parse(text) {
        try { return prepare(JSON.parse(text)); }
        catch (error) { throw new Error('Could not load the tree. ' + error.message); }
    }
    function find(tree, id) {
        function visit(node, parent) {
            if (node.identifier === id) return { node: node, parent: parent };
            for (var child of node.children || []) { var match = visit(child, node); if (match) return match; }
            return null;
        }
        return visit(tree[0], null);
    }
    function update(tree, id, changes) {
        var result = clone(tree), match = find(result, id);
        if (!match) throw new Error('This node is no longer in the tree.');
        Object.assign(match.node, changes);
        return result;
    }
    function addChild(tree, id) {
        var result = clone(tree), match = find(result, id);
        if (!match) throw new Error('This node is no longer in the tree.');
        var parent = match.node;
        parent.children = parent.children || [];
        if (parent.Type === 'e') parent.Type = 'c';
        var count = parent.nextChildId || parent.children.length + 1;
        while (find(result, parent.identifier + '.' + count)) count++;
        parent.children.push({ name: 'NewNode', Type: 'e', identifier: parent.identifier + '.' + count, Probability: null, ExpVal: null });
        parent.nextChildId = count + 1;
        return result;
    }
    function remove(tree, id) {
        var result = clone(tree), match = find(result, id);
        if (!match || !match.parent) throw new Error('The root cannot be deleted.');
        match.parent.children = match.parent.children.filter(function (node) { return node.identifier !== id; });
        if (!match.parent.children.length && match.parent !== result[0]) { match.parent.Type = 'e'; match.parent.ExpVal = null; }
        return result;
    }
    function number(text) { return text === '' || !Number.isFinite(Number(text)) ? null : Number(text); }
    function save(tree, storage, demo) {
        var json = serialize(tree);
        if (!demo) {
            if (!storage) throw new Error('Browser storage is unavailable. Download a copy of your tree.');
            storage.setItem('tree', json);
        }
        return json;
    }
    return { serialize: serialize, clone: clone, create: create, prepare: prepare, parse: parse, find: find, update: update, addChild: addChild, remove: remove, number: number, save: save };
}));
