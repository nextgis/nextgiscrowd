(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        editorCollapsed: false,
        editable: false,
        latlngEditable: {
            lat: {validated: null, marker: null, editor: null},
            lng: {validated: null, marker: null, editor: null},
            isNeedApplied: false,
            sourceCoordinates: null
        },
        markerEditable: null
    });

    $.extend(NGC.view, {
        $editorContainer: null
    });

    NGC.editor = {};
    $.extend(NGC.editor, {
        regex: { url: new RegExp("(https?)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]") },
        precisionDegree: 6,
        templates: {
            notEditableValue: Mustache.compile('<p>{{value}}</p>')
        },

        init: function () {
            this.setDomOptions();
            this.buildEditLayer();
            this.bindEvents();
        },

        setDomOptions: function () {
            NGC.view.$editorContainer = $('#editorContainer');
            NGC.viewmodel.editorCollapsed = NGC.view.$body.hasClass('editor-collapsed');
        },

        buildEditLayer: function () {
            var editedLayer = L.layerGroup();
            NGC.viewmodel.mapLayers['edit'] = editedLayer;
            NGC.viewmodel.map.addLayer(editedLayer);
        },

        bindEvents: function () {
            var context = this;

            NGC.view.$editorContainer.find('span.icon-collapse, div.title').off('click').on('click', function () {
                context.toggleEditor();
            });

            NGC.view.$document.on('/ngc/editor/startEdit', function (e) {
                context.startAjaxEdition();
            });

            $('#save').off('click').on('click', function (e) {
                e.stopPropagation();
                context.save();
            });

            $('#discard').off('click').on('click', function (e) {
                var viewmodel = NGC.viewmodel;
                e.stopPropagation();
                if (!viewmodel.latlngEditable.sourceCoordinates.equals(viewmodel.markerEditable.getLatLng())) {
                    viewmodel.map.setView(viewmodel.latlngEditable.sourceCoordinates, 18);
                    $('#target').show().delay(1000).fadeOut(1000);
                }
                context.finishAjaxEdition();
            });

            $('#editorForm').find(':checkbox').off('click').on('click', function () {
                var checkbox = $(this),
                    hidden = $('#' + checkbox.data('id'));
                if (checkbox.is(':checked')) {
                    hidden.val(1);
                } else {
                    hidden.val(0);
                }
            });

            $('#lat, #lng').off('keyup').on('keyup', function (e) {
                context.coordinatesInputHandler(e, $(this));
            });

            $('#applyCoordinates').off('click').on('click', function () {
                context.applyCoordinates(NGC.viewmodel.latlngEditable);
            });

            $('#undoCoordinates').off('click').on('click', function () {
                context.undoCoordinates();
            });

            $('#resetCenter').off('click').on('click', function () {
                context.resetCenter();
            });

            $('#regeocode').off('click').on('click', function () {
                context.regeocode();
            });

            $('#newPointCreator').off('click').on('click', function () {
                if (NGC.viewmodel.isAuth) {
                    context.createNewPoint();
                } else {
                    NGC.alerts.showAlert('creatorFail');
                }
            });
        },

        toggleEditor: function () {
            var editorCollapsed = !NGC.viewmodel.editorCollapsed;
            NGC.viewmodel.editorCollapsed = editorCollapsed;
            NGC.view.$body.toggleClass('editor-collapsed', editorCollapsed);
        },

        coordinatesInputHandler: function (e, $this) {
            var id = $this.attr('id'),
                value = $this.val(),
                latlngEditable = NGC.viewmodel.latlngEditable,
                currentCoordinateState = latlngEditable[id],
                preValidated = currentCoordinateState.validated,
                preDiffCoordinateState = currentCoordinateState.editor !== currentCoordinateState.marker,
                preIsCanApplied = latlngEditable.isNeedApplied;
            if (e.keyCode === 13) {
                if (latlngEditable.isNeedApplied) { this.applyCoordinates(latlngEditable); }
            } else {
                currentCoordinateState.validated = this.verifyDecimalDegree(value);
                if (currentCoordinateState.validated) {
                    value = parseFloat(value.replace(",", ".")).toFixed(this.precisionDegree);
                    currentCoordinateState.editor = value;
                } else {
                    NGC.alerts.showAlert('validateCoordinatesError');
                }
                latlngEditable.isNeedApplied = this.getIsCanApplied(latlngEditable);
                if (preIsCanApplied !== latlngEditable.isNeedApplied) {
                    $('#applyCoordinates').prop('disabled', !latlngEditable.isNeedApplied);
                }
                if (latlngEditable.isNeedApplied) {
                    NGC.alerts.showAlert('changeCoordinates');
                }
                if (preValidated !== currentCoordinateState.validated) {
                    $this.toggleClass('invalid', !currentCoordinateState.validated);
                } else if (preDiffCoordinateState !== (currentCoordinateState.editor !== currentCoordinateState.marker)) {
                    $this.toggleClass('need-apply', currentCoordinateState.editor !== currentCoordinateState.marker);
                }
            }
        },

        getIsCanApplied: function (latLngEditable) {
            if (!latLngEditable.lat.validated || !latLngEditable.lng.validated) {
                return false;
            }
            return latLngEditable.lat.editor !== latLngEditable.lat.marker ||
                latLngEditable.lng.editor !== latLngEditable.lng.marker;
        },

        verifyDecimalDegree: function (value) {
            return !/^\s*$/.test(value) && !isNaN(value);
        },

        applyCoordinates: function (latLngEditable) {
            var viewmodel = NGC.viewmodel,
                latlng = new L.LatLng(parseFloat(latLngEditable.lat.editor), parseFloat(latLngEditable.lng.editor));

            this.updateCoordinates(latlng);
            viewmodel.markerEditable.setLatLng(latlng);
            viewmodel.map.setView(latlng, 18);
            $('#target').show().delay(1000).fadeOut(1000);
            $('#lat, #lng').removeClass('need-apply');
            
            $('#undoCoordinates').prop('disabled', false);
        },

        undoCoordinates: function () {
            var viewmodel = NGC.viewmodel,
                latlng = new L.LatLng(viewmodel.entitySelected.obj.old_geom.lat, viewmodel.entitySelected.obj.old_geom.lng);

            this.updateCoordinates(latlng);
            viewmodel.markerEditable.setLatLng(latlng);
            viewmodel.map.setView(latlng, viewmodel.map.getZoom());

            $('#undoCoordinates').prop('disabled', true);
        },

        resetCenter: function () {
            var newCenter = NGC.viewmodel.map.getCenter();

            this.updateCoordinates(newCenter);
            NGC.viewmodel.markerEditable.setLatLng(newCenter);

            $('#undoCoordinates').prop('disabled', false);
        },


        regeocode: function () {
            var context = this,
                viewmodel = NGC.viewmodel,
                alerts = NGC.alerts,
                address = $('#editorForm input[data-address-field]').val(),
                newCoords;
            NGC.geocoder.directGeocode(address, function (result) {
                if (result.find) {
                    alerts.showAlert('regeocodeSuccess');
                    newCoords = new L.LatLng(result.matches[0].lat, result.matches[0].lon);
                    context.updateCoordinates(newCoords);
                    viewmodel.markerEditable.setLatLng(newCoords);
                    viewmodel.map.setView(newCoords, viewmodel.map.getZoom());
                    $('#undoCoordinates').prop('disabled', false);
                } else {
                    alerts.showAlert('regeocodeFail');
                }
            });
        },


        startAjaxEdition: function () {
            var context = this;
            $.ajax({
                type: 'GET',
                url: document.url_root + 'entity/block/' + NGC.viewmodel.entitySelected.obj.id
            }).done(function () {
                context.startEdit();
            });
        },

        startEdit: function () {
            var viewmodel = NGC.viewmodel,
                view = NGC.view;
            view.$body.addClass('editable');
            if (viewmodel.editorCollapsed) { this.toggleEditor(); }
            view.$editorContainer.find('input, select, textarea, button').removeAttr('disabled');
            view.$editorContainer.find('form').removeClass('disabled');
            viewmodel.editable = true;
            this.startEditingGeometry(viewmodel.entitySelected.obj.geom.lat, viewmodel.entitySelected.obj.geom.lng);
            this.fillEditor(viewmodel.entitySelected);
            viewmodel.entitySelected.obj.old_geom = jQuery.extend({}, viewmodel.entitySelected.obj.geom);
            viewmodel.map.closePopup();
            $('#editEntity-link').click();
        },

        startEditingGeometry: function (lat, lng) {
            var context = this,
                marker = L.marker([lat, lng], {
                    icon: NGC.helpers.getIcon('stop-editable', 25),
                    draggable: true
                }),
                stringLat = lat.toFixed(this.precisionDegree),
                stringLng = lng.toFixed(this.precisionDegree);

            marker.on('dragend', function (e) {
                context.updateCoordinates(e.target.getLatLng());
                $('#undoCoordinates').prop('disabled', false);
            });
            NGC.viewmodel.mapLayers['edit'].addLayer(marker);

            $('#applyCoordinates').prop('disabled', true);
            $('#undoCoordinates').prop('disabled', true);

            NGC.viewmodel.latlngEditable = {
                lat: {validated: true, marker: stringLat, editor: stringLat},
                lng: {validated: true, marker: stringLng, editor: stringLng},
                isNeedApplied: false,
                sourceCoordinates: new L.LatLng(lat, lng)
            };
            NGC.viewmodel.markerEditable = marker;
        },


        updateCoordinates: function (latLng) {
            var lat = latLng.lat.toFixed(this.precisionDegree),
                lng = latLng.lng.toFixed(this.precisionDegree),
                viewmodel = NGC.viewmodel,
                isNeedApplied = viewmodel.latlngEditable.isNeedApplied,
                sourceCoordinates = viewmodel.latlngEditable.sourceCoordinates;

            viewmodel.entitySelected.obj.geom.lat = latLng.lat;
            viewmodel.entitySelected.obj.geom.lng = latLng.lng;

            if (isNeedApplied) { $('#applyCoordinates').prop('disabled', true); }

            viewmodel.latlngEditable = {
                lat: {validated: true, marker: lat, editor: lat},
                lng: {validated: true, marker: lng, editor: lng},
                isNeedApplied: false,
                sourceCoordinates: sourceCoordinates
            };

            $('#lat').val(lat);
            $('#lng').val(lng);
        },


        fillEditor: function (entity) {
            var helpers = NGC.helpers;

            $.each(entity.props, function (i, prop) {
                $('#field-' + prop.id).val(prop.val);
            });

            if (entity.obj.geom) {
                $('#lat').val(entity.obj.geom.lat);
                $('#lng').val(entity.obj.geom.lng);
            }

            if (entity.obj.approved) {
                $('#is_applied').val(1);
                $('#chb_is_applied').prop('checked', true);
            } else {
                $('#is_applied').val(0);
                $('#chb_is_applied').prop('checked', false);
            }
            NGC.view.$document.trigger('/ngc/versions/build');
        },

        save: function () {
            if (!this.verifyEditor()) {
                return;
            }
            var context = this,
                frm = $('#editorContainer form'),
                data_serialized = frm.serializeArray(),
                data_serialized_length = data_serialized.length,
                entitySelected = NGC.viewmodel.entitySelected,
                savedEntityId = { 'id': entitySelected.obj.id },
                url = document['url_root'] + 'entity/' + savedEntityId.id,
                i = 0;

            for (i; i < data_serialized_length; i += 1) {
                savedEntityId[data_serialized[i].name] = data_serialized[i].value;
            }

            savedEntityId.geom = entitySelected.obj.geom;

            $.ajax({
                type: 'POST',
                url: url,
                data: { 'entity': JSON.stringify(savedEntityId)}
            }).done(function () {
                NGC.alerts.showAlert('saveSuccessful');
                context.finishAjaxEdition();
            }).error(function () {
                NGC.alerts.showAlert('saveError');
            });
        },

        verifyEditor: function () {
            var verificated = true,
                latLngEditable = NGC.viewmodel.latlngEditable;
            if (latLngEditable.isNeedApplied) {
                verificated = false;
                NGC.alerts.showAlert('notAppliedCoordinates');
            }
            if (!latLngEditable.lat.validated || !latLngEditable.lng.validated) {
                verificated = false;
                NGC.alerts.showAlert('validateCoordinatesError');
            }
            return verificated;
        },

        finishAjaxEdition: function () {
            var context = this;
            if (!NGC.viewmodel.entitySelected.obj.id) {
                context.finishEditing();
                return false;
            }

            $.ajax({
                type: 'GET',
                url: document['url_root'] + 'entity/unblock/' + NGC.viewmodel.entitySelected.obj.id
            }).done(function () {
                context.finishEditing();
            });
        },

        finishEditing: function () {
            var vm = NGC.viewmodel,
                v = NGC.view;
            vm.map.closePopup();
            vm.mapLayers['edit'].clearLayers();
            vm.editable = false;
            v.$body.addClass('editable');
            v.$editorContainer.find('input, textarea').val('');
            v.$editorContainer.find('input:checkbox').prop('checked', false);
            v.$editorContainer.find('input, select, textarea, button').attr('disabled', 'disabled').removeClass('invalid');
            v.$editorContainer.find('form').addClass('disabled');
            v.$editorContainer.find('span.value').empty();
            NGC.view.$document.trigger('/ngc/versions/clearUI');
            NGC.view.$document.trigger('/ngc/map/updateAllLayers');

        },

        createNewPoint: function () {
            var center = NGC.viewmodel.map.getCenter();

            NGC.viewmodel.entitySelected = ({
                obj: {
                    approved: false,
                    blocked: false,
                    geom: {
                        lat: center.lat,
                        lng: center.lng
                    }
                },
                props: [],
                versions: []
            });

            this.startEdit();
        }
    });
})(jQuery, NGC);

