(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        version: null
    });
    $.extend(NGC.view, {
        $document: null
    });

    NGC.loader = {};
    $.extend(NGC.loader, {
        templates: ['entityPopupTemplate', 'entityPopupInfoTemplate', 'searchResultsTemplate', 'userLogsTemplate', 'alertsTemplate'],

        init: function () {
            var context = this;

            this.setDomOptions();

            window.setTimeout(function () {
                context.initModules();
                $('img').imagesLoaded(function () {
                    NGC.view.$body.removeClass('loading');
                });
                NGC.alerts.showAlert('historyShortcuts');
            }, 1000);
        },

        initModules: function () {
//            try {
                NGC.common.init();
                NGC.popup.init();
                NGC.alerts.init();
                NGC.permalink.init();
                NGC.map.init();
                NGC.geocoder.init();
                NGC.searcher.init();
                NGC.searcher.address.init();
                NGC.searcher.tab.init();
                NGC.editor.init();
                NGC.user.init();
                NGC.entities.init();
//                NGC.regions.init();
                NGC.josm.init();
                NGC.editor.tab.init();
                NGC.versions.init();
//            } catch (e) {
//                alert(e);
//            }
        },

        setDomOptions: function () {
            NGC.view.$document = $(document);
        }
    });

    $(document).ready(function () {
        NGC.loader.init();
    });

})(jQuery, NGC);
