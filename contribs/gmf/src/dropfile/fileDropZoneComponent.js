// The MIT License (MIT)
//
// Copyright (c) 2016-2020 Camptocamp SA
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

import angular from 'angular';
import {MessageType} from 'ngeo/message/Message.js';
import './fileAlert.scss';

/**
 * @type {angular.IModule}
 * @hidden
 */
const module = angular.module('gmffileDropZone', []);

module.run(
  /**
   * @ngInject
   * @param {angular.ITemplateCacheService} $templateCache
   */
  ($templateCache) => {
    // @ts-ignore: webpack
    $templateCache.put('gmf/dropfile/fileDropZoneComponent', require('./fileDropZoneComponent.html'));
  }
);

module.value(
  'gmfFileDropZoneTemplateUrl',
  /**
   * @param {angular.IAttributes} $attrs Attributes.
   * @return {string} The template url.
   */
  ($attrs) => {
    const templateUrl = $attrs.gmfFileDropZoneTemplateUrl;
    return templateUrl !== undefined ? templateUrl : 'gmf/dropfile/fileDropZoneComponent';
  }
);

/**
 * @param {angular.IAttributes} $attrs Attributes.
 * @param {function(angular.IAttributes): string} gmfFileDropZoneTemplateUrl Template function.
 * @return {string} Template URL.
 * @ngInject
 * @private
 * @hidden
 */
function gmfFileDropZoneTemplateUrl($attrs, gmfFileDropZoneTemplateUrl) {
  return gmfFileDropZoneTemplateUrl($attrs);
}

/**
 * Provide file drop zone component.
 *
 * Example:
 *      <gmf-file-drop-zone ng-if="ctrl.dropFileEnabled"></gmf-file-drop-zone>
 *
 * If ng-if="ctrl.dropFileEnabled" is used, the component has to be enabled by
 *       module.value('gmfDropFileEnabled', true);
 *
 * @ngdoc component
 * @ngname gmfFileDropZone
 */
const fileDropComponent = {
  controller: 'gmfFileDropZoneController as ctrl',
  templateUrl: gmfFileDropZoneTemplateUrl,
};

module.component('gmfFileDropZone', fileDropComponent);

/**
 * @param {JQuery} $element Element.
 * @param {import("ngeo/message/Notification.js").MessageNotification} ngeoNotification Ngeo notification
 * @param {import("gmf/datasource/ExternalDataSourcesManager.js").ExternalDatSourcesManager} gmfExternalDataSourcesManager The manager of external datasources.
 * @param {angular.gettext.gettextCatalog} gettextCatalog Gettext catalog.
 * @constructor
 * @private
 * @hidden
 * @ngInject
 * @ngdoc controller
 * @ngname gmfFileDropZoneController
 */
function Controller($element, ngeoNotification, gmfExternalDataSourcesManager, gettextCatalog) {
  this.$postLink = function () {
    const processDrag = function () {
      if (event !== null) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.type === 'dragenter' || event.type === 'dragleave') {
        const dropZone = document.getElementById('drop-zone');

        if (event.type === 'dragenter') {
          dropZone.classList.remove('drop-zone-off');
          dropZone.classList.add('drop-zone');
        }
        if (event.type === 'dragleave') {
          dropZone.classList.remove('drop-zone');
          dropZone.classList.add('drop-zone-off');
        }
      }
    };

    $element.bind('dragover', processDrag);
    $element.bind('dragenter', processDrag);
    $element.bind('dragleave', processDrag);

    $element.bind('drop', function () {
      if (event !== null) {
        event.preventDefault();
      }
      const dropZone = document.getElementById('drop-zone');
      dropZone.classList.remove('drop-zone');
      dropZone.classList.add('drop-zone-off');
      dropZone.classList.remove('drop-zone');
      dropZone.classList.add('drop-zone-off');
      const file = event.dataTransfer.files[0];
      gmfExternalDataSourcesManager.createAndAddDataSourceFromFile(file, (success) => {
        if (!success) {
          const div = document.createElement('DIV');
          div.id = 'file-alert';

          const alertElements = document.getElementsByClassName('gmf-app-map-messages');
          if (alertElements && alertElements.length > 0) {
            div.classList.add('gmf-file-alert-contained');
            alertElements[0].insertBefore(div, alertElements[0].childNodes[0]);
          } else {
            div.classList.add('gmf-file-alert-alone');
            $element[0].appendChild(div);
          }
          const delay = 4000;
          ngeoNotification.notify({
            msg: gettextCatalog.getString('This file can not be imported!'),
            type: MessageType.ERROR,
            target: '#file-alert',
            delay: delay,
          });

          setTimeout(function () {
            const el = document.getElementById('file-alert');
            el.remove();
          }, delay);
        }
      });
    });
  };
}

module.controller('gmfFileDropZoneController', Controller);

export default module;
