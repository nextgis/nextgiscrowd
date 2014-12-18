<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>Статистика пользователей</title>
    <meta name="description" content="объекты">
    <meta name="viewport" content="width=device-width">

    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/bootstrap.min.css')}">

    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>


    <script type="text/javascript">
        $(document).ready(function () {
        });
    </script>
</head>
<body style="margin: 10px;">
<h2>Статистика пользователей</h2>
<p class="muted">В базе <span style="color:blue">${results['count']['all']}</span> Объектов,
    из них принято <span style="color:green">${results['count']['approved']}</span> Объектов</p>
<table class="table">
<thead>
    <tr>
        <th>Ранг</th>
        <th>Пользователь</th>
        <th>Количество правок</th>
        <th>Зарегистрирован</th>
    </tr>
</thead>
<tbody>
    % for user in results['entities_by_users']:
        % if user['count_entities']:
            <tr>
                <td>${user['rank']}</td>
                <td>${user['user_name']}</td>
                <td>${user['count_entities']}</td>
                <td>${user['registered_time']}</td>
            </tr>
        % endif
    % endfor
</tbody>
</table>
</body>
</html>