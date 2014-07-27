var UIK = {};
UIK.viewmodel = {};
UIK.view = {};
UIK.templates = {};

(function ($, UIK) {
    UIK.config = {};

    $.extend(UIK.config, {
        data: {
            points: {
                checked: {
                    name: 'Проверенные',
                    createIcon: function () {
                        return UIK.map.getIcon('uik-checked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-small',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'checked',
                    z: 1
                },
                unchecked: {
                    name: 'Непроверенные',
                    createIcon: function () {
                        return UIK.map.getIcon('uik-unchecked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-medium',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'non-checked',
                    z: 2
                },
                blocked: {
                    name: 'Заблокированные',
                    createIcon: function () {
                        return UIK.map.getIcon('uik-blocked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-large',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'blocked',
                    z: 3
                },
                uik_2012: {
                    name: 'УИК 2012',
                    createIcon: function () {
                        return UIK.map.getIcon('uik-2012', 20);
                    },
                    createLayer: function () {
                        return new L.featureGroup();
                    },
                    searchCssClass: 'uik2012',
                    z: 4
                }
            }
        }
    });
})(jQuery, UIK);