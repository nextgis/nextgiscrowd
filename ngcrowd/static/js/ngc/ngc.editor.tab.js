(function ($, NGC) {

    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $activatedEditorTab: null
    });

    NGC.editor.tab = {};

    $.extend(NGC.editor.tab, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$activatedEditorTab = NGC.view.$editorContainer.find('ul.nav li.active');
        },


        bindEvents: function () {
            var context = this,
                $tab;

            NGC.view.$editorContainer.find('ul.nav li').off('click').on('click', function (e) {
                $tab = $(this);
                if ($tab.data('id') !== NGC.view.$activatedEditorTab.data('id')) {
                    context.activateTab($tab);
                }
            });
        },

        activateTab: function ($tab) {
            var view = NGC.view;
            view.$activatedEditorTab.removeClass('active');
            view.$activatedEditorTab = $tab.addClass('active');
            view.$editorContainer.attr('class', $tab.data('id'));
        }

    });
})(jQuery, NGC);

