/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./lang","./logger","./parse","./pragma","./uglifyjs","./source-map"],function(v,x,o,l,f,e){"use strict";var c,L=/\@import\s+(url\()?\s*([^);]+)\s*(\))?([\w, ]*)(;)?/gi,C=/\/\*[^\*]*@import[^\*]*\*\//g,r=/\url\(\s*([^\)]+)\s*\)?/g,u=/^\w+:/;e.SourceMapGenerator,e.SourceMapConsumer;function y(e){return e="'"!==(e=e.replace(/\s+$/,"")).charAt(0)&&'"'!==e.charAt(0)?e:e.substring(1,e.length-1)}function k(a,o,e,l){return e.replace(r,function(e,r){var i,t,n=y(r),s=(n=n.replace(v.backSlashRegExp,"/")).charAt(0),p=u.test(n);for("/"===s||"#"===s||p?p||x.trace(a+"\n  URL not a relative URL, skipping: "+r):r=l+o+n,t=(i=r.split("/")).length-1;0<t;t--)"."===i[t]?i.splice(t,1):".."===i[t]&&0!==t&&".."!==i[t-1]&&(i.splice(t-1,2),--t);return"url("+i.join("/")+")"})}return c={jsFile:function(e,r,i,t,n){var s=t.env.fs;r=r||s.readFile(e),r=c.js(e,r,i,t,n),s.saveUtf8File(i,r)},js:function(r,e,i,t,n){var s=String(t.optimize).split("."),p=s[0],s="keepLines"===s[1],a="";if(e=l.process(r,e,t=t||{},"OnSave",n),p&&"none"!==p){if(!(n=c.optimizers[p]))throw new Error('optimizer with name of "'+p+'" not found for this environment');p=t[p]||{},t.generateSourceMaps&&(p.generateSourceMaps=!!t.generateSourceMaps,p._buildSourceMap=t._buildSourceMap);try{if(t.preserveLicenseComments)try{a=o.getLicenseComments(r,e)}catch(e){throw new Error("Cannot parse file: "+r+" for comments. Skipping it. Error is:\n"+e.toString())}t.generateSourceMaps&&a&&(p.preamble=a,a=""),e=a+n(r,e,i,s,p,t.env.fs),p._buildSourceMap&&p._buildSourceMap!==t._buildSourceMap&&(t._buildSourceMap=p._buildSourceMap)}catch(e){if(t.throwWhen&&t.throwWhen.optimize)throw e;x.error(e)}}else t._buildSourceMap&&(t._buildSourceMap=null);return e},cssFile:function(r,e,i){var t,n,s,p=i.env.fs,a=p.readFile(r),o=function c(u,e,f,m,g,r,d){var i=(u=u.replace(v.backSlashRegExp,"/")).lastIndexOf("/"),S=-1!==i?u.substring(0,i+1):"",h=[],b=[],M=d.env.fs;return e=e.replace(C,""),f&&","!==f.charAt(f.length-1)&&(f+=","),e=e.replace(L,function(r,e,i,t,n){if(n&&"all"!==n.replace(/^\s\s*/,"").replace(/\s\s*$/,""))return b.push(u),r;if(i=y(i),f&&-1!==f.indexOf(i+","))return r;i=i.replace(v.backSlashRegExp,"/");try{var s,p,a,o="/"===i.charAt(0)?i:S+i,l=M.readFile(o);return g[o]?"":(g[o]=!0,l=(a=c(o,l,f,m,g,!1,d)).fileContents,a.importList.length&&h.push.apply(h,a.importList),a.skippedList.length&&b.push.apply(b,a.skippedList),p=-1!==(s=i.lastIndexOf("/"))?i.substring(0,s+1):"",l=k(i,p=p.replace(/^\.\//,""),l,m),h.push(o),l)}catch(e){return x.warn(u+"\n  Cannot inline css import, skipping: "+i),r}}),m&&r&&(e=k(u,"",e,m)),{importList:h,skippedList:b,fileContents:e}}(r,a,i.cssImportIgnore,i.cssPrefix,{},!0,i),l=o.skippedList.length?a:o.fileContents;o.skippedList.length&&x.warn("Cannot inline @imports for "+r+",\nthe following files had media queries in them:\n"+o.skippedList.join("\n"));try{if(-1===i.optimizeCss.indexOf(".keepComments"))for(t=0;-1!==(t=l.indexOf("/*",t));){if(-1===(n=l.indexOf("*/",t+2)))throw"Improper comment in CSS file: "+r;s=l.substring(t,n),t=!i.preserveLicenseComments||-1===s.indexOf("license")&&-1===s.indexOf("opyright")&&-1===s.indexOf("(c)")?(l=l.substring(0,t)+l.substring(n+2,l.length),0):n}l=-1===i.optimizeCss.indexOf(".keepLines")?(l=(l=(l=l.replace(/[\r\n]/g," ")).replace(/\s+/g," ")).replace(/\{\s/g,"{")).replace(/\s\}/g,"}"):(l=l.replace(/(\r\n)+/g,"\r\n")).replace(/(\n)+/g,"\n"),-1===i.optimizeCss.indexOf(".keepWhitespace")&&(l=(l=(l=(l=(l=(l=l.replace(/^[ \t]+/gm,"")).replace(/[ \t]+$/gm,"")).replace(/(;|:|\{|}|,)[ \t]+/g,"$1")).replace(/[ \t]+(\{)/g,"$1")).replace(/([ \t])+/g,"$1")).replace(/^[ \t]*[\r\n]/gm,""))}catch(e){l=a,x.error("Could not optimized CSS file: "+r+", error: "+e)}return p.saveUtf8File(e,l),a="\n"+e.replace(i.dir,"")+"\n----------------\n",o.importList.push(r),a+=o.importList.map(function(e){return e.replace(i.dir,"")}).join("\n"),{importList:o.importList,buildText:a+"\n"}},css:function(e,r){var i,t,n,s="",p=[],a=r.dir&&r.removeCombined,o=r.env.fs;if(-1!==r.optimizeCss.indexOf("standard")){if(n=o.getFilteredFileList(e,/\.css$/,!0))for(i=0;i<n.length;i++)t=n[i],x.trace("Optimizing ("+r.optimizeCss+") CSS file: "+t),s+=(t=c.cssFile(t,t,r)).buildText,a&&(t.importList.pop(),p=p.concat(t.importList));a&&p.forEach(function(e){o.exists(e)&&o.deleteFile(e)})}return s},optimizers:{uglify:function(r,e,i,t,n,s){var p,a,o,l={},c=i+".map",u=r&&r.split("/").pop();v.mixin(l,n=n||{},!0),n.preamble&&(l.output={preamble:n.preamble}),n.generateSourceMaps&&(i||n._buildSourceMap)&&(l.outSourceMap=u+".map",n._buildSourceMap?(a=JSON.parse(n._buildSourceMap),l.inSourceMap=a):s.exists(c)&&(l.inSourceMap=c,a=JSON.parse(s.readFile(c)))),x.trace("Uglify file: "+r);try{p=f.minify(e,l,u+".src.js"),l.outSourceMap&&p.map?(o=p.map,a||n._buildSourceMap||s.saveFile(i+".src.js",e),e=p.code,n._buildSourceMap?n._buildSourceMap=o:s.saveFile(i+".map",o)):e=p.code}catch(e){c=e.toString(),u=/SyntaxError/.test(c);throw console.error(e),new Error("Cannot uglify file: "+r+". Skipping it. Error is:\n"+c+(u?"\n\nIf the source uses ES2015 or later syntax, please pass \"optimize: 'none'\" to r.js and use an ES2015+ compatible minifier after running r.js. The included UglifyJS only understands ES5 or earlier syntax.":""))}return e}}}});
//# sourceMappingURL=sourcemaps/optimize.js.map
