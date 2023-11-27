/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(function(){return{TRACE:0,INFO:1,WARN:2,ERROR:3,SILENT:4,level:0,logPrefix:"",logLevel:function(i){this.level=i},trace:function(i){this.level<=this.TRACE&&this._print(i)},info:function(i){this.level<=this.INFO&&this._print(i)},warn:function(i){this.level<=this.WARN&&this._print(i)},error:function(i){this.level<=this.ERROR&&this._print(i)},_print:function(i){this._sysPrint((this.logPrefix?this.logPrefix+" ":"")+i)},_sysPrint:function(i){var t,n;t=i,console.log(t,n)}}});
//# sourceMappingURL=sourcemaps/logger.js.map
