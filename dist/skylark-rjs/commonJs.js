/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./parse"],function(e){"use strict";var n={useLog:!0,convertDir:function(e,r,t){var o,i,s,l,c,a=/\.js$/;if(o=t.getFilteredFileList(e,/\w/,!0),e=e.replace(/\\/g,"/"),r=r.replace(/\\/g,"/"),"/"===e.charAt(e.length-1)&&(e=e.substring(0,e.length-1)),"/"===r.charAt(r.length-1)&&(r=r.substring(0,r.length-1)),o&&o.length)for(i=0;i<o.length;i++)l=(s=o[i]).replace(e,r),a.test(s)?(c=t.readFile(s),c=n.convert(s,c,config),t.saveUtf8File(l,c)):t.copyFile(s,l,!0);else n.useLog&&("convert"===e?console.log("\n\n"+n.convert(r,t.readFile(r),config)):console.log("No files to convert in directory: "+e))},convert:function(n,r){try{var t="",o=e.usesCommonJs(n,r);if(e.usesAmdOrRequireJs(n,r)||!o)return r;(o.dirname||o.filename)&&(t='var __filename = module.uri || "", __dirname = __filename.substring(0, __filename.lastIndexOf("/") + 1); '),r="define(function (require, exports, module) {"+t+r+"\n});\n"}catch(e){return console.log("commonJs.convert: COULD NOT CONVERT: "+n+", so skipping it. Error was: "+e),r}return r}};return n});
//# sourceMappingURL=sourcemaps/commonJs.js.map
