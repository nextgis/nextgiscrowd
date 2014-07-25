(function ($, UIK) {

    $.extend(UIK.view, {
        $permalink: null,
        $fb_link: null
    });

    UIK.permalink = {};
    $.extend(UIK.permalink, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            UIK.view.$permalink = $('#permalink');
            UIK.view.$fb_link = $('#rightPanel a.facebook');
        },


        bindEvents: function () {
            UIK.view.$document.on('/uik/permalink/update', function (event, latlng, zoom) {
                var view = UIK.view,
                    url = document['url_root'] + '?lat=' + latlng.lat + '&lon=' + latlng.lng + '&zoom=' + zoom;
                view.$permalink.prop('href', url);
                view.$fb_link.prop('href', 'https://www.facebook.com/sharer/sharer.php?u=' + url);
            });
        }
    });
})(jQuery, UIK);
