/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(function(){"use strict";var e=Object.prototype.hasOwnProperty;function n(n,t){return e.call(n,t)}function t(e,n){var t;if(e)for(t=0;t<e.length;t+=1)e[t]&&n(e[t],t,e)}function r(e){if(n(e,"e")||n(e,"v")){if(!i.hideResolutionConflict)throw new Error("Prim promise already resolved: "+JSON.stringify(e));return!1}return!0}function o(e,n){i.nextTick(function(){t(e,function(e){e(n)})})}function i(){var e,t=[],c=[];return e={callback:function(r,o){o&&e.errback(o),n(e,"v")?i.nextTick(function(){r(e.v)}):t.push(r)},errback:function(t){n(e,"e")?i.nextTick(function(){t(e.e)}):c.push(t)},finished:function(){return n(e,"e")||n(e,"v")},rejected:function(){return n(e,"e")},resolve:function(n){return r(e)&&(e.v=n,o(t,n)),e},reject:function(n){return r(e)&&(e.e=n,o(c,n)),e},start:function(n){return e.resolve(),e.promise.then(n)},promise:{then:function(n,t){var r=i();return e.callback(function(e){try{n&&"function"==typeof n&&(e=n(e)),e&&e.then?e.then(r.resolve,r.reject):r.resolve(e)}catch(e){r.reject(e)}},function(e){var n;try{t&&"function"==typeof t?(n=t(e))&&n.then?n.then(r.resolve,r.reject):r.resolve(n):r.reject(e)}catch(e){r.reject(e)}}),r.promise},fail:function(n){return e.promise.then(null,n)},end:function(){e.errback(function(e){throw e})}}}}return i.serial=function(e){var n=i().resolve().promise;return t(e,function(e){n=n.then(function(){return e()})}),n},i.nextTick="function"==typeof setImmediate?setImmediate:"undefined"!=typeof process&&process.nextTick?process.nextTick:"undefined"!=typeof setTimeout?function(e){setTimeout(e,0)}:function(e){e()},i});
//# sourceMappingURL=sourcemaps/prim.js.map
