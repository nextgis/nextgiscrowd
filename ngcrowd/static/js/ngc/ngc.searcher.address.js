(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $divAddressSearchResults: null
    });

    NGC.searcher.address = {};
    $.extend(NGC.searcher.address, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$divAddressSearchResults = $('#searchAddress').find('div.searchResults div');
        },


        bindEvents: function () {
            var context = this;
            NGC.view.$document.on('/ngc/search/address', function () {
                context.searchAddress();
            });
        },


        searchAddress: function () {
            var context = this,
                $divAddressSearchResults = NGC.view.$divAddressSearchResults,
                matches;

            $divAddressSearchResults.empty();
            NGC.geocoder.directGeocode(NGC.viewmodel.filter.address.json.address, function (data) {
                matches = data.matches;
                $divAddressSearchResults.append(context.getHtmlForSearchResults('', matches));

                $divAddressSearchResults.find('a.target').on('click', function () {
                    var $li = $(this).parent();
                    NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 16);
                    $('#target').show().delay(1000).fadeOut(1000);
                });
            });
        },


        getHtmlForSearchResults: function (cssClass, matches) {
            return NGC.templates.addressSearchTemplate({
                cssClass: cssClass,
                matches: matches
            });
        }
    });
})(jQuery, NGC);

