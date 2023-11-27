/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./rjs"],function(e){return function(){e.optimize=function(n,t,o){e({context:"build"},["build","logger","env!env/quit"],function(i,u,l){function c(n){if(e._buildReset&&(e._buildReset(),e._cacheReset()),n instanceof Error)throw n;return n}n.logLevel=n.hasOwnProperty("logLevel")?n.logLevel:u.SILENT,e._buildReset&&(e._buildReset(),e._cacheReset()),o=o||function(e){console.log(e),l(1)},i(n).then(c,c).then(t,o)})},e.tools={useLib:function(n,t){t||(t=n,n="uselib"),useLibLoaded[n]||(loadLib(),useLibLoaded[n]=!0);var o=e({context:n});o(["build"],function(){t(o)})}}}});
//# sourceMappingURL=sourcemaps/create-rjsapi.js.map
