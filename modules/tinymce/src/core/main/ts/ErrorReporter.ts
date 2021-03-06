/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { window, console } from '@ephox/dom-globals';
import I18n from './api/util/I18n';
import Editor from './api/Editor';

const displayNotification = (editor: Editor, message: string) => {
  editor.notificationManager.open({
    type: 'error',
    text: message
  });
};

const displayError = (editor: Editor, message: string) => {
  if (editor._skinLoaded) {
    displayNotification(editor, message);
  } else {
    editor.on('SkinLoaded', () => {
      displayNotification(editor, message);
    });
  }
};

const uploadError = (editor: Editor, message: string) => {
  displayError(editor, I18n.translate(['Failed to upload image: {0}', message]));
};

const logError = (msg: string) => {
  console.error(msg);
};

const createLoadError = (type: string, url: string, name?: string) => {
  return name ?
    `Failed to load ${type}: ${name} from url ${url}` :
    `Failed to load ${type} url: ${url}`;
};

const pluginLoadError = (url: string, name?: string) => {
  logError(createLoadError('plugin', url, name));
};

const iconsLoadError = (url: string, name?: string) => {
  logError(createLoadError('icons', url, name));
};

const languageLoadError = (url: string, name: string) => {
  logError(createLoadError('language', url, name));
};

const pluginInitError = (editor: Editor, name: string, err) => {
  const message = I18n.translate(['Failed to initialize plugin: {0}', name]);
  initError(message, err);
  displayError(editor, message);
};

const initError = function (message: string, ...x: any[]) {
  const console = window.console;
  if (console) { // Skip test env
    if (console.error) { // tslint:disable-line:no-console
      console.error.apply(console, arguments); // tslint:disable-line:no-console
    } else {
      console.log.apply(console, arguments); // tslint:disable-line:no-console
    }
  }
};

export default {
  pluginLoadError,
  iconsLoadError,
  languageLoadError,
  pluginInitError,
  uploadError,
  displayError,
  initError
};
