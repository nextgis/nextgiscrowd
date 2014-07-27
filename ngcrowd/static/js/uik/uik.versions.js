(function ($, UIK) {
    $.extend(UIK.viewmodel, {
        version: null
    });
    $.extend(UIK.view, {
        $divVersions: null
    });

    UIK.versions = {};
    $.extend(UIK.versions, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            UIK.view.$divVersions = $('#versionsUIK');
        },


        bindEvents: function () {
            var context = this;

            UIK.view.$document.on('/uik/versions/build', function () {
                context.buildVersions();
            });

            UIK.view.$document.on('/uik/versions/clearUI', function () {
                context.clearVersionsUI();
            });
        },


        buildVersions: function () {
            UIK.view.$divVersions.empty();
            if (UIK.viewmodel.uikSelected.versions && UIK.viewmodel.uikSelected.versions.length > 0) {
                for (var version_id in UIK.viewmodel.uikSelected.versions) {
                    var version = UIK.viewmodel.uikSelected.versions[version_id];
                    var html = UIK.templates.versionsTemplate({
                        num: +version_id + 1,
                        name: version.display_name,
                        time: version.time
                    });
                    UIK.view.$divVersions.append(html);
                }
            } else {
                UIK.view.$divVersions.append('У этого УИКа нет сохраненных версий');
            }
        },

        clearVersionsUI: function () {
            UIK.view.$divVersions.empty();
        }
    });
})(jQuery, UIK);