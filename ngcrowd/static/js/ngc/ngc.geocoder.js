(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });
    $.extend(NGC.view, {

    });
    NGC.geocoder = {};
    $.extend(NGC.geocoder, {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {

        },

        directGeocode: function (geocodingSearch, callback) {
            var url = 'http://openstreetmap.ru/api/search?callback=?&q=' + geocodingSearch;
            $.ajax({
                type: 'GET',
                url: url,
                async: false,
                jsonpCallback: 'jsonCallback',
                contentType: "application/json",
                dataType: 'jsonp',
                success: function (result) {
                    callback(result);
                }
            });
        }
    });
})(jQuery, NGC);

