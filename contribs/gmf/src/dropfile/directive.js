// The MIT License (MIT)
//
// Copyright (c) 2019-2020 Camptocamp SA
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
 * @ngInject
 * @param {import("ngeo/message/Notification.js").MessageNotification} ngeoNotification Ngeo notification
 * @param {import("gmf/datasource/ExternalDataSourcesManager.js").ExternalDatSourcesManager} gmfExternalDataSourcesManager The manager of external datasources.
 * @param {angular.gettext.gettextCatalog} gettextCatalog Gettext catalog.
 * @return {angular.IDirective} The Directive Definition Object.
 * @ngdoc directive
 * @ngname gmfFileDropZone
 */
const fileDrop = function (gmfExternalDataSourcesManager, ngeoNotification, gettextCatalog) {
  return {
    restrict: 'A',
    template: '<div class="drop-zone-off" id="drop-zone"><p>{{"Drop file here." | translate}}</p></div>',
    /**
     * @param {angular.IScope} $scope Scope.
     * @param {JQuery} element Element.
     * @param {angular.IAttributes} attrs Attributes.
     */
    link: function ($scope, element, attrs) {
      if ($scope.ctrl.fileDropZoneEnabled !== true) {
        return;
      }
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

      element.bind('dragover', processDrag);
      element.bind('dragenter', processDrag);
      element.bind('dragleave', processDrag);

      element.bind('drop', function () {
        if (event !== null) {
          event.preventDefault();
        }
        const dropZone = document.getElementById('drop-zone');
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
              element[0].appendChild(div);
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
    },
  };
};

/**
 * @type {angular.IModule}
 * @hidden
 */
const module = angular.module('gmfFileDropZoneModule', []);

module.directive('gmfFileDropZone', fileDrop);

export default module;
