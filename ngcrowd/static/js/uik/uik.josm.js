(function ($, UIK) {

    $.extend(UIK.viewmodel, {

    });

    $.extend(UIK.view, {
        $josmLink: null
    });

    UIK.josm = {};
    $.extend(UIK.josm, {

        init: function () {
            this.bindEvents();
            this.setDomOptions();
        },


        setDomOptions: function () {
            UIK.view.$josmLink = $('#josm-link');
        },


        bindEvents: function () {
            $('#json_link').on('mouseover', function() {
                var bounds = UIK.viewmodel.map.getBounds(),
                    link = ('http://127.0.0.1:8111/load_and_zoom?' +
                        'left=' + bounds.getNorthWest().lng +
                        '&top=' + bounds.getNorthWest().lat +
                        '&right=' + bounds.getSouthEast().lng +
                        '&bottom=' + bounds.getSouthEast().lat);
                $(this).attr('href', link);
            });
        }
    });

})(jQuery, UIK);
