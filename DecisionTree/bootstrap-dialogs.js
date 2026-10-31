// Transitional AngularJS adapter. Bootstrap owns dialog visibility and focus;
// Angular owns the form scope. Removed when the UI moves to React.
angular.module('bootstrapDialogs', []).factory('$modal', function ($q, $rootScope, $compile, $controller, $templateCache, $injector) {
    var nextId = 0;
    return { open: function (options) {
        var result = $q.defer(), rendered = $q.defer();
        var scope, element, dialog, settled = false, outcome;
        var opener = document.activeElement;
        var api = {
            result: result.promise,
            rendered: rendered.promise,
            close: function (value) { finish(true, value); },
            dismiss: function (reason) { finish(false, reason); }
        };
        function finish(accepted, value) {
            if (settled) return;
            settled = true; outcome = { accepted: accepted, value: value };
            if (dialog) dialog.hide();
        }
        var resolutions = {};
        Object.keys(options.resolve || {}).forEach(function (key) { resolutions[key] = $injector.invoke(options.resolve[key]); });
        $q.all(resolutions).then(function (locals) {
            scope = $rootScope.$new();
            element = document.createElement('div');
            element.className = 'modal' + (options.animation ? ' fade' : '');
            element.tabIndex = -1;
            element.setAttribute('role', 'dialog');
            var id = 'dialog-title-' + (++nextId);
            element.setAttribute('aria-labelledby', id);
            element.innerHTML = '<div class="modal-dialog modal-dialog-scrollable' + (options.size === 'lg' ? ' modal-lg' : '') + '"><div class="modal-content"></div></div>';
            element.querySelector('.modal-content').innerHTML = $templateCache.get(options.templateUrl);
            var title = element.querySelector('.modal-title');
            if (title) { title.id = id; title.classList.add('fs-5'); }
            var close = document.createElement('button');
            close.type = 'button'; close.className = 'btn-close';
            close.setAttribute('aria-label', 'Close dialog');
            close.addEventListener('click', function () { api.dismiss('close'); });
            element.querySelector('.modal-header').appendChild(close);
            document.body.appendChild(element);
            locals.$scope = scope; locals.$modalInstance = api;
            $controller(options.controller, locals);
            $compile(element)(scope);
            element.addEventListener('shown.bs.modal', function () {
                $rootScope.$evalAsync(function () { rendered.resolve(); });
            }, { once: true });
            element.addEventListener('hide.bs.modal', function () {
                if (!outcome) { settled = true; outcome = { accepted: false, value: 'dismissed' }; }
            });
            element.addEventListener('hidden.bs.modal', function () {
                $rootScope.$evalAsync(function () {
                    dialog.dispose(); element.remove(); scope.$destroy();
                    if (options.animation !== false && opener && opener.isConnected) opener.focus();
                    if (outcome.accepted) result.resolve(outcome.value);
                    else result.reject(outcome.value);
                });
            }, { once: true });
            // Driver.js manages focus during demo dialogs; otherwise Bootstrap
            // traps focus inside the modal for keyboard accessibility.
            dialog = new bootstrap.Modal(element, { focus: options.animation !== false });
            dialog.show();
            if (settled) dialog.hide();
        }).catch(function (error) {
            if (dialog) dialog.dispose();
            if (element) element.remove();
            if (scope) scope.$destroy();
            rendered.reject(error); result.reject(error);
        });
        return api;
    } };
});
