(function ($, UIK) {

    $.extend(UIK.viewmodel, {

    });

    $.extend(UIK.view, {
        $activatedEditorTab: null
    });

    UIK.editor.tab = {};

    $.extend(UIK.editor.tab, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            UIK.view.$activatedEditorTab = UIK.view.$editorContainer.find('ul.nav li.active');
        },


        bindEvents: function () {
            var context = this,
                $tab;

            UIK.view.$editorContainer.find('ul.nav li').off('click').on('click', function (e) {
                $tab = $(this);
                if ($tab.data('id') !== UIK.view.$activatedEditorTab.data('id')) {
                    context.activateTab($tab);
                }
            });
        },

        activateTab: function ($tab) {
            var view = UIK.view;
            view.$activatedEditorTab.removeClass('active');
            view.$activatedEditorTab = $tab.addClass('active');
            view.$editorContainer.attr('class', $tab.data('id'));
        }

    });
})(jQuery, UIK);

