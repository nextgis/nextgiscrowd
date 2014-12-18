(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        map: null,
        mapLayers: {},
        isPopupOpened: false
    });
    $.extend(NGC.view, {
        $map: null
    });

    NGC.map = {};
    $.extend(NGC.map, {

        init: function () {
            this.bindTriggers();
            this.buildMap();
            this.buildLayerManager();
            this.buildLayers();
            this.bindMapEvents();
        },


        bindTriggers: function () {
            var context = this,
                view = NGC.view,
                viewmodel = NGC.viewmodel;

            NGC.subscribe('/ngc/map/setView', function (latlng, zoom) {
                viewmodel.map.setView(latlng, zoom);
                context.setLastExtentToCookie(latlng, zoom);
                view.$document.trigger('/ngc/permalink/update', [viewmodel.map.getCenter(), viewmodel.map.getZoom()]);
            });

            view.$document.on('/ngc/map/updateAllLayers', function () {
                NGC.view.$document.trigger('/ngc/entities/update');

            });

            NGC.subscribe('/ngc/map/openPopup', function (latlng, html) {
                var map = NGC.viewmodel.map;

                map.panTo(latlng);
                map.openPopup(L.popup({
                    maxHeight: 300,
                    minWidth: 300
                }).setLatLng(latlng).setContent(html));
            });
        },


        buildMap: function () {
            var viewmodel = NGC.viewmodel,
                selectedLayer;

            NGC.view.$map = $('#map');
            viewmodel.map = new L.Map('map');

            this.initUrlModule();
            this.initHistoryModule();

            L.control.scale().addTo(viewmodel.map);

            selectedLayer = L.layerGroup();
            viewmodel.map.addLayer(selectedLayer);
            viewmodel.mapLayers['select'] = selectedLayer;
        },


        buildLayers: function () {
            var configPoints = NGC.config.data.points,
                layerName,
                pointLayer,
                layerIndex = {},
                indexesSort = [];
            NGC.viewmodel.mapLayers.points = {};

            for (layerName in configPoints) {
                if (configPoints.hasOwnProperty(layerName)) {
                    pointLayer = configPoints[layerName].createLayer();
                    NGC.viewmodel.map.addLayer(pointLayer);
                    NGC.viewmodel.mapLayers.points[layerName] = pointLayer;
                    layerIndex[configPoints[layerName].z] = layerName;
                    indexesSort.push(configPoints[layerName].z);
                }
            }

            indexesSort.sort(function (a, b) {
                return b - a;
            });

            $.each(indexesSort, function (i, zIndex) {
                NGC.viewmodel.mapLayers.points[layerIndex[zIndex]].bringToFront();
            });
        },


        bindMapEvents: function () {
            var context = this,
                viewmodel = NGC.viewmodel;

            viewmodel.map.on('moveend', function (e) {
                var map = e.target,
                    center = map.getCenter(),
                    zoom = map.getZoom();
                context.setLastExtentToCookie(center, zoom);
                NGC.map.pushCurrentExtent();
                NGC.view.$document.trigger('/ngc/permalink/update', [center, zoom]);
                NGC.view.$document.trigger('/ngc/map/updateAllLayers');

            });

            viewmodel.map.on('popupclose', function () {
                var viewmodel = NGC.viewmodel;
                viewmodel.isPopupOpened = false;
                viewmodel.mapLayers.select.clearLayers();
            });
        },


        setLastExtentToCookie: function (latLng, zoom) {
            $.cookie('map.lat', latLng.lat, { expires: 7, path: '/' });
            $.cookie('map.lng', latLng.lng, { expires: 7, path: '/' });
            $.cookie('map.zoom', zoom, { expires: 7, path: '/' });
        }
    });
})(jQuery, NGC);

