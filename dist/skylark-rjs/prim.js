/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(function(){"use strict";var t=Object.prototype.hasOwnProperty;function r(e,n){return t.call(e,n)}function o(e,n){if(e)for(var t=0;t<e.length;t+=1)e[t]&&n(e[t],t,e)}function i(e){if(r(e,"e")||r(e,"v")){if(u.hideResolutionConflict)return;throw new Error("Prim promise already resolved: "+JSON.stringify(e))}return 1}function c(e,n){u.nextTick(function(){o(e,function(e){e(n)})})}function u(){var o,t=[],n=[];return o={callback:function(e,n){n&&o.errback(n),r(o,"v")?u.nextTick(function(){e(o.v)}):t.push(e)},errback:function(e){r(o,"e")?u.nextTick(function(){e(o.e)}):n.push(e)},finished:function(){return r(o,"e")||r(o,"v")},rejected:function(){return r(o,"e")},resolve:function(e){return i(o)&&(o.v=e,c(t,e)),o},reject:function(e){return i(o)&&(o.e=e,c(n,e)),o},start:function(e){return o.resolve(),o.promise.then(e)},promise:{then:function(n,t){var r=u();return o.callback(function(e){try{(e=n&&"function"==typeof n?n(e):e)&&e.then?e.then(r.resolve,r.reject):r.resolve(e)}catch(e){r.reject(e)}},function(e){var n;try{t&&"function"==typeof t?(n=t(e))&&n.then?n.then(r.resolve,r.reject):r.resolve(n):r.reject(e)}catch(e){r.reject(e)}}),r.promise},fail:function(e){return o.promise.then(null,e)},end:function(){o.errback(function(e){throw e})}}}}return u.serial=function(e){var n=u().resolve().promise;return o(e,function(e){n=n.then(function(){return e()})}),n},u.nextTick="function"==typeof setImmediate?setImmediate:"undefined"!=typeof process&&process.nextTick?process.nextTick:"undefined"!=typeof setTimeout?function(e){setTimeout(e,0)}:function(e){e()},u});
//# sourceMappingURL=sourcemaps/prim.js.map
