/**
 * StyleSheetLoader.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import { Arr } from '@ephox/katamari';
import { Fun } from '@ephox/katamari';
import { Future } from '@ephox/katamari';
import { Futures } from '@ephox/katamari';
import { Result } from '@ephox/katamari';
import Delay from '../util/Delay';
import Tools from '../util/Tools';

/**
 * This class handles loading of external stylesheets and fires events when these are loaded.
 *
 * @class tinymce.dom.StyleSheetLoader
 * @private
 */

"use strict";

export default function (document, settings?) {
  var idCount = 0, loadedStates = {}, maxLoadTime;

  settings = settings || {};
  maxLoadTime = settings.maxLoadTime || 5000;

  var appendToHead = function (node) {
    document.getElementsByTagName('head')[0].appendChild(node);
  };

  /**
   * Loads the specified css style sheet file and call the loadedCallback once it's finished loading.
   *
   * @method load
   * @param {String} url Url to be loaded.
   * @param {Function} loadedCallback Callback to be executed when loaded.
   * @param {Function} errorCallback Callback to be executed when failed loading.
   */
  var load = function (url, loadedCallback, errorCallback) {
    var link, style, startTime, state;

    var passed = function () {
      var callbacks = state.passed, i = callbacks.length;

      while (i--) {
        callbacks[i]();
      }

      state.status = 2;
      state.passed = [];
      state.failed = [];
    };

    var failed = function () {
      var callbacks = state.failed, i = callbacks.length;

      while (i--) {
        callbacks[i]();
      }

      state.status = 3;
      state.passed = [];
      state.failed = [];
    };

    // Sniffs for older WebKit versions that have the link.onload but a broken one
    var isOldWebKit = function () {
      var webKitChunks = navigator.userAgent.match(/WebKit\/(\d*)/);
      return !!(webKitChunks && parseInt(webKitChunks[1], 10) < 536);
    };

    // Calls the waitCallback until the test returns true or the timeout occurs
    var wait = function (testCallback, waitCallback) {
      if (!testCallback()) {
        // Wait for timeout
        if ((new Date().getTime()) - startTime < maxLoadTime) {
          Delay.setTimeout(waitCallback);
        } else {
          failed();
        }
      }
    };

    // Workaround for WebKit that doesn't properly support the onload event for link elements
    // Or WebKit that fires the onload event before the StyleSheet is added to the document
    var waitForWebKitLinkLoaded = function () {
      wait(function () {
        var styleSheets = document.styleSheets, styleSheet, i = styleSheets.length, owner;

        while (i--) {
          styleSheet = styleSheets[i];
          owner = styleSheet.ownerNode ? styleSheet.ownerNode : styleSheet.owningElement;
          if (owner && owner.id === link.id) {
            passed();
            return true;
          }
        }
      }, waitForWebKitLinkLoaded);
    };

    // Workaround for older Geckos that doesn't have any onload event for StyleSheets
    var waitForGeckoLinkLoaded = function () {
      wait(function () {
        try {
          // Accessing the cssRules will throw an exception until the CSS file is loaded
          var cssRules = style.sheet.cssRules;
          passed();
          return !!cssRules;
        } catch (ex) {
          // Ignore
        }
      }, waitForGeckoLinkLoaded);
    };

    url = Tools._addCacheSuffix(url);

    if (!loadedStates[url]) {
      state = {
        passed: [],
        failed: []
      };

      loadedStates[url] = state;
    } else {
      state = loadedStates[url];
    }

    if (loadedCallback) {
      state.passed.push(loadedCallback);
    }

    if (errorCallback) {
      state.failed.push(errorCallback);
    }

    // Is loading wait for it to pass
    if (state.status == 1) {
      return;
    }

    // Has finished loading and was success
    if (state.status == 2) {
      passed();
      return;
    }

    // Has finished loading and was a failure
    if (state.status == 3) {
      failed();
      return;
    }

    // Start loading
    state.status = 1;
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.id = 'u' + (idCount++);
    link.async = false;
    link.defer = false;
    startTime = new Date().getTime();

    // Feature detect onload on link element and sniff older webkits since it has an broken onload event
    if ("onload" in link && !isOldWebKit()) {
      link.onload = waitForWebKitLinkLoaded;
      link.onerror = failed;
    } else {
      // Sniff for old Firefox that doesn't support the onload event on link elements
      // TODO: Remove this in the future when everyone uses modern browsers
      if (navigator.userAgent.indexOf("Firefox") > 0) {
        style = document.createElement('style');
        style.textContent = '@import "' + url + '"';
        waitForGeckoLinkLoaded();
        appendToHead(style);
        return;
      }

      // Use the id owner on older webkits
      waitForWebKitLinkLoaded();
    }

    appendToHead(link);
    link.href = url;
  };

  var loadF = function (url) {
    return Future.nu(function (resolve) {
      load(
        url,
        Fun.compose(resolve, Fun.constant(Result.value(url))),
        Fun.compose(resolve, Fun.constant(Result.error(url)))
      );
    });
  };

  var unbox = function (result) {
    return result.fold(Fun.identity, Fun.identity);
  };

  var loadAll = function (urls, success, failure) {
    Futures.par(Arr.map(urls, loadF)).get(function (result) {
      var parts = Arr.partition(result, function (r) {
        return r.isValue();
      });

      if (parts.fail.length > 0) {
        failure(parts.fail.map(unbox));
      } else {
        success(parts.pass.map(unbox));
      }
    });
  };

  return {
    load: load,
    loadAll: loadAll
  };
};