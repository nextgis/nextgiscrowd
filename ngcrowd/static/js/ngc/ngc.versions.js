(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        version: null
    });
    $.extend(NGC.view, {
        $divVersions: null
    });

    NGC.versions = {};
    $.extend(NGC.versions, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$divVersions = $('#versionsEntity');
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$document.on('/ngc/versions/build', function () {
                context.buildVersions();
            });

            NGC.view.$document.on('/ngc/versions/clearUI', function () {
                context.clearVersionsUI();
            });
        },


        buildVersions: function () {
            NGC.view.$divVersions.empty();
            if (NGC.viewmodel.entitySelected.versions && NGC.viewmodel.entitySelected.versions.length > 0) {
                for (var version_id in NGC.viewmodel.entitySelected.versions) {
                    var version = NGC.viewmodel.entitySelected.versions[version_id];
                    var html = NGC.templates.versionsTemplate({
                        num: +version_id + 1,
                        name: version.display_name,
                        time: version.time
                    });
                    NGC.view.$divVersions.append(html);
                }
            } else {
                NGC.view.$divVersions.append('У этого УИКа нет сохраненных версий');
            }
        },

        clearVersionsUI: function () {
            NGC.view.$divVersions.empty();
        }
    });
})(jQuery, NGC);