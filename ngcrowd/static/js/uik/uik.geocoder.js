(function ($, UIK) {
    $.extend(UIK.viewmodel, {

    });
    $.extend(UIK.view, {

    });
    UIK.geocoder = {};
    $.extend(UIK.geocoder, {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {

        },

        directGeocode: function (geocodingSearch, callback) {
            var url = 'http://beta.openstreetmap.ru/api/search?callback=?&q=' + geocodingSearch;
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
})(jQuery, UIK);

