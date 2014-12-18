<!DOCTYPE html >
<html xmlns="http://www.w3.org/1999/html" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <title>${app.title}</title>
    <meta name="description" content="${app.description}">
    <meta name="viewport" content="width=device-width">


    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.5/leaflet.css"/>
    <!--[if lte IE 8]>
    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.5/leaflet.ie.css"/>
    <![endif]-->

    % if request.registry.settings['useCompilledStaticScripts']=='True':
        <link rel="stylesheet"
              href="${request.static_url('ngcrowd:static/build/ngcrowd-' + request.registry.settings['static_version'] + '.css')}">
        <!--[if lte IE 8]><!--<link rel="stylesheet" href="${request.static_url('ngcrowd:static/js/Leaflet.markercluster/MarkerCluster.Default.ie.css')}" />-->
        <![endif]-->
    % else:
        <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/bootstrap.min.css')}">
        <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/main.css')}">
        <link rel="stylesheet"
              href="${request.static_url('ngcrowd:static/js/Leaflet.markercluster/MarkerCluster.css')}"/>
        <link rel="stylesheet"
              href="${request.static_url('ngcrowd:static/js/Leaflet.markercluster/MarkerCluster.Default.css')}"/>
    % endif

    <link rel="stylesheet" href="${request.static_url('ngcrowd:static/css/user.css')}"/>

    <script type="text/javascript">
        document['url_root'] = '${request.route_url('home')}';
    </script>

    <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/mustache.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/jquery-2.1.1.min.js')}"></script>
    <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/leaflet/leaflet.js')}"></script>

    % if request.registry.settings['useCompilledStaticScripts']=='True':
        <script type="text/javascript"
                src="${request.static_url('ngcrowd:static/build/ngcrowd-' + request.registry.settings['static_version'] + '.js')}"></script>
    % else:
        <script src="${request.static_url('ngcrowd:static/js/Leaflet.markercluster/leaflet.markercluster-src.js')}"></script>
        <script type="text/javascript"
                src="${request.static_url('ngcrowd:static/js/jquery/jquery.cookie.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/jquery.imagesloaded.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/leaflet/bing.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/mustache.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.config.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.subscriber.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.loader.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.helpers.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.common.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.popup.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.map.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.map.url.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.map.history.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.map.helpers.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.map.manager.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.geocoder.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.searcher.js')}"></script>
        <script type="text/javascript"
                src="${request.static_url('ngcrowd:static/js/ngc/ngc.searcher.address.js')}"></script>
        <script type="text/javascript"
                src="${request.static_url('ngcrowd:static/js/ngc/ngc.searcher.tab.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.editor.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.entities.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.entities.url.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.regions.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.alerts.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.user.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.permalink.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.josm.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.versions.js')}"></script>
        <script type="text/javascript" src="${request.static_url('ngcrowd:static/js/ngc/ngc.editor.tab.js')}"></script>
        <script type="text/javascript"
                src="${request.static_url('ngcrowd:static/build/compile-templates-' + request.registry.settings['static_version'] + '.js')}"></script>
    % endif


</head>
<body class="editor-collapsed loading">
<div class="loading">
    <img style="margin-top: 70px;" src="${request.static_url('ngcrowd:static/img/loader-global.gif')}"/>
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
<div id="searchContainer" class="searchEntity">
    <span class="icon-collapse"></span>

    <div class="title"><span>Поиск</span></div>
    <ul class="nav nav-tabs">
        <li class="active" data-id="searchEntity"><a href="javascript:void(0)">Объекты</a></li>
        <li data-id="searchAddress"><a href="javascript:void(0)">Поиск по адресу</a></li>
    </ul>

    <div id="searchEntity" onsubmit="return false" class="search-block" data-trigger="/ngc/entities/update"
         data-isMapTriggered="true" data-filter="entity">
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

    <div id="searchAddress" onsubmit="return false" class="search-block" data-trigger="/ngc/search/address"
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
<div class="edit-panel panel">
    <div class="point panel-item"><a id="newPointCreator" href="javascript:void(0)"
                                     title="Создать новый объект"></a></div>
</div>
<div class="help-panel panel">
    <div class="help panel-item"><a href="javascript:void(0)" title="Руководство пользователя"></a></div>
    <div class="nextgis panel-item"><a target="_blank" href="http://nextgis.ru/"
                                       title="Перейти на сайт разработчика - NextGIS"></a></div>
    <div class="facebook panel-item"><a target="_blank" title="Поделиться с друзьями на Facebook"
                                        href="${'https://www.facebook.com/sharer/sharer.php?u=' + request.route_url('home')}"></a>
    </div>
    <div class="twitter panel-item">
        <a target="_blank" title="Твитнуть"
           href="${'https://twitter.com/intent/tweet?hashtags=' + app.twitter_hash_tags + '&original_referer=' + request.route_url('home') + '&text=' + app.title + ' &tw_p=tweetbutton&url=' + request.route_url('home')}"></a>
    </div>
</div>

<div id="editorContainer" class="versionsEntity">
    <span class="icon-collapse"></span>

    <div class="title"><span>Редактор</span></div>

    <ul class="nav nav-tabs">
        <li data-id="editEntity" id="editEntity-link"><a href="javascript:void(0)">Данные</a></li>
        <li class="active" data-id="versionsEntity" id="versionsEntity-link"><a href="javascript:void(0)">Версии</a></li>
    </ul>

    <div class="form-wrap" id="editEntity">
        <form class="form-inline disabled" id="editorForm">
            %for field in fields:
                <div class="group">
                    <span class="form-label">${field.title}</span>
                    %if field.type == 'reference_book':
                        <select id="field-${field.id}" name="ep_${field.id}" class="stand" disabled="disabled">
                            % for reference_book_value in sorted(field.reference_book_values, key=lambda k: k.value):
                                <option value="${reference_book_value.id}">${reference_book_value.value}</option>
                            % endfor
                        </select>
                    %else:
                        <input type="text" id="field-${field.id}" name="ep_${field.id}"
                               class="stand"  ${'data-address-field="true"' if field.address_field else '' | n}/>
                    %endif
                </div>
            %endfor

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

    <div id="versionsEntity"></div>
</div>
<div class="permalink">
    <a id="permalink" name="Ссылка на текущую область">Ссылка на карту</a></br>
    <a id="json_link" name="Открыть в JOSM" target="_blank">Открыть в JOSM</a>
</div>
</body>
</html>