/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(function(){"use strict";var n,e,r=Object.prototype.hasOwnProperty;function t(n,e){return r.call(n,e)}return e=function(){return!1},"undefined"!=typeof java&&java.lang&&java.lang.Object&&"undefined"!=typeof importPackage&&(e=function(n){return n instanceof java.lang.Object}),n={backSlashRegExp:/\\/g,ostring:Object.prototype.toString,isArray:Array.isArray||function(e){return"[object Array]"===n.ostring.call(e)},isFunction:function(e){return"[object Function]"===n.ostring.call(e)},isRegExp:function(n){return n&&n instanceof RegExp},hasProp:t,falseProp:function(n,e){return!t(n,e)||!n[e]},getOwn:function(n,e){return t(n,e)&&n[e]},_mixin:function(n,e,r){var t;for(t in e)!e.hasOwnProperty(t)||!r&&n.hasOwnProperty(t)||(n[t]=e[t]);return n},mixin:function(e){var r,t,o,i=Array.prototype.slice.call(arguments);for(e||(e={}),i.length>2&&"boolean"==typeof arguments[i.length-1]&&(r=i.pop()),t=1,o=i.length;t<o;t++)n._mixin(e,i[t],r);return e},deepMix:function(e,r){return n.eachProp(r,function(r,t){"object"!=typeof r||!r||n.isArray(r)||n.isFunction(r)||r instanceof RegExp?e[t]=r:(e[t]||(e[t]={}),n.deepMix(e[t],r))}),e},deeplikeCopy:function(r,o){var i,a;return n.isArray(r)?(a=[],r.forEach(function(e){a.push(n.deeplikeCopy(e,o))}),a):(i=typeof r,null===r||void 0===r||"boolean"===i||"string"===i||"number"===i||n.isFunction(r)||n.isRegExp(r)||e(r)?r:(a={},n.eachProp(r,function(e,r){o&&t(o,r)||(a[r]=n.deeplikeCopy(e,o))}),a))},delegate:function(){function e(){}return function(r,t){e.prototype=r;var o=new e;return e.prototype=null,t&&n.mixin(o,t),o}}(),each:function(n,e){var r;if(n)for(r=0;r<n.length&&!e(n[r],r,n);r+=1);},eachProp:function(n,e){var r;for(r in n)if(t(n,r)&&e(n[r],r))break},bind:function(n,e){return function(){return e.apply(n,arguments)}},jsEscape:function(n){return n.replace(/(["'\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r")}}});
//# sourceMappingURL=sourcemaps/lang.js.map
