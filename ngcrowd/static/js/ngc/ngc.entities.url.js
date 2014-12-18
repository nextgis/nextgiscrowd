(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.entities, {

        handleUrl: function () {
            var context =  this,
                entityFromUrl = this.getEntityFromUrl();

            if (entityFromUrl) {
                if (entityFromUrl.editable === true && NGC.viewmodel.isAuth === true) {
                    $.when(this.getAjaxEntity(entityFromUrl)).then(function (entity) {
                        NGC.call('/ngc/map/setView', [[entity.obj.geom.lat, entity.obj.geom.lng], 17]);
                        context.setEntitySelected(entity);
                        NGC.view.$document.trigger('/ngc/editor/startEdit');
                    });
                } else {
                    $.when(this.getAjaxEntity(entityFromUrl)).then(function (entity) {
                        NGC.viewmodel.map.setZoom(17);
                        NGC.call('/ngc/entities/popup/openByEntity', [entity]);
                    });
                }
            }
        },


        getEntityFromUrl: function () {
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


        getAjaxEntity: function (entityFromUrl) {
            return $.getJSON(document.url_root + 'uik/' + entityFromUrl.regionCode + '/' + entityFromUrl.uikOfficialNumber);
        }
    });
})(jQuery, NGC);