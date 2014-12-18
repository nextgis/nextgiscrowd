(function ($, NGC) {

    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $josmLink: null
    });

    NGC.josm = {};
    $.extend(NGC.josm, {

        init: function () {
            this.bindEvents();
            this.setDomOptions();
        },


        setDomOptions: function () {
            NGC.view.$josmLink = $('#josm-link');
        },


        bindEvents: function () {
            $('#json_link').on('mouseover', function() {
                var bounds = NGC.viewmodel.map.getBounds(),
                    link = ('http://127.0.0.1:8111/load_and_zoom?' +
                        'left=' + bounds.getNorthWest().lng +
                        '&top=' + bounds.getNorthWest().lat +
                        '&right=' + bounds.getSouthEast().lng +
                        '&bottom=' + bounds.getSouthEast().lat);
                $(this).attr('href', link);
            });
        }
    });

})(jQuery, NGC);
