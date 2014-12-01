<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>Статистика</title>
    <meta name="description" content="участковая избирательная комиссия выборы адрес">
    <meta name="viewport" content="width=device-width">

    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/bootstrap.min.css')}">
    <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css">
    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/stat.css')}">
    <link rel="stylesheet"
          href="${request.static_url('ngcrowd:static/frameworks/jtable.2.3.0/themes/lightcolor/gray/jtable.css')}">

    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
    <script type="text/javascript"
            src="${request.static_url('ngcrowd:static/frameworks/jtable.2.3.0/jquery.jtable.js')}"></script>

    <script type="text/javascript">

        $(document).ready(function () {

            $('#UiksTableContainer').jtable({
                paging: true,
                sorting: true,
                pageSize: 10,
                defaultSorting: 'Name ASC',
                actions: {
                    listAction: '${request.route_url('home')}uik/stat/json'
                },
                fields: {
                    %for property in properties:
                        ep_${property.id}: {
                            title: "${property.title}"
                        },
                    %endfor
                    is_applied: {
                        title: 'Принят',
                        width: '10%',
                        display: function (data) {
                            if (data.record.is_applied === true) {
                                return $('<div class="green" >' + 'Да' + '</div>');
                            }
                            return $('<div class="red" >' + 'Нет' + '</div>');
                        }
                    }
                }
            });

            $('#LoadRecordsButton').click(function (e) {
                e.preventDefault();
                jQuery('#UiksTableContainer').jtable('load', {
                    number_official: $('#number_official').val(),
                    tik: $('#tik').val(),
                    region: $('#region').val(),
                    place_voting:  $('#place_voting').val(),
                    geocoding_precision: $('#geocoding_precision').val(),
                    is_applied: $('#is_applied').val(),
                    user_id: $('#user').val()
                });
            });

            $('#LoadRecordsButton').click();
        });
    </script>
</head>
<body style="margin: 10px;">
<h2>Список объектов</h2>
<div class="header-table">
    <div class="column">
        <label for="user">Выбрать объекты пользователя: </label>
        <select id="user" name="user">
            <option selected="selected" value="">Любой</option>
            % for user in users:
                % if user[1] > 0:
                    <option value="${user[0].id}">${user[0].display_name} (${user[1]})</option>
                % endif
            % endfor
        </select>
    </div>
    <div  class="column" style="text-align: right;">
        <button class="btn btn-primary" type="button" id="LoadRecordsButton">Применить фильтры</button>
    </div>
</div>
<div class="filtering">
    <div class="filter f5">
        <input type="text" name="number_official" id="number_official"/>
    </div>
    <div class="filter f20">
        <select id="tik" name="tik">
            <option selected="selected" value="">Любой</option>
##            % for tik in tiks:
##                    <option value="${tik.id}">${tik.name}</option>
##            % endfor
        </select>
    </div>
    <div class="filter f20">
        <select id="region" name="region">
            <option selected="selected" value="">Любой</option>
##            % for region in regions:
##                    <option value="${region.id}">${region.name}</option>
##            % endfor
        </select>
    </div>
    <div class="filter f20">
        <input type="text" name="place_voting" id="place_voting"/>
    </div>
    <div class="filter f10">
        <select id="geocoding_precision" name="geocoding_precision">
            <option selected="selected" value="">Любая</option>
##            % for geocoding_precision in geocoding_precisions:
##                    <option value="${geocoding_precision.id}">${geocoding_precision.name_ru}</option>
##            % endfor
        </select>
    </div>
    <div class="filter f10">
        <select id="is_applied" name="is_applied">
            <option selected="selected" value="">Не важно</option>
            <option value="True">Да</option>
            <option value="False">Нет</option>
        </select>
    </div>
</div>
<div id="UiksTableContainer" style="margin: auto;"></div>
</body>
</html>