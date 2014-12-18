(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.entities, {

        handleUrl: function () {
            var context =  this,
                uikFromUrl = this.getUikFromUrl();

            if (uikFromUrl) {
                if (uikFromUrl.editable === true && NGC.viewmodel.isAuth === true) {
                    $.when(this.getAjaxUik(uikFromUrl)).then(function (ajaxUik) {
                        NGC.call('/ngc/map/setView', [[ajaxUik.uik.geom.lat, ajaxUik.uik.geom.lng], 17]);
                        context.setUikSelected(ajaxUik);
                        NGC.view.$document.trigger('/ngc/editor/startEdit');
                    });
                } else {
                    $.when(this.getAjaxUik(uikFromUrl)).then(function (uik) {
                        NGC.viewmodel.map.setZoom(17);
                        NGC.call('/ngc/entities/popup/openByUik', [uik]);
                    });
                }
            }
        },


        getUikFromUrl: function () {
            var helpers = NGC.helpers,
                uikOfficialNumber = helpers.getURLParameter('uik'),
                regionCode = helpers.getURLParameter('reg'),
                editable = helpers.getURLParameter('edit');

            if (uikOfficialNumber !== 'null' && regionCode !== 'null') {
                return {
                    'uikOfficialNumber': uikOfficialNumber,
                    'regionCode': regionCode,
                    'editable': editable === 'True' || editable === 'true'
                };
            }

            return null;
        },


        getAjaxUik: function (uikFromUrl) {
            return $.getJSON(document.url_root + 'uik/' + uikFromUrl.regionCode + '/' + uikFromUrl.uikOfficialNumber);
        }
    });
})(jQuery, NGC);