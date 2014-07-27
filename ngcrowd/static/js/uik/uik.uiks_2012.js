(function ($, UIK) {
    $.extend(UIK.viewmodel, {
        uikSelected: null,
        uikSelectedId: null
    });

    $.extend(UIK.view, {
    });

    UIK.uiks_2012 = {};

    $.extend(UIK.uiks_2012, {
        init: function () {
            this.updatePoints();
            this.bindEvents();
        },

        bindEvents: function () {
            var context = this;
            UIK.view.$document.on('/uik/uiks_2012/updateUiks', function () {
                context.updatePoints();
            });
        },


        updatePoints: function () {
            var validateZoom = this.validateZoom();
            this.clearLayers();
            if (!validateZoom) { return; }
            UIK.view.$document.trigger('/uik/uiks_2012/startUpdate');
            this.updateUiksByAjax();
        },

        clearLayers: function () {
            UIK.viewmodel.mapLayers.points['uik_2012'].clearLayers();
        },

        updateUiksByAjax: function () {
            var context = this,
                url = document['url_root'] + 'uikp/all',
                filter = UIK.viewmodel.filter,
                filter_json = {
                    'uik' : filter.uik.json,
                    'uik_2012' : filter.uik_2012.json
                };
            $.ajax({
                type: "GET",
                url: url,
                data: {
                    'bbox' : JSON.stringify(UIK.viewmodel.map.getBounds()),
                    'center' : JSON.stringify(UIK.viewmodel.map.getCenter()),
                    'filter' : JSON.stringify(filter_json)
                },
                dataType: 'json',
                success: function (data) {
                    context.renderUiks(data);
                    UIK.view.$document.trigger('/sm/searcher/update');
                    UIK.view.$document.trigger('/sm/stops/endUpdate');
                },
                context: context
            });
        },

        renderUiks: function (data) {
            var viewmodel = UIK.viewmodel,
                pointsLayers = viewmodel.mapLayers.points,
                pointsConfig = UIK.config.data.points,
                dataPointsLayers = data.points.layers,
                dataPointType,
                dataPointsIterable,
                dataPointsCount,
                dataPoint,
                icon,
                marker,
                i,
                htmlPopup = UIK.templates.uikPopupTemplate({ css: 'edit' }),
                context = this;

            viewmodel.pointLayers.uiksp = data.points.layers;

            for (dataPointType in dataPointsLayers) {
                if (dataPointsLayers.hasOwnProperty(dataPointType)) {
                    dataPointsIterable = dataPointsLayers[dataPointType].elements;
                    dataPointsCount = dataPointsLayers[dataPointType].count;
                    if (dataPointsCount > 0) { icon = pointsConfig[dataPointType].createIcon(); }
                    for (i = 0; i < dataPointsCount; i += 1) {
                        dataPoint = dataPointsIterable[i];
                        marker = L.marker([dataPoint.lat, dataPoint.lon], {icon: icon}).on('click', function (e) {
                            var marker = e.target;
                            UIK.call('/uik/map/openPopup', [marker.getLatLng(), htmlPopup]);
                            context.buildUikPopup(marker.id);
                        });
                        marker.id = dataPoint.id;
                        pointsLayers[dataPointType].addLayer(marker);
                    }
                }
            }
        },

        buildUikPopup: function (uikId) {
            return $.getJSON(document['url_root'] + 'uikp/' + uikId, function (data) {
                var html = UIK.templates.uik2012PopupInfoTemplate({
                    uikp: data.uikp
                });
                $('#uik-popup').removeClass('loader').empty().append(html);
            }).error(function () {
                $('#uik-popup').removeClass('loader').empty().append('Error connection');
            });
        },

        validateZoom: function () {
            return UIK.viewmodel.map.getZoom() >= 16;
        }
    });
})(jQuery, UIK);