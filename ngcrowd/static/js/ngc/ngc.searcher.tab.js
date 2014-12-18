(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });
    $.extend(NGC.view, {
        $activatedSearchTab: null
    });

    NGC.searcher.tab = {};

    $.extend(NGC.searcher.tab, {


        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$activatedSearchTab = NGC.view.$searchContainer.find('ul.nav li.active');
        },


        bindEvents: function () {
            var context = this,
                $tab;

            NGC.view.$searchContainer.find('ul.nav li').off('click').on('click', function (e) {
                $tab = $(this);
                if ($tab.data('id') !== NGC.view.$activatedSearchTab.data('id')) {
                    context.activateTab($tab);
                }
            });
        },


        activateTab: function ($tab) {
            var view = NGC.view;
            view.$activatedSearchTab.removeClass('active');
            view.$activatedSearchTab = $tab.addClass('active');
            view.$searchContainer.attr('class', $tab.data('id'));
        }

    });
})(jQuery, NGC);

