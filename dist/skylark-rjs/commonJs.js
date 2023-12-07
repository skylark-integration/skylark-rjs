/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./parse"],function(o){"use strict";var a={useLog:!0,convertDir:function(e,n,r){var t,o,i,s,l=/\.js$/,c=r.getFilteredFileList(e,/\w/,!0);if(e=e.replace(/\\/g,"/"),n=n.replace(/\\/g,"/"),"/"===e.charAt(e.length-1)&&(e=e.substring(0,e.length-1)),"/"===n.charAt(n.length-1)&&(n=n.substring(0,n.length-1)),c&&c.length)for(t=0;t<c.length;t++)i=(o=c[t]).replace(e,n),l.test(o)?(s=r.readFile(o),s=a.convert(o,s,config),r.saveUtf8File(i,s)):r.copyFile(o,i,!0);else a.useLog&&("convert"===e?console.log("\n\n"+a.convert(n,r.readFile(n),config)):console.log("No files to convert in directory: "+e))},convert:function(n,e){try{var r="",t=o.usesCommonJs(n,e);if(o.usesAmdOrRequireJs(n,e)||!t)return e;e="define(function (require, exports, module) {"+(r=t.dirname||t.filename?'var __filename = module.uri || "", __dirname = __filename.substring(0, __filename.lastIndexOf("/") + 1); ':r)+e+"\n});\n"}catch(e){console.log("commonJs.convert: COULD NOT CONVERT: "+n+", so skipping it. Error was: "+e)}return e}};return a});
//# sourceMappingURL=sourcemaps/commonJs.js.map
