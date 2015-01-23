<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>Статистика</title>
    <meta name="description" content="участковая избирательная комиссия выборы адрес">
    <meta name="viewport" content="width=device-width">

    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/bootstrap.min.css')}"/>
    <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css"/>
    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/stat.css')}"/>
    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/user.css')}"/>
    <link rel="stylesheet"
          href="${request.static_url('ngcrowd:static/frameworks/jtable.2.3.0/themes/lightcolor/gray/jtable.css')}"/>

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
                    listAction: '${request.route_url('home')}entities/table/json'
                },
                fields: {
                    %for property in properties:
                        ep_${property.id}: {
                            title: "${property.title}",
                            width: '${property.table_width}'
                        },
                    %endfor
                    is_applied: {
                        title: 'Принят',
                        width: '5%',
                        display: function (data) {
                            if (data.record.is_applied === true) {
                                return $('<div class="green" >' + 'Да' + '</div>');
                            }
                            return $('<div class="red" >' + 'Нет' + '</div>');
                        }
                    }
                }
            });

            var $filtersForm = $('#filters');
            $('#LoadRecordsButton').click(function (e) {
                e.preventDefault();

                var filtersArray = $filtersForm.serializeArray(),
                        filter = {};

                for (var countFilters = filtersArray.length, i = 0; i < countFilters; i++) {
                    if (filtersArray[i].name && filtersArray[i].value) {
                        filter[filtersArray[i].name] = filtersArray[i].value;
                    }
                }

                jQuery('#UiksTableContainer').jtable('load', filter);
            });

            $('#LoadRecordsButton').click();
        });
    </script>
</head>
<body style="margin: 10px;">
<h2>Список объектов</h2>

<form id="filters">
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
        <div class="column" style="text-align: right;">
            <input class="btn btn-primary" type="submit" id="LoadRecordsButton" value="Применить фильтры"/>
        </div>
    </div>
    <div class="filtering">
        %for property in properties:
            <div class="filter" style="width: ${property.table_width}">
                <input type="text" name="ep_${property.id}" id="ep_${property.id}"/>
            </div>
        %endfor
        <div class="filter" style="width: 5%">
            <select id="is_applied" name="is_applied">
                <option selected="selected" value="">Не важно</option>
                <option value="True">Да</option>
                <option value="False">Нет</option>
            </select>
        </div>
    </div>
</form>
<div id="UiksTableContainer" style="margin: auto;"></div>
</body>
</html>