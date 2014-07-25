(function ($, UIK) {
    $.extend(UIK.viewmodel, {

    });
    $.extend(UIK.view, {

    });
    UIK.regions = {};

    UIK.regions.colorMap = {
        1: "#0000FF",
        2: "#A52A2A",
        3: "#D2691E",
        4: "#DC143C",
        5: "#00008B",
        6: "#B8860B",
        7: "#006400",
        8: "#8B008B",
        9: "#556B2F",
        10: "#FF8C00",
        11: "#9932CC",
        12: "#8B0000",
        13: "#9400D3",
        14: "#FF1493",
        15: "#00BFFF",
        16: "#B22222",
        17: "#228B22",
        18: "#FFD700",
        19: "#DAA520",
        20: "#008000",
        21: "#FF69B4",
        22: "#CD5C5C",
        23: "#F08080",
        24: "#800000",
        25: "#66CDAA",
        26: "#0000CD",
        27: "#BA55D3",
        28: "#9370DB",
        29: "#3CB371",
        30: "#7B68EE",
        31: "#00FA9A",
        32: "#48D1CC",
        33: "#C71585",
        34: "#FF00FF",
        35: "#FF0000",
        36: "#BC8F8F",
        37: "#4169E1",
        38: "#8B4513",
        39: "#FA8072",
        40: "#F4A460",
        41: "#2E8B57",
        42: "#800080",
        43: "#4682B4",
        44: "#008080",
        45: "#9ACD32"
    };

    $.extend(UIK.regions, {
        init: function () {
            this.getData();
        },


        getData: function () {
            var that = this,
                getRegionsData = new $.Deferred(),
                getLinesData = new $.Deferred();

            $.ajax({
                dataType: "json",
                url: document['url_root'] + 'static/data/mos-mo-splitted.json',
                success: function (data) {
                    that.buildRegionsLayer(data);
                    getRegionsData.resolve();
                },
                error: function (data, status, error) {
                    alert(data, status, error);
                }
            });

            $.ajax({
                dataType: "json",
                url: document['url_root'] + 'static/data/mos-io-lines.json',
                success: function (data) {
                    that.buildBordersDistrictsLayer(data);
                    getLinesData.resolve();
                },
                error: function (data, status, error) {
                    alert(data, status, error);
                }
            });

            $.when(getRegionsData.promise(), getLinesData.promise()).then(function () {
                that.bindRegionLayersEvent();
                that.verifyLayersByZoom();
                UIK.viewmodel.map.addLayer(that.bordersDistrictsLayer);
            });
        },


        regionsLayer: null,
        buildRegionsLayer: function (data) {
            this.regionsLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        color: '#F0FFFF',
                        fillColor: UIK.regions.colorMap[feature.properties.IO_ID],
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.4
                    };
                },
                onEachFeature: function (feature, layer) {
                    var popupContent = '<b>Район: ' + feature.properties.NAME + '</b>' +
                        '</br>Избирательный округ №' + feature.properties.IO_ID +
                        '</br>OKATO: ' + feature.properties['OKATO'] +
                        '</br>OKTMO: ' + feature.properties['OKTMO'];
                    layer.bindPopup(popupContent);
                }
            });
        },


        bordersDistrictsLayer: null,
        buildBordersDistrictsLayer: function (data) {
            this.bordersDistrictsLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        color: '#0000FF',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0
                    };
                }
            });
        },


        bindRegionLayersEvent: function () {
            var that = this;
            UIK.viewmodel.map.on('moveend', function (e) {
                var map = e.target,
                    zoom = map.getZoom();
                that.verifyLayersByZoom(zoom);
            });
        },

        verifyLayersByZoom: function (zoom) {
            if (!zoom) {
                zoom = UIK.viewmodel.map.getZoom();
            }
            if (zoom > 14) {
                UIK.viewmodel.map.removeLayer(this.regionsLayer);
            } else {
                UIK.viewmodel.map.addLayer(this.regionsLayer);
                this.regionsLayer.bringToBack();
            }
        }
    });
})(jQuery, UIK);

