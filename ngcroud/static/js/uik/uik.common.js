(function ($, UIK) {
	$.extend(UIK.view, {
		$body: null
	});

	UIK.common = {};
	$.extend(UIK.common, {
		init: function () {
			this.setDomOptions();
			this.bindEvents();
		},

		bindEvents: function () {
			UIK.view.$document.on('/uik/common/setMainLoad', function () {
				UIK.view.$body.addClass('loader');
			});

            $('div.help-panel div.help').off('click').on('click', function () {
                UIK.view.$document.trigger('/uik/popup/openPopup',
                    ['Добро пожаловать в проект УИК ГЕО!', UIK.templates.welcomeTemplate({
                        rootUrl: document.url_root
                    }) ]);
            });
		},

		setDomOptions: function () {
			UIK.view.$body = $('body');
		}
	});
})(jQuery, UIK);
