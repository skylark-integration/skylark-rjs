/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./pragma","./parse","./lang","./logger","./commonJs","./prim"],function(pragma,parse,lang,logger,commonJs,prim){var allowRun=!0,hasProp=lang.hasProp,falseProp=lang.falseProp,getOwn=lang.getOwn,useStrictRegExp=/['"]use strict['"];/g,absoluteUrlRegExp=/^[\/\\]|^\w:/;return prim.hideResolutionConflict=!0,function(config){if(allowRun){allowRun=!1;var fs=config.env.fs,layer,pluginBuilderRegExp=/(["']?)pluginBuilder(["']?)\s*[=\:]\s*["']([^'"\s]+)["']/,oldNewContext=require.s.newContext,oldDef,exports,module;require._cacheReset=function(){require._cachedRawText={},require._cachedFileContents={},require._cachedDefinesRequireUrls={}},require._cacheReset(),require._isSupportedBuildUrl=function(e){return-1===e.indexOf("://")&&-1===e.indexOf("?")&&0!==e.indexOf("empty:")&&0!==e.indexOf("//")||(layer.ignoredUrls[e]||(-1===e.indexOf("empty:")&&logger.info("Cannot optimize network URL, skipping: "+e),layer.ignoredUrls[e]=!0),!1)},require.s.newContext=function(name){var context=oldNewContext(name),oldEnable=context.enable,moduleProto=context.Module.prototype,oldInit=moduleProto.init,oldCallPlugin=moduleProto.callPlugin;return"_"===name&&(context.nextTick=function(e){e()},context.needFullExec={},context.fullExec={},context.plugins={},context.buildShimExports={},context.makeShimExports=function(e){return context.config.wrapShim?function(){var t="return ";return e.exports&&-1===e.exports.indexOf(".")&&(t+="root."+e.exports+" = "),e.init&&(t+="("+e.init.toString().replace(useStrictRegExp,"")+".apply(this, arguments))"),e.init&&e.exports&&(t+=" || "),e.exports&&(t+=e.exports),t+=";"}:function(){return"(function (global) {\n    return function () {\n        var ret, fn;\n"+(e.init?"       fn = "+e.init.toString().replace(useStrictRegExp,"")+";\n        ret = fn.apply(global, arguments);\n":"")+(e.exports?"        return ret || global."+e.exports+";\n":"        return ret;\n")+"    };\n}(this))"}},context.enable=function(e,t){var n=e.id,r=t&&t.map.id,l=context.needFullExec,i=context.fullExec,o=getOwn(context.registry,n);return o&&!o.defined?r&&getOwn(l,r)&&(l[n]=e):(getOwn(l,n)&&falseProp(i,n)||r&&getOwn(l,r)&&falseProp(i,n))&&context.require.undef(n),oldEnable.apply(context,arguments)},context.load=function(moduleName,url){var contents,pluginBuilderMatch,builderName,shim,shimExports;0===url.indexOf("empty:")&&delete context.urlFetched[url],require._isSupportedBuildUrl(url)?(url=normalizeUrlWithBase(context,moduleName,url),layer.buildPathMap[moduleName]=url,layer.buildFileToModule[url]=moduleName,hasProp(context.plugins,moduleName)&&(context.needFullExec[moduleName]=!0),prim().start(function(){if(!hasProp(require._cachedFileContents,url)||!falseProp(context.needFullExec,moduleName)&&!getOwn(context.fullExec,moduleName))return require._cacheReadAsync(url,void 0,fs).then(function(e){contents=e,!context.config.cjsTranslate||context.config.shim&&lang.hasProp(context.config.shim,moduleName)||(contents=commonJs.convert(url,contents)),context.config.onBuildRead&&(contents=context.config.onBuildRead(moduleName,url,contents)),contents=pragma.process(url,contents,context.config,"OnExecute");try{!layer.existingRequireUrl&&parse.definesRequire(url,contents)&&(layer.existingRequireUrl=url,require._cachedDefinesRequireUrls[url]=!0)}catch(e){throw new Error("Parse error using esprima for file: "+url+"\n"+e)}}).then(function(){return hasProp(context.plugins,moduleName)&&(pluginBuilderMatch=pluginBuilderRegExp.exec(contents))?(builderName=context.makeModuleMap(pluginBuilderMatch[3],context.makeModuleMap(moduleName),null,!0).id,require._cacheReadAsync(context.nameToUrl(builderName),void 0,fs)):contents}).then(function(e){contents=e;try{falseProp(context.needFullExec,moduleName)&&(contents=parse(moduleName,url,contents,{insertNeedsDefine:!0,has:context.config.has,findNestedDependencies:context.config.findNestedDependencies}))}catch(e){throw new Error("Parse error using esprima for file: "+url+"\n"+e)}require._cachedFileContents[url]=contents});contents=require._cachedFileContents[url],!layer.existingRequireUrl&&require._cachedDefinesRequireUrls[url]&&(layer.existingRequireUrl=url)}).then(function(){contents&&eval(contents);try{getOwn(context.needFullExec,moduleName)&&(shim=getOwn(context.config.shim,moduleName),shim&&shim.exports&&(shimExports=eval(shim.exports),void 0!==shimExports&&(context.buildShimExports[moduleName]=shimExports))),context.completeLoad(moduleName)}catch(e){throw e.moduleTree||(e.moduleTree=[]),e.moduleTree.push(moduleName),e}}).then(null,function(e){throw e.fileName||(e.fileName=url),e}).end()):context.completeLoad(moduleName)},context.execCb=function(e,t,n,exports){var r=getOwn(layer.context.buildShimExports,e);return r||(t.__requireJsBuild||getOwn(layer.context.needFullExec,e)?t.apply(exports,n):void 0)},moduleProto.init=function(e){return context.needFullExec[this.map.id]&&lang.each(e,lang.bind(this,function(e){"string"==typeof e&&(e=context.makeModuleMap(e,this.map.isDefine?this.map:this.map.parentMap,!1,!0)),context.fullExec[e.id]||context.require.undef(e.id)})),oldInit.apply(this,arguments)},moduleProto.callPlugin=function(){var e=this.map,t=context.makeModuleMap(e.prefix),n=t.id,r=getOwn(context.registry,n);return context.plugins[n]=!0,context.needFullExec[n]=e,!falseProp(context.fullExec,n)||r&&!r.defined||context.require.undef(t.id),oldCallPlugin.apply(this,arguments)}),context},delete require.s.contexts._,require._buildReset=function(){var e=require.s.contexts._;return delete require.s.contexts._,require({}),layer=require._layer={buildPathMap:{},buildFileToModule:{},buildFilePaths:[],pathAdded:{},modulesWithNames:{},needsDefine:{},existingRequireUrl:"",ignoredUrls:{},context:require.s.contexts._},e},require._buildReset(),oldDef=define,define=function(e){return"string"==typeof e&&falseProp(layer.needsDefine,e)&&(layer.modulesWithNames[e]=!0),oldDef.apply(require,arguments)},define.amd=oldDef.amd,require._readFile=fs.readFile,require._fileExists=function(e){return fs.exists(e)},require.onResourceLoad=function(e,t){var n,r=t.id;e.plugins&&lang.hasProp(e.plugins,r)&&lang.eachProp(e.needFullExec,function(t,n){if(!0!==t&&t.prefix===r&&t.unnormalized){var l=e.makeModuleMap(t.originalName,t.parentMap);e.needFullExec[l.id]=l}}),e.needFullExec&&getOwn(e.needFullExec,r)&&(e.fullExec[r]=t),t.prefix?falseProp(layer.pathAdded,r)&&(layer.buildFilePaths.push(r),layer.buildPathMap[r]=r,layer.buildFileToModule[r]=r,layer.modulesWithNames[r]=!0,layer.pathAdded[r]=!0):t.url&&require._isSupportedBuildUrl(t.url)&&(n=normalizeUrlWithBase(e,r,t.url),!layer.pathAdded[n]&&getOwn(layer.buildPathMap,r)&&(layer.buildFilePaths.push(n),layer.pathAdded[n]=!0))},require.needsDefine=function(e){layer.needsDefine[e]=!0}}function normalizeUrlWithBase(e,t,n){return require.jsExtRegExp.test(t)&&!absoluteUrlRegExp.test(n)&&(n=(e.config.dir||e.config.dirBaseUrl)+n),n}}});
//# sourceMappingURL=sourcemaps/requirePatch.js.map