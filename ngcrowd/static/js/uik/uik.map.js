(function ($, UIK) {
    $.extend(UIK.viewmodel, {
        map: null,
        mapLayers: {},
        isPopupOpened: false
    });
    $.extend(UIK.view, {
        $map: null
    });

    UIK.map = {};
    $.extend(UIK.map, {

        init: function () {
            this.bindTriggers();
            this.buildMap();
            this.buildLayerManager();
            this.buildLayers();
            this.bindMapEvents();
        },


        bindTriggers: function () {
            var context = this,
                view = UIK.view,
                viewmodel = UIK.viewmodel;

            UIK.subscribe('/uik/map/setView', function (latlng, zoom) {
                viewmodel.map.setView(latlng, zoom);
                context.setLastExtentToCookie(latlng, zoom);
                view.$document.trigger('/uik/permalink/update', [viewmodel.map.getCenter(), viewmodel.map.getZoom()]);
            });

            view.$document.on('/uik/map/updateAllLayers', function () {
                UIK.view.$document.trigger('/uik/uiks_2012/updateUiks');
                UIK.view.$document.trigger('/uik/uiks/updateUiks');

            });

            UIK.subscribe('/uik/map/openPopup', function (latlng, html) {
                var map = UIK.viewmodel.map;

                map.panTo(latlng);
                map.openPopup(L.popup({
                    maxHeight: 300,
                    minWidth: 300
                }).setLatLng(latlng).setContent(html));
            });
        },


        buildMap: function () {
            var viewmodel = UIK.viewmodel,
                selectedLayer;

            UIK.view.$map = $('#map');
            viewmodel.map = new L.Map('map');

            this.initUrlModule();
            this.initHistoryModule();

            L.control.scale().addTo(viewmodel.map);

            selectedLayer = L.layerGroup();
            viewmodel.map.addLayer(selectedLayer);
            viewmodel.mapLayers['select'] = selectedLayer;
        },


        buildLayers: function () {
            var configPoints = UIK.config.data.points,
                layerName,
                pointLayer,
                layerIndex = {},
                indexesSort = [];
            UIK.viewmodel.mapLayers.points = {};

            for (layerName in configPoints) {
                if (configPoints.hasOwnProperty(layerName)) {
                    pointLayer = configPoints[layerName].createLayer();
                    UIK.viewmodel.map.addLayer(pointLayer);
                    UIK.viewmodel.mapLayers.points[layerName] = pointLayer;
                    layerIndex[configPoints[layerName].z] = layerName;
                    indexesSort.push(configPoints[layerName].z);
                }
            }

            indexesSort.sort(function (a, b) {
                return b - a;
            });

            $.each(indexesSort, function (i, zIndex) {
                UIK.viewmodel.mapLayers.points[layerIndex[zIndex]].bringToFront();
            });
        },


        bindMapEvents: function () {
            var context = this,
                viewmodel = UIK.viewmodel;

            viewmodel.map.on('moveend', function (e) {
                var map = e.target,
                    center = map.getCenter(),
                    zoom = map.getZoom();
                context.setLastExtentToCookie(center, zoom);
                UIK.map.pushCurrentExtent();
                UIK.view.$document.trigger('/uik/permalink/update', [center, zoom]);
                UIK.view.$document.trigger('/uik/map/updateAllLayers');

            });

            viewmodel.map.on('popupclose', function () {
                var viewmodel = UIK.viewmodel;
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
})(jQuery, UIK);

