(function ($, NGC) {
    $.extend(NGC.view, {
        $popup: null
    });


    NGC.popup = {};
    $.extend(NGC.popup, {
        $header: null,
        $content: null,

        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            var view = NGC.view;

            view.$popup = $('#popup');
            this.$header = view.$popup.find('div.header');
            this.$content = view.$popup.find('div.content');
        },


        bindEvents: function () {
            var view = NGC.view,
                context = this;

            view.$document.on('/ngc/popup/openPopup', function (e, header, contentPopup, popupName) {
                context.openPopup(header, contentPopup, popupName);
            });

            view.$document.on('/ngc/popup/closePopup', function () {
                context.closePopup();
            });

            view.$popup.find('a.close').off('click').on('click', function () {
                context.closePopup();
            });
        },


        openPopup: function (header, content, popupName) {
            var view = NGC.view,
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
            view.$document.trigger('/ngc/popup/' + popupName + '/opened');
        },


        closePopup: function () {
            NGC.view.$body.removeClass('popup');
        }
    });
})(jQuery, NGC);
