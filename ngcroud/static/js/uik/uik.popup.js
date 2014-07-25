(function ($, UIK) {
    $.extend(UIK.view, {
        $popup: null
    });


    UIK.popup = {};
    $.extend(UIK.popup, {
        $header: null,
        $content: null,

        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            var view = UIK.view;

            view.$popup = $('#popup');
            this.$header = view.$popup.find('div.header');
            this.$content = view.$popup.find('div.content');
        },


        bindEvents: function () {
            var view = UIK.view,
                context = this;

            view.$document.on('/uik/popup/openPopup', function (e, header, contentPopup, popupName) {
                context.openPopup(header, contentPopup, popupName);
            });

            view.$document.on('/uik/popup/closePopup', function () {
                context.closePopup();
            });

            view.$popup.find('a.close').off('click').on('click', function () {
                context.closePopup();
            });
        },


        openPopup: function (header, content, popupName) {
            var view = UIK.view,
                $popup = view.$popup,
                marginLeft, marginTop;
            this.$header.text(header);
            this.$content.html(content);
            marginLeft = $popup.width() / 2;
            marginTop = $popup.height() / 2;
            $popup.css({
                'margin-left' : -marginLeft + 'px',
                'margin-top' :  -marginTop  + 'px'
            });
            view.$body.addClass('popup');
            view.$document.trigger('/uik/popup/' + popupName + '/opened');
        },


        closePopup: function () {
            UIK.view.$body.removeClass('popup');
        }
    });
})(jQuery, UIK);
