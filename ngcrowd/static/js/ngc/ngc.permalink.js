(function ($, NGC) {

    $.extend(NGC.view, {
        $permalink: null,
        $fb_link: null
    });

    NGC.permalink = {};
    $.extend(NGC.permalink, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$permalink = $('#permalink');
            NGC.view.$fb_link = $('#rightPanel a.facebook');
        },


        bindEvents: function () {
            NGC.view.$document.on('/ngc/permalink/update', function (event, latlng, zoom) {
                var view = NGC.view,
                    url = document['url_root'] + '?lat=' + latlng.lat + '&lon=' + latlng.lng + '&zoom=' + zoom;
                view.$permalink.prop('href', url);
                view.$fb_link.prop('href', 'https://www.facebook.com/sharer/sharer.php?u=' + url);
            });
        }
    });
})(jQuery, NGC);
