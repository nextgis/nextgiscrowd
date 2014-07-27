(function ($, UIK) {
    $.extend(UIK.viewmodel, {

    });

    $.extend(UIK.view, {
        $divAddressSearchResults: null
    });

    UIK.searcher.address = {};
    $.extend(UIK.searcher.address, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            UIK.view.$divAddressSearchResults = $('#searchAddress').find('div.searchResults div');
        },


        bindEvents: function () {
            var context = this;
            UIK.view.$document.on('/uik/search/address', function () {
                context.searchAddress();
            });
        },


        searchAddress: function () {
            var context = this,
                $divAddressSearchResults = UIK.view.$divAddressSearchResults,
                matches;

            $divAddressSearchResults.empty();
            UIK.geocoder.directGeocode(UIK.viewmodel.filter.address.json.address, function (data) {
                matches = data.matches;
                $divAddressSearchResults.append(context.getHtmlForSearchResults('', matches));

                $divAddressSearchResults.find('a.target').on('click', function () {
                    var $li = $(this).parent();
                    UIK.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 16);
                    $('#target').show().delay(1000).fadeOut(1000);
                });
            });
        },


        getHtmlForSearchResults: function (cssClass, matches) {
            return UIK.templates.addressSearchTemplate({
                cssClass: cssClass,
                matches: matches
            });
        }
    });
})(jQuery, UIK);

