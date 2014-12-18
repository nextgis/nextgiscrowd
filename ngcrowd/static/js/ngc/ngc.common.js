(function ($, NGC) {
	$.extend(NGC.view, {
		$body: null
	});

	NGC.common = {};
	$.extend(NGC.common, {
		init: function () {
			this.setDomOptions();
			this.bindEvents();
		},

		bindEvents: function () {
			NGC.view.$document.on('/ngc/common/setMainLoad', function () {
				NGC.view.$body.addClass('loader');
			});

            $('div.help-panel div.help').off('click').on('click', function () {
                NGC.view.$document.trigger('/ngc/popup/openPopup',
                    ['Добро пожаловать!', NGC.templates.welcomeTemplate({
                        rootUrl: document.url_root
                    }) ]);
            });
		},

		setDomOptions: function () {
			NGC.view.$body = $('body');
		}
	});
})(jQuery, NGC);
