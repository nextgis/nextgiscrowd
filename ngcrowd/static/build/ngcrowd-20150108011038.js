/*
 Copyright (c) 2012, Smartrak, David Leaver
 Leaflet.markercluster is an open-source JavaScript library for Marker Clustering on leaflet powered maps.
 https://github.com/danzel/Leaflet.markercluster
*/
(function (window, undefined) {


/*
 * L.MarkerClusterGroup extends L.FeatureGroup by clustering the markers contained within
 */

L.MarkerClusterGroup = L.FeatureGroup.extend({

	options: {
		maxClusterRadius: 80, //A cluster will cover at most this many pixels from its center
		iconCreateFunction: null,

		spiderfyOnMaxZoom: true,
		showCoverageOnHover: true,
		zoomToBoundsOnClick: true,
		singleMarkerMode: false,

		disableClusteringAtZoom: null,

		//Whether to animate adding markers after adding the MarkerClusterGroup to the map
		// If you are adding individual markers set to true, if adding bulk markers leave false for massive performance gains.
		animateAddingMarkers: false,

		//Increase to increase the distance away that spiderfied markers appear from the center
		spiderfyDistanceMultiplier: 1,

		//Options to pass to the L.Polygon constructor
		polygonOptions: {}
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		if (!this.options.iconCreateFunction) {
			this.options.iconCreateFunction = this._defaultIconCreateFunction;
		}

		L.FeatureGroup.prototype.initialize.call(this, []);

		this._inZoomAnimation = 0;
		this._needsClustering = [];
		//The bounds of the currently shown area (from _getExpandedVisibleBounds) Updated on zoom/move
		this._currentShownBounds = null;
	},

	addLayer: function (layer) {

		if (layer instanceof L.LayerGroup) {
			var array = [];
			for (var i in layer._layers) {
				if (layer._layers.hasOwnProperty(i)) {
					array.push(layer._layers[i]);
				}
			}
			return this.addLayers(array);
		}

		if (!this._map) {
			this._needsClustering.push(layer);
			return this;
		}

		if (this.hasLayer(layer)) {
			return this;
		}

		//If we have already clustered we'll need to add this one to a cluster

		if (this._unspiderfy) {
			this._unspiderfy();
		}

		this._addLayer(layer, this._maxZoom);

		//Work out what is visible
		var visibleLayer = layer,
			currentZoom = this._map.getZoom();
		if (layer.__parent) {
			while (visibleLayer.__parent._zoom >= currentZoom) {
				visibleLayer = visibleLayer.__parent;
			}
		}

		if (this._currentShownBounds.contains(visibleLayer.getLatLng())) {
			if (this.options.animateAddingMarkers) {
				this._animationAddLayer(layer, visibleLayer);
			} else {
				this._animationAddLayerNonAnimated(layer, visibleLayer);
			}
		}
		return this;
	},

	removeLayer: function (layer) {

		if (!this._map) {
			this._arraySplice(this._needsClustering, layer);
			return this;
		}

		if (!layer.__parent) {
			return this;
		}

		if (this._unspiderfy) {
			this._unspiderfy();
			this._unspiderfyLayer(layer);
		}

		//Remove the marker from clusters
		this._removeLayer(layer, true);

		if (layer._icon) {
			L.FeatureGroup.prototype.removeLayer.call(this, layer);
			layer.setOpacity(1);
		}

		return this;
	},

	//Takes an array of markers and adds them in bulk
	addLayers: function (layersArray) {
		var i, l, m;
		if (!this._map) {
			this._needsClustering = this._needsClustering.concat(layersArray);
			return this;
		}

		for (i = 0, l = layersArray.length; i < l; i++) {
			m = layersArray[i];

			if (this.hasLayer(m)) {
				continue;
			}

			this._addLayer(m, this._maxZoom);

			//If we just made a cluster of size 2 then we need to remove the other marker from the map (if it is) or we never will
			if (m.__parent) {
				if (m.__parent.getChildCount() === 2) {
					var markers = m.__parent.getAllChildMarkers(),
						otherMarker = markers[0] === m ? markers[1] : markers[0];
					L.FeatureGroup.prototype.removeLayer.call(this, otherMarker);
				}
			}
		}

		//Update the icons of all those visible clusters that were affected
		for (i in this._layers) {
			if (this._layers.hasOwnProperty(i)) {
				m = this._layers[i];
				if (m instanceof L.MarkerCluster && m._iconNeedsUpdate) {
					m._updateIcon();
				}
			}
		}

		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);

		return this;
	},

	//Takes an array of markers and removes them in bulk
	removeLayers: function (layersArray) {
		var i, l, m;

		if (!this._map) {
			for (i = 0, l = layersArray.length; i < l; i++) {
				this._arraySplice(this._needsClustering, layersArray[i]);
			}
			return this;
		}

		for (i = 0, l = layersArray.length; i < l; i++) {
			m = layersArray[i];

			if (!m.__parent) {
				continue;
			}

			this._removeLayer(m, true, true);

			if (m._icon) {
				L.FeatureGroup.prototype.removeLayer.call(this, m);
				m.setOpacity(1);
			}
		}

		//Fix up the clusters and markers on the map
		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);

		for (i in this._layers) {
			if (this._layers.hasOwnProperty(i)) {
				m = this._layers[i];
				if (m instanceof L.MarkerCluster) {
					m._updateIcon();
				}
			}
		}

		return this;
	},

	//Removes all layers from the MarkerClusterGroup
	clearLayers: function () {
		//Need our own special implementation as the LayerGroup one doesn't work for us

		//If we aren't on the map (yet), blow away the markers we know of
		if (!this._map) {
			this._needsClustering = [];
			delete this._gridClusters;
			delete this._gridUnclustered;
		}

		if (this._unspiderfy) {
			this._unspiderfy();
		}

		//Remove all the visible layers
		for (var i in this._layers) {
			if (this._layers.hasOwnProperty(i)) {
				L.FeatureGroup.prototype.removeLayer.call(this, this._layers[i]);
			}
		}

		this.eachLayer(function (marker) {
			delete marker.__parent;
		});

		if (this._map) {
			//Reset _topClusterLevel and the DistanceGrids
			this._generateInitialClusters();
		}

		return this;
	},

	//Override FeatureGroup.getBounds as it doesn't work
	getBounds: function () {
		var bounds = new L.LatLngBounds();
		if (this._topClusterLevel) {
			bounds.extend(this._topClusterLevel._bounds);
		} else {
			for (var i = this._needsClustering.length - 1; i >= 0; i--) {
				bounds.extend(this._needsClustering[i].getLatLng());
			}
		}
		return bounds;
	},

	//Overrides LayerGroup.eachLayer
	eachLayer: function (method, context) {
		var markers = this._needsClustering.slice(),
		    i;

		if (this._topClusterLevel) {
			this._topClusterLevel.getAllChildMarkers(markers);
		}

		for (i = markers.length - 1; i >= 0; i--) {
			method.call(context, markers[i]);
		}
	},

	//Returns true if the given layer is in this MarkerClusterGroup
	hasLayer: function (layer) {
		if (this._needsClustering.length > 0) {
			var anArray = this._needsClustering;
			for (var i = anArray.length - 1; i >= 0; i--) {
				if (anArray[i] === layer) {
					return true;
				}
			}
		}

		return !!(layer.__parent && layer.__parent._group === this);
	},

	//Zoom down to show the given layer (spiderfying if necessary) then calls the callback
	zoomToShowLayer: function (layer, callback) {

		var showMarker = function () {
			if ((layer._icon || layer.__parent._icon) && !this._inZoomAnimation) {
				this._map.off('moveend', showMarker, this);
				this.off('animationend', showMarker, this);

				if (layer._icon) {
					callback();
				} else if (layer.__parent._icon) {
					var afterSpiderfy = function () {
						this.off('spiderfied', afterSpiderfy, this);
						callback();
					};

					this.on('spiderfied', afterSpiderfy, this);
					layer.__parent.spiderfy();
				}
			}
		};

		if (layer._icon) {
			callback();
		} else if (layer.__parent._zoom < this._map.getZoom()) {
			//Layer should be visible now but isn't on screen, just pan over to it
			this._map.on('moveend', showMarker, this);
			if (!layer._icon) {
				this._map.panTo(layer.getLatLng());
			}
		} else {
			this._map.on('moveend', showMarker, this);
			this.on('animationend', showMarker, this);
			this._map.setView(layer.getLatLng(), layer.__parent._zoom + 1);
			layer.__parent.zoomToBounds();
		}
	},

	//Overrides FeatureGroup.onAdd
	onAdd: function (map) {
		this._map = map;

		if (!this._gridClusters) {
			this._generateInitialClusters();
		}

		for (var i = 0, l = this._needsClustering.length; i < l; i++) {
			var layer = this._needsClustering[i];
			if (layer.__parent) {
				continue;
			}
			this._addLayer(layer, this._maxZoom);
		}
		this._needsClustering = [];

		this._map.on('zoomend', this._zoomEnd, this);
		this._map.on('moveend', this._moveEnd, this);

		if (this._spiderfierOnAdd) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnAdd();
		}

		this._bindEvents();


		//Actually add our markers to the map:

		//Remember the current zoom level and bounds
		this._zoom = this._map.getZoom();
		this._currentShownBounds = this._getExpandedVisibleBounds();

		//Make things appear on the map
		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);
	},

	//Overrides FeatureGroup.onRemove
	onRemove: function (map) {
		this._map.off('zoomend', this._zoomEnd, this);
		this._map.off('moveend', this._moveEnd, this);

		this._unbindEvents();

		//In case we are in a cluster animation
		this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');

		if (this._spiderfierOnRemove) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnRemove();
		}

		//Clean up all the layers we added to the map
		for (var i in this._layers) {
			if (this._layers.hasOwnProperty(i)) {
				L.FeatureGroup.prototype.removeLayer.call(this, this._layers[i]);
			}
		}

		this._map = null;
	},


	//Remove the given object from the given array
	_arraySplice: function (anArray, obj) {
		for (var i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i] === obj) {
				anArray.splice(i, 1);
				return;
			}
		}
	},

	//Internal function for removing a marker from everything.
	//dontUpdateMap: set to true if you will handle updating the map manually (for bulk functions)
	_removeLayer: function (marker, removeFromDistanceGrid, dontUpdateMap) {
		var gridClusters = this._gridClusters,
			gridUnclustered = this._gridUnclustered,
			map = this._map;

		//Remove the marker from distance clusters it might be in
		if (removeFromDistanceGrid) {
			for (var z = this._maxZoom; z >= 0; z--) {
				if (!gridUnclustered[z].removeObject(marker, map.project(marker.getLatLng(), z))) {
					break;
				}
			}
		}

		//Work our way up the clusters removing them as we go if required
		var cluster = marker.__parent,
			markers = cluster._markers,
			otherMarker;

		//Remove the marker from the immediate parents marker list
		this._arraySplice(markers, marker);

		while (cluster) {
			cluster._childCount--;

			if (cluster._zoom < 0) {
				//Top level, do nothing
				break;
			} else if (removeFromDistanceGrid && cluster._childCount <= 1) { //Cluster no longer required
				//We need to push the other marker up to the parent
				otherMarker = cluster._markers[0] === marker ? cluster._markers[1] : cluster._markers[0];

				//Update distance grid
				gridClusters[cluster._zoom].removeObject(cluster, map.project(cluster._cLatLng, cluster._zoom));
				gridUnclustered[cluster._zoom].addObject(otherMarker, map.project(otherMarker.getLatLng(), cluster._zoom));

				//Move otherMarker up to parent
				this._arraySplice(cluster.__parent._childClusters, cluster);
				cluster.__parent._markers.push(otherMarker);
				otherMarker.__parent = cluster.__parent;

				if (cluster._icon) {
					//Cluster is currently on the map, need to put the marker on the map instead
					L.FeatureGroup.prototype.removeLayer.call(this, cluster);
					if (!dontUpdateMap) {
						L.FeatureGroup.prototype.addLayer.call(this, otherMarker);
					}
				}
			} else {
				cluster._recalculateBounds();
				if (!dontUpdateMap || !cluster._icon) {
					cluster._updateIcon();
				}
			}

			cluster = cluster.__parent;
		}

		delete marker.__parent;
	},

	//Overrides FeatureGroup._propagateEvent
	_propagateEvent: function (e) {
		if (e.target instanceof L.MarkerCluster) {
			e.type = 'cluster' + e.type;
		}
		L.FeatureGroup.prototype._propagateEvent.call(this, e);
	},

	//Default functionality
	_defaultIconCreateFunction: function (cluster) {
		var childCount = cluster.getChildCount();

		var c = ' marker-cluster-';
		if (childCount < 10) {
			c += 'small';
		} else if (childCount < 100) {
			c += 'medium';
		} else {
			c += 'large';
		}

		return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
	},

	_bindEvents: function () {
		var shownPolygon = null,
			map = this._map,

			spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
			showCoverageOnHover = this.options.showCoverageOnHover,
			zoomToBoundsOnClick = this.options.zoomToBoundsOnClick;

		//Zoom on cluster click or spiderfy if we are at the lowest level
		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.on('clusterclick', function (a) {
				if (map.getMaxZoom() === map.getZoom()) {
					if (spiderfyOnMaxZoom) {
						a.layer.spiderfy();
					}
				} else if (zoomToBoundsOnClick) {
					a.layer.zoomToBounds();
				}
			}, this);
		}

		//Show convex hull (boundary) polygon on mouse over
		if (showCoverageOnHover) {
			this.on('clustermouseover', function (a) {
				if (this._inZoomAnimation) {
					return;
				}
				if (shownPolygon) {
					map.removeLayer(shownPolygon);
				}
				if (a.layer.getChildCount() > 2) {
					shownPolygon = new L.Polygon(a.layer.getConvexHull(), this.options.polygonOptions);
					map.addLayer(shownPolygon);
				}
			}, this);
			this.on('clustermouseout', function () {
				if (shownPolygon) {
					map.removeLayer(shownPolygon);
					shownPolygon = null;
				}
			}, this);
			map.on('zoomend', function () {
				if (shownPolygon) {
					map.removeLayer(shownPolygon);
					shownPolygon = null;
				}
			}, this);
			map.on('layerremove', function (opt) {
				if (shownPolygon && opt.layer === this) {
					map.removeLayer(shownPolygon);
					shownPolygon = null;
				}
			}, this);
		}
	},

	_unbindEvents: function () {
		var spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
			showCoverageOnHover = this.options.showCoverageOnHover,
			zoomToBoundsOnClick = this.options.zoomToBoundsOnClick,
			map = this._map;

		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.off('clusterclick', null, this);
		}
		if (showCoverageOnHover) {
			this.off('clustermouseover', null, this);
			this.off('clustermouseout', null, this);
			map.off('zoomend', null, this);
			map.off('layerremove', null, this);
		}
	},

	_zoomEnd: function () {
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}
		this._mergeSplitClusters();

		this._zoom = this._map._zoom;
		this._currentShownBounds = this._getExpandedVisibleBounds();
	},

	_moveEnd: function () {
		if (this._inZoomAnimation) {
			return;
		}

		var newBounds = this._getExpandedVisibleBounds();

		this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, this._zoom, newBounds);
		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, newBounds);

		this._currentShownBounds = newBounds;
		return;
	},

	_generateInitialClusters: function () {
		var maxZoom = this._map.getMaxZoom(),
			radius = this.options.maxClusterRadius;

		if (this.options.disableClusteringAtZoom) {
			maxZoom = this.options.disableClusteringAtZoom - 1;
		}
		this._maxZoom = maxZoom;
		this._gridClusters = {};
		this._gridUnclustered = {};

		//Set up DistanceGrids for each zoom
		for (var zoom = maxZoom; zoom >= 0; zoom--) {
			this._gridClusters[zoom] = new L.DistanceGrid(radius);
			this._gridUnclustered[zoom] = new L.DistanceGrid(radius);
		}

		this._topClusterLevel = new L.MarkerCluster(this, -1);
	},

	//Zoom: Zoom to start adding at (Pass this._maxZoom to start at the bottom)
	_addLayer: function (layer, zoom) {
		var gridClusters = this._gridClusters,
		    gridUnclustered = this._gridUnclustered,
		    markerPoint, z;

		if (this.options.singleMarkerMode) {
			layer.options.icon = this.options.iconCreateFunction({
				getChildCount: function () {
					return 1;
				},
				getAllChildMarkers: function () {
					return [layer];
				}
			});
		}

		//Find the lowest zoom level to slot this one in
		for (; zoom >= 0; zoom--) {
			markerPoint = this._map.project(layer.getLatLng(), zoom); // calculate pixel position

			//Try find a cluster close by
			var closest = gridClusters[zoom].getNearObject(markerPoint);
			if (closest) {
				closest._addChild(layer);
				layer.__parent = closest;
				return;
			}

			//Try find a marker close by to form a new cluster with
			closest = gridUnclustered[zoom].getNearObject(markerPoint);
			if (closest) {
				var parent = closest.__parent;
				if (parent) {
					this._removeLayer(closest, false);
				}

				//Create new cluster with these 2 in it

				var newCluster = new L.MarkerCluster(this, zoom, closest, layer);
				gridClusters[zoom].addObject(newCluster, this._map.project(newCluster._cLatLng, zoom));
				closest.__parent = newCluster;
				layer.__parent = newCluster;

				//First create any new intermediate parent clusters that don't exist
				var lastParent = newCluster;
				for (z = zoom - 1; z > parent._zoom; z--) {
					lastParent = new L.MarkerCluster(this, z, lastParent);
					gridClusters[z].addObject(lastParent, this._map.project(closest.getLatLng(), z));
				}
				parent._addChild(lastParent);

				//Remove closest from this zoom level and any above that it is in, replace with newCluster
				for (z = zoom; z >= 0; z--) {
					if (!gridUnclustered[z].removeObject(closest, this._map.project(closest.getLatLng(), z))) {
						break;
					}
				}

				return;
			}
			
			//Didn't manage to cluster in at this zoom, record us as a marker here and continue upwards
			gridUnclustered[zoom].addObject(layer, markerPoint);
		}

		//Didn't get in anything, add us to the top
		this._topClusterLevel._addChild(layer);
		layer.__parent = this._topClusterLevel;
		return;
	},

	//Merge and split any existing clusters that are too big or small
	_mergeSplitClusters: function () {
		if (this._zoom < this._map._zoom) { //Zoom in, split
			this._animationStart();
			//Remove clusters now off screen
			this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, this._zoom, this._getExpandedVisibleBounds());

			this._animationZoomIn(this._zoom, this._map._zoom);

		} else if (this._zoom > this._map._zoom) { //Zoom out, merge
			this._animationStart();

			this._animationZoomOut(this._zoom, this._map._zoom);
		} else {
			this._moveEnd();
		}
	},
	
	//Gets the maps visible bounds expanded in each direction by the size of the screen (so the user cannot see an area we do not cover in one pan)
	_getExpandedVisibleBounds: function () {
		var map = this._map,
			bounds = map.getBounds(),
			sw = bounds._southWest,
			ne = bounds._northEast,
			latDiff = L.Browser.mobile ? 0 : Math.abs(sw.lat - ne.lat),
			lngDiff = L.Browser.mobile ? 0 : Math.abs(sw.lng - ne.lng);

		return new L.LatLngBounds(
			new L.LatLng(sw.lat - latDiff, sw.lng - lngDiff, true),
			new L.LatLng(ne.lat + latDiff, ne.lng + lngDiff, true));
	},

	//Shared animation code
	_animationAddLayerNonAnimated: function (layer, newCluster) {
		if (newCluster === layer) {
			L.FeatureGroup.prototype.addLayer.call(this, layer);
		} else if (newCluster._childCount === 2) {
			newCluster._addToMap();

			var markers = newCluster.getAllChildMarkers();
			L.FeatureGroup.prototype.removeLayer.call(this, markers[0]);
			L.FeatureGroup.prototype.removeLayer.call(this, markers[1]);
		} else {
			newCluster._updateIcon();
		}
	}
});

L.MarkerClusterGroup.include(!L.DomUtil.TRANSITION ? {

	//Non Animated versions of everything
	_animationStart: function () {
		//Do nothing...
	},
	_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
		this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, previousZoomLevel);
		this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());
	},
	_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
		this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, previousZoomLevel);
		this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());
	},
	_animationAddLayer: function (layer, newCluster) {
		this._animationAddLayerNonAnimated(layer, newCluster);
	}
} : {

	//Animated versions here
	_animationStart: function () {
		this._map._mapPane.className += ' leaflet-cluster-anim';
		this._inZoomAnimation++;
	},
	_animationEnd: function () {
		if (this._map) {
			this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');
		}
		this._inZoomAnimation--;
		this.fire('animationend');
	},
	_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
		var me = this,
		    bounds = this._getExpandedVisibleBounds(),
		    i;

		//Add all children of current clusters to map and remove those clusters from map
		this._topClusterLevel._recursively(bounds, previousZoomLevel, 0, function (c) {
			var startPos = c._latlng,
				markers = c._markers,
				m;

			if (c._isSingleParent() && previousZoomLevel + 1 === newZoomLevel) { //Immediately add the new child and remove us
				L.FeatureGroup.prototype.removeLayer.call(me, c);
				c._recursivelyAddChildrenToMap(null, newZoomLevel, bounds);
			} else {
				//Fade out old cluster
				c.setOpacity(0);
				c._recursivelyAddChildrenToMap(startPos, newZoomLevel, bounds);
			}

			//Remove all markers that aren't visible any more
			//TODO: Do we actually need to do this on the higher levels too?
			for (i = markers.length - 1; i >= 0; i--) {
				m = markers[i];
				if (!bounds.contains(m._latlng)) {
					L.FeatureGroup.prototype.removeLayer.call(me, m);
				}
			}

		});

		this._forceLayout();
		var j, n;

		//Update opacities
		me._topClusterLevel._recursivelyBecomeVisible(bounds, newZoomLevel);
		//TODO Maybe? Update markers in _recursivelyBecomeVisible
		for (j in me._layers) {
			if (me._layers.hasOwnProperty(j)) {
				n = me._layers[j];

				if (!(n instanceof L.MarkerCluster) && n._icon) {
					n.setOpacity(1);
				}
			}
		}

		//update the positions of the just added clusters/markers
		me._topClusterLevel._recursively(bounds, previousZoomLevel, newZoomLevel, function (c) {
			c._recursivelyRestoreChildPositions(newZoomLevel);
		});

		//Remove the old clusters and close the zoom animation

		setTimeout(function () {
			//update the positions of the just added clusters/markers
			me._topClusterLevel._recursively(bounds, previousZoomLevel, 0, function (c) {
				L.FeatureGroup.prototype.removeLayer.call(me, c);
				c.setOpacity(1);
			});

			me._animationEnd();
		}, 250);
	},

	_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
		this._animationZoomOutSingle(this._topClusterLevel, previousZoomLevel - 1, newZoomLevel);

		//Need to add markers for those that weren't on the map before but are now
		this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());
		//Remove markers that were on the map before but won't be now
		this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, previousZoomLevel, this._getExpandedVisibleBounds());
	},
	_animationZoomOutSingle: function (cluster, previousZoomLevel, newZoomLevel) {
		var bounds = this._getExpandedVisibleBounds();

		//Animate all of the markers in the clusters to move to their cluster center point
		cluster._recursivelyAnimateChildrenInAndAddSelfToMap(bounds, previousZoomLevel + 1, newZoomLevel);

		var me = this;

		//Update the opacity (If we immediately set it they won't animate)
		this._forceLayout();
		cluster._recursivelyBecomeVisible(bounds, newZoomLevel);

		//TODO: Maybe use the transition timing stuff to make this more reliable
		//When the animations are done, tidy up
		setTimeout(function () {

			//This cluster stopped being a cluster before the timeout fired
			if (cluster._childCount === 1) {
				var m = cluster._markers[0];
				//If we were in a cluster animation at the time then the opacity and position of our child could be wrong now, so fix it
				m.setLatLng(m.getLatLng());
				m.setOpacity(1);

				return;
			}

			cluster._recursively(bounds, newZoomLevel, 0, function (c) {
				c._recursivelyRemoveChildrenFromMap(bounds, previousZoomLevel + 1);
			});
			me._animationEnd();
		}, 250);
	},
	_animationAddLayer: function (layer, newCluster) {
		var me = this;

		L.FeatureGroup.prototype.addLayer.call(this, layer);
		if (newCluster !== layer) {
			if (newCluster._childCount > 2) { //Was already a cluster

				newCluster._updateIcon();
				this._forceLayout();
				this._animationStart();

				layer._setPos(this._map.latLngToLayerPoint(newCluster.getLatLng()));
				layer.setOpacity(0);

				setTimeout(function () {
					L.FeatureGroup.prototype.removeLayer.call(me, layer);
					layer.setOpacity(1);

					me._animationEnd();
				}, 250);

			} else { //Just became a cluster
				this._forceLayout();

				me._animationStart();
				me._animationZoomOutSingle(newCluster, this._map.getMaxZoom(), this._map.getZoom());
			}
		}
	},

	//Force a browser layout of stuff in the map
	// Should apply the current opacity and location to all elements so we can update them again for an animation
	_forceLayout: function () {
		//In my testing this works, infact offsetWidth of any element seems to work.
		//Could loop all this._layers and do this for each _icon if it stops working

		L.Util.falseFn(document.body.offsetWidth);
	}
});


L.MarkerCluster = L.Marker.extend({
	initialize: function (group, zoom, a, b) {

		L.Marker.prototype.initialize.call(this, a ? (a._cLatLng || a.getLatLng()) : new L.LatLng(0, 0), { icon: this });


		this._group = group;
		this._zoom = zoom;

		this._markers = [];
		this._childClusters = [];
		this._childCount = 0;
		this._iconNeedsUpdate = true;

		this._bounds = new L.LatLngBounds();

		if (a) {
			this._addChild(a);
		}
		if (b) {
			this._addChild(b);
		}
	},

	//Recursively retrieve all child markers of this cluster
	getAllChildMarkers: function (storageArray) {
		storageArray = storageArray || [];

		for (var i = this._childClusters.length - 1; i >= 0; i--) {
			this._childClusters[i].getAllChildMarkers(storageArray);
		}

		for (var j = this._markers.length - 1; j >= 0; j--) {
			storageArray.push(this._markers[j]);
		}

		return storageArray;
	},

	//Returns the count of how many child markers we have
	getChildCount: function () {
		return this._childCount;
	},

	//Zoom to the extents of this cluster
	zoomToBounds: function () {
		this._group._map.fitBounds(this._bounds);
	},


	_updateIcon: function () {
		this._iconNeedsUpdate = true;
		if (this._icon) {
			this.setIcon(this);
		}
	},

	//Cludge for Icon, we pretend to be an icon for performance
	createIcon: function () {
		if (this._iconNeedsUpdate) {
			this._iconObj = this._group.options.iconCreateFunction(this);
			this._iconNeedsUpdate = false;
		}
		return this._iconObj.createIcon();
	},
	createShadow: function () {
		return this._iconObj.createShadow();
	},


	_addChild: function (new1, isNotificationFromChild) {

		this._iconNeedsUpdate = true;
		this._expandBounds(new1);

		if (new1 instanceof L.MarkerCluster) {
			if (!isNotificationFromChild) {
				this._childClusters.push(new1);
				new1.__parent = this;
			}
			this._childCount += new1._childCount;
		} else {
			if (!isNotificationFromChild) {
				this._markers.push(new1);
			}
			this._childCount++;
		}

		if (this.__parent) {
			this.__parent._addChild(new1, true);
		}
	},

	//Expand our bounds and tell our parent to
	_expandBounds: function (marker) {
		var addedCount,
		    addedLatLng = marker._wLatLng || marker._latlng;

		if (marker instanceof L.MarkerCluster) {
			this._bounds.extend(marker._bounds);
			addedCount = marker._childCount;
		} else {
			this._bounds.extend(addedLatLng);
			addedCount = 1;
		}

		if (!this._cLatLng) {
			// when clustering, take position of the first point as the cluster center
			this._cLatLng = marker._cLatLng || addedLatLng;
		}

		// when showing clusters, take weighted average of all points as cluster center
		var totalCount = this._childCount + addedCount;

		//Calculate weighted latlng for display
		if (!this._wLatLng) {
			this._latlng = this._wLatLng = new L.LatLng(addedLatLng.lat, addedLatLng.lng);
		} else {
			this._wLatLng.lat = (addedLatLng.lat * addedCount + this._wLatLng.lat * this._childCount) / totalCount;
			this._wLatLng.lng = (addedLatLng.lng * addedCount + this._wLatLng.lng * this._childCount) / totalCount;
		}
	},

	//Set our markers position as given and add it to the map
	_addToMap: function (startPos) {
		if (startPos) {
			this._backupLatlng = this._latlng;
			this.setLatLng(startPos);
		}
		L.FeatureGroup.prototype.addLayer.call(this._group, this);
	},
	
	_recursivelyAnimateChildrenIn: function (bounds, center, maxZoom) {
		this._recursively(bounds, 0, maxZoom - 1,
			function (c) {
				var markers = c._markers,
					i, m;
				for (i = markers.length - 1; i >= 0; i--) {
					m = markers[i];

					//Only do it if the icon is still on the map
					if (m._icon) {
						m._setPos(center);
						m.setOpacity(0);
					}
				}
			},
			function (c) {
				var childClusters = c._childClusters,
					j, cm;
				for (j = childClusters.length - 1; j >= 0; j--) {
					cm = childClusters[j];
					if (cm._icon) {
						cm._setPos(center);
						cm.setOpacity(0);
					}
				}
			}
		);
	},

	_recursivelyAnimateChildrenInAndAddSelfToMap: function (bounds, previousZoomLevel, newZoomLevel) {
		this._recursively(bounds, newZoomLevel, 0,
			function (c) {
				c._recursivelyAnimateChildrenIn(bounds, c._group._map.latLngToLayerPoint(c.getLatLng()).round(), previousZoomLevel);

				//TODO: depthToAnimateIn affects _isSingleParent, if there is a multizoom we may/may not be.
				//As a hack we only do a animation free zoom on a single level zoom, if someone does multiple levels then we always animate
				if (c._isSingleParent() && previousZoomLevel - 1 === newZoomLevel) {
					c.setOpacity(1);
					c._recursivelyRemoveChildrenFromMap(bounds, previousZoomLevel); //Immediately remove our children as we are replacing them. TODO previousBounds not bounds
				} else {
					c.setOpacity(0);
				}

				c._addToMap();
			}
		);
	},

	_recursivelyBecomeVisible: function (bounds, zoomLevel) {
		this._recursively(bounds, 0, zoomLevel, null, function (c) {
			c.setOpacity(1);
		});
	},

	_recursivelyAddChildrenToMap: function (startPos, zoomLevel, bounds) {
		this._recursively(bounds, -1, zoomLevel,
			function (c) {
				if (zoomLevel === c._zoom) {
					return;
				}

				//Add our child markers at startPos (so they can be animated out)
				for (var i = c._markers.length - 1; i >= 0; i--) {
					var nm = c._markers[i];

					if (!bounds.contains(nm._latlng)) {
						continue;
					}

					if (startPos) {
						nm._backupLatlng = nm.getLatLng();

						nm.setLatLng(startPos);
						nm.setOpacity(0);
					}

					L.FeatureGroup.prototype.addLayer.call(c._group, nm);
				}
			},
			function (c) {
				c._addToMap(startPos);
			}
		);
	},

	_recursivelyRestoreChildPositions: function (zoomLevel) {
		//Fix positions of child markers
		for (var i = this._markers.length - 1; i >= 0; i--) {
			var nm = this._markers[i];
			if (nm._backupLatlng) {
				nm.setLatLng(nm._backupLatlng);
				delete nm._backupLatlng;
			}
		}

		if (zoomLevel - 1 === this._zoom) {
			//Reposition child clusters
			for (var j = this._childClusters.length - 1; j >= 0; j--) {
				this._childClusters[j]._restorePosition();
			}
		} else {
			for (var k = this._childClusters.length - 1; k >= 0; k--) {
				this._childClusters[k]._recursivelyRestoreChildPositions(zoomLevel);
			}
		}
	},

	_restorePosition: function () {
		if (this._backupLatlng) {
			this.setLatLng(this._backupLatlng);
			delete this._backupLatlng;
		}
	},

	//exceptBounds: If set, don't remove any markers/clusters in it
	_recursivelyRemoveChildrenFromMap: function (previousBounds, zoomLevel, exceptBounds) {
		var m, i;
		this._recursively(previousBounds, -1, zoomLevel - 1,
			function (c) {
				//Remove markers at every level
				for (i = c._markers.length - 1; i >= 0; i--) {
					m = c._markers[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						L.FeatureGroup.prototype.removeLayer.call(c._group, m);
						m.setOpacity(1);
					}
				}
			},
			function (c) {
				//Remove child clusters at just the bottom level
				for (i = c._childClusters.length - 1; i >= 0; i--) {
					m = c._childClusters[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						L.FeatureGroup.prototype.removeLayer.call(c._group, m);
						m.setOpacity(1);
					}
				}
			}
		);
	},

	//Run the given functions recursively to this and child clusters
	// boundsToApplyTo: a L.LatLngBounds representing the bounds of what clusters to recurse in to
	// zoomLevelToStart: zoom level to start running functions (inclusive)
	// zoomLevelToStop: zoom level to stop running functions (inclusive)
	// runAtEveryLevel: function that takes an L.MarkerCluster as an argument that should be applied on every level
	// runAtBottomLevel: function that takes an L.MarkerCluster as an argument that should be applied at only the bottom level
	_recursively: function (boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel) {
		var childClusters = this._childClusters,
		    zoom = this._zoom,
			i, c;

		if (zoomLevelToStart > zoom) { //Still going down to required depth, just recurse to child clusters
			for (i = childClusters.length - 1; i >= 0; i--) {
				c = childClusters[i];
				if (boundsToApplyTo.intersects(c._bounds)) {
					c._recursively(boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel);
				}
			}
		} else { //In required depth

			if (runAtEveryLevel) {
				runAtEveryLevel(this);
			}
			if (runAtBottomLevel && this._zoom === zoomLevelToStop) {
				runAtBottomLevel(this);
			}

			//TODO: This loop is almost the same as above
			if (zoomLevelToStop > zoom) {
				for (i = childClusters.length - 1; i >= 0; i--) {
					c = childClusters[i];
					if (boundsToApplyTo.intersects(c._bounds)) {
						c._recursively(boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel);
					}
				}
			}
		}
	},

	_recalculateBounds: function () {
		var markers = this._markers,
			childClusters = this._childClusters,
			i;

		this._bounds = new L.LatLngBounds();
		delete this._wLatLng;

		for (i = markers.length - 1; i >= 0; i--) {
			this._expandBounds(markers[i]);
		}
		for (i = childClusters.length - 1; i >= 0; i--) {
			this._expandBounds(childClusters[i]);
		}
	},


	//Returns true if we are the parent of only one cluster and that cluster is the same as us
	_isSingleParent: function () {
		//Don't need to check this._markers as the rest won't work if there are any
		return this._childClusters.length > 0 && this._childClusters[0]._childCount === this._childCount;
	}
});



L.DistanceGrid = function (cellSize) {
	this._cellSize = cellSize;
	this._sqCellSize = cellSize * cellSize;
	this._grid = {};
	this._objectPoint = { };
};

L.DistanceGrid.prototype = {

	addObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    stamp = L.Util.stamp(obj);

		this._objectPoint[stamp] = point;

		cell.push(obj);
	},

	updateObject: function (obj, point) {
		this.removeObject(obj);
		this.addObject(obj, point);
	},

	//Returns true if the object was found
	removeObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    i, len;

		delete this._objectPoint[L.Util.stamp(obj)];

		for (i = 0, len = cell.length; i < len; i++) {
			if (cell[i] === obj) {

				cell.splice(i, 1);

				if (len === 1) {
					delete row[x];
				}

				return true;
			}
		}

	},

	eachObject: function (fn, context) {
		var i, j, k, len, row, cell, removed,
		    grid = this._grid;

		for (i in grid) {
			if (grid.hasOwnProperty(i)) {
				row = grid[i];

				for (j in row) {
					if (row.hasOwnProperty(j)) {
						cell = row[j];

						for (k = 0, len = cell.length; k < len; k++) {
							removed = fn.call(context, cell[k]);
							if (removed) {
								k--;
								len--;
							}
						}
					}
				}
			}
		}
	},

	getNearObject: function (point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    i, j, k, row, cell, len, obj, dist,
		    objectPoint = this._objectPoint,
		    closestDistSq = this._sqCellSize,
		    closest = null;

		for (i = y - 1; i <= y + 1; i++) {
			row = this._grid[i];
			if (row) {

				for (j = x - 1; j <= x + 1; j++) {
					cell = row[j];
					if (cell) {

						for (k = 0, len = cell.length; k < len; k++) {
							obj = cell[k];
							dist = this._sqDist(objectPoint[L.Util.stamp(obj)], point);
							if (dist < closestDistSq) {
								closestDistSq = dist;
								closest = obj;
							}
						}
					}
				}
			}
		}
		return closest;
	},

	_getCoord: function (x) {
		return Math.floor(x / this._cellSize);
	},

	_sqDist: function (p, p2) {
		var dx = p2.x - p.x,
		    dy = p2.y - p.y;
		return dx * dx + dy * dy;
	}
};


/* Copyright (c) 2012 the authors listed at the following URL, and/or
the authors of referenced articles or incorporated external code:
http://en.literateprograms.org/Quickhull_(Javascript)?action=history&offset=20120410175256

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Retrieved from: http://en.literateprograms.org/Quickhull_(Javascript)?oldid=18434
*/

(function () {
	L.QuickHull = {
		getDistant: function (cpt, bl) {
			var vY = bl[1].lat - bl[0].lat,
				vX = bl[0].lng - bl[1].lng;
			return (vX * (cpt.lat - bl[0].lat) + vY * (cpt.lng - bl[0].lng));
		},


		findMostDistantPointFromBaseLine: function (baseLine, latLngs) {
			var maxD = 0,
				maxPt = null,
				newPoints = [],
				i, pt, d;

			for (i = latLngs.length - 1; i >= 0; i--) {
				pt = latLngs[i];
				d = this.getDistant(pt, baseLine);

				if (d > 0) {
					newPoints.push(pt);
				} else {
					continue;
				}

				if (d > maxD) {
					maxD = d;
					maxPt = pt;
				}

			}
			return { 'maxPoint': maxPt, 'newPoints': newPoints };
		},

		buildConvexHull: function (baseLine, latLngs) {
			var convexHullBaseLines = [],
				t = this.findMostDistantPointFromBaseLine(baseLine, latLngs);

			if (t.maxPoint) { // if there is still a point "outside" the base line
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints)
					);
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints)
					);
				return convexHullBaseLines;
			} else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
				return [baseLine];
			}
		},

		getConvexHull: function (latLngs) {
			//find first baseline
			var maxLat = false, minLat = false,
				maxPt = null, minPt = null,
				i;

			for (i = latLngs.length - 1; i >= 0; i--) {
				var pt = latLngs[i];
				if (maxLat === false || pt.lat > maxLat) {
					maxPt = pt;
					maxLat = pt.lat;
				}
				if (minLat === false || pt.lat < minLat) {
					minPt = pt;
					minLat = pt.lat;
				}
			}
			var ch = [].concat(this.buildConvexHull([minPt, maxPt], latLngs),
								this.buildConvexHull([maxPt, minPt], latLngs));
			return ch;
		}
	};
}());

L.MarkerCluster.include({
	getConvexHull: function () {
		var childMarkers = this.getAllChildMarkers(),
			points = [],
			hullLatLng = [],
			hull, p, i;

		for (i = childMarkers.length - 1; i >= 0; i--) {
			p = childMarkers[i].getLatLng();
			points.push(p);
		}

		hull = L.QuickHull.getConvexHull(points);

		for (i = hull.length - 1; i >= 0; i--) {
			hullLatLng.push(hull[i][0]);
		}

		return hullLatLng;
	}
});

//This code is 100% based on https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet
//Huge thanks to jawj for implementing it first to make my job easy :-)

L.MarkerCluster.include({

	_2PI: Math.PI * 2,
	_circleFootSeparation: 25, //related to circumference of circle
	_circleStartAngle: Math.PI / 6,

	_spiralFootSeparation:  28, //related to size of spiral (experiment!)
	_spiralLengthStart: 11,
	_spiralLengthFactor: 5,

	_circleSpiralSwitchover: 9, //show spiral instead of circle from this marker count upwards.
								// 0 -> always spiral; Infinity -> always circle

	spiderfy: function () {
		if (this._group._spiderfied === this || this._group._inZoomAnimation) {
			return;
		}

		var childMarkers = this.getAllChildMarkers(),
			group = this._group,
			map = group._map,
			center = map.latLngToLayerPoint(this._latlng),
			positions;

		this._group._unspiderfy();
		this._group._spiderfied = this;

		//TODO Maybe: childMarkers order by distance to center

		if (childMarkers.length >= this._circleSpiralSwitchover) {
			positions = this._generatePointsSpiral(childMarkers.length, center);
		} else {
			center.y += 10; //Otherwise circles look wrong
			positions = this._generatePointsCircle(childMarkers.length, center);
		}

		this._animationSpiderfy(childMarkers, positions);
	},

	unspiderfy: function (zoomDetails) {
		/// <param Name="zoomDetails">Argument from zoomanim if being called in a zoom animation or null otherwise</param>
		if (this._group._inZoomAnimation) {
			return;
		}
		this._animationUnspiderfy(zoomDetails);

		this._group._spiderfied = null;
	},

	_generatePointsCircle: function (count, centerPt) {
		var circumference = this._group.options.spiderfyDistanceMultiplier * this._circleFootSeparation * (2 + count),
			legLength = circumference / this._2PI,  //radius from circumference
			angleStep = this._2PI / count,
			res = [],
			i, angle;

		res.length = count;

		for (i = count - 1; i >= 0; i--) {
			angle = this._circleStartAngle + i * angleStep;
			res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
		}

		return res;
	},

	_generatePointsSpiral: function (count, centerPt) {
		var legLength = this._group.options.spiderfyDistanceMultiplier * this._spiralLengthStart,
			separation = this._group.options.spiderfyDistanceMultiplier * this._spiralFootSeparation,
			lengthFactor = this._group.options.spiderfyDistanceMultiplier * this._spiralLengthFactor,
			angle = 0,
			res = [],
			i;

		res.length = count;

		for (i = count - 1; i >= 0; i--) {
			angle += separation / legLength + i * 0.0005;
			res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
			legLength += this._2PI * lengthFactor / angle;
		}
		return res;
	}
});

L.MarkerCluster.include(!L.DomUtil.TRANSITION ? {
	//Non Animated versions of everything
	_animationSpiderfy: function (childMarkers, positions) {
		var group = this._group,
			map = group._map,
			i, m, leg, newPos;

		for (i = childMarkers.length - 1; i >= 0; i--) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];

			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			m.setZIndexOffset(1000000); //Make these appear on top of EVERYTHING

			L.FeatureGroup.prototype.addLayer.call(group, m);


			leg = new L.Polyline([this._latlng, newPos], { weight: 1.5, color: '#222' });
			map.addLayer(leg);
			m._spiderLeg = leg;
		}
		this.setOpacity(0.3);
		group.fire('spiderfied');
	},

	_animationUnspiderfy: function () {
		var group = this._group,
			map = group._map,
			childMarkers = this.getAllChildMarkers(),
			m, i;

		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			L.FeatureGroup.prototype.removeLayer.call(group, m);

			m.setLatLng(m._preSpiderfyLatlng);
			delete m._preSpiderfyLatlng;
			m.setZIndexOffset(0);

			map.removeLayer(m._spiderLeg);
			delete m._spiderLeg;
		}
	}
} : {
	//Animated versions here
	SVG_ANIMATION: (function () {
		return document.createElementNS('http://www.w3.org/2000/svg', 'animate').toString().indexOf('SVGAnimate') > -1;
	}()),

	_animationSpiderfy: function (childMarkers, positions) {
		var me = this,
			group = this._group,
			map = group._map,
			thisLayerPos = map.latLngToLayerPoint(this._latlng),
			i, m, leg, newPos;

		//Add markers to map hidden at our center point
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			m.setZIndexOffset(1000000); //Make these appear on top of EVERYTHING
			m.setOpacity(0);

			L.FeatureGroup.prototype.addLayer.call(group, m);

			m._setPos(thisLayerPos);
		}

		group._forceLayout();
		group._animationStart();

		var initialLegOpacity = L.Path.SVG ? 0 : 0.3,
			xmlns = L.Path.SVG_NS;


		for (i = childMarkers.length - 1; i >= 0; i--) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];

			//Move marker to new position
			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			m.setOpacity(1);


			//Add Legs.
			leg = new L.Polyline([me._latlng, newPos], { weight: 1.5, color: '#222', opacity: initialLegOpacity });
			map.addLayer(leg);
			m._spiderLeg = leg;

			//Following animations don't work for canvas
			if (!L.Path.SVG || !this.SVG_ANIMATION) {
				continue;
			}

			//How this works:
			//http://stackoverflow.com/questions/5924238/how-do-you-animate-an-svg-path-in-ios
			//http://dev.opera.com/articles/view/advanced-svg-animation-techniques/

			//Animate length
			var length = leg._path.getTotalLength();
			leg._path.setAttribute("stroke-dasharray", length + "," + length);

			var anim = document.createElementNS(xmlns, "animate");
			anim.setAttribute("attributeName", "stroke-dashoffset");
			anim.setAttribute("begin", "indefinite");
			anim.setAttribute("from", length);
			anim.setAttribute("to", 0);
			anim.setAttribute("dur", 0.25);
			leg._path.appendChild(anim);
			anim.beginElement();

			//Animate opacity
			anim = document.createElementNS(xmlns, "animate");
			anim.setAttribute("attributeName", "stroke-opacity");
			anim.setAttribute("attributeName", "stroke-opacity");
			anim.setAttribute("begin", "indefinite");
			anim.setAttribute("from", 0);
			anim.setAttribute("to", 0.5);
			anim.setAttribute("dur", 0.25);
			leg._path.appendChild(anim);
			anim.beginElement();
		}
		me.setOpacity(0.3);

		//Set the opacity of the spiderLegs back to their correct value
		// The animations above override this until they complete.
		// If the initial opacity of the spiderlegs isn't 0 then they appear before the animation starts.
		if (L.Path.SVG) {
			this._group._forceLayout();

			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i]._spiderLeg;

				m.options.opacity = 0.5;
				m._path.setAttribute('stroke-opacity', 0.5);
			}
		}

		setTimeout(function () {
			group._animationEnd();
			group.fire('spiderfied');
		}, 250);
	},

	_animationUnspiderfy: function (zoomDetails) {
		var group = this._group,
			map = group._map,
			thisLayerPos = zoomDetails ? map._latLngToNewLayerPoint(this._latlng, zoomDetails.zoom, zoomDetails.center) : map.latLngToLayerPoint(this._latlng),
			childMarkers = this.getAllChildMarkers(),
			svg = L.Path.SVG && this.SVG_ANIMATION,
			m, i, a;

		group._animationStart();
		
		//Make us visible and bring the child markers back in
		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			//Marker was added to us after we were spidified
			if (!m._preSpiderfyLatlng) {
				continue;
			}

			//Fix up the location to the real one
			m.setLatLng(m._preSpiderfyLatlng);
			delete m._preSpiderfyLatlng;
			//Hack override the location to be our center
			m._setPos(thisLayerPos);

			m.setOpacity(0);

			//Animate the spider legs back in
			if (svg) {
				a = m._spiderLeg._path.childNodes[0];
				a.setAttribute('to', a.getAttribute('from'));
				a.setAttribute('from', 0);
				a.beginElement();

				a = m._spiderLeg._path.childNodes[1];
				a.setAttribute('from', 0.5);
				a.setAttribute('to', 0);
				a.setAttribute('stroke-opacity', 0);
				a.beginElement();

				m._spiderLeg._path.setAttribute('stroke-opacity', 0);
			}
		}

		setTimeout(function () {
			//If we have only <= one child left then that marker will be shown on the map so don't remove it!
			var stillThereChildCount = 0;
			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];
				if (m._spiderLeg) {
					stillThereChildCount++;
				}
			}


			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];

				if (!m._spiderLeg) { //Has already been unspiderfied
					continue;
				}


				m.setOpacity(1);
				m.setZIndexOffset(0);

				if (stillThereChildCount > 1) {
					L.FeatureGroup.prototype.removeLayer.call(group, m);
				}

				map.removeLayer(m._spiderLeg);
				delete m._spiderLeg;
			}
			group._animationEnd();
		}, 250);
	}
});


L.MarkerClusterGroup.include({
	//The MarkerCluster currently spiderfied (if any)
	_spiderfied: null,

	_spiderfierOnAdd: function () {
		this._map.on('click', this._unspiderfyWrapper, this);

		if (this._map.options.zoomAnimation) {
			this._map.on('zoomstart', this._unspiderfyZoomStart, this);
		} else {
			//Browsers without zoomAnimation don't fire zoomstart
			this._map.on('zoomend', this._unspiderfyWrapper, this);
		}

		if (L.Path.SVG && !L.Browser.touch) {
			this._map._initPathRoot();
			//Needs to happen in the pageload, not after, or animations don't work in webkit
			//  http://stackoverflow.com/questions/8455200/svg-animate-with-dynamically-added-elements
			//Disable on touch browsers as the animation messes up on a touch zoom and isn't very noticable
		}
	},

	_spiderfierOnRemove: function () {
		this._map.off('click', this._unspiderfyWrapper, this);
		this._map.off('zoomstart', this._unspiderfyZoomStart, this);
		this._map.off('zoomanim', this._unspiderfyZoomAnim, this);

		this._unspiderfy(); //Ensure that markers are back where they should be
	},


	//On zoom start we add a zoomanim handler so that we are guaranteed to be last (after markers are animated)
	//This means we can define the animation they do rather than Markers doing an animation to their actual location
	_unspiderfyZoomStart: function () {
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}

		this._map.on('zoomanim', this._unspiderfyZoomAnim, this);
	},
	_unspiderfyZoomAnim: function (zoomDetails) {
		//Wait until the first zoomanim after the user has finished touch-zooming before running the animation
		if (L.DomUtil.hasClass(this._map._mapPane, 'leaflet-touching')) {
			return;
		}

		this._map.off('zoomanim', this._unspiderfyZoomAnim, this);
		this._unspiderfy(zoomDetails);
	},


	_unspiderfyWrapper: function () {
		/// <summary>_unspiderfy but passes no arguments</summary>
		this._unspiderfy();
	},

	_unspiderfy: function (zoomDetails) {
		if (this._spiderfied) {
			this._spiderfied.unspiderfy(zoomDetails);
		}
	},

	//If the given layer is currently being spiderfied then we unspiderfy it so it isn't on the map anymore etc
	_unspiderfyLayer: function (layer) {
		if (layer._spiderLeg) {
			L.FeatureGroup.prototype.removeLayer.call(this, layer);

			layer.setOpacity(1);
			//Position will be fixed up immediately in _animationUnspiderfy
			layer.setZIndexOffset(0);

			this._map.removeLayer(layer._spiderLeg);
			delete layer._spiderLeg;
		}
	}
});



}(this));/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as anonymous module.
		define(['jquery'], factory);
	} else {
		// Browser globals.
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function raw(s) {
		return s;
	}

	function decoded(s) {
		return decodeURIComponent(s.replace(pluses, ' '));
	}

	function converted(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}
		try {
			return config.json ? JSON.parse(s) : s;
		} catch(er) {}
	}

	var config = $.cookie = function (key, value, options) {

		// write
		if (value !== undefined) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}

			value = config.json ? JSON.stringify(value) : String(value);

			return (document.cookie = [
				config.raw ? key : encodeURIComponent(key),
				'=',
				config.raw ? value : encodeURIComponent(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// read
		var decode = config.raw ? raw : decoded;
		var cookies = document.cookie.split('; ');
		var result = key ? undefined : {};
		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = decode(parts.join('='));

			if (key && key === name) {
				result = converted(cookie);
				break;
			}

			if (!key) {
				result[name] = converted(cookie);
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) !== undefined) {
			$.cookie(key, '', $.extend(options, { expires: -1 }));
			return true;
		}
		return false;
	};

}));
/*!
 * jQuery imagesLoaded plugin v2.1.1
 * http://github.com/desandro/imagesloaded
 *
 * MIT License. by Paul Irish et al.
 */

/*jshint curly: true, eqeqeq: true, noempty: true, strict: true, undef: true, browser: true */
/*global jQuery: false */

;(function($, undefined) {
'use strict';

// blank image data-uri bypasses webkit log warning (thx doug jones)
var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
	var $this = this,
		deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
		hasNotify = $.isFunction(deferred.notify),
		$images = $this.find('img').add( $this.filter('img') ),
		loaded = [],
		proper = [],
		broken = [];

	// Register deferred callbacks
	if ($.isPlainObject(callback)) {
		$.each(callback, function (key, value) {
			if (key === 'callback') {
				callback = value;
			} else if (deferred) {
				deferred[key](value);
			}
		});
	}

	function doneLoading() {
		var $proper = $(proper),
			$broken = $(broken);

		if ( deferred ) {
			if ( broken.length ) {
				deferred.reject( $images, $proper, $broken );
			} else {
				deferred.resolve( $images );
			}
		}

		if ( $.isFunction( callback ) ) {
			callback.call( $this, $images, $proper, $broken );
		}
	}

	function imgLoadedHandler( event ) {
		imgLoaded( event.target, event.type === 'error' );
	}

	function imgLoaded( img, isBroken ) {
		// don't proceed if BLANK image, or image is already loaded
		if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
			return;
		}

		// store element in loaded images array
		loaded.push( img );

		// keep track of broken and properly loaded images
		if ( isBroken ) {
			broken.push( img );
		} else {
			proper.push( img );
		}

		// cache image and its state for future calls
		$.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

		// trigger deferred progress method if present
		if ( hasNotify ) {
			deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
		}

		// call doneLoading and clean listeners if all images are loaded
		if ( $images.length === loaded.length ) {
			setTimeout( doneLoading );
			$images.unbind( '.imagesLoaded', imgLoadedHandler );
		}
	}

	// if no images, trigger immediately
	if ( !$images.length ) {
		doneLoading();
	} else {
		$images.bind( 'load.imagesLoaded error.imagesLoaded', imgLoadedHandler )
		.each( function( i, el ) {
			var src = el.src;

			// find out if this image has been already checked for status
			// if it was, and src has not changed, call imgLoaded on it
			var cached = $.data( el, 'imagesLoaded' );
			if ( cached && cached.src === src ) {
				imgLoaded( el, cached.isBroken );
				return;
			}

			// if complete is true and browser supports natural sizes, try
			// to check for image status manually
			if ( el.complete && el.naturalWidth !== undefined ) {
				imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
				return;
			}

			// cached images don't fire load sometimes, so we reset src, but only when
			// dealing with IE, or image is complete (loaded) and failed manual check
			// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
			if ( el.readyState || el.complete ) {
				el.src = BLANK;
				el.src = src;
			}
		});
	}

	return deferred ? deferred.promise( $this ) : $this;
};

})(jQuery);L.BingLayer = L.TileLayer.extend({
	options: {
		subdomains: [0, 1, 2, 3],
		type: 'Aerial',
		attribution: 'Bing',
		culture: ''
	},

	initialize: function(key, options) {
		L.Util.setOptions(this, options);

		this._key = key;
		this._url = null;
		this.meta = {};
		this.loadMetadata();
	},

	tile2quad: function(x, y, z) {
		var quad = '';
		for (var i = z; i > 0; i--) {
			var digit = 0;
			var mask = 1 << (i - 1);
			if ((x & mask) != 0) digit += 1;
			if ((y & mask) != 0) digit += 2;
			quad = quad + digit;
		}
		return quad;
	},

	getTileUrl: function(p, z) {
		var z = this._getZoomForUrl();
		var subdomains = this.options.subdomains,
			s = this.options.subdomains[Math.abs((p.x + p.y) % subdomains.length)];
		return this._url.replace('{subdomain}', s)
				.replace('{quadkey}', this.tile2quad(p.x, p.y, z))
				.replace('{culture}', this.options.culture);
	},

	loadMetadata: function() {
		var _this = this;
		var cbid = '_bing_metadata_' + L.Util.stamp(this);
		window[cbid] = function (meta) {
			_this.meta = meta;
			window[cbid] = undefined;
			var e = document.getElementById(cbid);
			e.parentNode.removeChild(e);
			if (meta.errorDetails) {
				alert("Got metadata" + meta.errorDetails);
				return;
			}
			_this.initMetadata();
		};
		var url = "http://dev.virtualearth.net/REST/v1/Imagery/Metadata/" + this.options.type + "?include=ImageryProviders&jsonp=" + cbid + "&key=" + this._key;
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = url;
		script.id = cbid;
		document.getElementsByTagName("head")[0].appendChild(script);
	},

	initMetadata: function() {
		var r = this.meta.resourceSets[0].resources[0];
		this.options.subdomains = r.imageUrlSubdomains;
		this._url = r.imageUrl;
		this._providers = [];
		for (var i = 0; i < r.imageryProviders.length; i++) {
			var p = r.imageryProviders[i];
			for (var j = 0; j < p.coverageAreas.length; j++) {
				var c = p.coverageAreas[j];
				var coverage = {zoomMin: c.zoomMin, zoomMax: c.zoomMax, active: false};
				var bounds = new L.LatLngBounds(
						new L.LatLng(c.bbox[0]+0.01, c.bbox[1]+0.01),
						new L.LatLng(c.bbox[2]-0.01, c.bbox[3]-0.01)
				);
				coverage.bounds = bounds;
				coverage.attrib = p.attribution;
				this._providers.push(coverage);
			}
		}
		this._update();
	},

	_update: function() {
		if (this._url == null || !this._map) return;
		this._update_attribution();
		L.TileLayer.prototype._update.apply(this, []);
	},

	_update_attribution: function() {
		var bounds = this._map.getBounds();
		var zoom = this._map.getZoom();
		for (var i = 0; i < this._providers.length; i++) {
			var p = this._providers[i];
			if ((zoom <= p.zoomMax && zoom >= p.zoomMin) &&
					bounds.intersects(p.bounds)) {
				if (!p.active)
					this._map.attributionControl.addAttribution(p.attrib);
				p.active = true;
			} else {
				if (p.active)
					this._map.attributionControl.removeAttribution(p.attrib);
				p.active = false;
			}
		}
	},

	onRemove: function(map) {
		for (var i = 0; i < this._providers.length; i++) {
			var p = this._providers[i];
			if (p.active) {
				this._map.attributionControl.removeAttribution(p.attrib);
				p.active = false;
			}
		}
        	L.TileLayer.prototype.onRemove.apply(this, [map]);
	}
});
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (root, factory) {
  if (typeof exports === "object" && exports) {
    module.exports = factory; // CommonJS
  } else if (typeof define === "function" && define.amd) {
    define(factory); // AMD
  } else {
    root.Mustache = factory; // <script>
  }
}(this, (function () {

  var exports = {};

  exports.name = "mustache.js";
  exports.version = "0.7.2";
  exports.tags = ["{{", "}}"];

  exports.Scanner = Scanner;
  exports.Context = Context;
  exports.Writer = Writer;

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  var _test = RegExp.prototype.test;
  var _toString = Object.prototype.toString;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  function testRe(re, string) {
    return _test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRe(nonSpaceRe, string);
  }

  var isArray = Array.isArray || function (obj) {
    return _toString.call(obj) === '[object Array]';
  };

  function escapeRe(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  exports.escape = escapeHtml;

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      this.tail = this.tail.substring(match[0].length);
      this.pos += match[0].length;
      return match[0];
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var match, pos = this.tail.search(re);

    switch (pos) {
    case -1:
      match = this.tail;
      this.pos += this.tail.length;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, pos);
      this.tail = this.tail.substring(pos);
      this.pos += pos;
    }

    return match;
  };

  function Context(view, parent) {
    this.view = view;
    this.parent = parent;
    this._cache = {};
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value = this._cache[name];

    if (!value) {
      if (name == '.') {
        value = this.view;
      } else {
        var context = this;

        while (context) {
          if (name.indexOf('.') > 0) {
            value = context.view;
            var names = name.split('.'), i = 0;
            while (value && i < names.length) {
              value = value[names[i++]];
            }
          } else {
            value = context.view[name];
          }

          if (value != null) break;

          context = context.parent;
        }
      }

      this._cache[name] = value;
    }

    if (typeof value === 'function') value = value.call(this.view);

    return value;
  };

  function Writer() {
    this.clearCache();
  }

  Writer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Writer.prototype.compile = function (template, tags) {
    var fn = this._cache[template];

    if (!fn) {
      var tokens = exports.parse(template, tags);
      fn = this._cache[template] = this.compileTokens(tokens, template);
    }

    return fn;
  };

  Writer.prototype.compilePartial = function (name, template, tags) {
    var fn = this.compile(template, tags);
    this._partialCache[name] = fn;
    return fn;
  };

  Writer.prototype.getPartial = function (name) {
    if (!(name in this._partialCache) && this._loadPartial) {
      this.compilePartial(name, this._loadPartial(name));
    }

    return this._partialCache[name];
  };

  Writer.prototype.compileTokens = function (tokens, template) {
    var self = this;
    return function (view, partials) {
      if (partials) {
        if (typeof partials === 'function') {
          self._loadPartial = partials;
        } else {
          for (var name in partials) {
            self.compilePartial(name, partials[name]);
          }
        }
      }

      return renderTokens(tokens, self, Context.make(view), template);
    };
  };

  Writer.prototype.render = function (template, view, partials) {
    return this.compile(template)(view, partials);
  };

  /**
   * Low-level function that renders the given `tokens` using the given `writer`
   * and `context`. The `template` string is only needed for templates that use
   * higher-order sections to extract the portion of the original template that
   * was contained in that section.
   */
  function renderTokens(tokens, writer, context, template) {
    var buffer = '';

    var token, tokenValue, value;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      tokenValue = token[1];

      switch (token[0]) {
      case '#':
        value = context.lookup(tokenValue);

        if (typeof value === 'object') {
          if (isArray(value)) {
            for (var j = 0, jlen = value.length; j < jlen; ++j) {
              buffer += renderTokens(token[4], writer, context.push(value[j]), template);
            }
          } else if (value) {
            buffer += renderTokens(token[4], writer, context.push(value), template);
          }
        } else if (typeof value === 'function') {
          var text = template == null ? null : template.slice(token[3], token[5]);
          value = value.call(context.view, text, function (template) {
            return writer.render(template, context);
          });
          if (value != null) buffer += value;
        } else if (value) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '^':
        value = context.lookup(tokenValue);

        // Use JavaScript's definition of falsy. Include empty arrays.
        // See https://github.com/janl/mustache.js/issues/186
        if (!value || (isArray(value) && value.length === 0)) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '>':
        value = writer.getPartial(tokenValue);
        if (typeof value === 'function') buffer += value(context);
        break;
      case '&':
        value = context.lookup(tokenValue);
        if (value != null) buffer += value;
        break;
      case 'name':
        value = context.lookup(tokenValue);
        if (value != null) buffer += exports.escape(value);
        break;
      case 'text':
        buffer += tokenValue;
        break;
      }
    }

    return buffer;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];

    var token;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      switch (token[0]) {
      case '#':
      case '^':
        sections.push(token);
        collector.push(token);
        collector = token[4] = [];
        break;
      case '/':
        var section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : tree;
        break;
      default:
        collector.push(token);
      }
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          lastToken = token;
          squashedTokens.push(token);
        }
      }
    }

    return squashedTokens;
  }

  function escapeTags(tags) {
    return [
      new RegExp(escapeRe(tags[0]) + "\\s*"),
      new RegExp("\\s*" + escapeRe(tags[1]))
    ];
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  exports.parse = function (template, tags) {
    template = template || '';
    tags = tags || exports.tags;

    if (typeof tags === 'string') tags = tags.split(spaceRe);
    if (tags.length !== 2) throw new Error('Invalid tags: ' + tags.join(', '));

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          delete tokens[spaces.pop()];
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var start, type, value, chr, token;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(tagRes[0]);
      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push(['text', chr, start, start + 1]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr == '\n') stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) break;
      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === '{') {
        value = scanner.scanUntil(new RegExp('\\s*' + escapeRe('}' + tags[1])));
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
        type = '&';
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) throw new Error('Unclosed tag at ' + scanner.pos);

      token = [type, value, start, scanner.pos];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        if (sections.length === 0) throw new Error('Unopened section "' + value + '" at ' + start);
        var openSection = sections.pop();
        if (openSection[1] !== value) throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        tags = value.split(spaceRe);
        if (tags.length !== 2) throw new Error('Invalid tags at ' + start + ': ' + tags.join(', '));
        tagRes = escapeTags(tags);
      }
    }

    // Make sure there are no open sections when we're done.
    var openSection = sections.pop();
    if (openSection) throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    tokens = squashTokens(tokens);

    return nestTokens(tokens);
  };

  // All Mustache.* functions use this writer.
  var _writer = new Writer();

  /**
   * Clears all cached templates and partials in the default writer.
   */
  exports.clearCache = function () {
    return _writer.clearCache();
  };

  /**
   * Compiles the given `template` to a reusable function using the default
   * writer.
   */
  exports.compile = function (template, tags) {
    return _writer.compile(template, tags);
  };

  /**
   * Compiles the partial with the given `name` and `template` to a reusable
   * function using the default writer.
   */
  exports.compilePartial = function (name, template, tags) {
    return _writer.compilePartial(name, template, tags);
  };

  /**
   * Compiles the given array of tokens (the output of a parse) to a reusable
   * function using the default writer.
   */
  exports.compileTokens = function (tokens, template) {
    return _writer.compileTokens(tokens, template);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  exports.render = function (template, view, partials) {
    return _writer.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = exports.render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  return exports;

}())));
var NGC = {};
NGC.viewmodel = {};
NGC.view = {};
NGC.templates = {};

(function ($, NGC) {
    NGC.config = {};

    $.extend(NGC.config, {
        data: {
            points: {
                checked: {
                    name: 'Проверенные',
                    createIcon: function () {
                        return NGC.map.getIcon('entity-checked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-small',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'checked',
                    z: 1
                },
                unchecked: {
                    name: 'Непроверенные',
                    createIcon: function () {
                        return NGC.map.getIcon('entity-unchecked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-medium',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'non-checked',
                    z: 2
                },
                blocked: {
                    name: 'Заблокированные',
                    createIcon: function () {
                        return NGC.map.getIcon('entity-blocked', 20);
                    },
                    createLayer: function () {
                        return new L.MarkerClusterGroup({
                            disableClusteringAtZoom: 17,
                            iconCreateFunction: function(cluster) {
                                return new L.DivIcon({
                                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                                    className: 'marker-cluster marker-cluster-large',
                                    iconSize: new L.Point(40, 40)
                                });
                            }
                        });
                    },
                    searchCssClass: 'blocked',
                    z: 3
                }
            }
        }
    });
})(jQuery, NGC);(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        version: null
    });
    $.extend(NGC.view, {
        $document: null
    });

    NGC.loader = {};
    $.extend(NGC.loader, {
        templates: ['entityPopupTemplate', 'entityPopupInfoTemplate', 'searchResultsTemplate', 'userLogsTemplate', 'alertsTemplate'],

        init: function () {
            var context = this;

            this.setDomOptions();

            window.setTimeout(function () {
                context.initModules();
                $('img').imagesLoaded(function () {
                    NGC.view.$body.removeClass('loading');
                });
                NGC.alerts.showAlert('historyShortcuts');
            }, 1000);
        },

        initModules: function () {
//            try {
                NGC.common.init();
                NGC.popup.init();
                NGC.alerts.init();
                NGC.permalink.init();
                NGC.map.init();
                NGC.geocoder.init();
                NGC.searcher.init();
                NGC.searcher.address.init();
                NGC.searcher.tab.init();
                NGC.editor.init();
                NGC.user.init();
                NGC.entities.init();
//                NGC.regions.init();
                NGC.josm.init();
                NGC.editor.tab.init();
                NGC.versions.init();
//            } catch (e) {
//                alert(e);
//            }
        },

        setDomOptions: function () {
            NGC.view.$document = $(document);
        }
    });

    $(document).ready(function () {
        NGC.loader.init();
    });

})(jQuery, NGC);
(function (DB, $) {
    var subscriber;
    NGC.subscriber = {};
    subscriber = NGC.subscriber;

    $.extend(NGC.subscriber, {
        isLog: false,
        routes: {},
        $document: $(document),


        subscribe: function (channel, callback, context) {
            var route = {
                callback: callback,
                context: context
            };

            if (!subscriber.routes[channel]) {
                subscriber.routes[channel] = [route];
            } else {
                subscriber.routes[channel].push(route);
            }
        },


        publish: function (channel, parameters) {
            var route,
                callbackIndex = 0,
                callbackCount;

            parameters = parameters || [];
            subscriber.trigger(channel, parameters);
            if (!subscriber.routes.hasOwnProperty(channel)) {
                return false;
            }

            for (callbackIndex, callbackCount = subscriber.routes[channel].length;
                    callbackIndex < callbackCount; callbackIndex += 1) {
                route = subscriber.routes[channel][callbackIndex];
                route.callback.apply(route.context, parameters);
            }
        },


        unsubscribe: function (channel) {
            delete subscriber.routes[channel];
        },


        call: function (channel, parameters) {
            parameters = parameters || [];
            if (!subscriber.routes.hasOwnProperty(channel)) {
                return false;
            }

            var route = subscriber.routes[channel][0];
            return route.callback.apply(route.context, parameters);
        },


        trigger: function (channel, parameters) {
            parameters = parameters || [];
            subscriber.$document.trigger(channel, parameters);
        }
    });

    NGC.subscribe = NGC.subscriber.subscribe;
    NGC.unsubscribe = NGC.subscriber.unsubscribe;
    NGC.publish = NGC.subscriber.publish;
    NGC.call = NGC.subscriber.call;
    NGC.trigger = NGC.subscriber.trigger;

}) (NGC, jQuery);(function ($, NGC) {
	NGC.helpers = {};
	$.extend(NGC.helpers, {
		getIcon: function (cssClass, iconSize) {
			return L.divIcon({
				className: cssClass,
				iconSize: [iconSize, iconSize],
				iconAnchor: [iconSize / 2, iconSize / 2],
				popupAnchor: [0, 2 - (iconSize / 2)]
			});
		},

		hashToArrayKeyValues: function (hash) {
			var res = [];
			if (Object.prototype.toString.call(hash) === '[object Array]') {
				return hash;
			}
			for (var prop in hash) {
				if (!hash.hasOwnProperty(prop)) continue;
				res.push({ 'key' : prop, 'val' : hash[prop]});
			}
			return res;
		},

		boolToString: function (bool, is_coded) {
			switch (bool) {
				case null:
					return is_coded ? 'null' : '';
					break;
				case true:
					return is_coded ? 'true' : 'Да';
					break;
				case false:
					return is_coded ? 'false' : 'Нет';
					break;
			}
			throw 'The bool value is not convertible to string'
		},

		valueNullToString: function (val) {
			if (val === null) { return ''; }
			return val;
		},

		sortByFields: function () {
			var props = arguments,
				context = this;
			return function (obj1, obj2) {
				var i = 0, result = 0, numberOfProperties = props.length;
				while(result === 0 && i < numberOfProperties) {
					result = context.dynamicSort(props[i])(obj1, obj2);
					i++;
				}
				return result;
			}
		},

		dynamicSort: function (property) {
			var sortOrder = 1;
			if(property[0] === "-") {
				sortOrder = -1;
				property = property.substr(1, property.length - 1);
			}
			return function (a,b) {
				var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
				return result * sortOrder;
			}
		},


        getURLParameter: function (name) {
            return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]);
        }
	});
})(jQuery, NGC);(function ($, NGC) {
	$.extend(NGC.view, {
		$body: null
	});

	NGC.common = {};
	$.extend(NGC.common, {
		init: function () {
			this.setDomOptions();
			this.bindEvents();
		},

		bindEvents: function () {
			NGC.view.$document.on('/ngc/common/setMainLoad', function () {
				NGC.view.$body.addClass('loader');
			});

            $('div.help-panel div.help').off('click').on('click', function () {
                NGC.view.$document.trigger('/ngc/popup/openPopup',
                    ['Добро пожаловать!', NGC.templates.welcomeTemplate({
                        rootUrl: document.url_root
                    }) ]);
            });
		},

		setDomOptions: function () {
			NGC.view.$body = $('body');
		}
	});
})(jQuery, NGC);
(function ($, NGC) {
    $.extend(NGC.view, {
        $popup: null
    });


    NGC.popup = {};
    $.extend(NGC.popup, {
        $header: null,
        $content: null,

        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            var view = NGC.view;

            view.$popup = $('#popup');
            this.$header = view.$popup.find('div.header');
            this.$content = view.$popup.find('div.content');
        },


        bindEvents: function () {
            var view = NGC.view,
                context = this;

            view.$document.on('/ngc/popup/openPopup', function (e, header, contentPopup, popupName) {
                context.openPopup(header, contentPopup, popupName);
            });

            view.$document.on('/ngc/popup/closePopup', function () {
                context.closePopup();
            });

            view.$popup.find('a.close').off('click').on('click', function () {
                context.closePopup();
            });
        },


        openPopup: function (header, content, popupName) {
            var view = NGC.view,
                $popup = view.$popup,
                marginLeft, marginTop;
            this.$header.text(header);
            this.$content.html(content);
            marginLeft = $popup.width() / 2;
            marginTop = $popup.height() / 2;
            $popup.css({
                'margin-left' : -marginLeft + 'px',
                'margin-top' :  -marginTop  + 'px'
            });
            view.$body.addClass('popup');
            view.$document.trigger('/ngc/popup/' + popupName + '/opened');
        },


        closePopup: function () {
            NGC.view.$body.removeClass('popup');
        }
    });
})(jQuery, NGC);
(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        map: null,
        mapLayers: {},
        isPopupOpened: false
    });
    $.extend(NGC.view, {
        $map: null
    });

    NGC.map = {};
    $.extend(NGC.map, {

        init: function () {
            this.bindTriggers();
            this.buildMap();
            this.buildLayerManager();
            this.buildLayers();
            this.bindMapEvents();
        },


        bindTriggers: function () {
            var context = this,
                view = NGC.view,
                viewmodel = NGC.viewmodel;

            NGC.subscribe('/ngc/map/setView', function (latlng, zoom) {
                viewmodel.map.setView(latlng, zoom);
                context.setLastExtentToCookie(latlng, zoom);
                view.$document.trigger('/ngc/permalink/update', [viewmodel.map.getCenter(), viewmodel.map.getZoom()]);
            });

            view.$document.on('/ngc/map/updateAllLayers', function () {
                NGC.view.$document.trigger('/ngc/entities/update');

            });

            NGC.subscribe('/ngc/map/openPopup', function (latlng, html) {
                var map = NGC.viewmodel.map;

                map.panTo(latlng);
                map.openPopup(L.popup({
                    maxHeight: 300,
                    minWidth: 300
                }).setLatLng(latlng).setContent(html));
            });
        },


        buildMap: function () {
            var viewmodel = NGC.viewmodel,
                selectedLayer;

            NGC.view.$map = $('#map');
            viewmodel.map = new L.Map('map');

            this.initUrlModule();
            this.initHistoryModule();

            L.control.scale().addTo(viewmodel.map);

            selectedLayer = L.layerGroup();
            viewmodel.map.addLayer(selectedLayer);
            viewmodel.mapLayers['select'] = selectedLayer;
        },


        buildLayers: function () {
            var configPoints = NGC.config.data.points,
                layerName,
                pointLayer,
                layerIndex = {},
                indexesSort = [];
            NGC.viewmodel.mapLayers.points = {};

            for (layerName in configPoints) {
                if (configPoints.hasOwnProperty(layerName)) {
                    pointLayer = configPoints[layerName].createLayer();
                    NGC.viewmodel.map.addLayer(pointLayer);
                    NGC.viewmodel.mapLayers.points[layerName] = pointLayer;
                    layerIndex[configPoints[layerName].z] = layerName;
                    indexesSort.push(configPoints[layerName].z);
                }
            }

            indexesSort.sort(function (a, b) {
                return b - a;
            });

            $.each(indexesSort, function (i, zIndex) {
                NGC.viewmodel.mapLayers.points[layerIndex[zIndex]].bringToFront();
            });
        },


        bindMapEvents: function () {
            var context = this,
                viewmodel = NGC.viewmodel;

            viewmodel.map.on('moveend', function (e) {
                var map = e.target,
                    center = map.getCenter(),
                    zoom = map.getZoom();
                context.setLastExtentToCookie(center, zoom);
                NGC.map.pushCurrentExtent();
                NGC.view.$document.trigger('/ngc/permalink/update', [center, zoom]);
                NGC.view.$document.trigger('/ngc/map/updateAllLayers');

            });

            viewmodel.map.on('popupclose', function () {
                var viewmodel = NGC.viewmodel;
                viewmodel.isPopupOpened = false;
                viewmodel.mapLayers.select.clearLayers();
            });
        },


        setLastExtentToCookie: function (latLng, zoom) {
            $.cookie('map.lat', latLng.lat, { expires: 7, path: '/' });
            $.cookie('map.lng', latLng.lng, { expires: 7, path: '/' });
            $.cookie('map.zoom', zoom, { expires: 7, path: '/' });
        }
    });
})(jQuery, NGC);

(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.map, {

        defaultExtent: {
            latlng: new L.LatLng(55.773121344534445, 37.66945838928223),
            zoom: 14
        },

        initUrlModule: function () {
            var extentFromUrl = this.getExtentFromUrl();

            if (extentFromUrl) {
                NGC.call('/ngc/map/setView', [extentFromUrl.latlng, extentFromUrl.zoom]);
            } else {
                lastExtent = this.getLastExtentFromCookie();
                if (lastExtent) {
                    NGC.call('/ngc/map/setView', [lastExtent.latlng, lastExtent.zoom]);
                } else {
                    NGC.call('/ngc/map/setView', [this.defaultExtent.latlng, this.defaultExtent.zoom]);
                }
            }
        },


        getExtentFromUrl: function () {
            var helpers = NGC.helpers,
                lat = parseFloat(helpers.getURLParameter('lat')),
                lng = parseFloat(helpers.getURLParameter('lon')),
                zoom = parseFloat(helpers.getURLParameter('zoom'));

            if (lat && lng && zoom) {
                return {'latlng': new L.LatLng(lat, lng), 'zoom': zoom};
            }
            return null;
        },


        getLastExtentFromCookie: function () {
            var lat = parseFloat($.cookie('map.lat'), 10),
                lng = parseFloat($.cookie('map.lng'), 10),
                zoom = parseInt($.cookie('map.zoom'), 10);
            if (lat && lng && zoom) {
                return {'latlng': new L.LatLng(lat, lng), 'zoom': zoom};
            } else {
                return null;
            }
        }
    });
})(jQuery, NGC);

(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.map, {
        lockHistory: false,
        extentHistory: [],
        extentHistoryPointer: -1,


        initHistoryModule: function () {
            this.bindEvents();
            this.pushCurrentExtent();
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$map.keydown(function (event) {
                if (event.keyCode === 80) { // english letter 'p'
                    context.backwardExtentHistory();
                }
                if (event.keyCode === 78) { // english letter 'n'
                    context.forwardExtentHistory();
                }
            });
        },


        pushCurrentExtent: function () {
            var newExtent = [NGC.viewmodel.map.getCenter(), NGC.viewmodel.map.getZoom()];

            if (this.extentHistoryPointer >= 0 &&
                    this.extentHistory[this.extentHistoryPointer][0].lat === newExtent[0].lat &&
                    this.extentHistory[this.extentHistoryPointer][0].lng === newExtent[0].lng &&
                    this.extentHistory[this.extentHistoryPointer][1] === newExtent[1]) {
                return false;
            }

            while (this.extentHistory.length - 1 > this.extentHistoryPointer) {
                this.extentHistory.pop();
            }

            this.extentHistory.push(newExtent);
            this.extentHistoryPointer++;
        },


        backwardExtentHistory: function () {
            var prevExtent;

            if (this.extentHistoryPointer > 0) {
                this.extentHistoryPointer -= 1;
                prevExtent = this.extentHistory[this.extentHistoryPointer];
                this.lockHistory = true;
                NGC.viewmodel.map.setView(prevExtent[0], prevExtent[1]);
                this.lockHistory = false;
            }
        },


        forwardExtentHistory: function () {
            var nextExtent;

            if (this.extentHistoryPointer + 1 < this.extentHistory.length) {
                this.extentHistoryPointer += 1;
                nextExtent = this.extentHistory[this.extentHistoryPointer];
                this.lockHistory = true;
                NGC.viewmodel.map.setView(nextExtent[0], nextExtent[1]);
                this.lockHistory = false;
            }
        }
    });
})(jQuery, NGC);

(function ($, NGC) {
	$.extend(NGC.map, {
		getIcon: function (cssClass, iconSize) {
			return L.divIcon({
				className: cssClass,
				iconSize: [iconSize, iconSize],
				iconAnchor: [iconSize / 2, iconSize / 2],
				popupAnchor: [0, 2 - (iconSize / 2)]
			});
		}
	});
})(jQuery, NGC);(function ($, NGC) {
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
})(jQuery, NGC);(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });
    $.extend(NGC.view, {

    });
    NGC.geocoder = {};
    $.extend(NGC.geocoder, {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {

        },

        directGeocode: function (geocodingSearch, callback) {
            var url = 'http://openstreetmap.ru/api/search?callback=?&q=' + geocodingSearch;
            $.ajax({
                type: 'GET',
                url: url,
                async: false,
                jsonpCallback: 'jsonCallback',
                contentType: "application/json",
                dataType: 'jsonp',
                success: function (result) {
                    callback(result);
                }
            });
        }
    });
})(jQuery, NGC);

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
        $entitiesSearchResults: null,
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
            view.$entitiesSearchResults = $('#searchEntity').find('div.searchResults');
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
                $divSearchResults = NGC.view.$entitiesSearchResults.find('div'),
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

                var $li = $(this).parent(),
                    entityId;
                NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 18);
                $('#target').show().delay(1000).fadeOut(1000);
                entityId = $li.data('id');
                $.getJSON(document['url_root'] + 'entity/' + entityId, function (data) {
                    if (!NGC.viewmodel.editable) {
                        NGC.viewmodel.entitySelected = data;
                        NGC.view.$document.trigger('/ngc/editor/startEdit');
                    }
                });
            });
            $divSearchResults.prop('class', 'active');
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

(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $divAddressSearchResults: null
    });

    NGC.searcher.address = {};
    $.extend(NGC.searcher.address, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$divAddressSearchResults = $('#searchAddress').find('div.searchResults div');
        },


        bindEvents: function () {
            var context = this;
            NGC.view.$document.on('/ngc/search/address', function () {
                context.searchAddress();
            });
        },


        searchAddress: function () {
            var context = this,
                $divAddressSearchResults = NGC.view.$divAddressSearchResults,
                matches;

            $divAddressSearchResults.empty();
            NGC.geocoder.directGeocode(NGC.viewmodel.filter.address.json.address, function (data) {
                matches = data.matches;
                $divAddressSearchResults.append(context.getHtmlForSearchResults('', matches));

                $divAddressSearchResults.find('a.target').on('click', function () {
                    var $li = $(this).parent();
                    NGC.viewmodel.map.setView(new L.LatLng($li.data('lat'), $li.data('lon')), 16);
                    $('#target').show().delay(1000).fadeOut(1000);
                });
            });
        },


        getHtmlForSearchResults: function (cssClass, matches) {
            return NGC.templates.addressSearchTemplate({
                cssClass: cssClass,
                matches: matches
            });
        }
    });
})(jQuery, NGC);

(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });
    $.extend(NGC.view, {
        $activatedSearchTab: null
    });

    NGC.searcher.tab = {};

    $.extend(NGC.searcher.tab, {


        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$activatedSearchTab = NGC.view.$searchContainer.find('ul.nav li.active');
        },


        bindEvents: function () {
            var context = this,
                $tab;

            NGC.view.$searchContainer.find('ul.nav li').off('click').on('click', function (e) {
                $tab = $(this);
                if ($tab.data('id') !== NGC.view.$activatedSearchTab.data('id')) {
                    context.activateTab($tab);
                }
            });
        },


        activateTab: function ($tab) {
            var view = NGC.view;
            view.$activatedSearchTab.removeClass('active');
            view.$activatedSearchTab = $tab.addClass('active');
            view.$searchContainer.attr('class', $tab.data('id'));
        }

    });
})(jQuery, NGC);

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

(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        entitySelected: null,
        entitySelectedId: null,
        pointLayers: {}
    });

    $.extend(NGC.view, {
    });

    NGC.entities = {};
    $.extend(NGC.entities, {
        init: function () {
            this.updatePoints();
            this.bindEvents();
            this.handleUrl();
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$document.on('/ngc/entities/update', function () {
                context.updatePoints();
            });

            NGC.subscribe('/ngc/entities/popup/openByEntity', function (entity) {
                context.openPopupByEntity(entity);
            });
        },


        updatePoints: function () {
            var validateZoom = this.validateZoom();
            this.clearLayers();
            if (!validateZoom) { return; }
            NGC.view.$document.trigger('/ngc/entities/startUpdate');
            this.updateEntitiesByAjax();
        },


        clearLayers: function () {
            var mapLayers = NGC.viewmodel.mapLayers;
            mapLayers.points.checked.clearLayers();
            mapLayers.points.unchecked.clearLayers();
            mapLayers.points.blocked.clearLayers();
        },


        updateEntitiesByAjax: function () {
            var context = this,
                url = document['url_root'] + 'entity/all',
                filter = NGC.viewmodel.filter,
                filter_json = {
                    'entity' : filter.entity.json
                };
            $.ajax({
                type: "GET",
                url: url,
                data: {
                    'bbox' : JSON.stringify(NGC.viewmodel.map.getBounds()),
                    'center' : JSON.stringify(NGC.viewmodel.map.getCenter()),
                    'filter' : JSON.stringify(filter_json)
                },
                dataType: 'json',
                success: function (data) {
                    context.renderEntities(data);
                    NGC.view.$document.trigger('/sm/searcher/update');
                    NGC.view.$document.trigger('/sm/stops/endUpdate');
                },
                context: context
            });
        },


        renderEntities: function (data) {
            var viewmodel = NGC.viewmodel,
                pointsLayers = viewmodel.mapLayers.points,
                pointsConfig = NGC.config.data.points,
                dataPointsLayers = data.data.points.layers,
                dataPointType,
                dataPointsIterable,
                dataPointsCount,
                dataPoint,
                icon,
                marker,
                i,
                htmlPopup = NGC.templates.entityPopupTemplate({ css: 'edit' }),
                context = this;

            viewmodel.pointLayers.entities = data.data.points.layers;

            for (dataPointType in dataPointsLayers) {
                if (dataPointsLayers.hasOwnProperty(dataPointType)) {
                    dataPointsIterable = dataPointsLayers[dataPointType].elements;
                    dataPointsCount = dataPointsLayers[dataPointType].count;
                    if (dataPointsCount > 0) { icon = pointsConfig[dataPointType].createIcon(); }
                    for (i = 0; i < dataPointsCount; i += 1) {
                        dataPoint = dataPointsIterable[i];
                        marker = L.marker([dataPoint.lat, dataPoint.lon], {icon: icon}).on('click', function (e) {
                            var marker = e.target;
                            NGC.call('/ngc/map/openPopup', [marker.getLatLng(), htmlPopup]);
                            context.buildEntityPopupByClick(marker.id);
                        });
                        marker.id = dataPoint.id;
                        pointsLayers[dataPointType].addLayer(marker);
                    }
                }
            }
        },


        buildEntityPopupByClick: function (entityId) {
            var context = this;

            return $.getJSON(document.url_root + 'entity/' + entityId, function (entity) {
                context.setEntitySelected(entity);
                context.buildEntityPopup(entity);
            }).error(function () {
                $('#entity-popup').removeClass('loader').empty().append('Error connection');
            });
        },


        setEntitySelected: function (entity) {
            var viewmodel = NGC.viewmodel;

            if (!viewmodel.editable) {
                viewmodel.entitySelected = entity;
            }
        },


        buildEntityPopup: function (entity) {
            var html = NGC.templates.entityPopupInfoTemplate({
                props: entity.props,
                obj: entity.obj,
                isUserEditor: NGC.viewmodel.isAuth,
                editDenied: NGC.viewmodel.editable || entity.obj.is_blocked,
                isBlocked: entity.obj.blocked,
                userBlocked: entity.obj.user_blocked,
                isUnBlocked: entity.obj.is_unblocked
            });

            $('#entity-popup').removeClass('loader').empty().append(html);

            $('button#edit').off('click').on('click', function () {
                NGC.view.$document.trigger('/ngc/editor/startEdit');
            });

            if (entity.obj.is_unblocked) {
                $('#unblock').off('click').on('click', function () {
                    $.ajax({
                        type: 'GET',
                        url: document['url_root'] + 'entity/unblock/' + NGC.viewmodel.entitySelected.obj.id
                    }).done(function () {
                            NGC.viewmodel.map.closePopup();
                            NGC.view.$document.trigger('/ngc/map/updateAllLayers');
                        });
                });
            }
        },


        openPopupByEntity: function (entity) {
            var entityObj = entity.obj,
                latlng = [entityObj.geom.lat, entityObj.geom.lng],
                html = NGC.templates.entityPopupTemplate({ css: 'edit' });

            NGC.call('/ngc/map/openPopup', [latlng, html]);
            this.setEntitySelected(entity);
            this.buildEntityPopup(entity);
        },


        validateZoom: function () {
            if (NGC.viewmodel.map.getZoom() < 14) {
                NGC.alerts.showAlert('zoom');
                return false;
            }
            return true;
        }
    });
})(jQuery, NGC);

(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.entities, {

        handleUrl: function () {
            var context =  this,
                entityFromUrl = this.getEntityFromUrl();

            if (entityFromUrl) {
                if (entityFromUrl.editable === true && NGC.viewmodel.isAuth === true) {
                    $.when(this.getAjaxEntity(entityFromUrl)).then(function (entity) {
                        NGC.call('/ngc/map/setView', [[entity.obj.geom.lat, entity.obj.geom.lng], 17]);
                        context.setEntitySelected(entity);
                        NGC.view.$document.trigger('/ngc/editor/startEdit');
                    });
                } else {
                    $.when(this.getAjaxEntity(entityFromUrl)).then(function (entity) {
                        NGC.viewmodel.map.setZoom(17);
                        NGC.call('/ngc/entities/popup/openByEntity', [entity]);
                    });
                }
            }
        },


        getEntityFromUrl: function () {
            var helpers = NGC.helpers,
                uikOfficialNumber = helpers.getURLParameter('uik'),
                regionCode = helpers.getURLParameter('reg'),
                editable = helpers.getURLParameter('edit');

            if (uikOfficialNumber !== 'null' && regionCode !== 'null') {
                return {
                    'uikOfficialNumber': uikOfficialNumber,
                    'regionCode': regionCode,
                    'editable': editable === 'True' || editable === 'true'
                };
            }

            return null;
        },


        getAjaxEntity: function (entityFromUrl) {
            return $.getJSON(document.url_root + 'uik/' + entityFromUrl.regionCode + '/' + entityFromUrl.uikOfficialNumber);
        }
    });
})(jQuery, NGC);(function ($, NGC) {
    $.extend(NGC.viewmodel, {

    });
    $.extend(NGC.view, {

    });
    NGC.regions = {};

    NGC.regions.colorMap = {
        1: "#0000FF",
        2: "#A52A2A",
        3: "#D2691E",
        4: "#DC143C",
        5: "#00008B",
        6: "#B8860B",
        7: "#006400",
        8: "#8B008B",
        9: "#556B2F",
        10: "#FF8C00",
        11: "#9932CC",
        12: "#8B0000",
        13: "#9400D3",
        14: "#FF1493",
        15: "#00BFFF",
        16: "#B22222",
        17: "#228B22",
        18: "#FFD700",
        19: "#DAA520",
        20: "#008000",
        21: "#FF69B4",
        22: "#CD5C5C",
        23: "#F08080",
        24: "#800000",
        25: "#66CDAA",
        26: "#0000CD",
        27: "#BA55D3",
        28: "#9370DB",
        29: "#3CB371",
        30: "#7B68EE",
        31: "#00FA9A",
        32: "#48D1CC",
        33: "#C71585",
        34: "#FF00FF",
        35: "#FF0000",
        36: "#BC8F8F",
        37: "#4169E1",
        38: "#8B4513",
        39: "#FA8072",
        40: "#F4A460",
        41: "#2E8B57",
        42: "#800080",
        43: "#4682B4",
        44: "#008080",
        45: "#9ACD32"
    };

    $.extend(NGC.regions, {
        init: function () {
            this.getData();
        },


        getData: function () {
            var that = this,
                getRegionsData = new $.Deferred(),
                getLinesData = new $.Deferred();

            $.ajax({
                dataType: "json",
                url: document['url_root'] + 'static/data/mos-mo-splitted.json',
                success: function (data) {
                    that.buildRegionsLayer(data);
                    getRegionsData.resolve();
                },
                error: function (data, status, error) {
                    alert(data, status, error);
                }
            });

            $.ajax({
                dataType: "json",
                url: document['url_root'] + 'static/data/mos-io-lines.json',
                success: function (data) {
                    that.buildBordersDistrictsLayer(data);
                    getLinesData.resolve();
                },
                error: function (data, status, error) {
                    alert(data, status, error);
                }
            });

            $.when(getRegionsData.promise(), getLinesData.promise()).then(function () {
                that.bindRegionLayersEvent();
                that.verifyLayersByZoom();
                NGC.viewmodel.map.addLayer(that.bordersDistrictsLayer);
            });
        },


        regionsLayer: null,
        buildRegionsLayer: function (data) {
            this.regionsLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        color: '#F0FFFF',
                        fillColor: NGC.regions.colorMap[feature.properties.IO_ID],
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.4
                    };
                },
                onEachFeature: function (feature, layer) {
                    var popupContent = '<b>Район: ' + feature.properties.NAME + '</b>' +
                        '</br>Избирательный округ №' + feature.properties.IO_ID +
                        '</br>OKATO: ' + feature.properties['OKATO'] +
                        '</br>OKTMO: ' + feature.properties['OKTMO'];
                    layer.bindPopup(popupContent);
                }
            });
        },


        bordersDistrictsLayer: null,
        buildBordersDistrictsLayer: function (data) {
            this.bordersDistrictsLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        color: '#0000FF',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0
                    };
                }
            });
        },


        bindRegionLayersEvent: function () {
            var that = this;
            NGC.viewmodel.map.on('moveend', function (e) {
                var map = e.target,
                    zoom = map.getZoom();
                that.verifyLayersByZoom(zoom);
            });
        },

        verifyLayersByZoom: function (zoom) {
            if (!zoom) {
                zoom = NGC.viewmodel.map.getZoom();
            }
            if (zoom > 14) {
                NGC.viewmodel.map.removeLayer(this.regionsLayer);
            } else {
                NGC.viewmodel.map.addLayer(this.regionsLayer);
                this.regionsLayer.bringToBack();
            }
        }
    });
})(jQuery, NGC);

(function ($, NGC) {
    NGC.alerts = {};

    $.extend(NGC.view, {
        $alerts: null
    });

    $.extend(NGC.viewmodel, {
        alerts: {}
    });

    $.extend(NGC.alerts, {

        alerts: {
            historyShortcuts : {
                id: 'historyShortcuts',
                type: 'info',
                text: 'Пожалуйста, не используйте данные с других карт!',
                statusText: 'Мы создаем открытые данные без нарушений чужих лицензионных соглашений.'
            },
            'zoom' : {
                id: 'zoom',
                type: 'alert',
                text: 'Увеличьте масштаб для отображения объектов',
                statusText: 'Мелкий масштаб!'
            },
            'saveSuccessful' : {
                id: 'saveSuccessful',
                type: 'info',
                text: 'Объект успешно обновлен',
                statusText: ''
            },
            saveError: {
                id: 'saveError',
                type: 'error',
                text: 'Ошибка - объект не обновлен.',
                statusText: 'Ошибка!'
            },
            changeCoordinates: {
                id: 'coodrinateChanged',
                type: 'info',
                text: 'После изменения координаты должны быть применены.',
                statusText: 'Внимание! '
            },
            notAppliedCoordinates: {
                id: 'notAppliedCoordinates',
                type: 'error',
                text: 'Вы не применили координаты к редактируемому объекту. ',
                statusText: 'Ошибка сохранения:'
            },
            validateCoordinatesError: {
                id: 'valCoordError',
                type: 'error',
                text: 'Десятичные градусы должны быть введены как 58.00000',
                statusText: 'Неправильный формат ввода координат:'
            },
            regeocodeSuccess: {
                id: 'regeocodeSuccess',
                type: 'info',
                text: 'координаты обновлены',
                statusText: 'Геокодирование завершилось успешно:'
            },
            regeocodeFail: {
                id: 'regeocodeFail',
                type: 'error',
                text: 'координаты не были обновлены',
                statusText: 'Адрес не был геокодирован:'
            },
            creatorFail: {
                id: 'creatorFail',
                type: 'error',
                text: 'зарегистрируйтесь и авторизуйтесь, пожалуйста',
                statusText: 'Создавать новые объекты нельзя:'
            }
        },

        init: function () {
            NGC.view.$alerts = $('#alerts');
        },


        showAlert: function (alert) {
            if (!this.alerts[alert] || NGC.viewmodel.alerts[alert]) { return false; }
            NGC.viewmodel.alerts[alert] = true;
            var html = NGC.templates.alertsTemplate(this.alerts[alert]);
            NGC.view.$alerts.append(html);
            $('#alert_' + this.alerts[alert].id).fadeIn().delay(2000).fadeOut('slow', function () {
                $(this).remove();
                NGC.viewmodel.alerts[alert] = false;
            });
        }
    });
})(jQuery, NGC);(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        isAuth: false
    });
    $.extend(NGC.view, {
        $userContainer: null,
        $signInForm: null,
        $signOutForm: null
    });
    NGC.user = {};
    $.extend(NGC.user, {
        init: function () {
            this.setDomOptions();
            this.handleFirstUser();
        },


        setDomOptions: function () {
            NGC.view.$userContainer = $('#userContainer');
            NGC.view.$signInForm = $('#signInForm');
            NGC.view.$signOutForm = $('#signOutForm');
            if (NGC.view.$userContainer.hasClass('inner')) {
                NGC.viewmodel.isAuth = true;
            }
        },


        handleFirstUser: function () {
            var isUserKnown = $.cookie('ngc.user.known');
            if (!isUserKnown) {
                $.cookie('ngc.user.known', 'True', { expires: 200, path: '/' });

                NGC.view.$document.on('/ngc/popup/welcome/opened', function () {
                    $('#welcomePopup div.start input').off('click').on('click', function () {
                        NGC.view.$document.trigger('/ngc/popup/closePopup');
                        $(this).unbind('click');
                    });
                });

                NGC.view.$document.trigger('/ngc/popup/openPopup',
                    [
                        'Добро пожаловать!',
                        NGC.templates.welcomeTemplate({
                            rootUrl: document.url_root,
                            first: true
                        }),
                        'welcome'
                    ]);
            }
        }
    });
})(jQuery, NGC);

(function ($, NGC) {

    $.extend(NGC.view, {
        $permalink: null,
        $fb_link: null
    });

    NGC.permalink = {};
    $.extend(NGC.permalink, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$permalink = $('#permalink');
            NGC.view.$fb_link = $('#rightPanel a.facebook');
        },


        bindEvents: function () {
            NGC.view.$document.on('/ngc/permalink/update', function (event, latlng, zoom) {
                var view = NGC.view,
                    url = document['url_root'] + '?lat=' + latlng.lat + '&lon=' + latlng.lng + '&zoom=' + zoom;
                view.$permalink.prop('href', url);
                view.$fb_link.prop('href', 'https://www.facebook.com/sharer/sharer.php?u=' + url);
            });
        }
    });
})(jQuery, NGC);
(function ($, NGC) {

    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $josmLink: null
    });

    NGC.josm = {};
    $.extend(NGC.josm, {

        init: function () {
            this.bindEvents();
            this.setDomOptions();
        },


        setDomOptions: function () {
            NGC.view.$josmLink = $('#josm-link');
        },


        bindEvents: function () {
            $('#json_link').on('mouseover', function() {
                var bounds = NGC.viewmodel.map.getBounds(),
                    link = ('http://127.0.0.1:8111/load_and_zoom?' +
                        'left=' + bounds.getNorthWest().lng +
                        '&top=' + bounds.getNorthWest().lat +
                        '&right=' + bounds.getSouthEast().lng +
                        '&bottom=' + bounds.getSouthEast().lat);
                $(this).attr('href', link);
            });
        }
    });

})(jQuery, NGC);
(function ($, NGC) {
    $.extend(NGC.viewmodel, {
        version: null
    });
    $.extend(NGC.view, {
        $divVersions: null
    });

    NGC.versions = {};
    $.extend(NGC.versions, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$divVersions = $('#versionsEntity');
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$document.on('/ngc/versions/build', function () {
                context.buildVersions();
            });

            NGC.view.$document.on('/ngc/versions/clearUI', function () {
                context.clearVersionsUI();
            });
        },


        buildVersions: function () {
            NGC.view.$divVersions.empty();
            if (NGC.viewmodel.entitySelected.versions && NGC.viewmodel.entitySelected.versions.length > 0) {
                for (var version_id in NGC.viewmodel.entitySelected.versions) {
                    var version = NGC.viewmodel.entitySelected.versions[version_id];
                    var html = NGC.templates.versionsTemplate({
                        num: +version_id + 1,
                        name: version.display_name,
                        time: version.time
                    });
                    NGC.view.$divVersions.append(html);
                }
            } else {
                NGC.view.$divVersions.append('У этого УИКа нет сохраненных версий');
            }
        },

        clearVersionsUI: function () {
            NGC.view.$divVersions.empty();
        }
    });
})(jQuery, NGC);(function ($, NGC) {

    $.extend(NGC.viewmodel, {

    });

    $.extend(NGC.view, {
        $activatedEditorTab: null
    });

    NGC.editor.tab = {};

    $.extend(NGC.editor.tab, {
        init: function () {
            this.setDomOptions();
            this.bindEvents();
        },


        setDomOptions: function () {
            NGC.view.$activatedEditorTab = NGC.view.$editorContainer.find('ul.nav li.active');
        },


        bindEvents: function () {
            var context = this,
                $tab;

            NGC.view.$editorContainer.find('ul.nav li').off('click').on('click', function (e) {
                $tab = $(this);
                if ($tab.data('id') !== NGC.view.$activatedEditorTab.data('id')) {
                    context.activateTab($tab);
                }
            });
        },

        activateTab: function ($tab) {
            var view = NGC.view;
            view.$activatedEditorTab.removeClass('active');
            view.$activatedEditorTab = $tab.addClass('active');
            view.$editorContainer.attr('class', $tab.data('id'));
        }

    });
})(jQuery, NGC);

