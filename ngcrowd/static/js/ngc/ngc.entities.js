(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        entitySelected: null,
        entitySelectedId: null,
        pointLayers: {}
    });
    $.extend(NGC.view, {

    });
    NGC.entities = {};
    $.extend(NGC.entities, {
        init: function () {
            this.updatePoints();
            this.bindEvents();
            this.handleUrl();
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$document.on('/ngc/entities/updateUiks', function () {
                context.updatePoints();
            });

            NGC.subscribe('/ngc/entities/popup/openByUik', function (uik) {
                context.openUikPopupByUik(uik);
            });
        },


        updatePoints: function () {
            var validateZoom = this.validateZoom();
            this.clearLayers();
            if (!validateZoom) { return; }
            NGC.view.$document.trigger('/ngc/entities/startUpdate');
            this.updateUiksByAjax();
        },


        clearLayers: function () {
            var mapLayers = NGC.viewmodel.mapLayers;
            mapLayers.points.checked.clearLayers();
            mapLayers.points.unchecked.clearLayers();
            mapLayers.points.blocked.clearLayers();
        },


        updateUiksByAjax: function () {
            var context = this,
                url = document['url_root'] + 'entity/all',
                filter = NGC.viewmodel.filter,
                filter_json = {
                    'uik' : filter.uik.json
                };
            $.ajax({
                type: "GET",
                url: url,
                data: {
                    'bbox' : JSON.stringify(NGC.viewmodel.map.getBounds()),
                    'center' : JSON.stringify(NGC.viewmodel.map.getCenter()),
                    'filter' : JSON.stringify(filter_json)
                },
                dataType: 'json',
                success: function (data) {
                    context.renderUiks(data);
                    NGC.view.$document.trigger('/sm/searcher/update');
                    NGC.view.$document.trigger('/sm/stops/endUpdate');
                },
                context: context
            });
        },


        renderUiks: function (data) {
            var viewmodel = NGC.viewmodel,
                pointsLayers = viewmodel.mapLayers.points,
                pointsConfig = NGC.config.data.points,
                dataPointsLayers = data.data.points.layers,
                dataPointType,
                dataPointsIterable,
                dataPointsCount,
                dataPoint,
                icon,
                marker,
                i,
                htmlPopup = NGC.templates.entityPopupTemplate({ css: 'edit' }),
                context = this;

            viewmodel.pointLayers.entities = data.data.points.layers;

            for (dataPointType in dataPointsLayers) {
                if (dataPointsLayers.hasOwnProperty(dataPointType)) {
                    dataPointsIterable = dataPointsLayers[dataPointType].elements;
                    dataPointsCount = dataPointsLayers[dataPointType].count;
                    if (dataPointsCount > 0) { icon = pointsConfig[dataPointType].createIcon(); }
                    for (i = 0; i < dataPointsCount; i += 1) {
                        dataPoint = dataPointsIterable[i];
                        marker = L.marker([dataPoint.lat, dataPoint.lon], {icon: icon}).on('click', function (e) {
                            var marker = e.target;
                            NGC.call('/ngc/map/openPopup', [marker.getLatLng(), htmlPopup]);
                            context.buildUikPopupByClick(marker.id);
                        });
                        marker.id = dataPoint.id;
                        pointsLayers[dataPointType].addLayer(marker);
                    }
                }
            }
        },


        buildUikPopupByClick: function (uikId) {
            var context = this;

            return $.getJSON(document.url_root + 'uik/' + uikId, function (uikData) {
                context.setUikSelected(uikData);
                context.buildUikPopup(uikData);
            }).error(function () {
                $('#entity-popup').removeClass('loader').empty().append('Error connection');
            });
        },


        setUikSelected: function (uik) {
            var viewmodel = NGC.viewmodel;

            if (!viewmodel.editable) {
                viewmodel.entitySelected = uik;
            }
        },


        buildUikPopup: function (entity) {
            var html = NGC.templates.entityPopupInfoTemplate({
                props: entity.props,
                obj: entity.obj,
                isUserEditor: NGC.viewmodel.isAuth,
                editDenied: NGC.viewmodel.editable || entity.obj.is_blocked,
                isBlocked: entity.obj.blocked,
                userBlocked: entity.obj.user_blocked,
                isUnBlocked: entity.obj.is_unblocked
            });

            $('#entity-popup').removeClass('loader').empty().append(html);

            $('button#edit').off('click').on('click', function () {
                NGC.view.$document.trigger('/ngc/editor/startEdit');
            });

            if (entity.obj.is_unblocked) {
                $('#unblock').off('click').on('click', function () {
                    $.ajax({
                        type: 'GET',
                        url: document['url_root'] + 'object/unblock/' + NGC.viewmodel.entitySelected.obj.id
                    }).done(function () {
                            NGC.viewmodel.map.closePopup();
                            NGC.view.$document.trigger('/ngc/map/updateAllLayers');
                        });
                });
            }
        },


        openUikPopupByUik: function (entity) {
            var entityObj = entity.obj,
                latlng = [entityObj.geom.lat, entityObj.geom.lng],
                html = NGC.templates.entityPopupTemplate({ css: 'edit' });

            NGC.call('/ngc/map/openPopup', [latlng, html]);
            this.setUikSelected(ajaxUik);
            this.buildUikPopup(ajaxUik);
        },


        validateZoom: function () {
            if (NGC.viewmodel.map.getZoom() < 14) {
                NGC.alerts.showAlert('zoom');
                return false;
            }
            return true;
        }
    });
})(jQuery, NGC);

