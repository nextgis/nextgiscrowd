(function ($, NGC) {
	$.extend(NGC.viewmodel, {
		currentTileLayer: null
	});
	$.extend(NGC.view, {
		$tileLayers: null,
		$manager: null
	});

	$.extend(NGC.map, {
		_layers: {},
		_lastIndex: 0,

		buildLayerManager: function () {
			var v = NGC.view;
			NGC.view.$manager = $('#manager');
			this.addTileLayer('osm', 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap contributors');
			this.addTileLayer('irs', 'http://irs.gis-lab.info/?layers=irs&request=GetTile&z={z}&x={x}&y={y}', 'Kosmosnimki.ru IRS');
			this.addBingLayer('AujH--7B6FRTK8b81QgPhuvw_Sb3kc8hBO-Lp5OLNyhCD4ZQoGGW4cQS6zBgaeEh');
			NGC.view.$tileLayers = v.$map.find('div.leaflet-tile-pane div.leaflet-layer');
			this.bindLayerManagerEvents();
			this.onLayer('osm');
		},

		bindLayerManagerEvents: function () {
			var context = this;
			NGC.viewmodel.map.off('zoomend').on('zoomend', function () {
				context.onLayer();
			});
			NGC.view.$manager.find('div.tile-layers div.icon').off('click').on('click', function (e) {
				context.onLayer($(this).data('layer'));
			});
		},

		onLayer: function (nameLayer) {
			var viewmodel = NGC.viewmodel,
				view = NGC.view,
				$tileLayers = $(viewmodel.map.getPanes().tilePane).find('div.leaflet-layer');
			if (nameLayer) {
                view.$body.removeClass(viewmodel.currentTileLayer).addClass(nameLayer);
				if (viewmodel.currentTileLayer) {
                    viewmodel.map.removeLayer(this._layers[viewmodel.currentTileLayer].layer);
                }
				viewmodel.currentTileLayer = nameLayer;
                viewmodel.map.addLayer(this._layers[nameLayer].layer, true);
			} else {
			  // TODO not updated
//				$tileLayers.hide().eq(this._layers[viewmodel.currentTileLayer].index).show();
			}
		},

		addTileLayer: function (nameLayer, url, attribution) {
			var layer = new L.TileLayer(url, {minZoom: 8, maxZoom: 18, attribution: attribution});
			this._layers[nameLayer] = {
				'layer' : layer,
				'index' : this._lastIndex
			};
			this._lastIndex += 1;
		},

		addBingLayer: function (key) {
			var bingLayer = new L.BingLayer(key, {minZoom: 8, maxZoom: 18});
			this._layers['bing'] = {
				'layer' : bingLayer,
				'index' : this._lastIndex
			};
			this._lastIndex += 1;
		}

	});
})(jQuery, NGC);