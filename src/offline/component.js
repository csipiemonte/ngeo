// The MIT License (MIT)
//
// Copyright (c) 2018-2020 Camptocamp SA
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import ngeoMapFeatureOverlayMgr from 'ngeo/map/FeatureOverlayMgr.js';
import ngeoMessageModalComponent from 'ngeo/message/modalComponent.js';
import {extentToRectangle} from 'ngeo/utils.js';
import olCollection from 'ol/Collection.js';
import {unByKey} from 'ol/Observable.js';
import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import olGeomGeometryLayout from 'ol/geom/GeometryLayout.js';
import {DEVICE_PIXEL_RATIO} from 'ol/has.js';
import angular from 'angular';

/**
 * @type {!angular.IModule}
 */
const module = angular.module('ngeoOffline', [ngeoMapFeatureOverlayMgr.name, ngeoMessageModalComponent.name]);

module.value(
  'ngeoOfflineTemplateUrl',
  /**
   * @param {JQuery} element Element.
   * @param {angular.IAttributes} attrs Attributes.
   * @return {string} Template URL.
   */
  (element, attrs) => {
    const templateUrl = attrs['ngeoOfflineTemplateurl'];
    return templateUrl !== undefined ? templateUrl : 'ngeo/offline/component.html';
  }
);

module.run(
  /**
   * @ngInject
   * @param {angular.ITemplateCacheService} $templateCache
   */
  ($templateCache) => {
    // @ts-ignore: webpack
    $templateCache.put('ngeo/offline/component.html', require('./component.html'));
  }
);

/**
 * @param {!JQuery} $element Element.
 * @param {!angular.IAttributes} $attrs Attributes.
 * @param {!function(!JQuery, !angular.IAttributes): string} ngeoOfflineTemplateUrl Template function.
 * @return {string} Template URL.
 * @ngInject
 */
function ngeoOfflineTemplateUrl($element, $attrs, ngeoOfflineTemplateUrl) {
  return ngeoOfflineTemplateUrl($element, $attrs);
}

/**
 * Provides the "offline" component.
 *
 * Example:
 *
 *     <ngeo-offline
 *       ngeo-offline-map="ctrl.map"
 *       ngeo-offline-extentsize="ctrl.offlineExtentSize">
 *       ngeo-offline-mask-margin="::100"
 *       ngeo-offline-min_zoom="::11"
 *       ngeo-offline-max_zoom="::15"
 *     </ngeo-offline>
 *
 * See our live example: [../examples/offline.html](../examples/offline.html)
 *
 * @htmlAttribute {import("ol/Map.js").default} ngeo-offline-map The map.
 * @htmlAttribute {number} ngeo-offline-extentsize The size, in map units, of a side of the extent.
 * @private
 * @ngdoc component
 * @ngname ngeoOffline
 */
const component = {
  bindings: {
    'map': '<ngeoOfflineMap',
    'extentSize': '<?ngeoOfflineExtentsize',
    'maskMargin': '<?ngeoOfflineMaskMargin',
    'minZoom': '<?ngeoOfflineMinZoom',
    'maxZoom': '<?ngeoOfflineMaxZoom',
  },
  controller: 'ngeoOfflineController',
  templateUrl: ngeoOfflineTemplateUrl,
};

module.component('ngeoOffline', component);

export const Controller = class {
  /**
   * @private
   * @param {angular.ITimeoutService} $timeout Angular timeout service.
   * @param {import("ngeo/map/FeatureOverlayMgr.js").FeatureOverlayMgr} ngeoFeatureOverlayMgr
   * ngeo feature overlay manager service.
   * @param {import("ngeo/offline/ServiceManager.js").default} ngeoOfflineServiceManager
   * ngeo offline service Manager.
   * @param {import("ngeo/offline/Configuration.js").default} ngeoOfflineConfiguration
   * ngeo offline configuration service.
   * @param {import("ngeo/offline/Mode.js").default} ngeoOfflineMode Offline mode manager.
   * @param {import("ngeo/offline/NetworkStatus.js").default} ngeoNetworkStatus ngeo network status service.
   * @ngInject
   * @ngdoc controller
   * @ngname ngeoOfflineController
   */
  constructor(
    $timeout,
    ngeoFeatureOverlayMgr,
    ngeoOfflineServiceManager,
    ngeoOfflineConfiguration,
    ngeoOfflineMode,
    ngeoNetworkStatus
  ) {
    /**
     * @type {angular.ITimeoutService}
     * @private
     */
    this.$timeout_ = $timeout;

    /**
     * @type {import("ngeo/offline/ServiceManager.js").default}
     * @private
     */
    this.ngeoOfflineServiceManager_ = ngeoOfflineServiceManager;

    /**
     * @private
     * @type {import("ngeo/offline/Configuration.js").default}
     */
    this.ngeoOfflineConfiguration_ = ngeoOfflineConfiguration;

    /**
     * @type {import("ngeo/offline/Mode.js").default}
     * @export
     */
    this.offlineMode = ngeoOfflineMode;

    /**
     * @type {import("ngeo/offline/NetworkStatus.js").default}
     * @export
     */
    this.networkStatus = ngeoNetworkStatus;

    /**
     * The map.
     * @type {!import("ol/Map").default}
     * @export
     */
    // @ts-ignore
    this.map;

    /**
     * The size, in map units, of a side of the extent.
     * @type {number}
     * @export
     */
    this.extentSize = 0;

    /**
     * @type {import("ngeo/map/FeatureOverlay.js").FeatureOverlay}
     * @private
     */
    this.featuresOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

    /**
     * @type {!olCollection<Feature<import('ol/geom/Geometry.js').default>>}
     * @private
     */
    this.overlayCollection_ = new olCollection();

    this.featuresOverlay_.setFeatures(this.overlayCollection_);

    /**
     * @type {function(import("ol/render/Event").default):any}
     */
    this.postcomposeListener_ = this.createMaskPostcompose_();

    /**
     * @type {?import("ol/events.js").EventsKey|Array.<import("ol/events.js").EventsKey>}
     * @private
     */
    this.postComposeListenerKey_ = null;

    /**
     * @type {?Polygon}
     * @private
     */
    this.dataPolygon_ = null;

    /**
     * Whether the current view is the extent selection.
     * @type {boolean}
     * @export
     */
    this.selectingExtent = false;

    /**
     * Whether the current view is downloading one.
     * @type {boolean}
     * @export
     */
    this.downloading = false;

    /**
     * The progression of the data loading (0-100%).
     * @type {number}
     * @export
     */
    this.progressPercents = 0;

    /**
     * Whether the menu is currently displayed.
     * @type {boolean}
     * @export
     */
    this.menuDisplayed = false;

    /**
     * Whether the cancel download modal is displayed.
     * @type {boolean}
     * @export
     */
    this.displayAlertAbortDownload = false;

    /**
     * Whether the load data modal is displayed.
     * @type {boolean}
     * @export
     */
    this.displayAlertLoadData = false;

    /**
     * Whether the "no layer" modal is displayed.
     * @type {boolean}
     * @export
     */
    this.displayAlertNoLayer = false;

    /**
     * Offline mask minimum margin in pixels.
     * @type {number}
     * @export
     */
    this.maskMargin = 0;

    /**
     * Minimum zoom where offline is enable.
     * @type {number}
     * @export
     */
    this.minZoom = 0;

    /**
     * Maximum zoom where offline is enable.
     * @type {number}
     * @export
     */
    this.maxZoom = 0;

    /**
     * Map view max zoom constraint.
     * @type {number}
     * @export
     */
    this.originalMinZoom = 0;

    /**
     * Map view min zoom constraint.
     * @type {number}
     * @export
     */
    this.originalMaxZoom = 0;

    /**
     * @type {number}
     * @export
     */
    this.estimatedLoadDataSize = 0;

    /**
     * @private
     * @param {import("ngeo/CustomEvent").default<any>} event the progress event.
     */
    this.progressCallback_ = (event) => {
      const progress = event.detail['progress'];
      this.progressPercents = Math.floor(progress * 100);
      if (progress === 1) {
        this.finishDownload_();
      }
      this.$timeout_(() => {}, 0); // FIXME: force redraw
    };
  }

  $onInit() {
    this.offlineMode.registerComponent(this);
    this.ngeoOfflineConfiguration_.on('progress', this.progressCallback_);
    this.maskMargin = this.maskMargin || 100;
    this.minZoom = this.minZoom || 10;
    this.maxZoom = this.maxZoom || 15;
  }

  $onDestroy() {
    this.ngeoOfflineConfiguration_.un('progress', this.progressCallback_);
  }

  /**
   * @return {boolean} True if data are accessible offline.
   * @export
   */
  hasData() {
    return this.ngeoOfflineConfiguration_.hasOfflineData();
  }

  /**
   * @export
   */
  computeSizeAndDisplayAlertLoadData() {
    this.estimatedLoadDataSize = this.ngeoOfflineConfiguration_.estimateLoadDataSize(this.map);
    if (this.estimatedLoadDataSize > 0) {
      this.displayAlertLoadData = true;
    } else {
      this.displayAlertNoLayer = true;
    }
  }
  /**
   * Toggle the selecting extent view.
   * @param {boolean=} finished If just finished downloading.
   * @export
   */
  toggleViewExtentSelection(finished) {
    this.menuDisplayed = false;
    this.selectingExtent = !this.selectingExtent;

    if (this.postComposeListenerKey_) {
      unByKey(this.postComposeListenerKey_);
      this.postComposeListenerKey_ = null;
      this.removeZoomConstraints_();
    }
    if (this.selectingExtent && !this.postComposeListenerKey_) {
      this.addZoomConstraints_();
      this.postComposeListenerKey_ = this.map.on('postcompose', this.postcomposeListener_);
    }
    this.map.render();
  }

  /**
   * Validate the current extent and download data.
   * @export
   */
  validateExtent() {
    this.progressPercents = 0;
    const extent = this.getDowloadExtent_();
    this.downloading = true;
    this.ngeoOfflineServiceManager_.save(extent, this.map);
  }

  /**
   * @private
   */
  finishDownload_() {
    this.downloading = false;
    this.toggleViewExtentSelection(true);
  }

  /**
   * Ask to abort the download of data.
   * @export
   */
  askAbortDownload() {
    this.displayAlertAbortDownload = true;
  }

  /**
   * Abort the download of data.
   * @export
   */
  abortDownload() {
    this.downloading = false;
    this.ngeoOfflineServiceManager_.cancel();
    this.deleteData();
  }

  /**
   * Show the main menu.
   * @export
   */
  showMenu() {
    this.menuDisplayed = true;
  }

  /**
   * Activate offline mode.
   * Zoom to the extent of that data and restore the data.
   * @export
   */
  activateOfflineMode() {
    this.ngeoOfflineServiceManager_.restore(this.map).then((extent) => {
      this.dataPolygon_ = this.createPolygonFromExtent_(extent);
      const size = this.map.getSize();
      if (size === undefined) {
        throw new Error('Missing size');
      }
      this.map.getView().fit(extent, {size});
      this.menuDisplayed = false;
      this.displayExtent_();
      this.offlineMode.enable();
    });
  }

  /**
   *
   * Deactivate offline mode.
   * Reload the page.
   * @export
   */
  deactivateOfflineMode() {
    window.location.reload();
  }

  /**
   * Toggle the visibility of the data's extent.
   * @export
   */
  toggleExtentVisibility() {
    if (this.isExtentVisible()) {
      this.overlayCollection_.clear();
    } else {
      this.displayExtent_();
    }
  }

  /**
   * @return {boolean} True if the extent is currently visible. False otherwise.
   * @export
   */
  isExtentVisible() {
    return this.overlayCollection_.getLength() > 0;
  }

  /**
   * Delete the saved data.
   * @export
   */
  deleteData() {
    this.overlayCollection_.clear();
    this.dataPolygon_ = null;
    if (this.networkStatus.isDisconnected()) {
      this.menuDisplayed = false;
    }

    const reloadIfInOfflineMode = () => {
      if (this.offlineMode.isEnabled()) {
        this.deactivateOfflineMode();
      }
    };
    this.ngeoOfflineConfiguration_.clear().then(reloadIfInOfflineMode);
  }

  /**
   * @private
   */
  displayExtent_() {
    if (!this.isExtentVisible() && this.dataPolygon_) {
      const feature = new Feature(this.dataPolygon_);
      this.overlayCollection_.push(feature);
    }
  }

  /**
   * When enabling mask extent, zoom the view to the defined zoom range and
   * add constraints to the view to not allow user to move out of this range.
   * @private
   */
  addZoomConstraints_() {
    const view = this.map.getView();
    const zoom = view.getZoom() || 0;

    this.originalMinZoom = view.getMinZoom();
    this.originalMaxZoom = view.getMaxZoom();

    if (zoom < this.minZoom) {
      view.setZoom(this.minZoom);
    } else if (zoom > this.maxZoom) {
      view.setZoom(this.maxZoom);
    }
    view.setMaxZoom(this.maxZoom);
    view.setMinZoom(this.minZoom);
  }

  /**
   * @private
   */
  removeZoomConstraints_() {
    const view = this.map.getView();
    view.setMaxZoom(this.originalMaxZoom);
    view.setMinZoom(this.originalMinZoom);
  }

  /**
   * @return {function(import("ol/render/Event").default):any} Function to use as a map postcompose listener.
   * @private
   */
  createMaskPostcompose_() {
    return (evt) => {
      const context = evt.context;
      const frameState = evt.frameState;
      if (!context || !frameState) {
        throw new Error('Missing context or frameState');
      }

      const resolution = frameState.viewState.resolution;

      const viewportWidth = frameState.size[0] * frameState.pixelRatio;
      const viewportHeight = frameState.size[1] * frameState.pixelRatio;

      const extentLength = this.extentSize
        ? (this.extentSize / resolution) * DEVICE_PIXEL_RATIO
        : Math.min(viewportWidth, viewportHeight) - this.maskMargin * 2;

      const extentHalfLength = Math.ceil(extentLength / 2);

      // Draw a mask on the whole map.
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(viewportWidth, 0);
      context.lineTo(viewportWidth, viewportHeight);
      context.lineTo(0, viewportHeight);
      context.lineTo(0, 0);
      context.closePath();

      // Draw the get data zone
      const extent = this.createExtent_([viewportWidth / 2, viewportHeight / 2], extentHalfLength);

      context.moveTo(extent[0], extent[1]);
      context.lineTo(extent[0], extent[3]);
      context.lineTo(extent[2], extent[3]);
      context.lineTo(extent[2], extent[1]);
      context.lineTo(extent[0], extent[1]);
      context.closePath();

      // Fill the mask
      context.fillStyle = 'rgba(0, 5, 25, 0.5)';
      context.fill();
    };
  }

  /**
   * A polygon on the whole extent of the projection, with a hole for the offline extent.
   * @param {import("ol/extent.js").Extent} extent An extent
   * @return {Polygon} Polygon to save, based on the projection extent, the center of the map and
   *     the extentSize property.
   * @private
   */
  createPolygonFromExtent_(extent) {
    const projExtent = this.map.getView().getProjection().getExtent();
    return new Polygon([extentToRectangle(projExtent), extentToRectangle(extent)], olGeomGeometryLayout.XY);
  }

  /**
   * @param {import("ol/coordinate.js").Coordinate} center, a xy point.
   * @param {number} halfLength a half length of a square's side.
   * @return {Array.<number>} an extent.
   * @private
   */
  createExtent_(center, halfLength) {
    const minx = center[0] - halfLength;
    const miny = center[1] - halfLength;
    const maxx = center[0] + halfLength;
    const maxy = center[1] + halfLength;
    return [minx, miny, maxx, maxy];
  }

  /**
   * @return {import("ol/extent.js").Extent} the download extent.
   * @private
   */
  getDowloadExtent_() {
    const center = /** @type {import("ol/coordinate.js").Coordinate}*/ (this.map.getView().getCenter());
    const halfLength = Math.ceil(this.extentSize || this.getExtentSize_()) / 2;
    return this.createExtent_(center, halfLength);
  }

  getExtentSize_() {
    const mapSize = this.map.getSize() || [150, 150];
    const maskSizePixel = DEVICE_PIXEL_RATIO * Math.min(mapSize[0], mapSize[1]) - this.maskMargin * 2;
    const maskSizeMeter = (maskSizePixel * (this.map.getView().getResolution() || 1)) / DEVICE_PIXEL_RATIO;
    return maskSizeMeter;
  }
};

module.controller('ngeoOfflineController', Controller);

export default module;
