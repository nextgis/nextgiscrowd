(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.map, {

        defaultExtent: {
            latlng: new L.LatLng(55.773121344534445, 37.66945838928223),
            zoom: 14
        },

        initUrlModule: function () {
            var extentFromUrl = this.getExtentFromUrl();

            if (extentFromUrl) {
                NGC.call('/ngc/map/setView', [extentFromUrl.latlng, extentFromUrl.zoom]);
            } else {
                lastExtent = this.getLastExtentFromCookie();
                if (lastExtent) {
                    NGC.call('/ngc/map/setView', [lastExtent.latlng, lastExtent.zoom]);
                } else {
                    NGC.call('/ngc/map/setView', [this.defaultExtent.latlng, this.defaultExtent.zoom]);
                }
            }
        },


        getExtentFromUrl: function () {
            var helpers = NGC.helpers,
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
})(jQuery, NGC);

