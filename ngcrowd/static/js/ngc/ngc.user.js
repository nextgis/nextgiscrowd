(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        isAuth: false
    });
    $.extend(NGC.view, {
        $userContainer: null,
        $signInForm: null,
        $signOutForm: null
    });
    NGC.user = {};
    $.extend(NGC.user, {
        init: function () {
            this.setDomOptions();
            this.handleFirstUser();
        },


        setDomOptions: function () {
            NGC.view.$userContainer = $('#userContainer');
            NGC.view.$signInForm = $('#signInForm');
            NGC.view.$signOutForm = $('#signOutForm');
            if (NGC.view.$userContainer.hasClass('inner')) {
                NGC.viewmodel.isAuth = true;
            }
        },


        handleFirstUser: function () {
            var isUserKnown = $.cookie('uik.user.known');
            if (!isUserKnown) {
                $.cookie('uik.user.known', 'True', { expires: 200, path: '/' });

                NGC.view.$document.on('/ngc/popup/welcome/opened', function () {
                    $('#welcomePopup div.start input').off('click').on('click', function () {
                        NGC.view.$document.trigger('/ngc/popup/closePopup');
                        $(this).unbind('click');
                    });
                });

                NGC.view.$document.trigger('/ngc/popup/openPopup',
                    [
                        'Добро пожаловать!',
                        NGC.templates.welcomeTemplate({
                            rootUrl: document.url_root,
                            first: true
                        }),
                        'welcome'
                    ]);
            }
        }
    });
})(jQuery, NGC);

