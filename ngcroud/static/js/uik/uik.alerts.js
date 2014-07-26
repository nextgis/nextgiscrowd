(function ($, UIK) {
    UIK.alerts = {};

    $.extend(UIK.view, {
        $alerts: null
    });

    $.extend(UIK.viewmodel, {
        alerts: {}
    });

    $.extend(UIK.alerts, {

        alerts: {
            historyShortcuts : {
                id: 'historyShortcuts',
                type: 'info',
                text: 'Пожалуйста, не используйте данные с других карт!',
                statusText: 'Мы создаем открытые данные без нарушений чужих лицензионных соглашений.'
            },
            'zoom' : {
                id: 'zoom',
                type: 'alert',
                text: 'Увеличьте масштаб для отображения объектов',
                statusText: 'Мелкий масштаб!'
            },
            'saveSuccessful' : {
                id: 'saveSuccessful',
                type: 'info',
                text: 'Объект успешно обновлен',
                statusText: ''
            },
            saveError: {
                id: 'saveError',
                type: 'error',
                text: 'Ошибка - объект не обновлен.',
                statusText: 'Ошибка!'
            },
            changeCoordinates: {
                id: 'coodrinateChanged',
                type: 'info',
                text: 'После изменения координаты должны быть применены.',
                statusText: 'Внимание! '
            },
            notAppliedCoordinates: {
                id: 'notAppliedCoordinates',
                type: 'error',
                text: 'Вы не применили координаты к редактируемому объекту. ',
                statusText: 'Ошибка сохранения:'
            },
            validateCoordinatesError: {
                id: 'valCoordError',
                type: 'error',
                text: 'Десятичные градусы должны быть введены как 58.00000',
                statusText: 'Неправильный формат ввода координат:'
            },
            regeocodeSuccess: {
                id: 'regeocodeSuccess',
                type: 'info',
                text: 'координаты обновлены',
                statusText: 'Геокодирование завершилось успешно:'
            },
            regeocodeFail: {
                id: 'regeocodeFail',
                type: 'error',
                text: 'координаты не были обновлены',
                statusText: 'Адрес не был геокодирован:'
            }
        },

        init: function () {
            UIK.view.$alerts = $('#alerts');
        },


        showAlert: function (alert) {
            if (!this.alerts[alert] || UIK.viewmodel.alerts[alert]) { return false; }
            UIK.viewmodel.alerts[alert] = true;
            var html = UIK.templates.alertsTemplate(this.alerts[alert]);
            UIK.view.$alerts.append(html);
            $('#alert_' + this.alerts[alert].id).fadeIn().delay(2000).fadeOut('slow', function () {
                $(this).remove();
                UIK.viewmodel.alerts[alert] = false;
            });
        }
    });
})(jQuery, UIK);