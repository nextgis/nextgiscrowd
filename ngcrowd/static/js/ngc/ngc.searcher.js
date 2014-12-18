(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        searcherCollapsed: false,
        filter: {},
        isFilterValidated: true
    });
    $.extend(NGC.view, {
        $searchContainer: null,
        $filterName: null,
        $filterAddr: null,
        $searchButton: null,
        $uiksSearchResults: null,
        $uikspSearchResults: null,
        $clearSearch: null
    });
    NGC.searcher = {};
    $.extend(NGC.searcher, {
        min_characters_count: 3,


        init: function () {
            this.setDomOptions();
            this.initFilter();
            this.bindEvents();
        },

        setDomOptions: function () {
            var view = NGC.view;
            view.$searchContainer = $('#searchContainer');
            view.$filterName = $('#filter_name');
            view.$filterAddr = $('#filter_address');
            view.$searchButton = $('#search');
            view.$uiksSearchResults = $('#searchEntity').find('div.searchResults');
            view.$clearSearch = view.$searchContainer.find('a.clear-search');
        },


        initFilter: function () {
            var context = this,
                view = NGC.view,
                $searchBlock,
                filterBlock,
                $searchInput,
                filterParam,
                isValid,
                filter;

            view.$searchContainer.find('div.search-block').each(function (index) {
                $searchBlock = $(this);
                filterBlock = $searchBlock.data('filter');
                filter = NGC.viewmodel.filter;
                filter[filterBlock] = {};
                filter[filterBlock].json = {};
                filter[filterBlock].is_valid = true;
                filter[filterBlock].trigger = $searchBlock.data('trigger');
                filter[filterBlock].btn_search = $searchBlock.find('div.search');
                filter[filterBlock].clear_search = $searchBlock.find('a.clear-search');
                filter[filterBlock].elements = {};

                $searchBlock.find('input.filterable').each(function () {
                    (function (element, filterBlockName, filter) {
                        $searchInput = $(element);
                        filterParam = $searchInput.data('filter');
                        NGC.viewmodel.filter[filterBlockName].elements[filterParam] = {
                            'element': $searchInput,
                            'is_valid': true
                        };
                        filter[filterBlockName].json[filterParam] = '';
                    })(this, filterBlock, filter);
                });
            });
        },

        bindEvents: function () {
            var view = NGC.view,
                context = this;

            this.bindKeyUpHandlers();

            view.$searchContainer.find('span.icon-collapse, div.title').off('click').on('click', function () {
                NGC.viewmodel.searcherCollapsed = !NGC.viewmodel.searcherCollapsed;
                NGC.view.$body.toggleClass('searcher-collapsed', context.searcherCollapsed);
            });

            view.$document.on('/sm/searcher/update', function () {
                context.updateSearch();
            });
//
//            view.$document.on('/ngc/entities/startUpdate', function () {
//                var v = NGC.view;
//                v.$searchResults.prop('class', 'update');
//                v.$filterName.prop('disabled', true);
//                v.$filterAddr.prop('disabled', true);
//                context.validateSearch();
//            });
//
//            view.$document.on('/sm/stops/endUpdate', function () {
//                var v = NGC.view;
//                v.$searchResults.prop('class', 'active');
//                v.$filterName.prop('disabled', false);
//                v.$filterAddr.prop('disabled', false);
//            });
        },

        bindKeyUpHandlers: function () {
            var context = this,
                filter = NGC.viewmodel.filter,
                filterBlock,
                filterBlockName,
                element,
                elementName,
                isValid,
                isValidFilter,
                $this;

            for (filterBlockName in filter) {
                if (filter.hasOwnProperty(filterBlockName)) {
                    filterBlock = filter[filterBlockName];
                    for (elementName in filterBlock.elements) {
                        if (filterBlock.elements.hasOwnProperty(elementName)) {
                            element = filterBlock.elements[elementName].element;
                            (function (element, filterBlock, context) {
                                element.off('keyup').on('keyup', function (e) {
                                    $this = $(this);
                                    if (e.keyCode === 13) {
                                        if (context.validateFilter(filterBlock)) {
                                            context.applyFilter(filterBlock);
                                        }
                                    } else {
                                        isValid = context[$this.data('validate')]($this.val());
                                        $this.toggleClass('invalid', !isValid);
                                        elementName = $this.data('filter');
                                        filterBlock.elements[elementName].is_valid = isValid;
                                        isValidFilter = context.validateFilter(filterBlock);
                                        filterBlock.btn_search.toggleClass('active', isValidFilter);
                                        if (isValidFilter) { context.buildFilterJson(filterBlock); }
                                        if (isValidFilter && context.isEmptyFilters(filterBlock)) {
                                            filterBlock.btn_search.removeClass('active');
                                        }

                                    }
                                });
                                filterBlock.clear_search.off('click').on('click', function () {
                                    $.each(filterBlock.elements, function () {
                                        this.element.val('');
                                    });
                                    context.applyFilter(filterBlock);
                                });
                                filterBlock.btn_search.off('click').on('click', function () {
                                    if ($(this).hasClass('active')) {
                                        context.applyFilter(filterBlock);
                                    }
                                });
                            }) (element, filterBlock, context);
                        }
                    }
                }
            }
        },



        validateFilter: function (filterBlock) {
            var elements = filterBlock.elements,
                filterElem;
            for (filterElem in elements) {
                if (elements.hasOwnProperty(filterElem) && !elements[filterElem].is_valid) {
                    filterBlock.is_valid = false;
                    return false;
                }
            }
            filterBlock.is_valid = true;
            return true;
        },


        isEmptyFilters: function (filterBlock) {
            var elements = filterBlock.elements,
                elementName;
            for (elementName in elements) {
                if (elements.hasOwnProperty(elementName)) {
                    if ($.trim(elements[elementName].element.val()) !== '') {
                        return false;
                    }
                }
            }
            return true;
        },


        validateDefault: function (value) {
            var trimValue = $.trim(value);
            return trimValue.length > this.min_characters_count ||
                trimValue === '';
        },


        validateNumber: function (value) {
            return true;
        },


        applyFilter: function (filterBlock) {
            this.buildFilterJson(filterBlock);
            this.search(filterBlock);
        },

        buildFilterJson: function (filterBlock) {
            var elements = filterBlock.elements,
                elementName;

            for (elementName in elements) {
                if (elements.hasOwnProperty(elementName)) {
                    filterBlock.json[elementName] = $.trim(elements[elementName].element.val());
                }
            }
        },

        search: function (filterBlock) {
            NGC.view.$document.trigger(filterBlock.trigger);
        },

        updateSearch: function () {
            var pointLayers = NGC.viewmodel.pointLayers.entities,
                pointsConfig = NGC.config.data.points,
                pointsType,
                $divSearchResults = NGC.view.$uiksSearchResults.find('div'),
                html;

            $divSearchResults.empty();
            for (pointsType in pointLayers) {
                if (pointLayers.hasOwnProperty(pointsType)) {
                    html = this.getHtmlForSearchResults(pointsConfig[pointsType].searchCssClass,
                        pointLayers[pointsType].elements);
                    $divSearchResults.append(html);
                }
            }

            $divSearchResults.find('a.target').on('click', function () {
                var $li = $(this).parent();
                NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 18);
                $('#target').show().delay(1000).fadeOut(1000);
            });

            $divSearchResults.find('a.edit').on('click', function () {
                if (NGC.viewmodel.editable) { return false; }

                var $li = $(this).parent(), uikId;
                NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 18);
                $('#target').show().delay(1000).fadeOut(1000);
                uikId = $li.data('id');
                $.getJSON(document['url_root'] + 'uik/' + uikId, function (data) {
                    if (!NGC.viewmodel.editable) {
                        NGC.viewmodel.entitySelected = data;
                        NGC.view.$document.trigger('/ngc/editor/startEdit');
                    }
                });
            });
            $divSearchResults.prop('class', 'active');

//            $divSearchResults = NGC.view.$uikspSearchResults.find('div');
//            pointLayers = NGC.viewmodel.pointLayers.uiksp;
//
//            $divSearchResults.empty();
//            for (pointsType in pointLayers) {
//                if (pointLayers.hasOwnProperty(pointsType)) {
//                    html = NGC.templates.searchResultsTemplate({
//                        cssClass: pointsConfig[pointsType].searchCssClass,
//                        uiks: pointLayers[pointsType].elements,
//                        isAuth: false
//                    });
//                    $divSearchResults.append(html);
//                }
//            }

//            $divSearchResults.find('a.target').on('click', function () {
//                var $li = $(this).parent();
//                NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 18);
//                $('#target').show().delay(1000).fadeOut(1000);
//            });
//
//            $divSearchResults.prop('class', 'active');
        },

        getHtmlForSearchResults: function (cssClass, entities) {
            return NGC.templates.searchResultsTemplate({
                cssClass: cssClass,
                entities: entities,
                isAuth: NGC.viewmodel.isAuth
            });
        }
    });
})(jQuery, NGC);

