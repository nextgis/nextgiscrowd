(function ($, UIK) {

    $.extend(UIK.viewmodel, {
    });

    $.extend(UIK.view, {
    });

    $.extend(UIK.map, {

        defaultExtent: {
            latlng: new L.LatLng(55.742, 37.658),
            zoom: 17
        },

        initUrlModule: function () {
            var extentFromUrl = this.getExtentFromUrl();

            if (extentFromUrl) {
                UIK.call('/uik/map/setView', [extentFromUrl.latlng, extentFromUrl.zoom]);
            } else {
                lastExtent = this.getLastExtentFromCookie();
                if (lastExtent) {
                    UIK.call('/uik/map/setView', [lastExtent.latlng, lastExtent.zoom]);
                } else {
                    UIK.call('/uik/map/setView', [this.defaultExtent.latlng, this.defaultExtent.zoom]);
                }
            }
        },


        getExtentFromUrl: function () {
            var helpers = UIK.helpers,
                lat = parseFloat(helpers.getURLParameter('lat')),
                lng = parseFloat(helpers.getURLParameter('lon')),
                zoom = parseFloat(helpers.getURLParameter('zoom'));

            if (lat && lng && zoom) {
                return {'latlng': new L.LatLng(lat, lng), 'zoom': zoom};
            }
            return null;
        },


        getLastExtentFromCookie: function () {
            var lat = parseFloat($.cookie('map.lat'), 10),
                lng = parseFloat($.cookie('map.lng'), 10),
                zoom = parseInt($.cookie('map.zoom'), 10);
            if (lat && lng && zoom) {
                return {'latlng': new L.LatLng(lat, lng), 'zoom': zoom};
            } else {
                return null;
            }
        }
    });
})(jQuery, UIK);

