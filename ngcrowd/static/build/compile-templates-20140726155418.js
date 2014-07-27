UIK.templates = {};
UIK.templates['uikPopupInfoTemplate'] = Mustache.compile('<table class="table table-striped" style="width: 100px;"> {{#props}} <tr> <td>{{title}}</td> <td>{{val}}</td> </tr> {{/props}} <tr> <td>Проверен</td> <td> {{#uik.approved}}Да{{/uik.approved}} {{^uik.approved}}Нет{{/uik.approved}} </td> </tr> {{#isBlocked}} <tr class="block"> {{#isUnBlocked}} <td>Заблокирована вами</td> <td> <button class="btn btn-small btn-primary block" id="unblock" type="button">Разблокировать</button> </td> {{/isUnBlocked}} {{^isUnBlocked}} <td>Заблокировал</td> <td>{{userBlocked}}</td> {{/isUnBlocked}} </tr> {{/isBlocked}} </table> <div class="edit"> {{#isUserEditor}} <button class="btn btn-small btn-primary {{#isBlock}}block{{/isBlock}}" id="edit" type="button" {{#editDenied}}disabled="disabled"{{/editDenied}}>Редактировать</button> {{/isUserEditor}} </div> ');
UIK.templates['alertsTemplate'] = Mustache.compile('<div id="alert_{{id}}" class="alert alert-{{type}}" style="display: none;"> <button type="button" class="close" data-dismiss="alert">&times;</button> <strong>{{statusText}}</strong> {{text}} </div>');
UIK.templates['versionsTemplate'] = Mustache.compile('<ul> <li> <b>v{{num}}</b> {{time}}, {{name}} </li> </ul>');
UIK.templates['osmPopupTemplate'] = Mustache.compile('<div class="osm-popup"> <div class="caption"> <span>{{id}}</span> <a href="{{link}}" target="_blank" title="Посмотреть на OpenStreetMaps" class="osm"></a> </div> <table class="table table-striped"> {{#tags}} <tr> <td>{{key}}</td> <td>{{val}}</td> </tr> {{/tags}} </table> </div>');
UIK.templates['addressSearchTemplate'] = Mustache.compile('<ul class="{{cssClass}}"> {{#matches}} <li data-lat={{lat}} data-lon={{lon}} data-id={{id}}> {{display_name}} <a class="target" title="Перейти к объекту"></a> </li> {{/matches}} </ul>');
UIK.templates['welcomeTemplate'] = Mustache.compile('<div id="welcomePopup"> <p><strong>Здесь вы можете помочь проверить информацию по местоположениям объектов.</strong></p> <p>Чтобы начать работу - <a target="_blank" href="{{rootUrl}}register">зарегистрируйтесь</a> и найдите интересный вам участок или непроверенные объекты.</p> <p>Вы можете найти объекты с помощью этой карты или через <a target="_blank" href="{{rootUrl}}uik/stat">список УИКов</a>. </p> <p>Полезные ссылки:</p> <ul> <li><a target="_blank" href="http://gis-lab.info/qa/uikgeo-manual.html">Руководство пользователя редактора</a></li> <li><a target="_blank" href="http://gis-lab.info/qa/uikgeo.html">О проекте</a></li> <li><a target="_blank" href="http://gis-lab.info/qa/uik-sources.html">Координационная таблица по созданию списков - можно участвовать!</a></li> <li><a target="_blank" href="http://gis-lab.info/forum/viewforum.php?f=55">Задать вопросы или обсудить на форуме</a></li> <li>Контакты: <a href="mailto:uikgeo@gis-lab.info">uikgeo@gis-lab.info</a></li> </ul> <p><strong>Пожалуйста, не используйте данные с других карт!</strong></p> {{#first}} <div class="start"> <input type="button" class="btn btn-primary" value="Начать работу!"/> </div> {{/first}} </div> ');
UIK.templates['uikPopupTemplate'] = Mustache.compile('<div id="uik-popup" class="{{css}} loader"></div>');
UIK.templates['searchResultsTemplate'] = Mustache.compile('<ul class="{{cssClass}}"> {{#uiks}} <li data-lat={{lat}} data-lon={{lon}} data-id={{id}}> <span>{{name}}</span> {{addr}} <a class="target" title="Перейти"></a> {{#isAuth}}<a class="edit" title="Редактировать"></a>{{/isAuth}} </li> {{/uiks}} </ul>');
UIK.templates['userLogsTemplate'] = Mustache.compile('<table class="table table-striped logs"> <caption>Общая статистика</caption> <tr> <th>Показатель</th> <th>Значение</th> </tr> <tr> <td>Всего объектов</td> <td class="stop">{{count_all}}</td> </tr> <tr> <td>Отредактировано объектов</td> <td class="stop">{{count_editable}}</td> </tr> <tr> <td>Отредактировано, %</td> <td class="stop">{{percent}}</td> </tr> </table> <table class="table table-striped logs"> <caption>Статистика по пользователям</caption> <tr> <th>Пользователь</th> <th>Кол-во УИКов</th> </tr> {{#user_logs}} <tr> <td>{{user_name}}</td> <td class="stop">{{count_uiks}}</td> </tr> {{/user_logs}} </table>');
UIK.templates['uik2012PopupInfoTemplate'] = Mustache.compile('<div class="header">Это местоположение УИК в 2012 году (выборы Президента):</div> <table class="table table-striped"> <tr> <td>Номер УИКа</td> <td>{{uikp.name}}</td> </tr> <tr> <td>Адрес</td> <td>{{uikp.address}}</td> </tr> <tr> <td>Комментарий</td> <td>{{uikp.comment}}</td> </tr> </table> ');