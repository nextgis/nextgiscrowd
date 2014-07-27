(function ($, UIK) {

    $.extend(UIK.viewmodel, {
    });

    $.extend(UIK.view, {
    });

    $.extend(UIK.uiks, {

        handleUrl: function () {
            var context =  this,
                uikFromUrl = this.getUikFromUrl();

            if (uikFromUrl) {
                if (uikFromUrl.editable === true && UIK.viewmodel.isAuth === true) {
                    $.when(this.getAjaxUik(uikFromUrl)).then(function (ajaxUik) {
                        UIK.call('/uik/map/setView', [[ajaxUik.uik.geom.lat, ajaxUik.uik.geom.lng], 17]);
                        context.setUikSelected(ajaxUik);
                        UIK.view.$document.trigger('/uik/editor/startEdit');
                    });
                } else {
                    $.when(this.getAjaxUik(uikFromUrl)).then(function (uik) {
                        UIK.viewmodel.map.setZoom(17);
                        UIK.call('/uik/uiks/popup/openByUik', [uik]);
                    });
                }
            }
        },


        getUikFromUrl: function () {
            var helpers = UIK.helpers,
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
})(jQuery, UIK);