/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./rjs","./lang","./prim","./logger","./parse","./optimize","./pragma","./transform","./requirePatch","./commonJs","./source-map"],function(require,lang,prim,logger,parse,optimize,pragma,transform,requirePatch,commonJs,sourceMap){"use strict";var build,SourceMapGenerator=sourceMap.SourceMapGenerator,hasProp=lang.hasProp,getOwn=lang.getOwn,falseProp=lang.falseProp,endsWithSemiColonRegExp=/;\s*$/,endsWithSlashRegExp=/[\/\\]$/,resourceIsModuleIdRegExp=/^[\w\/\\\.]+$/,deepCopyProps={layer:!0};function copyConfig(e){return lang.deeplikeCopy(e,deepCopyProps)}function makeBuildBaseConfig(e){return{appDir:"",pragmas:{},paths:{},optimize:"uglify",optimizeCss:"standard.keepLines.keepWhitespace",inlineText:!0,isBuild:!0,optimizeAllPluginResources:!1,findNestedDependencies:!1,preserveLicenseComments:!0,writeBuildTxt:!0,waitSeconds:30,dirExclusionRegExp:e.dirExclusionRegExp,_buildPathToModuleIndex:{}}}function addSemiColon(e,i){return i.skipSemiColonInsertion||endsWithSemiColonRegExp.test(e)?e:e+";"}function endsWithSlash(e){return"/"!==e.charAt(e.length-1)&&(e+="/"),e}function endsWithNewLine(e){return"\n"!==e.charAt(e.length-1)&&(e+="\n"),e}function makeWriteFile(e,i){function n(e,i){logger.trace("Saving plugin-optimized file: "+e),file.saveUtf8File(e,i)}return n.asModule=function(o,r,t){n(r,build.toTransport(e,o,r,t,i))},n}function appendToFileContents(e,i,n,o,module,r){var t,a,l,s,u,f,d,c;if(r){for(t=o.out?o.baseUrl:module&&module._buildPath?module._buildPath:"",1===(d=n.split("!")).length?a=build.makeRelativeFilePath(t,n):(s=d.shift(),l=d.join("!"),a=resourceIsModuleIdRegExp.test(l)?build.makeRelativeFilePath(t,require.toUrl(l))+"!"+s:n),u=e.split("\n").length-1,f=i.split("\n").length,c=1;c<=f;c+=1)r.addMapping({generated:{line:u+c,column:0},original:{line:c,column:0},source:a});r.setSourceContent(a,i)}return e+=i}function stringDotToObj(e,i,n){var o=i.split(".");o.forEach(function(i,r){r===o.length-1?e[i]=n:(falseProp(e,i)&&(e[i]={}),e=e[i])})}function mixConfig(e,i,n){var o,r,t,a;for(o in i)hasProp(i,o)&&(r=i[o],t=lang.isArray(r),"object"!=typeof r||!r||t||lang.isFunction(r)||lang.isRegExp(r)?t?n||(a=e[o],lang.isArray(a)?e[o]=a.concat(r):e[o]=r):e[o]=r:"map"===o?(e.map||(e.map={}),lang.deepMix(e.map,i.map)):e[o]=lang.mixin({},e[o],r,!0));lang.hasProp(e,"logLevel")&&logger.logLevel(e.logLevel)}function flattenWrapFile(e,i,n){var o=e.wrap,r=i+"File",t="__"+i+"Map",a=e.env.fs;if("string"!=typeof o[i]&&o[r])o[i]="","string"==typeof o[r]&&(o[r]=[o[r]]),o[t]=[],o[r].forEach(function(e){var r=build.makeAbsPath(e,n,a),l=endsWithNewLine(a.readFile(r));o[t].push(function(e,i,n){return appendToFileContents(e,l,r,i,null,n)}),o[i]+=l});else if(null===o[i]||void 0===o[i])o[i]="";else{if("string"!=typeof o[i])throw new Error("wrap."+i+" or wrap."+r+" malformed");o[i]=endsWithNewLine(o[i]),o[t]=[function(e,r,t){var l=build.makeAbsPath("config-wrap-"+i+"-default.js",n,a);return appendToFileContents(e,o[i],l,r,null,t)}]}}function normalizeWrapConfig(e,i){var n=e.env.fs;try{e.wrap&&(!0===e.wrap?e.wrap={start:"(function () {\n",end:"}());",__startMap:[function(e,o,r){return appendToFileContents(e,"(function () {\n",build.makeAbsPath("config-wrap-start-default.js",i,n),o,null,r)}],__endMap:[function(e,o,r){return appendToFileContents(e,"}());",build.makeAbsPath("config-wrap-end-default.js",i,n),o,null,r)}]}:(flattenWrapFile(e,"start",i),flattenWrapFile(e,"end",i)))}catch(e){throw new Error("Malformed wrap config: "+e.toString())}}return prim.nextTick=function(e){e()},require._cacheReadAsync=function(e,i,n){var o;return lang.hasProp(require._cachedRawText,e)?((o=prim()).resolve(require._cachedRawText[e]),o.promise):n.readFileAsync(e,i).then(function(i){return require._cachedRawText[e]=i,i})},build=function(e){var i,n,o,r,t,a,l,s,u,f=/( {4}at[^\n]+)\n/;return prim().start(function(){if(!e||lang.isArray(e)){if(!e||e.length<1)return void logger.error("build.js buildProfile.js\nwhere buildProfile.js is the name of the build file (see example.build.js for hints on how to make a build file).");-1===e[0].indexOf("=")&&(i=e[0],e.splice(0,1)),(n=build.convertArrayToObject(e)).buildFile=i}else n=e;return build._run(n)}).then(null,function(i){var n;if(o=i.toString(),a=i.moduleTree,(t=f.exec(o))&&(o+=o.substring(0,t.index+t[0].length+1)),a&&a.length>0){for(o+="\nIn module tree:\n",l=a.length-1;l>-1;l--)if(u=a[l]){for(s=a.length-l;s>-1;s--)o+="  ";o+=u+"\n"}logger.error(o)}throw r=i.stack,"string"==typeof e&&-1!==e.indexOf("stacktrace=true")?o+="\n"+r:!t&&r&&(t=f.exec(r))&&(o+="\n"+t[0]||""),(n=new Error(o)).originalError=i,n})},build._run=function(e){var i,n,o,r,t,a,l,s,u,f,d,c,p,g,m,h,b,x,w={},P="",C={};return prim().start(function(){var n;if(a=build.createConfig(e),o=a.paths,x=a.env.fs,requirePatch(a),a.dir&&!a.keepBuildDir&&x.exists(a.dir)&&x.deleteFile(a.dir),!a.out&&!a.cssIn)if(x.copyDir(a.appDir||a.baseUrl,a.dir,/\w/,!0),i={},a.appDir)for(n in o)hasProp(o,n)&&(i[n]=o[n].replace(a.appDir,a.dir));else for(n in o)hasProp(o,n)&&(0===o[n].indexOf(a.baseUrl)?i[n]=o[n].replace(a.baseUrl,a.dirBaseUrl):(i[n]="empty:"===o[n]?"empty:":n,0!==(s=o[n]).indexOf("/")&&-1===s.indexOf(":")&&(s=a.baseUrl+s),f=a.dirBaseUrl+i[n],"empty:"!==s&&(x.exists(s)&&x.isDirectory(s)?x.copyDir(s,f,/\w/,!0):(s+=".js",f+=".js",x.copyFile(s,f)))));require({baseUrl:a.baseUrl,paths:o,packagePaths:a.packagePaths,packages:a.packages}),u=require.s.contexts._,(l=a.modules)&&l.forEach(function(module){if(module.name&&(module._sourcePath=u.nameToUrl(module.name),!(x.exists(module._sourcePath)||module.create||-1!==module.name.indexOf("!")||a.rawText&&lang.hasProp(a.rawText,module.name))))throw new Error("ERROR: module path does not exist: "+module._sourcePath+" for module named: "+module.name+". Path is relative to: "+x.absPath("."))}),a.out?(require(a),a.cssIn||(a.modules[0]._buildPath="function"==typeof a.out?"FUNCTION":a.out)):a.cssIn||(t={baseUrl:a.dirBaseUrl,paths:i},lang.mixin(t,a),require(t),l&&l.forEach(function(module){if(module.name){if(module._buildPath=u.nameToUrl(module.name,null),module._buildPath===module._sourcePath&&!a.allowSourceOverwrites)throw new Error("Module ID '"+module.name+"' has a source path that is same as output path: "+module._sourcePath+". Stopping, config is malformed.");module.create||a.rawText&&lang.hasProp(a.rawText,module.name)||x.copyFile(module._sourcePath,module._buildPath)}})),a.optimizeCss&&"none"!==a.optimizeCss&&a.dir&&(P+=optimize.css(a.dir,a))}).then(function(){t=copyConfig(require.s.contexts._.config)}).then(function(){var e=[];if(l)return e=l.map(function(module,e){return function(){return a._buildPathToModuleIndex[x.normalize(module._buildPath)]=e,build.traceDependencies(module,a,t).then(function(e){module.layer=e})}}),prim.serial(e)}).then(function(){var e;if(l)return e=l.map(function(module){return function(){if(module.exclude)return module.excludeLayers=[],prim.serial(module.exclude.map(function(e,i){return function(){var n=build.findBuildModule(e,l);if(!n)return build.traceDependencies({name:e},a,t).then(function(e){module.excludeLayers[i]={layer:e}});module.excludeLayers[i]=n}}))}}),prim.serial(e)}).then(function(){if(l)return prim.serial(l.map(function(module){return function(){return module.exclude&&module.exclude.forEach(function(e,i){var n=module.excludeLayers[i].layer,o=n.buildFileToModule;n.buildFilePaths.forEach(function(e){build.removeModulePath(o[e],e,module.layer)})}),module.excludeShallow&&module.excludeShallow.forEach(function(e){var i=getOwn(module.layer.buildPathMap,e);i&&build.removeModulePath(e,i,module.layer)}),build.flattenModule(module,module.layer,a).then(function(e){var i;"FUNCTION"===module._buildPath?(module._buildText=e.text,module._buildSourceMap=e.sourceMap):(i=e.text,e.sourceMap&&(i+="\n//# sourceMappingURL="+module._buildPath.split("/").pop()+".map",x.saveUtf8File(module._buildPath+".map",e.sourceMap)),x.saveUtf8File(module._buildPath+"-temp",i)),P+=e.buildText})}}))}).then(function(){var e,i,o={},t=a.bundlesConfigOutFile;if(l&&(l.forEach(function(module){var e,i=module._buildPath;if("FUNCTION"!==i){if(x.exists(i)&&x.deleteFile(i),x.renameFile(i+"-temp",i),t){e=o[module.name]=[];var n=x.readFile(i),r={};r[module.name]=!0;var s=parse.getAllNamedDefines(n,r);e.push.apply(e,s)}a.removeCombined&&!a.out&&module.layer.buildFilePaths.forEach(function(e){var i=l.some(function(i){return i._buildPath===e}),n=build.makeRelativeFilePath(a.dir,e);x.exists(e)&&!i&&0!==n.indexOf("..")&&x.deleteFile(e)})}a.onModuleBundleComplete&&a.onModuleBundleComplete(module.onCompleteData)}),t)){var s=x.readFile(t);s=transform.modifyConfig(s,function(e){return e.bundles||(e.bundles={}),lang.eachProp(o,function(i,n){e.bundles[n]=i}),e}),x.saveUtf8File(t,s)}if(a.removeCombined&&!a.out&&a.dir&&x.deleteEmptyDirs(a.dir),a.out&&!a.cssIn)"FUNCTION"===(n=a.modules[0]._buildPath)?(i=a.modules[0]._buildSourceMap,a._buildSourceMap=i,a.modules[0]._buildText=optimize.js((a.modules[0].name||a.modules[0].include[0]||n)+".build.js",a.modules[0]._buildText,null,a),a._buildSourceMap&&a._buildSourceMap!==i&&(a.modules[0]._buildSourceMap=a._buildSourceMap,a._buildSourceMap=null)):optimize.jsFile(n,null,n,a);else if(!a.cssIn){for(e in x.getFilteredFileList(a.dir,/\.js$/,!0).forEach(function(i){var n,o,r;e=(e=i.replace(a.dir,"")).substring(0,e.length-3),((r=0===(r=getOwn(a._buildPathToModuleIndex,i))||r>0?r:-1)>-1||!a.skipDirOptimize||"all"===a.normalizeDirDefines||a.cjsTranslate)&&(b=x.readFile(i),!a.cjsTranslate||a.shim&&lang.hasProp(a.shim,e)||(b=commonJs.convert(i,b)),-1===r&&(a.onBuildRead&&(b=a.onBuildRead(e,i,b)),"all"===a.normalizeDirDefines&&(b=build.toTransport(a.namespace,null,i,b)),a.onBuildWrite&&(b=a.onBuildWrite(e,i,b))),n=(o=r>-1?a.modules[r].override:null)?build.createOverrideConfig(a,o):a,(r>-1||!a.skipDirOptimize)&&optimize.jsFile(i,b,i,n,C))}),p=require.s.contexts._,C)if(hasProp(C,e))for(c=p.makeModuleMap(e),g=C[e],r=0;r<g.length;r++){if(m=g[r],d=p.makeModuleMap(m,c),falseProp(p.plugins,d.prefix)){if(p.plugins[d.prefix]=!0,!x.exists(require.toUrl(d.prefix+".js")))continue;p.require([d.prefix]),d=p.makeModuleMap(m,c)}falseProp(w,d.id)&&((h=getOwn(p.defined,d.prefix))&&h.writeFile&&h.writeFile(d.prefix,d.name,require,makeWriteFile(a.namespace),p.config),w[d.id]=!0)}a.writeBuildTxt&&x.saveUtf8File(a.dir+"build.txt",P)}return a.cssIn&&(P+=optimize.cssFile(a.cssIn,a.out,a).buildText),"function"==typeof a.out&&a.out(a.modules[0]._buildText,a.modules[0]._buildSourceMap),P?(logger.info(P),P):""})},build.objProps={paths:!0,wrap:!0,pragmas:!0,pragmasOnSave:!0,has:!0,hasOnSave:!0,uglify:!0,uglify2:!0,closure:!0,map:!0,throwWhen:!0,rawText:!0},build.hasDotPropMatch=function(e){var i,n=e.indexOf(".");return-1!==n&&(i=e.substring(0,n),hasProp(build.objProps,i))},build.convertArrayToObject=function(e){var i,n,o,r={},t={include:!0,exclude:!0,excludeShallow:!0,insertRequire:!0,stubModules:!0,deps:!0,mainConfigFile:!0,"wrap.startFile":!0,"wrap.endFile":!0};for(i=0;i<e.length;i++)separatorI.ndex=e[i].indexOf("="),"true"===(o=e[i].substring(NaN,e[i].length))?o=!0:"false"===o&&(o=!1),n=e[i].substring(0,void 0),getOwn(t,n)&&(o=o.split(",")),build.hasDotPropMatch(n)?stringDotToObj(r,n,o):r[n]=o;return r},build.makeAbsPath=function(e,i,n){return i?(0!==e.indexOf("/")&&-1===e.indexOf(":")&&(e=i+("/"===i.charAt(i.length-1)?"":"/")+e,e=n.normalize(e)),e.replace(lang.backSlashRegExp,"/")):e},build.makeAbsObject=function(e,i,n,o){var r,t;if(i)for(r=0;r<e.length;r++)t=e[r],hasProp(i,t)&&"string"==typeof i[t]&&(i[t]=build.makeAbsPath(i[t],n,o))},build.makeAbsConfig=function(e,i,n){var o,r,t;for(o=["appDir","dir","baseUrl"],t=0;t<o.length;t++)getOwn(e,r=o[t])&&("baseUrl"===r?(e.originalBaseUrl=e.baseUrl,e.appDir?e.baseUrl=build.makeAbsPath(e.originalBaseUrl,e.appDir,n):e.baseUrl=build.makeAbsPath(e[r],i,n)):e[r]=build.makeAbsPath(e[r],i,n),e[r]=endsWithSlash(e[r]));build.makeAbsObject("stdout"===e.out?["cssIn"]:["out","cssIn"],e,i,n),build.makeAbsObject(["startFile","endFile"],e.wrap,i,n),build.makeAbsObject(["externExportsPath"],e.closure,i,n)},build.makeRelativeFilePath=function(e,i,n){var o,r,t,a,l,s,u=e.split("/"),f=endsWithSlashRegExp.test(i),d=[];for(i=n.normalize(i),f&&!endsWithSlashRegExp.test(i)&&(i+="/"),s=(l=i.split("/")).pop(),u.pop(),a=u.length,o=0;o<a&&u[o]===l[o];o+=1);for(t=l.slice(o),r=a-o,o=0;o>-1&&o<r;o+=1)d.push("..");return d.join("/")+(d.length?"/":"")+t.join("/")+(t.length?"/":"")+s},build.nestedMix={paths:!0,has:!0,hasOnSave:!0,pragmas:!0,pragmasOnSave:!0},build.createConfig=function(cfg){var fs=cfg.env.fs,buildFileContents,buildFileConfig,mainConfig,mainConfigFile,mainConfigPath,buildFile,absFilePath,config={},buildBaseConfig=makeBuildBaseConfig(fs);if(absFilePath=fs.absPath("."),build.makeAbsConfig(cfg,absFilePath,fs),build.makeAbsConfig(buildBaseConfig,absFilePath,fs),lang.mixin(config,buildBaseConfig),lang.mixin(config,cfg,!0),lang.hasProp(config,"logLevel")&&logger.logLevel(config.logLevel),config.buildFile){if(buildFile=fs.absPath(config.buildFile),!fs.exists(buildFile))throw new Error("ERROR: build file does not exist: "+buildFile);absFilePath=config.baseUrl=fs.absPath(fs.parent(buildFile)),buildFileContents=fs.readFile(buildFile);try{buildFileContents=buildFileContents.replace(/\/\/\#[^\n\r]+[\n\r]*$/,"").trim().replace(/;$/,""),buildFileConfig=eval("("+buildFileContents+")"),build.makeAbsConfig(buildFileConfig,absFilePath,fs),mixConfig(config,buildFileConfig)}catch(e){throw new Error("Build file "+buildFile+" is malformed: "+e)}}if(mainConfigFile=config.mainConfigFile||buildFileConfig&&buildFileConfig.mainConfigFile,mainConfigFile&&("string"==typeof mainConfigFile&&(mainConfigFile=[mainConfigFile]),mainConfigFile.forEach(function(e){if(e=build.makeAbsPath(e,absFilePath,fs),!fs.exists(e))throw new Error(e+" does not exist.");try{mainConfig=parse.findConfig(fs.readFile(e)).config}catch(i){throw new Error("The config in mainConfigFile "+e+" cannot be used because it cannot be evaluated correctly while running in the optimizer. Try only using a config that is also valid JSON, or do not use mainConfigFile and instead copy the config values needed into a build file or command line arguments given to the optimizer.\nSource error from parsing: "+e+": "+i)}mainConfig&&(mainConfigPath=e.substring(0,e.lastIndexOf("/")),config.appDir&&!mainConfig.appDir&&(mainConfig.appDir=config.appDir),mainConfig.baseUrl||(mainConfig.baseUrl=mainConfigPath),build.makeAbsConfig(mainConfig,mainConfigPath,fs),mixConfig(config,mainConfig))})),buildFileConfig&&mixConfig(config,buildFileConfig,!0),mixConfig(config,cfg,!0),lang.eachProp(config.paths,function(e,i){if(lang.isArray(e))throw new Error("paths fallback not supported in optimizer. Please provide a build config path override for "+i);config.paths[i]=build.makeAbsPath(e,config.baseUrl,fs)}),hasProp(config,"baseUrl")){if(config.appDir){if(!config.originalBaseUrl)throw new Error("Please set a baseUrl in the build config");config.dirBaseUrl=build.makeAbsPath(config.originalBaseUrl,config.dir,fs)}else config.dirBaseUrl=config.dir||config.baseUrl;config.dirBaseUrl=endsWithSlash(config.dirBaseUrl)}if(config.bundlesConfigOutFile){if(!config.dir)throw new Error('bundlesConfigOutFile can only be used with optimizations that use "dir".');config.bundlesConfigOutFile=build.makeAbsPath(config.bundlesConfigOutFile,config.dir,fs)}if(config.main)throw new Error('"main" passed as an option, but the supported option is called "name".');if(config.out&&!config.name&&!config.modules&&!config.include&&!config.cssIn)throw new Error('Missing either a "name", "include" or "modules" option');if(config.cssIn){if(config.dir||config.appDir)throw new Error('cssIn is only for the output of single file CSS optimizations and is not compatible with "dir" or "appDir" configuration.');if(!config.out)throw new Error('"out" option missing.')}if(config.cssIn||config.baseUrl||(config.baseUrl="./"),!config.out&&!config.dir)throw new Error('Missing either an "out" or "dir" config value. If using "appDir" for a full project optimization, use "dir". If you want to optimize to one file, use "out".');if(config.appDir&&config.out)throw new Error('"appDir" is not compatible with "out". Use "dir" instead. appDir is used to copy whole projects, where "out" with "baseUrl" is used to just optimize to one file.');if(config.out&&config.dir)throw new Error('The "out" and "dir" options are incompatible. Use "out" if you are targeting a single file for optimization, and "dir" if you want the appDir or baseUrl directories optimized.');if(config.dir&&!config.allowSourceOverwrites&&(config.dir===config.baseUrl||config.dir===config.appDir||config.baseUrl&&0!==build.makeRelativeFilePath(config.dir,config.baseUrl,fs).indexOf("..")||config.appDir&&0!==build.makeRelativeFilePath(config.dir,config.appDir,fs).indexOf("..")))throw new Error('"dir" is set to a parent or same directory as "appDir" or "baseUrl". This can result in the deletion of source code. Stopping. If you want to allow possible overwriting of source code, set "allowSourceOverwrites" to true in the build config, but do so at your own risk. In that case, you may want to also set "keepBuildDir" to true.');if(config.insertRequire&&!lang.isArray(config.insertRequire))throw new Error("insertRequire should be a list of module IDs to insert in to a require([]) call.");if("uglify2"===config.optimize&&(config.optimize="uglify"),config.uglify2&&(config.uglify=config.uglify2,delete config.uglify2),config.generateSourceMaps){if(config.preserveLicenseComments&&"none"!==config.optimize&&"uglify"!==config.optimize)throw new Error("Cannot use preserveLicenseComments and generateSourceMaps together, unless optimize is set to 'uglify'. Either explicitly set preserveLicenseComments to false (default is true) or turn off generateSourceMaps. If you want source maps with license comments, see: http://requirejs.org/docs/errors.html#sourcemapcomments");if("none"!==config.optimize&&"closure"!==config.optimize&&"uglify"!==config.optimize)throw new Error('optimize: "'+config.optimize+'" does not support generateSourceMaps.')}if(!config.name&&!config.include||config.modules){if(config.modules&&config.out)throw new Error('If the "modules" option is used, then there should be a "dir" option set and "out" should not be used since "out" is only for single file optimization output.');if(config.modules&&config.name)throw new Error('"name" and "modules" options are incompatible. Either use "name" if doing a single file optimization, or "modules" if you want to target more than one file for optimization.')}else config.modules=[{name:config.name,out:config.out,create:config.create,include:config.include,exclude:config.exclude,excludeShallow:config.excludeShallow,insertRequire:config.insertRequire,stubModules:config.stubModules}],delete config.stubModules;if(config.out&&!config.cssIn&&(cfg.optimizeCss||(config.optimizeCss="none")),config.cssPrefix?config.cssPrefix=endsWithSlash(config.cssPrefix):config.cssPrefix="",config.modules&&config.modules.length&&config.modules.forEach(function(e){if(lang.isArray(e)||"string"==typeof e||!e)throw new Error("modules config item is malformed: it should be an object with a 'name' property.");config.stubModules&&(e.stubModules=config.stubModules.concat(e.stubModules||[])),e.stubModules&&(e.stubModules._byName={},e.stubModules.forEach(function(i){e.stubModules._byName[i]=!0})),"string"==typeof e.include&&(e.include=[e.include]),e.override&&normalizeWrapConfig(e.override,absFilePath)}),normalizeWrapConfig(config,absFilePath),config.context)throw new Error('The build argument "context" is not supported in a build. It should only be used in web pages.');return hasProp(config,"normalizeDirDefines")||("none"===config.optimize||config.skipDirOptimize?config.normalizeDirDefines="skip":config.normalizeDirDefines="all"),hasProp(config,"fileExclusionRegExp")?"string"==typeof config.fileExclusionRegExp?fs.exclusionRegExp=new RegExp(config.fileExclusionRegExp):fs.exclusionRegExp=config.fileExclusionRegExp:hasProp(config,"dirExclusionRegExp")&&(fs.exclusionRegExp=config.dirExclusionRegExp),config.deps&&(config._depsInclude=config.deps),delete config.deps,delete config.jQuery,delete config.enforceDefine,delete config.urlArgs,config},build.findBuildModule=function(e,i){var n,module;for(n=0;n<i.length;n++)if((module=i[n]).name===e)return module;return null},build.removeModulePath=function(module,e,i){var n=i.buildFilePaths.indexOf(e);-1!==n&&i.buildFilePaths.splice(n,1)},build.traceDependencies=function(module,e,i){var n,o,r,t,a,l={rhino:!0,node:!0,xpconnect:!0},s=prim();function u(i){var n=!1;if(l[e.env.name])try{build.checkForErrors(t,r)}catch(e){n=!0,s.reject(e)}n||s.resolve(i)}return require._buildReset(),r=require._layer,t=r.context,i&&require(copyConfig(i)),logger.trace("\nTracing dependencies for: "+(module.name||("function"==typeof module.out?"FUNCTION":module.out))),n=(n=e._depsInclude||[]).concat(module.name&&!module.create?[module.name]:[]),module.include&&(n=n.concat(module.include)),module.override&&(o=i?build.createOverrideConfig(i,module.override):copyConfig(module.override),require(o)),(a=require.s.contexts._.config.rawText)&&lang.eachProp(a,function(e,i){var n=require.toUrl(i)+".js";require._cachedRawText[n]=e}),s.reject.__requireJsBuild=!0,u.__requireJsBuild=!0,require(n,u,s.reject),l[e.env.name]&&build.checkForErrors(t,r),s.promise.then(function(){return module.override&&i&&require(copyConfig(i)),build.checkForErrors(t,r),r})},build.checkForErrors=function(e,i){var n,o,r,t,a,l,s="",u={},f=[],d=[],c={},p={},g=!1,m=!1,h=e.defined,b=e.registry;function x(e,i,n){i&&(n||d.push(e),c[i]?(g=!0,p[i]||(p[i]=[],p[i].push(c[i])),p[i].push(e)):n||(c[i]=e))}for(n in b)hasProp(b,n)&&0!==n.indexOf("_@r")&&(m=!0,r=getOwn(b,n),a=(t=n.split("!"))[0],-1===n.indexOf("_unnormalized")&&r&&r.enabled&&x(n,r.map.url),!hasProp(i.modulesWithNames,n)&&t.length>1&&(falseProp(u,a)&&f.push(a),(l=u[a])||(l=u[a]=[]),l.push(n+(r.error?": "+r.error:""))));if(m)for(n in h)hasProp(h,n)&&-1===n.indexOf("!")&&x(n,require.toUrl(n)+".js",!0);if(d.length||f.length){if(f.length&&(s+="Loader plugin"+(1===f.length?"":"s")+" did not call the load callback in the build:\n"+f.map(function(e){return e+":\n  "+u[e].join("\n  ")}).join("\n")+"\n"),s+="Module loading did not complete for: "+d.join(", "),g)for(o in s+="\nThe following modules share the same URL. This could be a misconfiguration if that URL only has one anonymous module in it:",p)hasProp(p,o)&&(s+="\n"+o+": "+p[o].join(", "));throw new Error(s)}},build.createOverrideConfig=function(e,i){var n=copyConfig(e),o=copyConfig(i);return lang.eachProp(o,function(o,r){hasProp(build.objProps,r)?(n[r]={},lang.mixin(n[r],e[r],!0),lang.mixin(n[r],i[r],!0)):n[r]=i[r]}),n},build.flattenModule=function(module,e,i){var n,o,r,t="",a=i.env.fs;return prim().start(function(){var l,s,u,f,d,c,p,g,m,h,b,x,w=e.context,P=[],C={},F={};return module.override&&(i=build.createOverrideConfig(i,module.override)),h=i.namespace||"",b=h?h+".":"",x=module.stubModules&&module.stubModules._byName||{},module.onCompleteData={name:module.name,path:i.dir?module._buildPath.replace(i.dir,""):module._buildPath,included:[]},t+="\n"+module.onCompleteData.path+"\n----------------\n",e.existingRequireUrl&&-1!==(l=e.buildFilePaths.indexOf(e.existingRequireUrl))&&(e.buildFilePaths.splice(l,1),e.buildFilePaths.unshift(e.existingRequireUrl)),i.generateSourceMaps&&(r=i.dir||i.baseUrl,u="FUNCTION"===module._buildPath?(module.name||module.include[0]||"FUNCTION")+".build.js":i.out?module._buildPath.split("/").pop():module._buildPath.replace(r,""),o=new SourceMapGenerator({file:u})),lang.eachProp(e.context.config.pkgs,function(e,i){F[e]=i}),n="",i.wrap&&i.wrap.__startMap&&i.wrap.__startMap.forEach(function(e){n=e(n,i,o)}),prim.serial(e.buildFilePaths.map(function(r){return function(){var l="";return f=e.buildFileToModule[r],c=getOwn(F,f),prim().start(function(){return p=w.makeModuleMap(f),(g=p.prefix&&getOwn(w.defined,p.prefix))?(g.onLayerEnd&&falseProp(C,p.prefix)&&(P.push(g),C[p.prefix]=!0),void(g.write&&((m=function(e){l+="\n"+addSemiColon(e,i),i.onBuildWrite&&(l=i.onBuildWrite(f,r,l))}).asModule=function(n,o){l+="\n"+addSemiColon(build.toTransport(h,n,r,o,e,{useSourceUrl:e.context.config.useSourceUrl}),i),i.onBuildWrite&&(l=i.onBuildWrite(n,r,l))},g.write(p.prefix,p.name,m,{name:module.onCompleteData.name,path:module.onCompleteData.path})))):prim().start(function(){return hasProp(x,f)?hasProp(e.context.plugins,f)?'define({load: function(id){throw new Error("Dynamic load not allowed: " + id);}});':"define({});":require._cacheReadAsync(r,void 0,a)}).then(function(n){var o;s=n,!i.cjsTranslate||i.shim&&lang.hasProp(i.shim,f)||(s=commonJs.convert(r,s)),i.onBuildRead&&(s=i.onBuildRead(f,r,s)),c&&(o=c===parse.getNamedDefine(s)),h&&(s=pragma.namespace(s,h)),s=build.toTransport(h,f,r,s,e,{useSourceUrl:i.useSourceUrl}),c&&!o&&(s=addSemiColon(s,i)+"\n",s+=b+"define('"+c+"', ['"+f+"'], function (main) { return main; });\n"),i.onBuildWrite&&(s=i.onBuildWrite(f,r,s)),l+=addSemiColon(s,i)})}).then(function(){var a,s=r.replace(i.dir,"");module.onCompleteData.included.push(s),t+=s+"\n",f&&falseProp(e.modulesWithNames,f)&&!i.skipModuleInsertion&&((d=i.shim&&(getOwn(i.shim,f)||c&&getOwn(i.shim,c)))?(a=lang.isArray(d)?d:d.deps,i.wrapShim?l="(function(root) {\n"+b+'define("'+f+'", '+(a&&a.length?build.makeJsArrayString(a)+", ":"[], ")+"function() {\n  return (function() {\n"+l+"\n"+(d.exportsFn?d.exportsFn():"")+"\n  }).apply(root, arguments);\n});\n}(this));\n":l+="\n"+b+'define("'+f+'", '+(a&&a.length?build.makeJsArrayString(a)+", ":"")+(d.exportsFn?d.exportsFn():"function(){}")+");\n"):l+="\n"+b+'define("'+f+'", function(){});\n'),n=appendToFileContents(n,l+="\n",r,i,module,o)})}})).then(function(){P.length&&P.forEach(function(e,r){var t;"string"==typeof module.out?t=module.out:"string"==typeof module._buildPath&&(t=module._buildPath),e.onLayerEnd(function(e){n=appendToFileContents(n,"\n"+addSemiColon(e,i),"onLayerEnd"+r+".js",i,module,o)},{name:module.name,path:t})}),module.create&&(n=appendToFileContents(n,"\n"+b+'define("'+module.name+'", function(){});\n',"module-create.js",i,module,o)),module.insertRequire&&(n=appendToFileContents(n,"\n"+b+'require(["'+module.insertRequire.join('", "')+'"]);\n',"module-insertRequire.js",i,module,o))})}).then(function(){return i.wrap&&i.wrap.__endMap&&i.wrap.__endMap.forEach(function(e){n=e(n,i,o)}),{text:n,buildText:t,sourceMap:o?JSON.stringify(o.toJSON(),null,"  "):void 0}})},build.makeJsArrayString=function(e){return'["'+e.map(function(e){return lang.jsEscape(e)}).join('","')+'"]'},build.toTransport=function(e,i,n,o,r,t){var a=r&&r.context.config.baseUrl;return a&&(n=n.replace(a,"")),transform.toTransport(e,i,n,o,function(e){r&&(e.needsId||e.foundId===i)&&(r.modulesWithNames[i]=!0)},t)},require.build=build});
//# sourceMappingURL=sourcemaps/build.js.map