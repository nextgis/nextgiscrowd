<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>Отметь свой объект</title>
    <meta name="description"
          content="NextGIS Crod - это краудсорсинговое приложение для совместной работы с геоданными, предназначенное для редактирования точек местоположений объектов">
    <meta name="viewport" content="width=device-width">

    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.5/leaflet.css"/>
    <!--[if lte IE 8]>
    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.5/leaflet.ie.css"/>
    <![endif]-->

    <link rel="stylesheet" href="${request.static_url('ngcroud:static/css/bootstrap.min.css')}">
    <link rel="stylesheet" href="${request.static_url('ngcroud:static/css/main.css')}">
    <link rel="stylesheet" href="${request.static_url('ngcroud:static/js/Leaflet.markercluster/MarkerCluster.css')}"/>
    <link rel="stylesheet"
          href="${request.static_url('ngcroud:static/js/Leaflet.markercluster/MarkerCluster.Default.css')}"/>

    ##    <link rel="stylesheet"
    ##          href="${request.static_url('ngcroud:static/build/uik-' + request.registry.settings['static_version'] + '.css')}">
        ##   	<!--[if lte IE 8]><!--<link rel="stylesheet" href="${request.static_url('ngcroud:static/js/Leaflet.markercluster/MarkerCluster.Default.ie.css')}" />--><![endif]-->


    <script type="text/javascript">
        document['url_root'] = '${request.route_url('home')}';
    </script>
    <script type="text/javascript"
            src="http://cdnjs.cloudflare.com/ajax/libs/mustache.js/0.7.0/mustache.min.js"></script>
    <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
    <script type="text/javascript" src="http://cdn.leafletjs.com/leaflet-0.5/leaflet.js"></script>

    ##    <script type="text/javascript" src="${request.static_url('ngcroud:static/build/uik-' + request.registry.settings['static_version'] + '.js')}"></script>

    <script src="${request.static_url('ngcroud:static/js/Leaflet.markercluster/leaflet.markercluster-src.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/jquery/jquery.cookie.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/jquery.imagesloaded.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/leaflet/bing.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/mustache.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.config.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.subscriber.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.loader.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.helpers.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.common.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.popup.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.map.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.map.url.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.map.history.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.map.helpers.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.map.manager.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.geocoder.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.searcher.js')}"></script>
    <script type="text/javascript"
            src="${request.static_url('ngcroud:static/js/uik/uik.searcher.address.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.searcher.tab.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.editor.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.uiks.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.uiks.url.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.uiks_2012.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.regions.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.alerts.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.user.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.permalink.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.josm.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.versions.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcroud:static/js/uik/uik.editor.tab.js')}"></script>
    <script type="text/javascript"
            src="${request.static_url('ngcroud:static/build/compile-templates-' + request.registry.settings['static_version'] + '.js')}"></script>

</head>
<body class="editor-collapsed loading">
<div class="loading">
    <img style="margin-top: 70px;" src="${request.static_url('ngcroud:static/img/loader-global.gif')}"/>
    <span>Запуск...</span>
</div>
<div class="popup-background"></div>
<div id="popup">
    <a class="close"></a>

    <div class="header"></div>
    <div class="content"></div>
</div>
<div class="main-loader"></div>
<!--[if lt IE 7]>
<p class="chromeframe">Вы используете <strong>устаревший</strong> браузер. Пожалуйста <a href="http://browsehappy.com/">обновите
    ваш браузер</a></p>
<![endif]-->
<div id="target"></div>
<div id="map"></div>
<div id="alerts">
</div>
<div id="userContainer"
    % if u_name:
     class="inner"
    % endif
        >
    <form id="signInForm" class="form-inline" method="post">
        <input id="em" type="email" class="input-small" name="mail" placeholder="E-mail">
        <input id="p" type="password" class="input-small" name="pass" placeholder="Пароль">
        <button type="submit" class="btn btn-primary">Войти</button>
        <div>или <a href="${request.application_url}/register">зарегистрироваться</a></div>
    </form>
    <form id="signOutForm" class="form-inline" method="post">
        <fieldset>
            <label id="display-name" class="control-label">
                % if u_name:
                        ${u_name}
                % endif
            </label>
            <input type="hidden" name="sign_out" value="true"/>
            <button type="submit" class="btn">Выйти</button>
        </fieldset>
    </form>
</div>
<div id="searchContainer" class="searchUIK">
    <span class="icon-collapse"></span>

    <div class="title"><span>Поиск</span></div>
    <ul class="nav nav-tabs">
        <li class="active" data-id="searchUIK"><a href="javascript:void(0)">Объекты</a></li>
        <li data-id="searchAddress"><a href="javascript:void(0)">Поиск по адресу</a></li>
    </ul>

    <div id="searchUIK" onsubmit="return false" class="search-block" data-trigger="/uik/uiks/updateUiks"
         data-isMapTriggered="true" data-filter="uik">
        <form class="form-search">
            <fieldset>
                % for field in fields:
                    %if field.searchable:
                        <input type="text" class="name filterable" data-filter="${field.id}"
                               data-validate="validateDefault" placeholder="${field.title}"/>
                    %endif
                % endfor
                <div class="search" title="Поиск">
                    <span></span>
                </div>
            </fieldset>
            <a href="javascript:void(0)" class="clear-search">Очистить поля поиска</a>
        </form>

        <div class="active searchResults" data-template="">
            <p class="update">Запрос данных...</p>

            <div></div>
        </div>
    </div>

    <div id="searchAddress" onsubmit="return false" class="search-block" data-trigger="/uik/search/address"
         data-filter="address">
        <form class="form-search">
            <fieldset>
                <input type="text" class="address filterable" data-filter="address" data-validate="validateDefault"
                       placeholder="Адрес"/>

                <div class="search" title="Поиск">
                    <span></span>
                </div>
            </fieldset>
            <a href="javascript:void(0)" class="clear-search">Очистить поле поиска</a>
        </form>

        <div class="active searchResults">
            <p class="update">Запрос данных...</p>

            <div></div>
        </div>
    </div>
</div>
<div id="manager">
    <div class="group tile-layers">
        <div class="icon osm" title="Слой Openstreetmap" data-layer="osm">
            <button></button>
        </div>
        <div class="icon bing" title="Слой Bing" data-layer="bing">
            <button></button>
        </div>
        <div class="icon irs" title="Слой Kosmosnimki IRS" data-layer="irs">
            <button></button>
        </div>
    </div>
</div>
<div class="stat-panel panel">
    <div class="log panel-item"><a target="_blank" href="${request.route_url('logs')}"
                                   title="Статистика пользователей"></a></div>
    <div class="stat panel-item"><a target="_blank" href="${request.route_url('statistic')}"
                                    title="Статистика по объектам"></a></div>
    <div class="export panel-item"><a target="_blank" href="${request.route_url('uik_export_page')}"
                                      title="Выгрузки по регионам"></a></div>
</div>
<div class="help-panel panel">
    <div class="help panel-item"><a href="javascript:void(0)" title="Руководство пользователя"></a></div>
    <div class="nextgis panel-item"><a target="_blank" href="http://nextgis.ru/"
                                       title="Перейти на сайт разработчика - NextGIS"></a></div>
    <div class="facebook panel-item"><a target="_blank" title="Поделиться с друзьями на Facebook"
                                        href="https://www.facebook.com/sharer/sharer.php?u=uikgeo.gis-lab.info"></a>
    </div>
    <div class="twitter panel-item"><a target="_blank" title="Твитнуть"
                                       href="https://twitter.com/intent/tweet?hashtags=uik_geo&original_referer=http%3A%2F%2Fuikgeo.gis-lab.info%2F&text=%D0%9E%D1%82%D0%BC%D0%B5%D1%82%D1%8C%20%D1%81%D0%B2%D0%BE%D0%B9%20%D0%A3%D0%98%D0%9A&tw_p=tweetbutton&url=http%3A%2F%2Fuikgeo.gis-lab.info%2F"></a>
    </div>
</div>

<div id="editorContainer" class="versionsUIK">
    <span class="icon-collapse"></span>

    <div class="title"><span>Редактор</span></div>

    <ul class="nav nav-tabs">
        <li data-id="editUIK" id="editUIK-link"><a href="javascript:void(0)">Данные</a></li>
        <li class="active" data-id="versionsUIK" id="versionsUIK-link"><a href="javascript:void(0)">Версии</a></li>
    </ul>

    <div class="form-wrap" id="editUIK">
        <form class="form-inline disabled" id="editorForm">
            %for field in fields:
                <div class="group">
                    <span class="form-label">${field.title}</span>
                    %if field.type == 'area':
                        <textarea id="field-${field.id}">Значение</textarea>
                    %else:
                        <span id="field-${field.id}" class="value"><p>Значение</p></span>
                    %endif
                </div>
            %endfor

            ##            <div class="group">
            ##                <span class="form-label">Номер</span>
            ##                <span id="name" class="value"></span>
            ##            </div>
            ##            <div class="group">
            ##                <span class="form-label">Регион</span>
            ##                <span id="region" class="value"></span>
            ##            </div>
            ##            <div class="group">
            ##                <span class="form-label">ТИК</span>
            ##                <span id="tik" class="value"></span>
            ##            </div>
            ##            <div class="group">
            ##                <label class="control-label top" for="address_voting">Адрес голосования</label>
            ##                <textarea id="address_voting" name="address_voting" disabled="disabled"></textarea>
            ##            </div>
            ##            <div class="group">
            ##                <label class="control-label top" for="place_voting">Место голосования</label>
            ##                <textarea id="place_voting" name="place_voting" disabled="disabled"></textarea>
            ##            </div>
            ##            <div class="group">
            ##                <label class="control-label" for="geo_precision">Точность</label>
            ##                <select id="geo_precision" class="stand" name="geo_precision" disabled="disabled">
            ##                    % for geocoding_precision in geocoding_precisions:
            ##                        <option value="${geocoding_precision.id}">${geocoding_precision.name_ru}</option>
            ##                    % endfor
            ##                </select>
            ##            </div>

            <div class="geographic">
                <div class="group">
                    <label class="control-label" for="lat">Широта</label>
                    <input type="text" id="lat" name="lat" class="stand" disabled="disabled"/>
                </div>
                <div class="group">
                    <label class="control-label" for="lng">Долгота</label>
                    <input type="text" id="lng" name="lng" class="stand" disabled="disabled"/>
                </div>
                <div class="wrapper-coordinates">
                    <button id="regeocode" class="btn btn-small" disabled="disabled" type="button">
                        Перегеокодировать
                    </button>
                    <button id="resetCenter" class="btn btn-small" disabled="disabled" type="button">
                        Перецентрировать
                    </button>
                </div>
                <div class="wrapper-coordinates">
                    <button id="applyCoordinates" class="btn btn-small" disabled="disabled" type="button">
                        Применить
                    </button>
                    <button id="undoCoordinates" class="btn btn-small" disabled="disabled" type="button">
                        Отменить
                    </button>
                </div>
            </div>
            ##        <div class="group">
            ##            <label class="control-label top" for="comment">Коммента-</br>рий</label>
            ##            <textarea id="comment" name="comment" disabled="disabled"></textarea>
            ##        </div>

            <div class="group-checkboxes">
                <input id="is_applied" type="hidden" name="is_applied" value="0"/>
                <input id="chb_is_applied" type="checkbox" class="stand" disabled="disabled" data-id="is_applied"/>
                <label class="control-label top lbl-applied" for="chb_is_applied">Принято (точность до дома)</label>
            </div>
            <div class="group-submit">
                <button id="discard" type="button" class="btn btn-warning" disabled="disabled">Отменить</button>
                <button id="save" type="button" class="btn btn-success" disabled="disabled">Сохранить</button>
            </div>
        </form>
    </div>

    <div id="versionsUIK"></div>
</div>
<div class="permalink">
    <a id="permalink" name="Ссылка на текущую область">Ссылка на карту</a></br>
    <a id="json_link" name="Открыть в JOSM" target="_blank">Открыть в JOSM</a>
</div>
</body>
</html>