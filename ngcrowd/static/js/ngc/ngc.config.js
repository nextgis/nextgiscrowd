var NGC = {};
NGC.viewmodel = {};
NGC.view = {};
NGC.templates = {};

(function ($, NGC) {
    NGC.config = {};

    $.extend(NGC.config, {
        data: {
            points: {
                checked: {
                    name: 'Проверенные',
                    createIcon: function () {
                        return NGC.map.getIcon('entity-checked', 20);
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
                        return NGC.map.getIcon('entity-unchecked', 20);
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
                        return NGC.map.getIcon('entity-blocked', 20);
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
                }
            }
        }
    });
})(jQuery, NGC);