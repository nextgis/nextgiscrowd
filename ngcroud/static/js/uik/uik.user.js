(function ($, UIK) {
	$.extend(UIK.viewmodel, {
		isAuth: false
	});
	$.extend(UIK.view, {
		$userContainer: null,
		$signInForm: null,
		$signOutForm: null
	});
	UIK.user = {};
	$.extend(UIK.user, {
		init: function () {
			this.setDomOptions();
            this.handleFirstUser();
		},


		setDomOptions: function () {
			UIK.view.$userContainer = $('#userContainer');
			UIK.view.$signInForm = $('#signInForm');
			UIK.view.$signOutForm = $('#signOutForm');
			if (UIK.view.$userContainer.hasClass('inner')) { UIK.viewmodel.isAuth = true; }
		},


        handleFirstUser: function () {
            var isUserKnown = $.cookie('uik.user.known');
            if (!isUserKnown) {
                $.cookie('uik.user.known', 'True', { expires: 200, path: '/' });

                UIK.view.$document.on('/uik/popup/welcome/opened', function () {
                    $('#welcomePopup div.start input').off('click').on('click', function () {
                        UIK.view.$document.trigger('/uik/popup/closePopup');
                        $(this).unbind('click');
                    });
                });

                UIK.view.$document.trigger('/uik/popup/openPopup',
                    [
                        'Добро пожаловать в проект УИК ГЕО!',
                        UIK.templates.welcomeTemplate({
                            rootUrl: document.url_root,
                            first: true
                        }),
                        'welcome'
                    ]);
            }
        }
	});
})(jQuery, UIK);

