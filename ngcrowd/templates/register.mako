<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>Регистрация</title>
    <meta name="description" content="участковая избирательная комиссия выборы адрес">
    <meta name="viewport" content="width=device-width">

    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/bootstrap.min.css')}">
    <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
</head>
<body style="margin: 10px;">
% if info:
    <div class="alert alert-info">
        <p>${info}</p>
    </div>
    <p>Вы можете загрузить редактор, ввести ваши данные и начать работу по этой <a href="${request.application_url}/">ссылке</a>.</p>
% else:
        <h1>Регистрация нового пользователя</h1>
        % if errors:
            <div class="alert alert-error">
                % for error in errors:
                    <p>${error}</p>
                % endfor
            </div>
        % endif
        <p>Заполните свои регистрационные данные<br/>Длина пароля должна быть больше 4 символов<br/>Конфиденциальность гарантируется</p>

        <form class="form" method="post">
            <fieldset>
                <label class="control-label middle" for="name">Ваше имя, фамилия (например, Иван Иванов)</label>
                <input type="text" id="name" name="name" class="stand"/>
                <label class="control-label middle" for="email">Ваша электронная почта (будет логином)</label>
                <input type="email" id="email" name="email" class="stand"/>
                <label class="control-label middle" for="pass">Ваш пароль</label>
                <input type="password" id="pass" name="pass" class="stand"/>
                <label class="control-label middle" for="pass2">Введите пароль еще раз</label>
                <input type="password" id="pass2" name="pass2" class="stand"/>
                <br/>
                <button type="submit">Зарегистрироваться</button>
            </fieldset>
        </form>
% endif
</body>
</html>