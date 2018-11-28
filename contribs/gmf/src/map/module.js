/**
 * @module gmf.map.module
 */
import gmfMapComponent from 'gmf/map/component.js';
import gmfMapMousepositionComponent from 'gmf/map/mousepositionComponent.js';

/**
 * @type {!angular.IModule}
 */
export default angular.module('gmfMapModule', [
  gmfMapComponent.name,
  gmfMapMousepositionComponent.name,
]);
