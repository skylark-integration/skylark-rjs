/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
(function(factory,globals,define,require) {
  var isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-rjs/rjs',[
    "skylark-langx-ns",
],function(skylark){
    require.define = define;

	return skylark.attach("intg.rjs",require);
});
/*jslint plusplus: true */
/*global define, java */

define('skylark-rjs/lang',[],function () {
    'use strict';

    var lang, isJavaObj,
        hasOwn = Object.prototype.hasOwnProperty;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    isJavaObj = function () {
        return false;
    };

    //Rhino, but not Nashorn (detected by importPackage not existing)
    //Can have some strange foreign objects.
    if (typeof java !== 'undefined' && java.lang && java.lang.Object && typeof importPackage !== 'undefined') {
        isJavaObj = function (obj) {
            return obj instanceof java.lang.Object;
        };
    }

    lang = {
        backSlashRegExp: /\\/g,
        ostring: Object.prototype.toString,

        isArray: Array.isArray || function (it) {
            return lang.ostring.call(it) === "[object Array]";
        },

        isFunction: function(it) {
            return lang.ostring.call(it) === "[object Function]";
        },

        isRegExp: function(it) {
            return it && it instanceof RegExp;
        },

        hasProp: hasProp,

        //returns true if the object does not have an own property prop,
        //or if it does, it is a falsy value.
        falseProp: function (obj, prop) {
            return !hasProp(obj, prop) || !obj[prop];
        },

        //gets own property value for given prop on object
        getOwn: function (obj, prop) {
            return hasProp(obj, prop) && obj[prop];
        },

        _mixin: function(dest, source, override){
            var name;
            for (name in source) {
                if(source.hasOwnProperty(name) &&
                    (override || !dest.hasOwnProperty(name))) {
                    dest[name] = source[name];
                }
            }

            return dest; // Object
        },

        /**
         * mixin({}, obj1, obj2) is allowed. If the last argument is a boolean,
         * then the source objects properties are force copied over to dest.
         */
        mixin: function(dest){
            var parameters = Array.prototype.slice.call(arguments),
                override, i, l;

            if (!dest) { dest = {}; }

            if (parameters.length > 2 && typeof arguments[parameters.length-1] === 'boolean') {
                override = parameters.pop();
            }

            for (i = 1, l = parameters.length; i < l; i++) {
                lang._mixin(dest, parameters[i], override);
            }
            return dest; // Object
        },

        /**
         * Does a deep mix of source into dest, where source values override
         * dest values if a winner is needed.
         * @param  {Object} dest destination object that receives the mixed
         * values.
         * @param  {Object} source source object contributing properties to mix
         * in.
         * @return {[Object]} returns dest object with the modification.
         */
        deepMix: function(dest, source) {
            lang.eachProp(source, function (value, prop) {
                if (typeof value === 'object' && value &&
                    !lang.isArray(value) && !lang.isFunction(value) &&
                    !(value instanceof RegExp)) {

                    if (!dest[prop]) {
                        dest[prop] = {};
                    }
                    lang.deepMix(dest[prop], value);
                } else {
                    dest[prop] = value;
                }
            });
            return dest;
        },

        /**
         * Does a type of deep copy. Do not give it anything fancy, best
         * for basic object copies of objects that also work well as
         * JSON-serialized things, or has properties pointing to functions.
         * For non-array/object values, just returns the same object.
         * @param  {Object} obj      copy properties from this object
         * @param  {Object} [ignoredProps] optional object whose own properties
         * are keys that should be ignored.
         * @return {Object}
         */
        deeplikeCopy: function (obj, ignoredProps) {
            var type, result;

            if (lang.isArray(obj)) {
                result = [];
                obj.forEach(function(value) {
                    result.push(lang.deeplikeCopy(value, ignoredProps));
                });
                return result;
            }

            type = typeof obj;
            if (obj === null || obj === undefined || type === 'boolean' ||
                type === 'string' || type === 'number' || lang.isFunction(obj) ||
                lang.isRegExp(obj)|| isJavaObj(obj)) {
                return obj;
            }

            //Anything else is an object, hopefully.
            result = {};
            lang.eachProp(obj, function(value, key) {
                if (!ignoredProps || !hasProp(ignoredProps, key)) {
                    result[key] = lang.deeplikeCopy(value, ignoredProps);
                }
            });
            return result;
        },

        delegate: (function () {
            // boodman/crockford delegation w/ cornford optimization
            function TMP() {}
            return function (obj, props) {
                TMP.prototype = obj;
                var tmp = new TMP();
                TMP.prototype = null;
                if (props) {
                    lang.mixin(tmp, props);
                }
                return tmp; // Object
            };
        }()),

        /**
         * Helper function for iterating over an array. If the func returns
         * a true value, it will break out of the loop.
         */
        each: function each(ary, func) {
            if (ary) {
                var i;
                for (i = 0; i < ary.length; i += 1) {
                    if (func(ary[i], i, ary)) {
                        break;
                    }
                }
            }
        },

        /**
         * Cycles over properties in an object and calls a function for each
         * property value. If the function returns a truthy value, then the
         * iteration is stopped.
         */
        eachProp: function eachProp(obj, func) {
            var prop;
            for (prop in obj) {
                if (hasProp(obj, prop)) {
                    if (func(obj[prop], prop)) {
                        break;
                    }
                }
            }
        },

        //Similar to Function.prototype.bind, but the "this" object is specified
        //first, since it is easier to read/figure out what "this" will be.
        bind: function bind(obj, fn) {
            return function () {
                return fn.apply(obj, arguments);
            };
        },

        //Escapes a content string to be be a string that has characters escaped
        //for inclusion as part of a JS string.
        jsEscape: function (content) {
            return content.replace(/(["'\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r");
        }
    };
    return lang;
});

/**
 * prim 0.0.1 Copyright (c) 2012-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/prim for details
 */

/*global setImmediate, process, setTimeout, define, module */

//Set prime.hideResolutionConflict = true to allow "resolution-races"
//in promise-tests to pass.
//Since the goal of prim is to be a small impl for trusted code, it is
//more important to normally throw in this case so that we can find
//logic errors quicker.

define('skylark-rjs/prim',[],function () {
    'use strict';
    var op = Object.prototype,
        hasOwn = op.hasOwnProperty;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i]) {
                    func(ary[i], i, ary);
                }
            }
        }
    }

    function check(p) {
        if (hasProp(p, 'e') || hasProp(p, 'v')) {
            if (!prim.hideResolutionConflict) {
                throw new Error('Prim promise already resolved: ' +
                                JSON.stringify(p));
            }
            return false;
        }
        return true;
    }

    function notify(ary, value) {
        prim.nextTick(function () {
            each(ary, function (item) {
                item(value);
            });
        });
    }

    function prim() {
        var p,
            ok = [],
            fail = [];

        return (p = {
            callback: function (yes, no) {
                if (no) {
                    p.errback(no);
                }

                if (hasProp(p, 'v')) {
                    prim.nextTick(function () {
                        yes(p.v);
                    });
                } else {
                    ok.push(yes);
                }
            },

            errback: function (no) {
                if (hasProp(p, 'e')) {
                    prim.nextTick(function () {
                        no(p.e);
                    });
                } else {
                    fail.push(no);
                }
            },

            finished: function () {
                return hasProp(p, 'e') || hasProp(p, 'v');
            },

            rejected: function () {
                return hasProp(p, 'e');
            },

            resolve: function (v) {
                if (check(p)) {
                    p.v = v;
                    notify(ok, v);
                }
                return p;
            },
            reject: function (e) {
                if (check(p)) {
                    p.e = e;
                    notify(fail, e);
                }
                return p;
            },

            start: function (fn) {
                p.resolve();
                return p.promise.then(fn);
            },

            promise: {
                then: function (yes, no) {
                    var next = prim();

                    p.callback(function (v) {
                        try {
                            if (yes && typeof yes === 'function') {
                                v = yes(v);
                            }

                            if (v && v.then) {
                                v.then(next.resolve, next.reject);
                            } else {
                                next.resolve(v);
                            }
                        } catch (e) {
                            next.reject(e);
                        }
                    }, function (e) {
                        var err;

                        try {
                            if (!no || typeof no !== 'function') {
                                next.reject(e);
                            } else {
                                err = no(e);

                                if (err && err.then) {
                                    err.then(next.resolve, next.reject);
                                } else {
                                    next.resolve(err);
                                }
                            }
                        } catch (e2) {
                            next.reject(e2);
                        }
                    });

                    return next.promise;
                },

                fail: function (no) {
                    return p.promise.then(null, no);
                },

                end: function () {
                    p.errback(function (e) {
                        throw e;
                    });
                }
            }
        });
    };

    prim.serial = function (ary) {
        var result = prim().resolve().promise;
        each(ary, function (item) {
            result = result.then(function () {
                return item();
            });
        });
        return result;
    };

    prim.nextTick = typeof setImmediate === 'function' ? setImmediate :
        (typeof process !== 'undefined' && process.nextTick ?
            process.nextTick : (typeof setTimeout !== 'undefined' ?
                function (fn) {
                setTimeout(fn, 0);
            } : function (fn) {
        fn();
    }));

    return prim;
});
/*jslint nomen: false, strict: false */
/*global define: false */

define('skylark-rjs/logger',[],function () {
    function print(msg,e) {
        console.log(msg,e);
    }

    var logger = {
        TRACE: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        SILENT: 4,
        level: 0,
        logPrefix: "",

        logLevel: function( level ) {
            this.level = level;
        },

        trace: function (message) {
            if (this.level <= this.TRACE) {
                this._print(message);
            }
        },

        info: function (message) {
            if (this.level <= this.INFO) {
                this._print(message);
            }
        },

        warn: function (message) {
            if (this.level <= this.WARN) {
                this._print(message);
            }
        },

        error: function (message) {
            if (this.level <= this.ERROR) {
                this._print(message);
            }
        },

        _print: function (message) {
            this._sysPrint((this.logPrefix ? (this.logPrefix + " ") : "") + message);
        },

        _sysPrint: function (message) {
            print(message);
        }
    };

    return logger;
});

/*global define, Reflect */

/*
 * xpcshell has a smaller stack on linux and windows (1MB vs 9MB on mac),
 * and the recursive nature of esprima can cause it to overflow pretty
 * quickly. So favor it built in Reflect parser:
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
 */
define('skylark-rjs/esprima',['skylark-espree'], function (esprima) {
    return esprima;
});

/*jslint plusplus: true */
/*global define: false */

define('skylark-rjs/parse',[
    './esprima', 
    './lang'
], function (esprima, lang) {
    'use strict';

    function arrayToString(ary) {
        var output = '[';
        if (ary) {
            ary.forEach(function (item, i) {
                output += (i > 0 ? ',' : '') + '"' + lang.jsEscape(item) + '"';
            });
        }
        output += ']';

        return output;
    }

    //This string is saved off because JSLint complains
    //about obj.arguments use, as 'reserved word'
    var argPropName = 'arguments',
        //Default object to use for "scope" checking for UMD identifiers.
        emptyScope = {},
        mixin = lang.mixin,
        hasProp = lang.hasProp;

    //From an esprima example for traversing its ast.
    function traverse(object, visitor) {
        var child;

        if (!object) {
            return;
        }

        if (visitor.call(null, object) === false) {
            return false;
        }
        for (var i = 0, keys = Object.keys(object); i < keys.length; i++) {
            child = object[keys[i]];
            if (typeof child === 'object' && child !== null) {
                if (traverse(child, visitor) === false) {
                    return false;
                }
            }
        }
    }

    //Like traverse, but visitor returning false just
    //stops that subtree analysis, not the rest of tree
    //visiting.
    function traverseBroad(object, visitor) {
        var child;

        if (!object) {
            return;
        }

        if (visitor.call(null, object) === false) {
            return false;
        }
        for (var i = 0, keys = Object.keys(object); i < keys.length; i++) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverseBroad(child, visitor);
            }
        }
    }

    /**
     * Pulls out dependencies from an array literal with just string members.
     * If string literals, will just return those string values in an array,
     * skipping other items in the array.
     *
     * @param {Node} node an AST node.
     *
     * @returns {Array} an array of strings.
     * If null is returned, then it means the input node was not a valid
     * dependency.
     */
    function getValidDeps(node) {
        if (!node || node.type !== 'ArrayExpression' || !node.elements) {
            return;
        }

        var deps = [];

        node.elements.some(function (elem) {
            if (elem.type === 'Literal') {
                deps.push(elem.value);
            }
        });

        return deps.length ? deps : undefined;
    }

    // Detects regular or arrow function expressions as the desired expression
    // type.
    function isFnExpression(node) {
        return (node && (node.type === 'FunctionExpression' ||
                             node.type === 'ArrowFunctionExpression'));
    }

    /**
     * Main parse function. Returns a string of any valid require or
     * define/require.def calls as part of one JavaScript source string.
     * @param {String} moduleName the module name that represents this file.
     * It is used to create a default define if there is not one already for the
     * file. This allows properly tracing dependencies for builds. Otherwise, if
     * the file just has a require() call, the file dependencies will not be
     * properly reflected: the file will come before its dependencies.
     * @param {String} moduleName
     * @param {String} fileName
     * @param {String} fileContents
     * @param {Object} options optional options. insertNeedsDefine: true will
     * add calls to require.needsDefine() if appropriate.
     * @returns {String} JS source string or null, if no require or
     * define/require.def calls are found.
     */
    function parse(moduleName, fileName, fileContents, options) {
        options = options || {};

        //Set up source input
        var i, moduleCall, depString,
            moduleDeps = [],
            result = '',
            moduleList = [],
            needsDefine = true,
            astRoot = esprima.parse(fileContents);

        parse.recurse(astRoot, function (callName, config, name, deps, node, factoryIdentifier, fnExpScope) {
            if (!deps) {
                deps = [];
            }

            if (callName === 'define' && (!name || name === moduleName)) {
                needsDefine = false;
            }

            if (!name) {
                //If there is no module name, the dependencies are for
                //this file/default module name.
                moduleDeps = moduleDeps.concat(deps);
            } else {
                moduleList.push({
                    name: name,
                    deps: deps
                });
            }

            if (callName === 'define' && factoryIdentifier && hasProp(fnExpScope, factoryIdentifier)) {
                return factoryIdentifier;
            }

            //If define was found, no need to dive deeper, unless
            //the config explicitly wants to dig deeper.
            return !!options.findNestedDependencies;
        }, options);

        if (options.insertNeedsDefine && needsDefine) {
            result += 'require.needsDefine("' + moduleName + '");';
        }

        if (moduleDeps.length || moduleList.length) {
            for (i = 0; i < moduleList.length; i++) {
                moduleCall = moduleList[i];
                if (result) {
                    result += '\n';
                }

                //If this is the main module for this file, combine any
                //"anonymous" dependencies (could come from a nested require
                //call) with this module.
                if (moduleCall.name === moduleName) {
                    moduleCall.deps = moduleCall.deps.concat(moduleDeps);
                    moduleDeps = [];
                }

                depString = arrayToString(moduleCall.deps);
                result += 'define("' + moduleCall.name + '",' +
                          depString + ');';
            }
            if (moduleDeps.length) {
                if (result) {
                    result += '\n';
                }
                depString = arrayToString(moduleDeps);
                result += 'define("' + moduleName + '",' + depString + ');';
            }
        }

        return result || null;
    }

    parse.traverse = traverse;
    parse.traverseBroad = traverseBroad;
    parse.isFnExpression = isFnExpression;

    /**
     * Handles parsing a file recursively for require calls.
     * @param {Array} parentNode the AST node to start with.
     * @param {Function} onMatch function to call on a parse match.
     * @param {Object} [options] This is normally the build config options if
     * it is passed.
     * @param {Object} [fnExpScope] holds list of function expresssion
     * argument identifiers, set up internally, not passed in
     */
    parse.recurse = function (object, onMatch, options, fnExpScope) {
        //Like traverse, but skips if branches that would not be processed
        //after has application that results in tests of true or false boolean
        //literal values.
        var keys, child, result, i, params, param, tempObject,
            hasHas = options && options.has;

        fnExpScope = fnExpScope || emptyScope;

        if (!object) {
            return;
        }

        //If has replacement has resulted in if(true){} or if(false){}, take
        //the appropriate branch and skip the other one.
        if (hasHas && object.type === 'IfStatement' && object.test.type &&
                object.test.type === 'Literal') {
            if (object.test.value) {
                //Take the if branch
                this.recurse(object.consequent, onMatch, options, fnExpScope);
            } else {
                //Take the else branch
                this.recurse(object.alternate, onMatch, options, fnExpScope);
            }
        } else {
            result = this.parseNode(object, onMatch, fnExpScope);
            if (result === false) {
                return;
            } else if (typeof result === 'string') {
                return result;
            }

            //Build up a "scope" object that informs nested recurse calls if
            //the define call references an identifier that is likely a UMD
            //wrapped function expression argument.
            //Catch (function(a) {... wrappers
            if (object.type === 'ExpressionStatement' && object.expression &&
                    object.expression.type === 'CallExpression' && object.expression.callee &&
                    isFnExpression(object.expression.callee)) {
                tempObject = object.expression.callee;
            }
            // Catch !function(a) {... wrappers
            if (object.type === 'UnaryExpression' && object.argument &&
                object.argument.type === 'CallExpression' && object.argument.callee &&
                isFnExpression(object.argument.callee)) {
                tempObject = object.argument.callee;
            }
            if (tempObject && tempObject.params && tempObject.params.length) {
                params = tempObject.params;
                fnExpScope = mixin({}, fnExpScope, true);
                for (i = 0; i < params.length; i++) {
                    param = params[i];
                    if (param.type === 'Identifier') {
                        fnExpScope[param.name] = true;
                    }
                }
            }

            for (i = 0, keys = Object.keys(object); i < keys.length; i++) {
                child = object[keys[i]];
                if (typeof child === 'object' && child !== null) {
                    result = this.recurse(child, onMatch, options, fnExpScope);
                    if (typeof result === 'string' && hasProp(fnExpScope, result)) {
                        //The result was still in fnExpScope so break. Otherwise,
                        //was a return from a a tree that had a UMD definition,
                        //but now out of that scope so keep siblings.
                        break;
                    }
                }
            }

            //Check for an identifier for a factory function identifier being
            //passed in as a function expression, indicating a UMD-type of
            //wrapping.
            if (typeof result === 'string') {
                if (hasProp(fnExpScope, result)) {
                    //result still in scope, keep jumping out indicating the
                    //identifier still in use.
                    return result;
                }

                return;
            }
        }
    };

    /**
     * Determines if the file defines the require/define module API.
     * Specifically, it looks for the `define.amd = ` expression.
     * @param {String} fileName
     * @param {String} fileContents
     * @returns {Boolean}
     */
    parse.definesRequire = function (fileName, fileContents) {
        var foundDefine = false,
            foundDefineAmd = false;

        traverse(esprima.parse(fileContents), function (node) {
            // Look for a top level declaration of a define, like
            // var requirejs, require, define, off Program body.
            if (node.type === 'Program' && node.body && node.body.length) {
                foundDefine = node.body.some(function(bodyNode) {
                    // var define
                    if (bodyNode.type === 'VariableDeclaration') {
                        var decls = bodyNode.declarations;
                        if (decls) {
                            var hasVarDefine = decls.some(function(declNode) {
                                return (declNode.type === 'VariableDeclarator' &&
                                        declNode.id &&
                                        declNode.id.type === 'Identifier' &&
                                        declNode.id.name === 'define');
                            });
                            if (hasVarDefine) {
                                return true;
                            }
                        }
                    }

                    // function define() {}
                    if (bodyNode.type === 'FunctionDeclaration' &&
                        bodyNode.id &&
                        bodyNode.id.type === 'Identifier' &&
                        bodyNode.id.name === 'define') {
                        return true;
                    }

                });
            }

            // Need define variable found first, before detecting define.amd.
            if (foundDefine && parse.hasDefineAmd(node)) {
                foundDefineAmd = true;

                //Stop traversal
                return false;
            }
        });

        return foundDefine && foundDefineAmd;
    };

    /**
     * Finds require("") calls inside a CommonJS anonymous module wrapped in a
     * define(function(require, exports, module){}) wrapper. These dependencies
     * will be added to a modified define() call that lists the dependencies
     * on the outside of the function.
     * @param {String} fileName
     * @param {String|Object} fileContents: a string of contents, or an already
     * parsed AST tree.
     * @returns {Array} an array of module names that are dependencies. Always
     * returns an array, but could be of length zero.
     */
    parse.getAnonDeps = function (fileName, fileContents) {
        var astRoot = typeof fileContents === 'string' ?
                      esprima.parse(fileContents) : fileContents,
            defFunc = this.findAnonDefineFactory(astRoot);

        return parse.getAnonDepsFromNode(defFunc);
    };

    /**
     * Finds require("") calls inside a CommonJS anonymous module wrapped
     * in a define function, given an AST node for the definition function.
     * @param {Node} node the AST node for the definition function.
     * @returns {Array} and array of dependency names. Can be of zero length.
     */
    parse.getAnonDepsFromNode = function (node) {
        var deps = [],
            funcArgLength;

        if (node) {
            this.findRequireDepNames(node, deps);

            //If no deps, still add the standard CommonJS require, exports,
            //module, in that order, to the deps, but only if specified as
            //function args. In particular, if exports is used, it is favored
            //over the return value of the function, so only add it if asked.
            funcArgLength = node.params && node.params.length;
            if (funcArgLength) {
                deps = (funcArgLength > 1 ? ["require", "exports", "module"] :
                        ["require"]).concat(deps);
            }
        }
        return deps;
    };

    parse.isDefineNodeWithArgs = function (node) {
        return node && node.type === 'CallExpression' &&
               node.callee && node.callee.type === 'Identifier' &&
               node.callee.name === 'define' && node[argPropName];
    };

    /**
     * Finds the function in define(function (require, exports, module){});
     * @param {Array} node
     * @returns {Boolean}
     */
    parse.findAnonDefineFactory = function (node) {
        var match;

        traverse(node, function (node) {
            var arg0, arg1;

            if (parse.isDefineNodeWithArgs(node)) {

                //Just the factory function passed to define
                arg0 = node[argPropName][0];
                if (isFnExpression(arg0)) {
                    match = arg0;
                    return false;
                }

                //A string literal module ID followed by the factory function.
                arg1 = node[argPropName][1];
                if (arg0.type === 'Literal' && isFnExpression(arg1)) {
                    match = arg1;
                    return false;
                }
            }
        });

        return match;
    };

    /**
     * Finds any config that is passed to requirejs. That includes calls to
     * require/requirejs.config(), as well as require({}, ...) and
     * requirejs({}, ...)
     * @param {String} fileContents
     *
     * @returns {Object} a config details object with the following properties:
     * - config: {Object} the config object found. Can be undefined if no
     * config found.
     * - range: {Array} the start index and end index in the contents where
     * the config was found. Can be undefined if no config found.
     * Can throw an error if the config in the file cannot be evaluated in
     * a build context to valid JavaScript.
     */
    parse.findConfig = function (fileContents) {
        /*jslint evil: true */
        var jsConfig, foundConfig, stringData, foundRange, quote, quoteMatch,
            quoteRegExp = /(:\s|\[\s*)(['"])/,
            astRoot = esprima.parse(fileContents, {
                loc: true
            });

        traverse(astRoot, function (node) {
            var arg,
                requireType = parse.hasRequire(node);

            if (requireType && (requireType === 'require' ||
                    requireType === 'requirejs' ||
                    requireType === 'requireConfig' ||
                    requireType === 'requirejsConfig')) {

                arg = node[argPropName] && node[argPropName][0];

                if (arg && arg.type === 'ObjectExpression') {
                    stringData = parse.nodeToString(fileContents, arg);
                    jsConfig = stringData.value;
                    foundRange = stringData.range;
                    return false;
                }
            } else {
                arg = parse.getRequireObjectLiteral(node);
                if (arg) {
                    stringData = parse.nodeToString(fileContents, arg);
                    jsConfig = stringData.value;
                    foundRange = stringData.range;
                    return false;
                }
            }
        });

        if (jsConfig) {
            // Eval the config
            quoteMatch = quoteRegExp.exec(jsConfig);
            quote = (quoteMatch && quoteMatch[2]) || '"';
            foundConfig = eval('(' + jsConfig + ')');
        }

        return {
            config: foundConfig,
            range: foundRange,
            quote: quote
        };
    };

    /** Returns the node for the object literal assigned to require/requirejs,
     * for holding a declarative config.
     */
    parse.getRequireObjectLiteral = function (node) {
        if (node.id && node.id.type === 'Identifier' &&
                (node.id.name === 'require' || node.id.name === 'requirejs') &&
                node.init && node.init.type === 'ObjectExpression') {
            return node.init;
        }
    };

    /**
     * Renames require/requirejs/define calls to be ns + '.' + require/requirejs/define
     * Does *not* do .config calls though. See pragma.namespace for the complete
     * set of namespace transforms. This function is used because require calls
     * inside a define() call should not be renamed, so a simple regexp is not
     * good enough.
     * @param  {String} fileContents the contents to transform.
     * @param  {String} ns the namespace, *not* including trailing dot.
     * @return {String} the fileContents with the namespace applied
     */
    parse.renameNamespace = function (fileContents, ns) {
        var lines,
            locs = [],
            astRoot = esprima.parse(fileContents, {
                loc: true
            });

        parse.recurse(astRoot, function (callName, config, name, deps, node) {
            locs.push(node.loc);
            //Do not recurse into define functions, they should be using
            //local defines.
            return callName !== 'define';
        }, {});

        if (locs.length) {
            lines = fileContents.split('\n');

            //Go backwards through the found locs, adding in the namespace name
            //in front.
            locs.reverse();
            locs.forEach(function (loc) {
                var startIndex = loc.start.column,
                //start.line is 1-based, not 0 based.
                lineIndex = loc.start.line - 1,
                line = lines[lineIndex];

                lines[lineIndex] = line.substring(0, startIndex) +
                                   ns + '.' +
                                   line.substring(startIndex,
                                                      line.length);
            });

            fileContents = lines.join('\n');
        }

        return fileContents;
    };

    /**
     * Finds all dependencies specified in dependency arrays and inside
     * simplified commonjs wrappers.
     * @param {String} fileName
     * @param {String} fileContents
     *
     * @returns {Array} an array of dependency strings. The dependencies
     * have not been normalized, they may be relative IDs.
     */
    parse.findDependencies = function (fileName, fileContents, options) {
        var dependencies = [],
            astRoot = esprima.parse(fileContents);

        parse.recurse(astRoot, function (callName, config, name, deps) {
            if (deps) {
                dependencies = dependencies.concat(deps);
            }
        }, options);

        return dependencies;
    };

    /**
     * Finds only CJS dependencies, ones that are the form
     * require('stringLiteral')
     */
    parse.findCjsDependencies = function (fileName, fileContents) {
        var dependencies = [];

        traverse(esprima.parse(fileContents), function (node) {
            var arg;

            if (node && node.type === 'CallExpression' && node.callee &&
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'require' && node[argPropName] &&
                    node[argPropName].length === 1) {
                arg = node[argPropName][0];
                if (arg.type === 'Literal') {
                    dependencies.push(arg.value);
                }
            }
        });

        return dependencies;
    };

    //function define() {}
    parse.hasDefDefine = function (node) {
        return node.type === 'FunctionDeclaration' && node.id &&
                    node.id.type === 'Identifier' && node.id.name === 'define';
    };

    //define.amd = ...
    parse.hasDefineAmd = function (node) {
        return node && node.type === 'AssignmentExpression' &&
            node.left && node.left.type === 'MemberExpression' &&
            node.left.object && node.left.object.name === 'define' &&
            node.left.property && node.left.property.name === 'amd';
    };

    //define.amd reference, as in: if (define.amd)
    parse.refsDefineAmd = function (node) {
        return node && node.type === 'MemberExpression' &&
        node.object && node.object.name === 'define' &&
        node.object.type === 'Identifier' &&
        node.property && node.property.name === 'amd' &&
        node.property.type === 'Identifier';
    };

    //require(), requirejs(), require.config() and requirejs.config()
    parse.hasRequire = function (node) {
        var callName,
            c = node && node.callee;

        if (node && node.type === 'CallExpression' && c) {
            if (c.type === 'Identifier' &&
                    (c.name === 'require' ||
                    c.name === 'requirejs')) {
                //A require/requirejs({}, ...) call
                callName = c.name;
            } else if (c.type === 'MemberExpression' &&
                    c.object &&
                    c.object.type === 'Identifier' &&
                    (c.object.name === 'require' ||
                        c.object.name === 'requirejs') &&
                    c.property && c.property.name === 'config') {
                // require/requirejs.config({}) call
                callName = c.object.name + 'Config';
            }
        }

        return callName;
    };

    //define()
    parse.hasDefine = function (node) {
        return node && node.type === 'CallExpression' && node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'define';
    };

    /**
     * If there is a named define in the file, returns the name. Does not
     * scan for mulitple names, just the first one.
     */
    parse.getNamedDefine = function (fileContents) {
        var name;
        traverse(esprima.parse(fileContents), function (node) {
            if (node && node.type === 'CallExpression' && node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'define' &&
            node[argPropName] && node[argPropName][0] &&
            node[argPropName][0].type === 'Literal') {
                name = node[argPropName][0].value;
                return false;
            }
        });

        return name;
    };

    /**
     * Finds all the named define module IDs in a file.
     */
    parse.getAllNamedDefines = function (fileContents, excludeMap) {
        var names = [];
        parse.recurse(esprima.parse(fileContents),
        function (callName, config, name, deps, node, factoryIdentifier, fnExpScope) {
            if (callName === 'define' && name) {
                if (!excludeMap.hasOwnProperty(name)) {
                    names.push(name);
                }
            }

            //If a UMD definition that points to a factory that is an Identifier,
            //indicate processing should not traverse inside the UMD definition.
            if (callName === 'define' && factoryIdentifier && hasProp(fnExpScope, factoryIdentifier)) {
                return factoryIdentifier;
            }

            //If define was found, no need to dive deeper, unless
            //the config explicitly wants to dig deeper.
            return true;
        }, {});

        return names;
    };

    /**
     * Determines if define(), require({}|[]) or requirejs was called in the
     * file. Also finds out if define() is declared and if define.amd is called.
     */
    parse.usesAmdOrRequireJs = function (fileName, fileContents) {
        var uses;

        traverse(esprima.parse(fileContents), function (node) {
            var type, callName, arg;

            if (parse.hasDefDefine(node)) {
                //function define() {}
                type = 'declaresDefine';
            } else if (parse.hasDefineAmd(node)) {
                type = 'defineAmd';
            } else {
                callName = parse.hasRequire(node);
                if (callName) {
                    arg = node[argPropName] && node[argPropName][0];
                    if (arg && (arg.type === 'ObjectExpression' ||
                            arg.type === 'ArrayExpression')) {
                        type = callName;
                    }
                } else if (parse.hasDefine(node)) {
                    type = 'define';
                }
            }

            if (type) {
                if (!uses) {
                    uses = {};
                }
                uses[type] = true;
            }
        });

        return uses;
    };

    /**
     * Determines if require(''), exports.x =, module.exports =,
     * __dirname, __filename are used. So, not strictly traditional CommonJS,
     * also checks for Node variants.
     */
    parse.usesCommonJs = function (fileName, fileContents) {
        var uses = null,
            assignsExports = false;


        traverse(esprima.parse(fileContents), function (node) {
            var type,
                exp = node.expression || node.init;

            if (node.type === 'Identifier' &&
                    (node.name === '__dirname' || node.name === '__filename')) {
                type = node.name.substring(2);
            } else if (node.type === 'VariableDeclarator' && node.id &&
                    node.id.type === 'Identifier' &&
                        node.id.name === 'exports') {
                //Hmm, a variable assignment for exports, so does not use cjs
                //exports.
                type = 'varExports';
            } else if (exp && exp.type === 'AssignmentExpression' && exp.left &&
                    exp.left.type === 'MemberExpression' && exp.left.object) {
                if (exp.left.object.name === 'module' && exp.left.property &&
                        exp.left.property.name === 'exports') {
                    type = 'moduleExports';
                } else if (exp.left.object.name === 'exports' &&
                        exp.left.property) {
                    type = 'exports';
                } else if (exp.left.object.type === 'MemberExpression' &&
                           exp.left.object.object.name === 'module' &&
                           exp.left.object.property.name === 'exports' &&
                           exp.left.object.property.type === 'Identifier') {
                    type = 'moduleExports';
                }

            } else if (node && node.type === 'CallExpression' && node.callee &&
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'require' && node[argPropName] &&
                    node[argPropName].length === 1 &&
                    node[argPropName][0].type === 'Literal') {
                type = 'require';
            }

            if (type) {
                if (type === 'varExports') {
                    assignsExports = true;
                } else if (type !== 'exports' || !assignsExports) {
                    if (!uses) {
                        uses = {};
                    }
                    uses[type] = true;
                }
            }
        });

        return uses;
    };


    parse.findRequireDepNames = function (node, deps) {
        traverse(node, function (node) {
            var arg;

            if (node && node.type === 'CallExpression' && node.callee &&
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'require' &&
                    node[argPropName] && node[argPropName].length === 1) {

                arg = node[argPropName][0];
                if (arg.type === 'Literal') {
                    deps.push(arg.value);
                }
            }
        });
    };

    /**
     * Determines if a specific node is a valid require or define/require.def
     * call.
     * @param {Array} node
     * @param {Function} onMatch a function to call when a match is found.
     * It is passed the match name, and the config, name, deps possible args.
     * The config, name and deps args are not normalized.
     * @param {Object} fnExpScope an object whose keys are all function
     * expression identifiers that should be in scope. Useful for UMD wrapper
     * detection to avoid parsing more into the wrapped UMD code.
     *
     * @returns {String} a JS source string with the valid require/define call.
     * Otherwise null.
     */
    parse.parseNode = function (node, onMatch, fnExpScope) {
        var name, deps, cjsDeps, arg, factory, exp, refsDefine, bodyNode,
            args = node && node[argPropName],
            callName = parse.hasRequire(node),
            isUmd = false;

        if (callName === 'require' || callName === 'requirejs') {
            //A plain require/requirejs call
            arg = node[argPropName] && node[argPropName][0];
            if (arg && arg.type !== 'ArrayExpression') {
                if (arg.type === 'ObjectExpression') {
                    //A config call, try the second arg.
                    arg = node[argPropName][1];
                }
            }

            deps = getValidDeps(arg);
            if (!deps) {
                return;
            }

            return onMatch("require", null, null, deps, node);
        } else if (parse.hasDefine(node) && args && args.length) {
            name = args[0];
            deps = args[1];
            factory = args[2];

            if (name.type === 'ArrayExpression') {
                //No name, adjust args
                factory = deps;
                deps = name;
                name = null;
            } else if (isFnExpression(name)) {
                //Just the factory, no name or deps
                factory = name;
                name = deps = null;
            } else if (name.type === 'Identifier' && args.length === 1 &&
                       hasProp(fnExpScope, name.name)) {
                //define(e) where e is a UMD identifier for the factory
                //function.
                isUmd = true;
                factory = name;
                name = null;
            } else if (name.type !== 'Literal') {
                 //An object literal, just null out
                name = deps = factory = null;
            }

            if (name && name.type === 'Literal' && deps) {
                if (isFnExpression(deps)) {
                    //deps is the factory
                    factory = deps;
                    deps = null;
                } else if (deps.type === 'ObjectExpression') {
                    //deps is object literal, null out
                    deps = factory = null;
                } else if (deps.type === 'Identifier') {
                    if (args.length === 2) {
                        //define('id', factory)
                        deps = factory = null;
                    } else if (args.length === 3 && isFnExpression(factory)) {
                        //define('id', depsIdentifier, factory)
                        //Since identifier, cannot know the deps, but do not
                        //error out, assume they are taken care of outside of
                        //static parsing.
                        deps = null;
                    }
                }
            }

            if (deps && deps.type === 'ArrayExpression') {
                deps = getValidDeps(deps);
            } else if (isFnExpression(factory)) {
                //If no deps and a factory function, could be a commonjs sugar
                //wrapper, scan the function for dependencies.
                cjsDeps = parse.getAnonDepsFromNode(factory);
                if (cjsDeps.length) {
                    deps = cjsDeps;
                }
            } else if (deps || (factory && !isUmd)) {
                //Does not match the shape of an AMD call.
                return;
            }

            //Just save off the name as a string instead of an AST object.
            if (name && name.type === 'Literal') {
                name = name.value;
            }

            return onMatch("define", null, name, deps, node,
                           (factory && factory.type === 'Identifier' ? factory.name : undefined),
                           fnExpScope);
        } else if (node.type === 'CallExpression' && node.callee &&
                   isFnExpression(node.callee) &&
                   node.callee.body && node.callee.body.body &&
                   node.callee.body.body.length === 1 &&
                   node.callee.body.body[0].type === 'IfStatement') {
            bodyNode = node.callee.body.body[0];
            //Look for a define(Identifier) case, but only if inside an
            //if that has a define.amd test
            if (bodyNode.consequent && bodyNode.consequent.body) {
                exp = bodyNode.consequent.body[0];
                if (exp.type === 'ExpressionStatement' && exp.expression &&
                    parse.hasDefine(exp.expression) &&
                    exp.expression.arguments &&
                    exp.expression.arguments.length === 1 &&
                    exp.expression.arguments[0].type === 'Identifier') {

                    //Calls define(Identifier) as first statement in body.
                    //Confirm the if test references define.amd
                    traverse(bodyNode.test, function (node) {
                        if (parse.refsDefineAmd(node)) {
                            refsDefine = true;
                            return false;
                        }
                    });

                    if (refsDefine) {
                        return onMatch("define", null, null, null, exp.expression,
                                       exp.expression.arguments[0].name, fnExpScope);
                    }
                }
            }
        }
    };

    /**
     * Converts an AST node into a JS source string by extracting
     * the node's location from the given contents string. Assumes
     * esprima.parse() with loc was done.
     * @param {String} contents
     * @param {Object} node
     * @returns {String} a JS source string.
     */
    parse.nodeToString = function (contents, node) {
        var extracted,
            loc = node.loc,
            lines = contents.split('\n'),
            firstLine = loc.start.line > 1 ?
                        lines.slice(0, loc.start.line - 1).join('\n') + '\n' :
                        '',
            preamble = firstLine +
                       lines[loc.start.line - 1].substring(0, loc.start.column);

        if (loc.start.line === loc.end.line) {
            extracted = lines[loc.start.line - 1].substring(loc.start.column,
                                                            loc.end.column);
        } else {
            extracted =  lines[loc.start.line - 1].substring(loc.start.column) +
                     '\n' +
                     lines.slice(loc.start.line, loc.end.line - 1).join('\n') +
                     '\n' +
                     lines[loc.end.line - 1].substring(0, loc.end.column);
        }

        return {
            value: extracted,
            range: [
                preamble.length,
                preamble.length + extracted.length
            ]
        };
    };

    /**
     * Extracts license comments from JS text.
     * @param {String} fileName
     * @param {String} contents
     * @returns {String} a string of license comments.
     */
    parse.getLicenseComments = function (fileName, contents) {
        var commentNode, refNode, subNode, value, i, j,
            //xpconnect's Reflect does not support comment or range, but
            //prefer continued operation vs strict parity of operation,
            //as license comments can be expressed in other ways, like
            //via wrap args, or linked via sourcemaps.
            ast = esprima.parse(contents, {
                comment: true,
                range: true
            }),
            result = '',
            existsMap = {},
            lineEnd = contents.indexOf('\r') === -1 ? '\n' : '\r\n';

        if (ast.comments) {
            for (i = 0; i < ast.comments.length; i++) {
                commentNode = ast.comments[i];

                if (commentNode.type === 'Line') {
                    value = '//' + commentNode.value + lineEnd;
                    refNode = commentNode;

                    if (i + 1 >= ast.comments.length) {
                        value += lineEnd;
                    } else {
                        //Look for immediately adjacent single line comments
                        //since it could from a multiple line comment made out
                        //of single line comments. Like this comment.
                        for (j = i + 1; j < ast.comments.length; j++) {
                            subNode = ast.comments[j];
                            if (subNode.type === 'Line' &&
                                    subNode.range[0] === refNode.range[1] + 1) {
                                //Adjacent single line comment. Collect it.
                                value += '//' + subNode.value + lineEnd;
                                refNode = subNode;
                            } else {
                                //No more single line comment blocks. Break out
                                //and continue outer looping.
                                break;
                            }
                        }
                        value += lineEnd;
                        i = j - 1;
                    }
                } else {
                    value = '/*' + commentNode.value + '*/' + lineEnd + lineEnd;
                }

                if (!existsMap[value] && (value.indexOf('license') !== -1 ||
                        (commentNode.type === 'Block' &&
                            value.indexOf('/*!') === 0) ||
                        value.indexOf('opyright') !== -1 ||
                        value.indexOf('(c)') !== -1)) {

                    result += value;
                    existsMap[value] = true;
                }

            }
        }

        return result;
    };

    return parse;
});

/*jslint regexp: true, plusplus: true  */
/*global define: false */

define('skylark-rjs/pragma',[
    './parse', 
    './logger'
], function (parse, logger) {
    'use strict';
    function Temp() {}

    function create(obj, mixin) {
        Temp.prototype = obj;
        var temp = new Temp(), prop;

        //Avoid any extra memory hanging around
        Temp.prototype = null;

        if (mixin) {
            for (prop in mixin) {
                if (mixin.hasOwnProperty(prop) && !temp.hasOwnProperty(prop)) {
                    temp[prop] = mixin[prop];
                }
            }
        }

        return temp; // Object
    }

    var pragma = {
        conditionalRegExp: /(exclude|include)Start\s*\(\s*["'](\w+)["']\s*,(.*)\)/,
        useStrictRegExp: /(^|[^{]\r?\n)['"]use strict['"];/g,
        hasRegExp: /has\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        configRegExp: /(^|[^\.])(requirejs|require)(\.config)\s*\(/g,
        nsWrapRegExp: /\/\*requirejs namespace: true \*\//,
        apiDefRegExp: /var requirejs,\s*require,\s*define;/,
        defineCheckRegExp: /typeof(\s+|\s*\(\s*)define(\s*\))?\s*===?\s*["']function["']\s*&&\s*define\s*\.\s*amd/g,
        defineStringCheckRegExp: /typeof\s+define\s*===?\s*["']function["']\s*&&\s*define\s*\[\s*["']amd["']\s*\]/g,
        defineTypeFirstCheckRegExp: /\s*["']function["']\s*==(=?)\s*typeof\s+define\s*&&\s*define\s*\.\s*amd/g,
        defineJQueryRegExp: /typeof\s+define\s*===?\s*["']function["']\s*&&\s*define\s*\.\s*amd\s*&&\s*define\s*\.\s*amd\s*\.\s*jQuery/g,
        defineHasRegExp: /typeof\s+define\s*==(=)?\s*['"]function['"]\s*&&\s*typeof\s+define\.amd\s*==(=)?\s*['"]object['"]\s*&&\s*define\.amd/g,
        defineTernaryRegExp: /typeof\s+define\s*===?\s*['"]function["']\s*&&\s*define\s*\.\s*amd\s*\?\s*define/,
        defineExistsRegExp: /\s+typeof\s+define\s*!==?\s*['"]undefined["']\s*/,
        defineExistsAndAmdRegExp: /typeof\s+define\s*!==?\s*['"]undefined["']\s*&&\s*define\s*\.\s*amd\s*/,
        amdefineRegExp: /if\s*\(\s*typeof define\s*\!==\s*['"]function['"]\s*\)\s*\{\s*[^\{\}]+amdefine[^\{\}]+\}/g,

        removeStrict: function (contents, config) {
            return config.useStrict ? contents : contents.replace(pragma.useStrictRegExp, '$1');
        },

        namespace: function (fileContents, ns, onLifecycleName) {
            if (ns) {
                //Namespace require/define calls
                fileContents = fileContents.replace(pragma.configRegExp, '$1' + ns + '.$2$3(');


                fileContents = parse.renameNamespace(fileContents, ns);

                //Namespace define ternary use:
                fileContents = fileContents.replace(pragma.defineTernaryRegExp,
                                                    "typeof " + ns + ".define === 'function' && " + ns + ".define.amd ? " + ns + ".define");

                //Namespace define jquery use:
                fileContents = fileContents.replace(pragma.defineJQueryRegExp,
                                                    "typeof " + ns + ".define === 'function' && " + ns + ".define.amd && " + ns + ".define.amd.jQuery");

                //Namespace has.js define use:
                fileContents = fileContents.replace(pragma.defineHasRegExp,
                                                    "typeof " + ns + ".define === 'function' && typeof " + ns + ".define.amd === 'object' && " + ns + ".define.amd");

                //Namespace async.js define use:
                fileContents = fileContents.replace(pragma.defineExistsAndAmdRegExp,
                                                    "typeof " + ns + ".define !== 'undefined' && " + ns + ".define.amd");

                //Namespace define checks.
                //Do these ones last, since they are a subset of the more specific
                //checks above.
                fileContents = fileContents.replace(pragma.defineCheckRegExp,
                                                    "typeof " + ns + ".define === 'function' && " + ns + ".define.amd");
                fileContents = fileContents.replace(pragma.defineStringCheckRegExp,
                                                    "typeof " + ns + ".define === 'function' && " + ns + ".define['amd']");
                fileContents = fileContents.replace(pragma.defineTypeFirstCheckRegExp,
                                                    "'function' === typeof " + ns + ".define && " + ns + ".define.amd");
                fileContents = fileContents.replace(pragma.defineExistsRegExp,
                                                    "typeof " + ns + ".define !== 'undefined'");

                //Check for require.js with the require/define definitions
                if (pragma.apiDefRegExp.test(fileContents) &&
                    fileContents.indexOf("if (!" + ns + " || !" + ns + ".requirejs)") === -1) {
                    //Wrap the file contents in a typeof check, and a function
                    //to contain the API globals.
                    fileContents = "var " + ns + ";(function () { if (!" + ns + " || !" + ns + ".requirejs) {\n" +
                                    "if (!" + ns + ") { " + ns + ' = {}; } else { require = ' + ns + '; }\n' +
                                    fileContents +
                                    "\n" +
                                    ns + ".requirejs = requirejs;" +
                                    ns + ".require = require;" +
                                    ns + ".define = define;\n" +
                                    "}\n}());";
                }

                //Finally, if the file wants a special wrapper because it ties
                //in to the requirejs internals in a way that would not fit
                //the above matches, do that. Look for /*requirejs namespace: true*/
                if (pragma.nsWrapRegExp.test(fileContents)) {
                    //Remove the pragma.
                    fileContents = fileContents.replace(pragma.nsWrapRegExp, '');

                    //Alter the contents.
                    fileContents = '(function () {\n' +
                                   'var require = ' + ns + '.require,' +
                                   'requirejs = ' + ns + '.requirejs,' +
                                   'define = ' + ns + '.define;\n' +
                                   fileContents +
                                   '\n}());';
                }
            }

            return fileContents;
        },

        /**
         * processes the fileContents for some //>> conditional statements
         */
        process: function (fileName, fileContents, config, onLifecycleName, pluginCollector) {
            /*jslint evil: true */
            var foundIndex = -1, startIndex = 0, lineEndIndex, conditionLine,
                matches, type, marker, condition, isTrue, endRegExp, endMatches,
                endMarkerIndex, shouldInclude, startLength, lifecycleHas, deps,
                i, dep, moduleName, collectorMod,
                lifecyclePragmas, pragmas = config.pragmas, hasConfig = config.has,
                //Legacy arg defined to help in dojo conversion script. Remove later
                //when dojo no longer needs conversion:
                kwArgs = pragmas;

            //Mix in a specific lifecycle scoped object, to allow targeting
            //some pragmas/has tests to only when files are saved, or at different
            //lifecycle events. Do not bother with kwArgs in this section, since
            //the old dojo kwArgs were for all points in the build lifecycle.
            if (onLifecycleName) {
                lifecyclePragmas = config['pragmas' + onLifecycleName];
                lifecycleHas = config['has' + onLifecycleName];

                if (lifecyclePragmas) {
                    pragmas = create(pragmas || {}, lifecyclePragmas);
                }

                if (lifecycleHas) {
                    hasConfig = create(hasConfig || {}, lifecycleHas);
                }
            }

            //Replace has references if desired
            if (hasConfig) {
                fileContents = fileContents.replace(pragma.hasRegExp, function (match, test) {
                    if (hasConfig.hasOwnProperty(test)) {
                        return !!hasConfig[test];
                    }
                    return match;
                });
            }

            if (!config.skipPragmas) {

                while ((foundIndex = fileContents.indexOf("//>>", startIndex)) !== -1) {
                    //Found a conditional. Get the conditional line.
                    lineEndIndex = fileContents.indexOf("\n", foundIndex);
                    if (lineEndIndex === -1) {
                        lineEndIndex = fileContents.length - 1;
                    }

                    //Increment startIndex past the line so the next conditional search can be done.
                    startIndex = lineEndIndex + 1;

                    //Break apart the conditional.
                    conditionLine = fileContents.substring(foundIndex, lineEndIndex + 1);
                    matches = conditionLine.match(pragma.conditionalRegExp);
                    if (matches) {
                        type = matches[1];
                        marker = matches[2];
                        condition = matches[3];
                        isTrue = false;
                        //See if the condition is true.
                        try {
                            isTrue = !!eval("(" + condition + ")");
                        } catch (e) {
                            throw "Error in file: " +
                                   fileName +
                                   ". Conditional comment: " +
                                   conditionLine +
                                   " failed with this error: " + e;
                        }

                        //Find the endpoint marker.
                        endRegExp = new RegExp('\\/\\/\\>\\>\\s*' + type + 'End\\(\\s*[\'"]' + marker + '[\'"]\\s*\\)', "g");
                        endMatches = endRegExp.exec(fileContents.substring(startIndex, fileContents.length));
                        if (endMatches) {
                            endMarkerIndex = startIndex + endRegExp.lastIndex - endMatches[0].length;

                            //Find the next line return based on the match position.
                            lineEndIndex = fileContents.indexOf("\n", endMarkerIndex);
                            if (lineEndIndex === -1) {
                                lineEndIndex = fileContents.length - 1;
                            }

                            //Should we include the segment?
                            shouldInclude = ((type === "exclude" && !isTrue) || (type === "include" && isTrue));

                            //Remove the conditional comments, and optionally remove the content inside
                            //the conditional comments.
                            startLength = startIndex - foundIndex;
                            fileContents = fileContents.substring(0, foundIndex) +
                                (shouldInclude ? fileContents.substring(startIndex, endMarkerIndex) : "") +
                                fileContents.substring(lineEndIndex + 1, fileContents.length);

                            //Move startIndex to foundIndex, since that is the new position in the file
                            //where we need to look for more conditionals in the next while loop pass.
                            startIndex = foundIndex;
                        } else {
                            throw "Error in file: " +
                                  fileName +
                                  ". Cannot find end marker for conditional comment: " +
                                  conditionLine;

                        }
                    }
                }
            }

            //If need to find all plugin resources to optimize, do that now,
            //before namespacing, since the namespacing will change the API
            //names.
            //If there is a plugin collector, scan the file for plugin resources.
            if (config.optimizeAllPluginResources && pluginCollector) {
                try {
                    deps = parse.findDependencies(fileName, fileContents);
                    if (deps.length) {
                        for (i = 0; i < deps.length; i++) {
                            dep = deps[i];
                            if (dep.indexOf('!') !== -1) {
                                moduleName = dep.split('!')[0];
                                collectorMod = pluginCollector[moduleName];
                                if (!collectorMod) {
                                 collectorMod = pluginCollector[moduleName] = [];
                                }
                                collectorMod.push(dep);
                            }
                        }
                    }
                } catch (eDep) {
                    logger.error('Parse error looking for plugin resources in ' +
                                 fileName + ', skipping.');
                }
            }

            //Strip amdefine use for node-shared modules.
            if (!config.keepAmdefine) {
                fileContents = fileContents.replace(pragma.amdefineRegExp, '');
            }

            //Do namespacing
            if (onLifecycleName === 'OnSave' && config.namespace) {
                fileContents = pragma.namespace(fileContents, config.namespace, onLifecycleName);
            }


            return pragma.removeStrict(fileContents, config);
        }
    };

    return pragma;
});

//Distributed under the BSD license:
//Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>
define('skylark-rjs/uglifyjs',['skylark-uglifyjs'], function (uglifyjs) {
    return uglifyjs;
});

define('skylark-rjs/source-map',['skylark-sourcemap'], function (sourcemap) {
    return sourcemap;
});

/*jslint plusplus: true, nomen: true, regexp: true */
/*global define: false */

define('skylark-rjs/optimize',[ 
    './lang', 
    './logger', 
///    'env!env/optimize', 
///    'env!env/file', 
    './parse',
    './pragma', 
    './uglifyjs',
    './source-map'
],function (
    lang,
    logger,
///     envOptimize, 
///     file, 
     parse,
     pragma, 
     uglify,
     sourceMap
) {
    'use strict';

    var optimize,
        cssImportRegExp = /\@import\s+(url\()?\s*([^);]+)\s*(\))?([\w, ]*)(;)?/ig,
        cssCommentImportRegExp = /\/\*[^\*]*@import[^\*]*\*\//g,
        cssUrlRegExp = /\url\(\s*([^\)]+)\s*\)?/g,
        protocolRegExp = /^\w+:/,
        SourceMapGenerator = sourceMap.SourceMapGenerator,
        SourceMapConsumer = sourceMap.SourceMapConsumer,
        es5PlusGuidance = 'If the source uses ES2015 or later syntax, please pass "optimize: \'none\'" to r.js and use an ES2015+ compatible minifier after running r.js. The included UglifyJS only understands ES5 or earlier syntax.';

    /**
     * If an URL from a CSS url value contains start/end quotes, remove them.
     * This is not done in the regexp, since my regexp fu is not that strong,
     * and the CSS spec allows for ' and " in the URL if they are backslash escaped.
     * @param {String} url
     */
    function cleanCssUrlQuotes(url) {
        //Make sure we are not ending in whitespace.
        //Not very confident of the css regexps above that there will not be ending
        //whitespace.
        url = url.replace(/\s+$/, "");

        if (url.charAt(0) === "'" || url.charAt(0) === "\"") {
            url = url.substring(1, url.length - 1);
        }

        return url;
    }

    function fixCssUrlPaths(fileName, path, contents, cssPrefix) {
        return contents.replace(cssUrlRegExp, function (fullMatch, urlMatch) {
            var firstChar, hasProtocol, parts, i,
                fixedUrlMatch = cleanCssUrlQuotes(urlMatch);

            fixedUrlMatch = fixedUrlMatch.replace(lang.backSlashRegExp, "/");

            //Only do the work for relative URLs. Skip things that start with / or #, or have
            //a protocol.
            firstChar = fixedUrlMatch.charAt(0);
            hasProtocol = protocolRegExp.test(fixedUrlMatch);
            if (firstChar !== "/" && firstChar !== "#" && !hasProtocol) {
                //It is a relative URL, tack on the cssPrefix and path prefix
                urlMatch = cssPrefix + path + fixedUrlMatch;
            } else if (!hasProtocol) {
                logger.trace(fileName + "\n  URL not a relative URL, skipping: " + urlMatch);
            }

            //Collapse .. and .
            parts = urlMatch.split("/");
            for (i = parts.length - 1; i > 0; i--) {
                if (parts[i] === ".") {
                    parts.splice(i, 1);
                } else if (parts[i] === "..") {
                    if (i !== 0 && parts[i - 1] !== "..") {
                        parts.splice(i - 1, 2);
                        i -= 1;
                    }
                }
            }

            return "url(" + parts.join("/") + ")";
        });
    }

    /**
     * Inlines nested stylesheets that have @import calls in them.
     * @param {String} fileName the file name
     * @param {String} fileContents the file contents
     * @param {String} cssImportIgnore comma delimited string of files to ignore
     * @param {String} cssPrefix string to be prefixed before relative URLs
     * @param {Object} included an object used to track the files already imported
     */
    function flattenCss(fileName, fileContents, cssImportIgnore, cssPrefix, included, topLevel,config) {
        //Find the last slash in the name.
        fileName = fileName.replace(lang.backSlashRegExp, "/");
        var endIndex = fileName.lastIndexOf("/"),
            //Make a file path based on the last slash.
            //If no slash, so must be just a file name. Use empty string then.
            filePath = (endIndex !== -1) ? fileName.substring(0, endIndex + 1) : "",
            //store a list of merged files
            importList = [],
            skippedList = [],
            fs = config.env.fs;

        //First make a pass by removing any commented out @import calls.
        fileContents = fileContents.replace(cssCommentImportRegExp, '');

        //Make sure we have a delimited ignore list to make matching faster
        if (cssImportIgnore && cssImportIgnore.charAt(cssImportIgnore.length - 1) !== ",") {
            cssImportIgnore += ",";
        }

        fileContents = fileContents.replace(cssImportRegExp, function (fullMatch, urlStart, importFileName, urlEnd, mediaTypes) {
            //Only process media type "all" or empty media type rules.
            if (mediaTypes && ((mediaTypes.replace(/^\s\s*/, '').replace(/\s\s*$/, '')) !== "all")) {
                skippedList.push(fileName);
                return fullMatch;
            }

            importFileName = cleanCssUrlQuotes(importFileName);

            //Ignore the file import if it is part of an ignore list.
            if (cssImportIgnore && cssImportIgnore.indexOf(importFileName + ",") !== -1) {
                return fullMatch;
            }

            //Make sure we have a unix path for the rest of the operation.
            importFileName = importFileName.replace(lang.backSlashRegExp, "/");

            try {
                //if a relative path, then tack on the filePath.
                //If it is not a relative path, then the readFile below will fail,
                //and we will just skip that import.
                var fullImportFileName = importFileName.charAt(0) === "/" ? importFileName : filePath + importFileName,
                    importContents = fs.readFile(fullImportFileName),
                    importEndIndex, importPath, flat;

                //Skip the file if it has already been included.
                if (included[fullImportFileName]) {
                    return '';
                }
                included[fullImportFileName] = true;

                //Make sure to flatten any nested imports.
                flat = flattenCss(fullImportFileName, importContents, cssImportIgnore, cssPrefix, included,false,config);
                importContents = flat.fileContents;

                if (flat.importList.length) {
                    importList.push.apply(importList, flat.importList);
                }
                if (flat.skippedList.length) {
                    skippedList.push.apply(skippedList, flat.skippedList);
                }

                //Make the full import path
                importEndIndex = importFileName.lastIndexOf("/");

                //Make a file path based on the last slash.
                //If no slash, so must be just a file name. Use empty string then.
                importPath = (importEndIndex !== -1) ? importFileName.substring(0, importEndIndex + 1) : "";

                //fix url() on relative import (#5)
                importPath = importPath.replace(/^\.\//, '');

                //Modify URL paths to match the path represented by this file.
                importContents = fixCssUrlPaths(importFileName, importPath, importContents, cssPrefix);

                importList.push(fullImportFileName);
                return importContents;
            } catch (e) {
                logger.warn(fileName + "\n  Cannot inline css import, skipping: " + importFileName);
                return fullMatch;
            }
        });

        if (cssPrefix && topLevel) {
            //Modify URL paths to match the path represented by this file.
            fileContents = fixCssUrlPaths(fileName, '', fileContents, cssPrefix);
        }

        return {
            importList : importList,
            skippedList: skippedList,
            fileContents : fileContents
        };
    }

    optimize = {
        /**
         * Optimizes a file that contains JavaScript content. Optionally collects
         * plugin resources mentioned in a file, and then passes the content
         * through an minifier if one is specified via config.optimize.
         *
         * @param {String} fileName the name of the file to optimize
         * @param {String} fileContents the contents to optimize. If this is
         * a null value, then fileName will be used to read the fileContents.
         * @param {String} outFileName the name of the file to use for the
         * saved optimized content.
         * @param {Object} config the build config object.
         * @param {Array} [pluginCollector] storage for any plugin resources
         * found.
         */
        jsFile: function (fileName, fileContents, outFileName, config, pluginCollector) {
            var fs = config.env.fs;
            if (!fileContents) {
                fileContents = fs.readFile(fileName);
            }

            fileContents = optimize.js(fileName, fileContents, outFileName, config, pluginCollector);

            fs.saveUtf8File(outFileName, fileContents);
        },

        /**
         * Optimizes a file that contains JavaScript content. Optionally collects
         * plugin resources mentioned in a file, and then passes the content
         * through an minifier if one is specified via config.optimize.
         *
         * @param {String} fileName the name of the file that matches the
         * fileContents.
         * @param {String} fileContents the string of JS to optimize.
         * @param {Object} [config] the build config object.
         * @param {Array} [pluginCollector] storage for any plugin resources
         * found.
         */
        js: function (fileName, fileContents, outFileName, config, pluginCollector) {
            var optFunc, optConfig,
                parts = (String(config.optimize)).split('.'),
                optimizerName = parts[0],
                keepLines = parts[1] === 'keepLines',
                licenseContents = '';

            config = config || {};

            //Apply pragmas/namespace renaming
            fileContents = pragma.process(fileName, fileContents, config, 'OnSave', pluginCollector);

            //Optimize the JS files if asked.
            if (optimizerName && optimizerName !== 'none') {
                ///optFunc = envOptimize[optimizerName] || optimize.optimizers[optimizerName];
                optFunc = optimize.optimizers[optimizerName];
                if (!optFunc) {
                    throw new Error('optimizer with name of "' +
                                    optimizerName +
                                    '" not found for this environment');
                }

                optConfig = config[optimizerName] || {};
                if (config.generateSourceMaps) {
                    optConfig.generateSourceMaps = !!config.generateSourceMaps;
                    optConfig._buildSourceMap = config._buildSourceMap;
                }
                ///optConfig.env = config.env;

                try {
                    if (config.preserveLicenseComments) {
                        //Pull out any license comments for prepending after optimization.
                        try {
                            licenseContents = parse.getLicenseComments(fileName, fileContents);
                        } catch (e) {
                            throw new Error('Cannot parse file: ' + fileName + ' for comments. Skipping it. Error is:\n' + e.toString());
                        }
                    }

                    if (config.generateSourceMaps && licenseContents) {
                        optConfig.preamble = licenseContents;
                        licenseContents = '';
                    }

                    fileContents = licenseContents + optFunc(fileName,
                                                             fileContents,
                                                             outFileName,
                                                             keepLines,
                                                             optConfig,
                                                             config.env.fs);
                    if (optConfig._buildSourceMap && optConfig._buildSourceMap !== config._buildSourceMap) {
                        config._buildSourceMap = optConfig._buildSourceMap;
                    }
                } catch (e) {
                    if (config.throwWhen && config.throwWhen.optimize) {
                        throw e;
                    } else {
                        logger.error(e);
                    }
                }
            } else {
                if (config._buildSourceMap) {
                    config._buildSourceMap = null;
                }
            }

            return fileContents;
        },

        /**
         * Optimizes one CSS file, inlining @import calls, stripping comments, and
         * optionally removes line returns.
         * @param {String} fileName the path to the CSS file to optimize
         * @param {String} outFileName the path to save the optimized file.
         * @param {Object} config the config object with the optimizeCss and
         * cssImportIgnore options.
         */
        cssFile: function (fileName, outFileName, config) {
            var fs = config.env.fs;
            //Read in the file. Make sure we have a JS string.
            var originalFileContents = fs.readFile(fileName),
                flat = flattenCss(fileName, originalFileContents, config.cssImportIgnore, config.cssPrefix, {}, true,config),
                //Do not use the flattened CSS if there was one that was skipped.
                fileContents = flat.skippedList.length ? originalFileContents : flat.fileContents,
                startIndex, endIndex, buildText, comment;

            if (flat.skippedList.length) {
                logger.warn('Cannot inline @imports for ' + fileName +
                            ',\nthe following files had media queries in them:\n' +
                            flat.skippedList.join('\n'));
            }

            //Do comment removal.
            try {
                if (config.optimizeCss.indexOf(".keepComments") === -1) {
                    startIndex = 0;
                    //Get rid of comments.
                    while ((startIndex = fileContents.indexOf("/*", startIndex)) !== -1) {
                        endIndex = fileContents.indexOf("*/", startIndex + 2);
                        if (endIndex === -1) {
                            throw "Improper comment in CSS file: " + fileName;
                        }
                        comment = fileContents.substring(startIndex, endIndex);

                        if (config.preserveLicenseComments &&
                            (comment.indexOf('license') !== -1 ||
                             comment.indexOf('opyright') !== -1 ||
                             comment.indexOf('(c)') !== -1)) {
                            //Keep the comment, just increment the startIndex
                            startIndex = endIndex;
                        } else {
                            fileContents = fileContents.substring(0, startIndex) + fileContents.substring(endIndex + 2, fileContents.length);
                            startIndex = 0;
                        }
                    }
                }
                //Get rid of newlines.
                if (config.optimizeCss.indexOf(".keepLines") === -1) {
                    fileContents = fileContents.replace(/[\r\n]/g, " ");
                    fileContents = fileContents.replace(/\s+/g, " ");
                    fileContents = fileContents.replace(/\{\s/g, "{");
                    fileContents = fileContents.replace(/\s\}/g, "}");
                } else {
                    //Remove multiple empty lines.
                    fileContents = fileContents.replace(/(\r\n)+/g, "\r\n");
                    fileContents = fileContents.replace(/(\n)+/g, "\n");
                }
                //Remove unnecessary whitespace
                if (config.optimizeCss.indexOf(".keepWhitespace") === -1) {
                    //Remove leading and trailing whitespace from lines
                    fileContents = fileContents.replace(/^[ \t]+/gm, "");
                    fileContents = fileContents.replace(/[ \t]+$/gm, "");
                    //Remove whitespace after semicolon, colon, curly brackets and commas
                    fileContents = fileContents.replace(/(;|:|\{|}|,)[ \t]+/g, "$1");
                    //Remove whitespace before opening curly brackets
                    fileContents = fileContents.replace(/[ \t]+(\{)/g, "$1");
                    //Truncate double whitespace
                    fileContents = fileContents.replace(/([ \t])+/g, "$1");
                    //Remove empty lines
                    fileContents = fileContents.replace(/^[ \t]*[\r\n]/gm,'');
                }
            } catch (e) {
                fileContents = originalFileContents;
                logger.error("Could not optimized CSS file: " + fileName + ", error: " + e);
            }

            fs.saveUtf8File(outFileName, fileContents);

            //text output to stdout and/or written to build.txt file
            buildText = "\n"+ outFileName.replace(config.dir, "") +"\n----------------\n";
            flat.importList.push(fileName);
            buildText += flat.importList.map(function(path){
                return path.replace(config.dir, "");
            }).join("\n");

            return {
                importList: flat.importList,
                buildText: buildText +"\n"
            };
        },

        /**
         * Optimizes CSS files, inlining @import calls, stripping comments, and
         * optionally removes line returns.
         * @param {String} startDir the path to the top level directory
         * @param {Object} config the config object with the optimizeCss and
         * cssImportIgnore options.
         */
        css: function (startDir, config) {
            var buildText = "",
                importList = [],
                shouldRemove = config.dir && config.removeCombined,
                i, fileName, result, fileList,
                fs = config.env.fs;

            if (config.optimizeCss.indexOf("standard") !== -1) {
                fileList = fs.getFilteredFileList(startDir, /\.css$/, true);
                if (fileList) {
                    for (i = 0; i < fileList.length; i++) {
                        fileName = fileList[i];
                        logger.trace("Optimizing (" + config.optimizeCss + ") CSS file: " + fileName);
                        result = optimize.cssFile(fileName, fileName, config);
                        buildText += result.buildText;
                        if (shouldRemove) {
                            result.importList.pop();
                            importList = importList.concat(result.importList);
                        }
                    }
                }

                if (shouldRemove) {
                    importList.forEach(function (path) {
                        if (fs.exists(path)) {
                            fs.deleteFile(path);
                        }
                    });
                }
            }
            return buildText;
        },

        optimizers: {
            uglify: function (fileName, fileContents, outFileName, keepLines, config,fs) {
                var result, existingMap, resultMap, finalMap, sourceIndex,
                    uconfig = {},
                    existingMapPath = outFileName + '.map',
                    baseName = fileName && fileName.split('/').pop();

                config = config || {};

                lang.mixin(uconfig, config, true);

                ///uconfig.fromString = true;  // uglify 2 -> 3

                if (config.preamble) {
                    uconfig.output = {preamble: config.preamble};
                }

                ///var fs = config.env.fs;

                if (config.generateSourceMaps && (outFileName || config._buildSourceMap)) {
                    uconfig.outSourceMap = baseName + '.map';

                    if (config._buildSourceMap) {
                        existingMap = JSON.parse(config._buildSourceMap);
                        uconfig.inSourceMap = existingMap;
                    } else if (fs.exists(existingMapPath)) {
                        uconfig.inSourceMap = existingMapPath;
                        existingMap = JSON.parse(fs.readFile(existingMapPath));
                    }
                }

                logger.trace("Uglify file: " + fileName);

                try {
                    //var tempContents = fileContents.replace(/\/\/\# sourceMappingURL=.*$/, '');
                    result = uglify.minify(fileContents, uconfig, baseName + '.src.js');
                    if (uconfig.outSourceMap && result.map) {
                        resultMap = result.map;
                        if (!existingMap && !config._buildSourceMap) {
                            fs.saveFile(outFileName + '.src.js', fileContents);
                        }

                        fileContents = result.code;

                        if (config._buildSourceMap) {
                            config._buildSourceMap = resultMap;
                        } else {
                            fs.saveFile(outFileName + '.map', resultMap);
                        }
                    } else {
                        fileContents = result.code;
                    }
                } catch (e) {
                    var errorString = e.toString();
                    var isSyntaxError = /SyntaxError/.test(errorString);
                    throw new Error('Cannot uglify file: ' + fileName +
                                    '. Skipping it. Error is:\n' + errorString +
                                  (isSyntaxError ? '\n\n' + es5PlusGuidance : ''));
                }
                return fileContents;
            }
        }
    };

    return optimize;
});

/*global define */

define('skylark-rjs/transform',[ 
    './esprima', 
    './parse', 
    './logger', 
    './lang'
],
function (esprima, parse, logger, lang) {
    'use strict';
    var transform,
        baseIndentRegExp = /^([ \t]+)/,
        indentRegExp = /\{[\r\n]+([ \t]+)/,
        keyRegExp = /^[_A-Za-z]([A-Za-z\d_]*)$/,
        bulkIndentRegExps = {
            '\n': /\n/g,
            '\r\n': /\r\n/g
        };

    function applyIndent(str, indent, lineReturn) {
        var regExp = bulkIndentRegExps[lineReturn];
        return str.replace(regExp, '$&' + indent);
    }

    transform = {
        toTransport: function (namespace, moduleName, path, contents, onFound, options) {
            options = options || {};

            var astRoot, contentLines, modLine,
                foundAnon,
                scanCount = 0,
                scanReset = false,
                defineInfos = [],
                applySourceUrl = function (contents) {
                    if (options.useSourceUrl) {
                        contents = 'eval("' + lang.jsEscape(contents) +
                            '\\n//# sourceURL=' + (path.indexOf('/') === 0 ? '' : '/') +
                            path +
                            '");\n';
                    }
                    return contents;
                };

            try {
                astRoot = esprima.parse(contents, {
                    loc: true
                });
            } catch (e) {
                logger.trace('toTransport skipping ' + path + ': ' +
                             e.toString());
                return contents;
            }

            //Find the define calls and their position in the files.
            parse.traverse(astRoot, function (node) {
                var args, firstArg, firstArgLoc, factoryNode,
                    needsId, depAction, foundId, init,
                    sourceUrlData, range,
                    namespaceExists = false;

                // If a bundle script with a define declaration, do not
                // parse any further at this level. Likely a built layer
                // by some other tool.
                if (node.type === 'VariableDeclarator' &&
                    node.id && node.id.name === 'define' &&
                    node.id.type === 'Identifier') {
                    init = node.init;
                    if (init && init.callee &&
                        init.callee.type === 'CallExpression' &&
                        init.callee.callee &&
                        init.callee.callee.type === 'Identifier' &&
                        init.callee.callee.name === 'require' &&
                        init.callee.arguments && init.callee.arguments.length === 1 &&
                        init.callee.arguments[0].type === 'Literal' &&
                        init.callee.arguments[0].value &&
                        init.callee.arguments[0].value.indexOf('amdefine') !== -1) {
                        // the var define = require('amdefine')(module) case,
                        // keep going in that case.
                    } else {
                        return false;
                    }
                }

                namespaceExists = namespace &&
                                node.type === 'CallExpression' &&
                                node.callee  && node.callee.object &&
                                node.callee.object.type === 'Identifier' &&
                                node.callee.object.name === namespace &&
                                node.callee.property.type === 'Identifier' &&
                                node.callee.property.name === 'define';

                if (namespaceExists || parse.isDefineNodeWithArgs(node)) {
                    //The arguments are where its at.
                    args = node.arguments;
                    if (!args || !args.length) {
                        return;
                    }

                    firstArg = args[0];
                    firstArgLoc = firstArg.loc;

                    if (args.length === 1) {
                        if (firstArg.type === 'Identifier') {
                            //The define(factory) case, but
                            //only allow it if one Identifier arg,
                            //to limit impact of false positives.
                            needsId = true;
                            depAction = 'empty';
                        } else if (parse.isFnExpression(firstArg)) {
                            //define(function(){})
                            factoryNode = firstArg;
                            needsId = true;
                            depAction = 'scan';
                        } else if (firstArg.type === 'ObjectExpression') {
                            //define({});
                            needsId = true;
                            depAction = 'skip';
                        } else if (firstArg.type === 'Literal' &&
                                   typeof firstArg.value === 'number') {
                            //define('12345');
                            needsId = true;
                            depAction = 'skip';
                        } else if (firstArg.type === 'UnaryExpression' &&
                                   firstArg.operator === '-' &&
                                   firstArg.argument &&
                                   firstArg.argument.type === 'Literal' &&
                                   typeof firstArg.argument.value === 'number') {
                            //define('-12345');
                            needsId = true;
                            depAction = 'skip';
                        } else if (firstArg.type === 'MemberExpression' &&
                                   firstArg.object &&
                                   firstArg.property &&
                                   firstArg.property.type === 'Identifier') {
                            //define(this.key);
                            needsId = true;
                            depAction = 'empty';
                        }
                    } else if (firstArg.type === 'ArrayExpression') {
                        //define([], ...);
                        needsId = true;
                        depAction = 'skip';
                    } else if (firstArg.type === 'Literal' &&
                               typeof firstArg.value === 'string') {
                        //define('string', ....)
                        //Already has an ID.
                        needsId = false;
                        if (args.length === 2 &&
                            parse.isFnExpression(args[1])) {
                            //Needs dependency scanning.
                            factoryNode = args[1];
                            depAction = 'scan';
                        } else {
                            depAction = 'skip';
                        }
                    } else {
                        //Unknown define entity, keep looking, even
                        //in the subtree for this node.
                        return;
                    }

                    range = {
                        foundId: foundId,
                        needsId: needsId,
                        depAction: depAction,
                        namespaceExists: namespaceExists,
                        node: node,
                        defineLoc: node.loc,
                        firstArgLoc: firstArgLoc,
                        factoryNode: factoryNode,
                        sourceUrlData: sourceUrlData
                    };

                    //Only transform ones that do not have IDs. If it has an
                    //ID but no dependency array, assume it is something like
                    //a phonegap implementation, that has its own internal
                    //define that cannot handle dependency array constructs,
                    //and if it is a named module, then it means it has been
                    //set for transport form.
                    if (range.needsId) {
                        if (foundAnon) {
                            logger.trace(path + ' has more than one anonymous ' +
                                'define. May be a built file from another ' +
                                'build system like, Ender. Skipping normalization.');
                            defineInfos = [];
                            return false;
                        } else {
                            foundAnon = range;
                            defineInfos.push(range);
                        }
                    } else if (depAction === 'scan') {
                        scanCount += 1;
                        if (scanCount > 1) {
                            //Just go back to an array that just has the
                            //anon one, since this is an already optimized
                            //file like the phonegap one.
                            if (!scanReset) {
                                defineInfos =  foundAnon ? [foundAnon] : [];
                                scanReset = true;
                            }
                        } else {
                            defineInfos.push(range);
                        }
                    }
                }
            });


            if (!defineInfos.length) {
                return applySourceUrl(contents);
            }

            //Reverse the matches, need to start from the bottom of
            //the file to modify it, so that the ranges are still true
            //further up.
            defineInfos.reverse();

            contentLines = contents.split('\n');

            modLine = function (loc, contentInsertion) {
                var startIndex = loc.start.column,
                //start.line is 1-based, not 0 based.
                lineIndex = loc.start.line - 1,
                line = contentLines[lineIndex];
                contentLines[lineIndex] = line.substring(0, startIndex) +
                                           contentInsertion +
                                           line.substring(startIndex,
                                                              line.length);
            };

            defineInfos.forEach(function (info) {
                var deps,
                    contentInsertion = '',
                    depString = '';

                //Do the modifications "backwards", in other words, start with the
                //one that is farthest down and work up, so that the ranges in the
                //defineInfos still apply. So that means deps, id, then namespace.
                if (info.needsId && moduleName) {
                    contentInsertion += "'" + moduleName + "',";
                }

                if (info.depAction === 'scan') {
                    deps = parse.getAnonDepsFromNode(info.factoryNode);

                    if (deps.length) {
                        depString = '[' + deps.map(function (dep) {
                            return "'" + dep + "'";
                        }) + ']';
                    } else {
                        depString = '[]';
                    }
                    depString +=  ',';

                    if (info.factoryNode) {
                        //Already have a named module, need to insert the
                        //dependencies after the name.
                        modLine(info.factoryNode.loc, depString);
                    } else {
                        contentInsertion += depString;
                    }
                }

                if (contentInsertion) {
                    modLine(info.firstArgLoc, contentInsertion);
                }

                //Do namespace last so that ui does not mess upthe parenRange
                //used above.
                if (namespace && !info.namespaceExists) {
                    modLine(info.defineLoc, namespace + '.');
                }

                //Notify any listener for the found info
                if (onFound) {
                    onFound(info);
                }
            });

            contents = contentLines.join('\n');

            return applySourceUrl(contents);
        },

        /**
         * Modify the contents of a require.config/requirejs.config call. This
         * call will LOSE any existing comments that are in the config string.
         *
         * @param  {String} fileContents String that may contain a config call
         * @param  {Function} onConfig Function called when the first config
         * call is found. It will be passed an Object which is the current
         * config, and the onConfig function should return an Object to use
         * as the config.
         * @return {String} the fileContents with the config changes applied.
         */
        modifyConfig: function (fileContents, onConfig) {
            var details = parse.findConfig(fileContents),
                config = details.config;

            if (config) {
                config = onConfig(config);
                if (config) {
                    return transform.serializeConfig(config,
                                              fileContents,
                                              details.range[0],
                                              details.range[1],
                                              {
                                                quote: details.quote
                                              });
                }
            }

            return fileContents;
        },

        serializeConfig: function (config, fileContents, start, end, options) {
            //Calculate base level of indent
            var indent, match, configString, outDentRegExp,
                baseIndent = '',
                startString = fileContents.substring(0, start),
                existingConfigString = fileContents.substring(start, end),
                lineReturn = existingConfigString.indexOf('\r') === -1 ? '\n' : '\r\n',
                lastReturnIndex = startString.lastIndexOf('\n');

            //Get the basic amount of indent for the require config call.
            if (lastReturnIndex === -1) {
                lastReturnIndex = 0;
            }

            match = baseIndentRegExp.exec(startString.substring(lastReturnIndex + 1, start));
            if (match && match[1]) {
                baseIndent = match[1];
            }

            //Calculate internal indentation for config
            match = indentRegExp.exec(existingConfigString);
            if (match && match[1]) {
                indent = match[1];
            }

            if (!indent || indent.length < baseIndent) {
                indent = '  ';
            } else {
                indent = indent.substring(baseIndent.length);
            }

            outDentRegExp = new RegExp('(' + lineReturn + ')' + indent, 'g');

            configString = transform.objectToString(config, {
                                                    indent: indent,
                                                    lineReturn: lineReturn,
                                                    outDentRegExp: outDentRegExp,
                                                    quote: options && options.quote
                                                });

            //Add in the base indenting level.
            configString = applyIndent(configString, baseIndent, lineReturn);

            return startString + configString + fileContents.substring(end);
        },

        /**
         * Tries converting a JS object to a string. This will likely suck, and
         * is tailored to the type of config expected in a loader config call.
         * So, hasOwnProperty fields, strings, numbers, arrays and functions,
         * no weird recursively referenced stuff.
         * @param  {Object} obj        the object to convert
         * @param  {Object} options    options object with the following values:
         *         {String} indent     the indentation to use for each level
         *         {String} lineReturn the type of line return to use
         *         {outDentRegExp} outDentRegExp the regexp to use to outdent functions
         *         {String} quote      the quote type to use, ' or ". Optional. Default is "
         * @param  {String} totalIndent the total indent to print for this level
         * @return {String}            a string representation of the object.
         */
        objectToString: function (obj, options, totalIndent) {
            var startBrace, endBrace, nextIndent,
                first = true,
                value = '',
                lineReturn = options.lineReturn,
                indent = options.indent,
                outDentRegExp = options.outDentRegExp,
                quote = options.quote || '"';

            totalIndent = totalIndent || '';
            nextIndent = totalIndent + indent;

            if (obj === null) {
                value = 'null';
            } else if (obj === undefined) {
                value = 'undefined';
            } else if (typeof obj === 'number' || typeof obj === 'boolean') {
                value = obj;
            } else if (typeof obj === 'string') {
                //Use double quotes in case the config may also work as JSON.
                value = quote + lang.jsEscape(obj) + quote;
            } else if (lang.isArray(obj)) {
                lang.each(obj, function (item, i) {
                    value += (i !== 0 ? ',' + lineReturn : '' ) +
                        nextIndent +
                        transform.objectToString(item,
                                                 options,
                                                 nextIndent);
                });

                startBrace = '[';
                endBrace = ']';
            } else if (lang.isFunction(obj) || lang.isRegExp(obj)) {
                //The outdent regexp just helps pretty up the conversion
                //just in node. Rhino strips comments and does a different
                //indent scheme for Function toString, so not really helpful
                //there.
                value = obj.toString().replace(outDentRegExp, '$1');
            } else {
                //An object
                lang.eachProp(obj, function (v, prop) {
                    value += (first ? '': ',' + lineReturn) +
                        nextIndent +
                        (keyRegExp.test(prop) ? prop : quote + lang.jsEscape(prop) + quote )+
                        ': ' +
                        transform.objectToString(v,
                                                 options,
                                                 nextIndent);
                    first = false;
                });
                startBrace = '{';
                endBrace = '}';
            }

            if (startBrace) {
                value = startBrace +
                        lineReturn +
                        value +
                        lineReturn + totalIndent +
                        endBrace;
            }

            return value;
        }
    };

    return transform;
});

/*jslint */
/*global define: false, console: false */

define('skylark-rjs/commonJs',[
    './parse'
], function (
    parse
) {
    'use strict';
    var commonJs = {
        //Set to false if you do not want this file to log. Useful in environments
        //like node where you want the work to happen without noise.
        useLog: true,

        convertDir: function (commonJsPath, savePath,fs) {
            var fileList, i,
                jsFileRegExp = /\.js$/,
                fileName, convertedFileName, fileContents;

            //Get list of files to convert.
            fileList = fs.getFilteredFileList(commonJsPath, /\w/, true);

            //Normalize on front slashes and make sure the paths do not end in a slash.
            commonJsPath = commonJsPath.replace(/\\/g, "/");
            savePath = savePath.replace(/\\/g, "/");
            if (commonJsPath.charAt(commonJsPath.length - 1) === "/") {
                commonJsPath = commonJsPath.substring(0, commonJsPath.length - 1);
            }
            if (savePath.charAt(savePath.length - 1) === "/") {
                savePath = savePath.substring(0, savePath.length - 1);
            }

            //Cycle through all the JS files and convert them.
            if (!fileList || !fileList.length) {
                if (commonJs.useLog) {
                    if (commonJsPath === "convert") {
                        //A request just to convert one file.
                        console.log('\n\n' + commonJs.convert(savePath, fs.readFile(savePath),config));
                    } else {
                        console.log("No files to convert in directory: " + commonJsPath);
                    }
                }
            } else {
                for (i = 0; i < fileList.length; i++) {
                    fileName = fileList[i];
                    convertedFileName = fileName.replace(commonJsPath, savePath);

                    //Handle JS files.
                    if (jsFileRegExp.test(fileName)) {
                        fileContents = fs.readFile(fileName);
                        fileContents = commonJs.convert(fileName, fileContents,config);
                        fs.saveUtf8File(convertedFileName, fileContents);
                    } else {
                        //Just copy the file over.
                        fs.copyFile(fileName, convertedFileName, true);
                    }
                }
            }
        },

        /**
         * Does the actual file conversion.
         *
         * @param {String} fileName the name of the file.
         *
         * @param {String} fileContents the contents of a file :)
         *
         * @returns {String} the converted contents
         */
        convert: function (fileName, fileContents) {
            //Strip out comments.
            try {
                var preamble = '',
                    commonJsProps = parse.usesCommonJs(fileName, fileContents);

                //First see if the module is not already RequireJS-formatted.
                if (parse.usesAmdOrRequireJs(fileName, fileContents) || !commonJsProps) {
                    return fileContents;
                }

                if (commonJsProps.dirname || commonJsProps.filename) {
                    preamble = 'var __filename = module.uri || "", ' +
                               '__dirname = __filename.substring(0, __filename.lastIndexOf("/") + 1); ';
                }

                //Construct the wrapper boilerplate.
                fileContents = 'define(function (require, exports, module) {' +
                    preamble +
                    fileContents +
                    '\n});\n';

            } catch (e) {
                console.log("commonJs.convert: COULD NOT CONVERT: " + fileName + ", so skipping it. Error was: " + e);
                return fileContents;
            }

            return fileContents;
        }
    };

    return commonJs;
});

/*
 * This file patches require.js to communicate with the build system.
 */

//Using sloppy since this uses eval for some code like plugins,
//which may not be strict mode compliant. So if use strict is used
//below they will have strict rules applied and may cause an error.
/*jslint sloppy: true, nomen: true, plusplus: true, regexp: true */
/*global require, define: true */

//NOT asking for require as a dependency since the goal is to modify the
//global require below
define('skylark-rjs/requirePatch',[ 
    ///'env!env/file', 
    './pragma', 
    './parse', 
    './lang', 
    './logger',
    './commonJs', 
    './prim'
], function (
    ///file,
    pragma,
    parse,
    lang,
    logger,
    commonJs,
    prim
) {

    var allowRun = true,
        hasProp = lang.hasProp,
        falseProp = lang.falseProp,
        getOwn = lang.getOwn,
        // Used to strip out use strict from toString()'d functions for the
        // shim config since they will explicitly want to not be bound by strict,
        // but some envs, explicitly xpcshell, adds a use strict.
        useStrictRegExp = /['"]use strict['"];/g,
        //Absolute path if starts with /, \, or x:
        absoluteUrlRegExp = /^[\/\\]|^\w:/;

    //Turn off throwing on resolution conflict, that was just an older prim
    //idea about finding errors early, but does not comply with how promises
    //should operate.
    prim.hideResolutionConflict = true;

    //This method should be called when the patches to require should take hold.
    return function (config) {
        if (!allowRun) {
            return;
        }
        allowRun = false;

        var fs = config.env.fs;

        var layer,
            pluginBuilderRegExp = /(["']?)pluginBuilder(["']?)\s*[=\:]\s*["']([^'"\s]+)["']/,
            oldNewContext = require.s.newContext,
            oldDef,

            //create local undefined values for module and exports,
            //so that when files are evaled in this function they do not
            //see the node values used for r.js
            exports,
            module;

        /**
         * Reset "global" build caches that are kept around between
         * build layer builds. Useful to do when there are multiple
         * top level requirejs.optimize() calls.
         */
        require._cacheReset = function () {
            //Stored raw text caches, used by browser use.
            require._cachedRawText = {};
            //Stored cached file contents for reuse in other layers.
            require._cachedFileContents = {};
            //Store which cached files contain a require definition.
            require._cachedDefinesRequireUrls = {};
        };
        require._cacheReset();

        /**
         * Makes sure the URL is something that can be supported by the
         * optimization tool.
         * @param {String} url
         * @returns {Boolean}
         */
        require._isSupportedBuildUrl = function (url) {
            //Ignore URLs with protocols, hosts or question marks, means either network
            //access is needed to fetch it or it is too dynamic. Note that
            //on Windows, full paths are used for some urls, which include
            //the drive, like c:/something, so need to test for something other
            //than just a colon.
            if (url.indexOf("://") === -1 && url.indexOf("?") === -1 &&
                    url.indexOf('empty:') !== 0 && url.indexOf('//') !== 0) {
                return true;
            } else {
                if (!layer.ignoredUrls[url]) {
                    if (url.indexOf('empty:') === -1) {
                        logger.info('Cannot optimize network URL, skipping: ' + url);
                    }
                    layer.ignoredUrls[url] = true;
                }
                return false;
            }
        };

        function normalizeUrlWithBase(context, moduleName, url) {
            //Adjust the URL if it was not transformed to use baseUrl, but only
            //if the URL is not already an absolute path.
            if (require.jsExtRegExp.test(moduleName) &&
                !absoluteUrlRegExp.test(url)) {
                url = (context.config.dir || context.config.dirBaseUrl) + url;
            }
            return url;
        }

        //Overrides the new context call to add existing tracking features.
        require.s.newContext = function (name) {
            var context = oldNewContext(name),
                oldEnable = context.enable,
                moduleProto = context.Module.prototype,
                oldInit = moduleProto.init,
                oldCallPlugin = moduleProto.callPlugin;

            //Only do this for the context used for building.
            if (name === '_') {
                //For build contexts, do everything sync
                context.nextTick = function (fn) {
                    fn();
                };

                context.needFullExec = {};
                context.fullExec = {};
                context.plugins = {};
                context.buildShimExports = {};

                //Override the shim exports function generator to just
                //spit out strings that can be used in the stringified
                //build output.
                context.makeShimExports = function (value) {
                    var fn;
                    if (context.config.wrapShim) {
                        fn = function () {
                            var str = 'return ';
                            // If specifies an export that is just a global
                            // name, no dot for a `this.` and such, then also
                            // attach to the global, for `var a = {}` files
                            // where the function closure would hide that from
                            // the global object.
                            if (value.exports && value.exports.indexOf('.') === -1) {
                                str += 'root.' + value.exports + ' = ';
                            }

                            if (value.init) {
                                str += '(' + value.init.toString()
                                       .replace(useStrictRegExp, '') + '.apply(this, arguments))';
                            }
                            if (value.init && value.exports) {
                                str += ' || ';
                            }
                            if (value.exports) {
                                str += value.exports;
                            }
                            str += ';';
                            return str;
                        };
                    } else {
                        fn = function () {
                            return '(function (global) {\n' +
                                '    return function () {\n' +
                                '        var ret, fn;\n' +
                                (value.init ?
                                        ('       fn = ' + value.init.toString()
                                        .replace(useStrictRegExp, '') + ';\n' +
                                        '        ret = fn.apply(global, arguments);\n') : '') +
                                (value.exports ?
                                        '        return ret || global.' + value.exports + ';\n' :
                                        '        return ret;\n') +
                                '    };\n' +
                                '}(this))';
                        };
                    }

                    return fn;
                };

                context.enable = function (depMap, parent) {
                    var id = depMap.id,
                        parentId = parent && parent.map.id,
                        needFullExec = context.needFullExec,
                        fullExec = context.fullExec,
                        mod = getOwn(context.registry, id);

                    if (mod && !mod.defined) {
                        if (parentId && getOwn(needFullExec, parentId)) {
                            needFullExec[id] = depMap;
                        }

                    } else if ((getOwn(needFullExec, id) && falseProp(fullExec, id)) ||
                               (parentId && getOwn(needFullExec, parentId) &&
                                falseProp(fullExec, id))) {
                        context.require.undef(id);
                    }

                    return oldEnable.apply(context, arguments);
                };

                //Override load so that the file paths can be collected.
                context.load = function (moduleName, url) {
                    /*jslint evil: true */
                    var contents, pluginBuilderMatch, builderName,
                        shim, shimExports;

                    //Do not mark the url as fetched if it is
                    //not an empty: URL, used by the optimizer.
                    //In that case we need to be sure to call
                    //load() for each module that is mapped to
                    //empty: so that dependencies are satisfied
                    //correctly.
                    if (url.indexOf('empty:') === 0) {
                        delete context.urlFetched[url];
                    }

                    //Only handle urls that can be inlined, so that means avoiding some
                    //URLs like ones that require network access or may be too dynamic,
                    //like JSONP
                    if (require._isSupportedBuildUrl(url)) {
                        //Adjust the URL if it was not transformed to use baseUrl.
                        url = normalizeUrlWithBase(context, moduleName, url);

                        //Save the module name to path  and path to module name mappings.
                        layer.buildPathMap[moduleName] = url;
                        layer.buildFileToModule[url] = moduleName;

                        if (hasProp(context.plugins, moduleName)) {
                            //plugins need to have their source evaled as-is.
                            context.needFullExec[moduleName] = true;
                        }

                        prim().start(function () {
                            if (hasProp(require._cachedFileContents, url) &&
                                    (falseProp(context.needFullExec, moduleName) ||
                                    getOwn(context.fullExec, moduleName))) {
                                contents = require._cachedFileContents[url];

                                //If it defines require, mark it so it can be hoisted.
                                //Done here and in the else below, before the
                                //else block removes code from the contents.
                                //Related to #263
                                if (!layer.existingRequireUrl && require._cachedDefinesRequireUrls[url]) {
                                    layer.existingRequireUrl = url;
                                }
                            } else {
                                //Load the file contents, process for conditionals, then
                                //evaluate it.
                                return require._cacheReadAsync(url,undefined,fs).then(function (text) {
                                    contents = text;

                                    if (context.config.cjsTranslate &&
                                        (!context.config.shim || !lang.hasProp(context.config.shim, moduleName))) {
                                        contents = commonJs.convert(url, contents);
                                    }

                                    //If there is a read filter, run it now.
                                    if (context.config.onBuildRead) {
                                        contents = context.config.onBuildRead(moduleName, url, contents);
                                    }

                                    contents = pragma.process(url, contents, context.config, 'OnExecute');

                                    //Find out if the file contains a require() definition. Need to know
                                    //this so we can inject plugins right after it, but before they are needed,
                                    //and to make sure this file is first, so that define calls work.
                                    try {
                                        if (!layer.existingRequireUrl && parse.definesRequire(url, contents)) {
                                            layer.existingRequireUrl = url;
                                            require._cachedDefinesRequireUrls[url] = true;
                                        }
                                    } catch (e1) {
                                        throw new Error('Parse error using esprima ' +
                                                        'for file: ' + url + '\n' + e1);
                                    }
                                }).then(function () {
                                    if (hasProp(context.plugins, moduleName)) {
                                        //This is a loader plugin, check to see if it has a build extension,
                                        //otherwise the plugin will act as the plugin builder too.
                                        pluginBuilderMatch = pluginBuilderRegExp.exec(contents);
                                        if (pluginBuilderMatch) {
                                            //Load the plugin builder for the plugin contents.
                                            builderName = context.makeModuleMap(pluginBuilderMatch[3],
                                                                                context.makeModuleMap(moduleName),
                                                                                null,
                                                                                true).id;
                                            return require._cacheReadAsync(context.nameToUrl(builderName),undefined,fs);
                                        }
                                    }
                                    return contents;
                                }).then(function (text) {
                                    contents = text;

                                    //Parse out the require and define calls.
                                    //Do this even for plugins in case they have their own
                                    //dependencies that may be separate to how the pluginBuilder works.
                                    try {
                                        if (falseProp(context.needFullExec, moduleName)) {
                                            contents = parse(moduleName, url, contents, {
                                                insertNeedsDefine: true,
                                                has: context.config.has,
                                                findNestedDependencies: context.config.findNestedDependencies
                                            });
                                        }
                                    } catch (e2) {
                                        throw new Error('Parse error using esprima ' +
                                                        'for file: ' + url + '\n' + e2);
                                    }

                                    require._cachedFileContents[url] = contents;
                                });
                            }
                        }).then(function () {
                            if (contents) {
                                eval(contents);
                            }

                            try {
                                //If have a string shim config, and this is
                                //a fully executed module, try to see if
                                //it created a variable in this eval scope
                                if (getOwn(context.needFullExec, moduleName)) {
                                    shim = getOwn(context.config.shim, moduleName);
                                    if (shim && shim.exports) {
                                        shimExports = eval(shim.exports);
                                        if (typeof shimExports !== 'undefined') {
                                            context.buildShimExports[moduleName] = shimExports;
                                        }
                                    }
                                }

                                //Need to close out completion of this module
                                //so that listeners will get notified that it is available.
                                context.completeLoad(moduleName);
                            } catch (e) {
                                //Track which module could not complete loading.
                                if (!e.moduleTree) {
                                    e.moduleTree = [];
                                }
                                e.moduleTree.push(moduleName);
                                throw e;
                            }
                        }).then(null, function (eOuter) {

                            if (!eOuter.fileName) {
                                eOuter.fileName = url;
                            }
                            throw eOuter;
                        }).end();
                    } else {
                        //With unsupported URLs still need to call completeLoad to
                        //finish loading.
                        context.completeLoad(moduleName);
                    }
                };

                //Marks module has having a name, and optionally executes the
                //callback, but only if it meets certain criteria.
                context.execCb = function (name, cb, args, exports) {
                    var buildShimExports = getOwn(layer.context.buildShimExports, name);

                    if (buildShimExports) {
                        return buildShimExports;
                    } else if (cb.__requireJsBuild || getOwn(layer.context.needFullExec, name)) {
                        return cb.apply(exports, args);
                    }
                    return undefined;
                };

                moduleProto.init = function (depMaps) {
                    if (context.needFullExec[this.map.id]) {
                        lang.each(depMaps, lang.bind(this, function (depMap) {
                            if (typeof depMap === 'string') {
                                depMap = context.makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false, true);
                            }

                            if (!context.fullExec[depMap.id]) {
                                context.require.undef(depMap.id);
                            }
                        }));
                    }

                    return oldInit.apply(this, arguments);
                };

                moduleProto.callPlugin = function () {
                    var map = this.map,
                        pluginMap = context.makeModuleMap(map.prefix),
                        pluginId = pluginMap.id,
                        pluginMod = getOwn(context.registry, pluginId);

                    context.plugins[pluginId] = true;
                    context.needFullExec[pluginId] = map;

                    //If the module is not waiting to finish being defined,
                    //undef it and start over, to get full execution.
                    if (falseProp(context.fullExec, pluginId) && (!pluginMod || pluginMod.defined)) {
                        context.require.undef(pluginMap.id);
                    }

                    return oldCallPlugin.apply(this, arguments);
                };
            }

            return context;
        };

        //Clear up the existing context so that the newContext modifications
        //above will be active.
        delete require.s.contexts._;

        /** Reset state for each build layer pass. */
        require._buildReset = function () {
            var oldContext = require.s.contexts._;

            //Clear up the existing context.
            delete require.s.contexts._;

            //Set up new context, so the layer object can hold onto it.
            require({});

            layer = require._layer = {
                buildPathMap: {},
                buildFileToModule: {},
                buildFilePaths: [],
                pathAdded: {},
                modulesWithNames: {},
                needsDefine: {},
                existingRequireUrl: "",
                ignoredUrls: {},
                context: require.s.contexts._
            };

            //Return the previous context in case it is needed, like for
            //the basic config object.
            return oldContext;
        };

        require._buildReset();

        //Override define() to catch modules that just define an object, so that
        //a dummy define call is not put in the build file for them. They do
        //not end up getting defined via context.execCb, so we need to catch them
        //at the define call.
        oldDef = define;

        //This function signature does not have to be exact, just match what we
        //are looking for.
        define = function (name) {
            if (typeof name === "string" && falseProp(layer.needsDefine, name)) {
                layer.modulesWithNames[name] = true;
            }
            return oldDef.apply(require, arguments);
        };

        define.amd = oldDef.amd;

        //Add some utilities for plugins
        require._readFile = fs.readFile;
        require._fileExists = function (path) {
            return fs.exists(path);
        };

        //Called when execManager runs for a dependency. Used to figure out
        //what order of execution.
        require.onResourceLoad = function (context, map) {
            var id = map.id,
                url;

            // Fix up any maps that need to be normalized as part of the fullExec
            // plumbing for plugins to participate in the build.
            if (context.plugins && lang.hasProp(context.plugins, id)) {
                lang.eachProp(context.needFullExec, function(value, prop) {
                    // For plugin entries themselves, they do not have a map
                    // value in needFullExec, just a "true" entry.
                    if (value !== true && value.prefix === id && value.unnormalized) {
                        var map = context.makeModuleMap(value.originalName, value.parentMap);
                        context.needFullExec[map.id] = map;
                    }
                });
            }

            //If build needed a full execution, indicate it
            //has been done now. But only do it if the context is tracking
            //that. Only valid for the context used in a build, not for
            //other contexts being run, like for useLib, plain requirejs
            //use in node/rhino.
            if (context.needFullExec && getOwn(context.needFullExec, id)) {
                context.fullExec[id] = map;
            }

            //A plugin.
            if (map.prefix) {
                if (falseProp(layer.pathAdded, id)) {
                    layer.buildFilePaths.push(id);
                    //For plugins the real path is not knowable, use the name
                    //for both module to file and file to module mappings.
                    layer.buildPathMap[id] = id;
                    layer.buildFileToModule[id] = id;
                    layer.modulesWithNames[id] = true;
                    layer.pathAdded[id] = true;
                }
            } else if (map.url && require._isSupportedBuildUrl(map.url)) {
                //If the url has not been added to the layer yet, and it
                //is from an actual file that was loaded, add it now.
                url = normalizeUrlWithBase(context, id, map.url);
                if (!layer.pathAdded[url] && getOwn(layer.buildPathMap, id)) {
                    //Remember the list of dependencies for this layer.
                    layer.buildFilePaths.push(url);
                    layer.pathAdded[url] = true;
                }
            }
        };

        //Called by output of the parse() function, when a file does not
        //explicitly call define, probably just require, but the parse()
        //function normalizes on define() for dependency mapping and file
        //ordering works correctly.
        require.needsDefine = function (moduleName) {
            layer.needsDefine[moduleName] = true;
        };
    };
});

/*jslint plusplus: true, nomen: true, regexp: true  */
/*global define, requirejs, java, process, console */


define('skylark-rjs/build',[
    "./rjs",
    "./lang",
    "./prim",
    "./logger",
    ///"env!env/file",
    "./parse",
    "./optimize",
    "./pragma",
    "./transform",
    "./requirePatch",
    ///"env",
    "./commonJs",
    "./source-map"
],function (
    require,
    lang,
    prim,
    logger,
    parse,
    optimize,
    pragma,
    transform,
    requirePatch,
    commonJs,
    sourceMap

) {
    'use strict';

    var build,
        ///lang = require('lang'),
        ///prim = require('prim'),
        ///logger = require('logger'),
        ///file = require('env!env/file'),
        ///parse = require('parse'),
        ///optimize = require('optimize'),
        ///pragma = require('pragma'),
        ///transform = require('transform'),
        ///requirePatch = require('requirePatch'),
        ///env = require('env'),
        ///commonJs = require('commonJs'),
        ///SourceMapGenerator = require('source-map').SourceMapGenerator,
        SourceMapGenerator = sourceMap.SourceMapGenerator,
        hasProp = lang.hasProp,
        getOwn = lang.getOwn,
        falseProp = lang.falseProp,
        endsWithSemiColonRegExp = /;\s*$/,
        endsWithSlashRegExp = /[\/\\]$/,
        resourceIsModuleIdRegExp = /^[\w\/\\\.]+$/,
        deepCopyProps = {
            layer: true
        };

    //Deep copy a config object, but do not copy over the "layer" property,
    //as it can be a deeply nested structure with a full requirejs context.
    function copyConfig(obj) {
        return lang.deeplikeCopy(obj, deepCopyProps);
    }

    prim.nextTick = function (fn) {
        fn();
    };

    //Now map require to the outermost requirejs, now that we have
    //local dependencies for this module. The rest of the require use is
    //manipulating the requirejs loader.
    ///require = requirejs;

    //Caching function for performance. Attached to
    //require so it can be reused in requirePatch.js. _cachedRawText
    //set up by requirePatch.js
    require._cacheReadAsync = function (path, encoding,fs) {
        var d;

        if (lang.hasProp(require._cachedRawText, path)) {
            d = prim();
            d.resolve(require._cachedRawText[path]);
            return d.promise;
        } else {
            return fs.readFileAsync(path, encoding).then(function (text) {
                require._cachedRawText[path] = text;
                return text;
            });
        }
    };

    function makeBuildBaseConfig(fs) {
        return {
            appDir: "",
            pragmas: {},
            paths: {},
            optimize: "uglify",
            optimizeCss: "standard.keepLines.keepWhitespace",
            inlineText: true,
            isBuild: true,
            optimizeAllPluginResources: false,
            findNestedDependencies: false,
            preserveLicenseComments: true,
            writeBuildTxt: true,
            //Some builds can take a while, up the default limit.
            waitSeconds: 30,
            //By default, all files/directories are copied, unless
            //they match this regexp, by default just excludes .folders
            dirExclusionRegExp: fs.dirExclusionRegExp,
            _buildPathToModuleIndex: {}
        };
    }

    /**
     * Some JS may not be valid if concatenated with other JS, in particular
     * the style of omitting semicolons and rely on ASI. Add a semicolon in
     * those cases.
     */
    function addSemiColon(text, config) {
        if (config.skipSemiColonInsertion || endsWithSemiColonRegExp.test(text)) {
            return text;
        } else {
            return text + ";";
        }
    }

    function endsWithSlash(dirName) {
        if (dirName.charAt(dirName.length - 1) !== "/") {
            dirName += "/";
        }
        return dirName;
    }

    function endsWithNewLine(text) {
        if (text.charAt(text.length - 1) !== "\n") {
            text += "\n";
        }
        return text;
    }

    //Method used by plugin writeFile calls, defined up here to avoid
    //jslint warning about "making a function in a loop".
    function makeWriteFile(namespace, layer) {
        function writeFile(name, contents) {
            logger.trace('Saving plugin-optimized file: ' + name);
            file.saveUtf8File(name, contents);
        }

        writeFile.asModule = function (moduleName, fileName, contents) {
            writeFile(fileName,
                build.toTransport(namespace, moduleName, fileName, contents, layer));
        };

        return writeFile;
    }

    /**
     * Appends singleContents to fileContents and returns the result.  If a sourceMapGenerator
     * is provided, adds singleContents to the source map.
     *
     * @param {string} fileContents - The file contents to which to append singleContents
     * @param {string} singleContents - The additional contents to append to fileContents
     * @param {string} path - An absolute path of a file whose name to use in the source map.
     * The file need not actually exist if the code in singleContents is generated.
     * @param {{out: ?string, baseUrl: ?string}} config - The build configuration object.
     * @param {?{_buildPath: ?string}} module - An object with module information.
     * @param {?SourceMapGenerator} sourceMapGenerator - An instance of Mozilla's SourceMapGenerator,
     * or null if no source map is being generated.
     * @returns {string} fileContents with singleContents appended
     */
    function appendToFileContents(fileContents, singleContents, path, config, module, sourceMapGenerator) {
        var refPath, sourceMapPath, resourcePath, pluginId, sourceMapLineNumber, lineCount, parts, i;
        if (sourceMapGenerator) {
            if (config.out) {
                refPath = config.baseUrl;
            } else if (module && module._buildPath) {
                refPath = module._buildPath;
            } else {
                refPath = "";
            }
            parts = path.split('!');
            if (parts.length === 1) {
                //Not a plugin resource, fix the path
                sourceMapPath = build.makeRelativeFilePath(refPath, path);
            } else {
                //Plugin resource. If it looks like just a plugin
                //followed by a module ID, pull off the plugin
                //and put it at the end of the name, otherwise
                //just leave it alone.
                pluginId = parts.shift();
                resourcePath = parts.join('!');
                if (resourceIsModuleIdRegExp.test(resourcePath)) {
                    sourceMapPath = build.makeRelativeFilePath(refPath, require.toUrl(resourcePath)) +
                                    '!' + pluginId;
                } else {
                    sourceMapPath = path;
                }
            }

            sourceMapLineNumber = fileContents.split('\n').length - 1;
            lineCount = singleContents.split('\n').length;
            for (i = 1; i <= lineCount; i += 1) {
                sourceMapGenerator.addMapping({
                    generated: {
                        line: sourceMapLineNumber + i,
                        column: 0
                    },
                    original: {
                        line: i,
                        column: 0
                    },
                    source: sourceMapPath
                });
            }

            //Store the content of the original in the source
            //map since other transforms later like minification
            //can mess up translating back to the original
            //source.
            sourceMapGenerator.setSourceContent(sourceMapPath, singleContents);
        }
        fileContents += singleContents;
        return fileContents;
    }

    /**
     * Main API entry point into the build. The args argument can either be
     * an array of arguments (like the onese passed on a command-line),
     * or it can be a JavaScript object that has the format of a build profile
     * file.
     *
     * If it is an object, then in addition to the normal properties allowed in
     * a build profile file, the object should contain one other property:
     *
     * The object could also contain a "buildFile" property, which is a string
     * that is the file path to a build profile that contains the rest
     * of the build profile directives.
     *
     * This function does not return a status, it should throw an error if
     * there is a problem completing the build.
     */
    build = function (args) {
        var buildFile, cmdConfig, errorMsg, errorStack, stackMatch, errorTree,
            i, j, errorMod,
            stackRegExp = /( {4}at[^\n]+)\n/,
            standardIndent = '  ';

        return prim().start(function () {
            if (!args || lang.isArray(args)) {
                if (!args || args.length < 1) {
                    logger.error("build.js buildProfile.js\n" +
                          "where buildProfile.js is the name of the build file (see example.build.js for hints on how to make a build file).");
                    return undefined;
                }

                //Next args can include a build file path as well as other build args.
                //build file path comes first. If it does not contain an = then it is
                //a build file path. Otherwise, just all build args.
                if (args[0].indexOf("=") === -1) {
                    buildFile = args[0];
                    args.splice(0, 1);
                }

                //Remaining args are options to the build
                cmdConfig = build.convertArrayToObject(args);
                cmdConfig.buildFile = buildFile;
            } else {
                cmdConfig = args;
            }

            return build._run(cmdConfig);
        }).then(null, function (e) {
            var err;

            errorMsg = e.toString();
            errorTree = e.moduleTree;
            stackMatch = stackRegExp.exec(errorMsg);

            if (stackMatch) {
                errorMsg += errorMsg.substring(0, stackMatch.index + stackMatch[0].length + 1);
            }

            //If a module tree that shows what module triggered the error,
            //print it out.
            if (errorTree && errorTree.length > 0) {
                errorMsg += '\nIn module tree:\n';

                for (i = errorTree.length - 1; i > -1; i--) {
                    errorMod = errorTree[i];
                    if (errorMod) {
                        for (j = errorTree.length - i; j > -1; j--) {
                            errorMsg += standardIndent;
                        }
                        errorMsg += errorMod + '\n';
                    }
                }

                logger.error(errorMsg);
            }

            errorStack = e.stack;

            if (typeof args === 'string' && args.indexOf('stacktrace=true') !== -1) {
                errorMsg += '\n' + errorStack;
            } else {
                if (!stackMatch && errorStack) {
                    //Just trim out the first "at" in the stack.
                    stackMatch = stackRegExp.exec(errorStack);
                    if (stackMatch) {
                        errorMsg += '\n' + stackMatch[0] || '';
                    }
                }
            }

            err = new Error(errorMsg);
            err.originalError = e;
            throw err;
        });
    };

    build._run = function (cmdConfig) {
        var buildPaths, fileName, fileNames,
            paths, i,
            baseConfig, config,
            modules, srcPath, buildContext,
            destPath, moduleMap, parentModuleMap, context,
            resources, resource, plugin, fileContents,
            pluginProcessed = {},
            buildFileContents = "",
            pluginCollector = {},
            fs;

        return prim().start(function () {
            var prop;

            //Can now run the patches to require.js to allow it to be used for
            //build generation. Do it here instead of at the top of the module
            //because we want normal require behavior to load the build tool
            //then want to switch to build mode.

            config = build.createConfig(cmdConfig);
            paths = config.paths;
            fs = config.env.fs;

            requirePatch(config);


            //Remove the previous build dir, in case it contains source transforms,
            //like the ones done with onBuildRead and onBuildWrite.
            if (config.dir && !config.keepBuildDir && fs.exists(config.dir)) {
                fs.deleteFile(config.dir);
            }

            if (!config.out && !config.cssIn) {
                //This is not just a one-off file build but a full build profile, with
                //lots of files to process.

                //First copy all the baseUrl content
                fs.copyDir((config.appDir || config.baseUrl), config.dir, /\w/, true);

                //Adjust baseUrl if config.appDir is in play, and set up build output paths.
                buildPaths = {};
                if (config.appDir) {
                    //All the paths should be inside the appDir, so just adjust
                    //the paths to use the dirBaseUrl
                    for (prop in paths) {
                        if (hasProp(paths, prop)) {
                            buildPaths[prop] = paths[prop].replace(config.appDir, config.dir);
                        }
                    }
                } else {
                    //If no appDir, then make sure to copy the other paths to this directory.
                    for (prop in paths) {
                        if (hasProp(paths, prop)) {
                            //Set up build path for each path prefix, but only do so
                            //if the path falls out of the current baseUrl
                            if (paths[prop].indexOf(config.baseUrl) === 0) {
                                buildPaths[prop] = paths[prop].replace(config.baseUrl, config.dirBaseUrl);
                            } else {
                                buildPaths[prop] = paths[prop] === 'empty:' ? 'empty:' : prop;

                                //Make sure source path is fully formed with baseUrl,
                                //if it is a relative URL.
                                srcPath = paths[prop];
                                if (srcPath.indexOf('/') !== 0 && srcPath.indexOf(':') === -1) {
                                    srcPath = config.baseUrl + srcPath;
                                }

                                destPath = config.dirBaseUrl + buildPaths[prop];

                                //Skip empty: paths
                                if (srcPath !== 'empty:') {
                                    //If the srcPath is a directory, copy the whole directory.
                                    if (fs.exists(srcPath) && fs.isDirectory(srcPath)) {
                                        //Copy files to build area. Copy all files (the /\w/ regexp)
                                        fs.copyDir(srcPath, destPath, /\w/, true);
                                    } else {
                                        //Try a .js extension
                                        srcPath += '.js';
                                        destPath += '.js';
                                        fs.copyFile(srcPath, destPath);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //Figure out source file location for each module layer. Do this by seeding require
            //with source area configuration. This is needed so that later the module layers
            //can be manually copied over to the source area, since the build may be
            //require multiple times and the above copyDir call only copies newer files.
            require({
                baseUrl: config.baseUrl,
                paths: paths,
                packagePaths: config.packagePaths,
                packages: config.packages
            });
            buildContext = require.s.contexts._;
            modules = config.modules;

            if (modules) {
                modules.forEach(function (module) {
                    if (module.name) {
                        module._sourcePath = buildContext.nameToUrl(module.name);
                        //If the module does not exist, and this is not a "new" module layer,
                        //as indicated by a true "create" property on the module, and
                        //it is not a plugin-loaded resource, and there is no
                        //'rawText' containing the module's source then throw an error.
                        if (!fs.exists(module._sourcePath) && !module.create &&
                                module.name.indexOf('!') === -1 &&
                                (!config.rawText || !lang.hasProp(config.rawText, module.name))) {
                            throw new Error("ERROR: module path does not exist: " +
                                            module._sourcePath + " for module named: " + module.name +
                                            ". Path is relative to: " + fs.absPath('.'));
                        }
                    }
                });
            }

            if (config.out) {
                //Just set up the _buildPath for the module layer.
                require(config);
                if (!config.cssIn) {
                    config.modules[0]._buildPath = typeof config.out === 'function' ?
                                                   'FUNCTION' : config.out;
                }
            } else if (!config.cssIn) {
                //Now set up the config for require to use the build area, and calculate the
                //build file locations. Pass along any config info too.
                baseConfig = {
                    baseUrl: config.dirBaseUrl,
                    paths: buildPaths
                };

                lang.mixin(baseConfig, config);
                require(baseConfig);

                if (modules) {
                    modules.forEach(function (module) {
                        if (module.name) {
                            module._buildPath = buildContext.nameToUrl(module.name, null);

                            //If buildPath and sourcePath are the same, throw since this
                            //would result in modifying source. This condition can happen
                            //with some more tricky paths: config and appDir/baseUrl
                            //setting, which is a sign of incorrect config.
                            if (module._buildPath === module._sourcePath &&
                                !config.allowSourceOverwrites) {
                                throw new Error('Module ID \'' + module.name  +
                                                '\' has a source path that is same as output path: ' +
                                                module._sourcePath +
                                                '. Stopping, config is malformed.');
                            }

                            // Copy the file, but only if it is not provided in rawText.
                            if (!module.create && (!config.rawText || !lang.hasProp(config.rawText, module.name))) {
                                fs.copyFile(module._sourcePath, module._buildPath);
                            }
                        }
                    });
                }
            }

            //Run CSS optimizations before doing JS module tracing, to allow
            //things like text loader plugins loading CSS to get the optimized
            //CSS.
            if (config.optimizeCss && config.optimizeCss !== "none" && config.dir) {
                buildFileContents += optimize.css(config.dir, config);
            }
        }).then(function() {
            baseConfig = copyConfig(require.s.contexts._.config);
        }).then(function () {
            var actions = [];

            if (modules) {
                actions = modules.map(function (module, i) {
                    return function () {
                        //Save off buildPath to module index in a hash for quicker
                        //lookup later.
                        config._buildPathToModuleIndex[fs.normalize(module._buildPath)] = i;

                        //Call require to calculate dependencies.
                        return build.traceDependencies(module, config, baseConfig)
                            .then(function (layer) {
                                module.layer = layer;
                            });
                    };
                });

                return prim.serial(actions);
            }
        }).then(function () {
            var actions;

            if (modules) {
                //Now build up shadow layers for anything that should be excluded.
                //Do this after tracing dependencies for each module, in case one
                //of those modules end up being one of the excluded values.
                actions = modules.map(function (module) {
                    return function () {
                        if (module.exclude) {
                            module.excludeLayers = [];
                            return prim.serial(module.exclude.map(function (exclude, i) {
                                return function () {
                                    //See if it is already in the list of modules.
                                    //If not trace dependencies for it.
                                    var found = build.findBuildModule(exclude, modules);
                                    if (found) {
                                        module.excludeLayers[i] = found;
                                    } else {
                                        return build.traceDependencies({name: exclude}, config, baseConfig)
                                            .then(function (layer) {
                                                module.excludeLayers[i] = { layer: layer };
                                            });
                                    }
                                };
                            }));
                        }
                    };
                });

                return prim.serial(actions);
            }
        }).then(function () {
            if (modules) {
                return prim.serial(modules.map(function (module) {
                    return function () {
                        if (module.exclude) {
                            //module.exclude is an array of module names. For each one,
                            //get the nested dependencies for it via a matching entry
                            //in the module.excludeLayers array.
                            module.exclude.forEach(function (excludeModule, i) {
                                var excludeLayer = module.excludeLayers[i].layer,
                                    map = excludeLayer.buildFileToModule;
                                excludeLayer.buildFilePaths.forEach(function(filePath){
                                    build.removeModulePath(map[filePath], filePath, module.layer);
                                });
                            });
                        }
                        if (module.excludeShallow) {
                            //module.excludeShallow is an array of module names.
                            //shallow exclusions are just that module itself, and not
                            //its nested dependencies.
                            module.excludeShallow.forEach(function (excludeShallowModule) {
                                var path = getOwn(module.layer.buildPathMap, excludeShallowModule);
                                if (path) {
                                    build.removeModulePath(excludeShallowModule, path, module.layer);
                                }
                            });
                        }

                        //Flatten them and collect the build output for each module.
                        return build.flattenModule(module, module.layer, config).then(function (builtModule) {
                            var finalText, baseName;
                            //Save it to a temp file for now, in case there are other layers that
                            //contain optimized content that should not be included in later
                            //layer optimizations. See issue #56.
                            if (module._buildPath === 'FUNCTION') {
                                module._buildText = builtModule.text;
                                module._buildSourceMap = builtModule.sourceMap;
                            } else {
                                finalText = builtModule.text;
                                if (builtModule.sourceMap) {
                                    baseName = module._buildPath.split('/');
                                    baseName = baseName.pop();
                                    finalText += '\n//# sourceMappingURL=' + baseName + '.map';
                                    fs.saveUtf8File(module._buildPath + '.map', builtModule.sourceMap);
                                }
                                fs.saveUtf8File(module._buildPath + '-temp', finalText);

                            }
                            buildFileContents += builtModule.buildText;
                        });
                    };
                }));
            }
        }).then(function () {
            var moduleName, outOrigSourceMap,
                bundlesConfig = {},
                bundlesConfigOutFile = config.bundlesConfigOutFile;

            if (modules) {
                //Now move the build layers to their final position.
                modules.forEach(function (module) {
                    var entryConfig,
                        finalPath = module._buildPath;

                    if (finalPath !== 'FUNCTION') {
                        if (fs.exists(finalPath)) {
                            fs.deleteFile(finalPath);
                        }
                        fs.renameFile(finalPath + '-temp', finalPath);

                        //If bundles config should be written out, scan the
                        //built file for module IDs. Favor doing this reparse
                        //since tracking the IDs as the file is built has some
                        //edge cases around files that had more than one ID in
                        //them already, and likely loader plugin-written contents.
                        if (bundlesConfigOutFile) {
                            entryConfig = bundlesConfig[module.name] = [];
                            var bundleContents = fs.readFile(finalPath);
                            var excludeMap = {};
                            excludeMap[module.name] = true;
                            var parsedIds = parse.getAllNamedDefines(bundleContents, excludeMap);
                            entryConfig.push.apply(entryConfig, parsedIds);
                        }

                        //And finally, if removeCombined is specified, remove
                        //any of the files that were used in this layer.
                        //Be sure not to remove other build layers.
                        if (config.removeCombined && !config.out) {
                            module.layer.buildFilePaths.forEach(function (path) {
                                var isLayer = modules.some(function (mod) {
                                        return mod._buildPath === path;
                                    }),
                                    relPath = build.makeRelativeFilePath(config.dir, path);

                                if (fs.exists(path) &&
                                    // not a build layer target
                                    !isLayer &&
                                    // not outside the build directory
                                    relPath.indexOf('..') !== 0) {
                                    fs.deleteFile(path);
                                }
                            });
                        }
                    }

                    //Signal layer is done
                    if (config.onModuleBundleComplete) {
                        config.onModuleBundleComplete(module.onCompleteData);
                    }
                });

                //Write out bundles config, if it is wanted.
                if (bundlesConfigOutFile) {
                    var text = fs.readFile(bundlesConfigOutFile);
                    text = transform.modifyConfig(text, function (config) {
                        if (!config.bundles) {
                            config.bundles = {};
                        }

                        lang.eachProp(bundlesConfig, function (value, prop) {
                            config.bundles[prop] = value;
                        });

                        return config;
                    });

                    fs.saveUtf8File(bundlesConfigOutFile, text);
                }
            }

            //If removeCombined in play, remove any empty directories that
            //may now exist because of its use
            if (config.removeCombined && !config.out && config.dir) {
                fs.deleteEmptyDirs(config.dir);
            }

            //Do other optimizations.
            if (config.out && !config.cssIn) {
                //Just need to worry about one JS file.
                fileName = config.modules[0]._buildPath;
                if (fileName === 'FUNCTION') {
                    outOrigSourceMap = config.modules[0]._buildSourceMap;
                    config._buildSourceMap = outOrigSourceMap;
                    config.modules[0]._buildText = optimize.js((config.modules[0].name ||
                                                                config.modules[0].include[0] ||
                                                                fileName) + '.build.js',
                                                               config.modules[0]._buildText,
                                                               null,
                                                               config);
                    if (config._buildSourceMap && config._buildSourceMap !== outOrigSourceMap) {
                        config.modules[0]._buildSourceMap = config._buildSourceMap;
                        config._buildSourceMap = null;
                    }
                } else {
                    optimize.jsFile(fileName, null, fileName, config);
                }
            } else if (!config.cssIn) {
                //Normal optimizations across modules.

                //JS optimizations.
                fileNames = fs.getFilteredFileList(config.dir, /\.js$/, true);
                fileNames.forEach(function (fileName) {
                    var cfg, override, moduleIndex;

                    //Generate the module name from the config.dir root.
                    moduleName = fileName.replace(config.dir, '');
                    //Get rid of the extension
                    moduleName = moduleName.substring(0, moduleName.length - 3);

                    //If there is an override for a specific layer build module,
                    //and this file is that module, mix in the override for use
                    //by optimize.jsFile.
                    moduleIndex = getOwn(config._buildPathToModuleIndex, fileName);
                    //Normalize, since getOwn could have returned undefined
                    moduleIndex = moduleIndex === 0 || moduleIndex > 0 ? moduleIndex : -1;

                    //Try to avoid extra work if the other files do not need to
                    //be read. Build layers should be processed at the very
                    //least for optimization.
                    if (moduleIndex > -1 || !config.skipDirOptimize ||
                            config.normalizeDirDefines === "all" ||
                            config.cjsTranslate) {
                        //Convert the file to transport format, but without a name
                        //inserted (by passing null for moduleName) since the files are
                        //standalone, one module per file.
                        fileContents = fs.readFile(fileName);


                        //For builds, if wanting cjs translation, do it now, so that
                        //the individual modules can be loaded cross domain via
                        //plain script tags.
                        if (config.cjsTranslate &&
                            (!config.shim || !lang.hasProp(config.shim, moduleName))) {
                            fileContents = commonJs.convert(fileName, fileContents);
                        }

                        if (moduleIndex === -1) {
                            if (config.onBuildRead) {
                                fileContents = config.onBuildRead(moduleName,
                                                                  fileName,
                                                                  fileContents);
                            }

                            //Only do transport normalization if this is not a build
                            //layer (since it was already normalized) and if
                            //normalizeDirDefines indicated all should be done.
                            if (config.normalizeDirDefines === "all") {
                                fileContents = build.toTransport(config.namespace,
                                                             null,
                                                             fileName,
                                                             fileContents);
                            }

                            if (config.onBuildWrite) {
                                fileContents = config.onBuildWrite(moduleName,
                                                                   fileName,
                                                                   fileContents);
                            }
                        }

                        override = moduleIndex > -1 ?
                                   config.modules[moduleIndex].override : null;
                        if (override) {
                            cfg = build.createOverrideConfig(config, override);
                        } else {
                            cfg = config;
                        }

                        if (moduleIndex > -1 || !config.skipDirOptimize) {
                            optimize.jsFile(fileName, fileContents, fileName, cfg, pluginCollector);
                        }
                    }
                });

                //Normalize all the plugin resources.
                context = require.s.contexts._;

                for (moduleName in pluginCollector) {
                    if (hasProp(pluginCollector, moduleName)) {
                        parentModuleMap = context.makeModuleMap(moduleName);
                        resources = pluginCollector[moduleName];
                        for (i = 0; i < resources.length; i++) {
                            resource = resources[i];
                            moduleMap = context.makeModuleMap(resource, parentModuleMap);
                            if (falseProp(context.plugins, moduleMap.prefix)) {
                                //Set the value in context.plugins so it
                                //will be evaluated as a full plugin.
                                context.plugins[moduleMap.prefix] = true;

                                //Do not bother if the plugin is not available.
                                if (!fs.exists(require.toUrl(moduleMap.prefix + '.js'))) {
                                    continue;
                                }

                                //Rely on the require in the build environment
                                //to be synchronous
                                context.require([moduleMap.prefix]);

                                //Now that the plugin is loaded, redo the moduleMap
                                //since the plugin will need to normalize part of the path.
                                moduleMap = context.makeModuleMap(resource, parentModuleMap);
                            }

                            //Only bother with plugin resources that can be handled
                            //processed by the plugin, via support of the writeFile
                            //method.
                            if (falseProp(pluginProcessed, moduleMap.id)) {
                                //Only do the work if the plugin was really loaded.
                                //Using an internal access because the file may
                                //not really be loaded.
                                plugin = getOwn(context.defined, moduleMap.prefix);
                                if (plugin && plugin.writeFile) {
                                    plugin.writeFile(
                                        moduleMap.prefix,
                                        moduleMap.name,
                                        require,
                                        makeWriteFile(
                                            config.namespace
                                        ),
                                        context.config
                                    );
                                }

                                pluginProcessed[moduleMap.id] = true;
                            }
                        }

                    }
                }

                //console.log('PLUGIN COLLECTOR: ' + JSON.stringify(pluginCollector, null, "  "));


                //All module layers are done, write out the build.txt file.
                if (config.writeBuildTxt) {
                    fs.saveUtf8File(config.dir + "build.txt", buildFileContents);
                }
            }

            //If just have one CSS file to optimize, do that here.
            if (config.cssIn) {
                buildFileContents += optimize.cssFile(config.cssIn, config.out, config).buildText;
            }

            if (typeof config.out === 'function') {
                config.out(config.modules[0]._buildText, config.modules[0]._buildSourceMap);
            }

            //Print out what was built into which layers.
            if (buildFileContents) {
                logger.info(buildFileContents);
                return buildFileContents;
            }

            return '';
        });
    };

    /**
     * Converts command line args like "paths.foo=../some/path"
     * result.paths = { foo: '../some/path' } where prop = paths,
     * name = paths.foo and value = ../some/path, so it assumes the
     * name=value splitting has already happened.
     */
    function stringDotToObj(result, name, value) {
        var parts = name.split('.');

        parts.forEach(function (prop, i) {
            if (i === parts.length - 1) {
                result[prop] = value;
            } else {
                if (falseProp(result, prop)) {
                    result[prop] = {};
                }
                result = result[prop];
            }

        });
    }

    build.objProps = {
        paths: true,
        wrap: true,
        pragmas: true,
        pragmasOnSave: true,
        has: true,
        hasOnSave: true,
        uglify: true,
        uglify2: true,
        closure: true,
        map: true,
        throwWhen: true,
        rawText: true
    };

    build.hasDotPropMatch = function (prop) {
        var dotProp,
            index = prop.indexOf('.');

        if (index !== -1) {
            dotProp = prop.substring(0, index);
            return hasProp(build.objProps, dotProp);
        }
        return false;
    };

    /**
     * Converts an array that has String members of "name=value"
     * into an object, where the properties on the object are the names in the array.
     * Also converts the strings "true" and "false" to booleans for the values.
     * member name/value pairs, and converts some comma-separated lists into
     * arrays.
     * @param {Array} ary
     */
    build.convertArrayToObject = function (ary) {
        var result = {}, i, separatorIndex, prop, value,
            needArray = {
                "include": true,
                "exclude": true,
                "excludeShallow": true,
                "insertRequire": true,
                "stubModules": true,
                "deps": true,
                "mainConfigFile": true,
                "wrap.startFile": true,
                "wrap.endFile": true
            };

        for (i = 0; i < ary.length; i++) {
            separatorI.ndex = ary[i].indexOf("=");
            if (separatorIndex === -1) {
                throw "Malformed name/value pair: [" + ary[i] + "]. Format should be name=value";
            }

            value = ary[i].substring(separatorIndex + 1, ary[i].length);
            if (value === "true") {
                value = true;
            } else if (value === "false") {
                value = false;
            }

            prop = ary[i].substring(0, separatorIndex);

            //Convert to array if necessary
            if (getOwn(needArray, prop)) {
                value = value.split(",");
            }

            if (build.hasDotPropMatch(prop)) {
                stringDotToObj(result, prop, value);
            } else {
                result[prop] = value;
            }
        }
        return result; //Object
    };

    build.makeAbsPath = function (path, absFilePath,fs) {
        if (!absFilePath) {
            return path;
        }

        //Add abspath if necessary. If path starts with a slash or has a colon,
        //then already is an abolute path.
        if (path.indexOf('/') !== 0 && path.indexOf(':') === -1) {
            path = absFilePath +
                   (absFilePath.charAt(absFilePath.length - 1) === '/' ? '' : '/') +
                   path;
            path = fs.normalize(path);
        }
        return path.replace(lang.backSlashRegExp, '/');
    };

    build.makeAbsObject = function (props, obj, absFilePath,fs) {
        var i, prop;
        if (obj) {
            for (i = 0; i < props.length; i++) {
                prop = props[i];
                if (hasProp(obj, prop) && typeof obj[prop] === 'string') {
                    obj[prop] = build.makeAbsPath(obj[prop], absFilePath,fs);
                }
            }
        }
    };

    /**
     * For any path in a possible config, make it absolute relative
     * to the absFilePath passed in.
     */
    build.makeAbsConfig = function (config, absFilePath,fs) {
        var props, prop, i;

        props = ["appDir", "dir", "baseUrl"];
        for (i = 0; i < props.length; i++) {
            prop = props[i];

            if (getOwn(config, prop)) {
                //Add abspath if necessary, make sure these paths end in
                //slashes
                if (prop === "baseUrl") {
                    config.originalBaseUrl = config.baseUrl;
                    if (config.appDir) {
                        //If baseUrl with an appDir, the baseUrl is relative to
                        //the appDir, *not* the absFilePath. appDir and dir are
                        //made absolute before baseUrl, so this will work.
                        config.baseUrl = build.makeAbsPath(config.originalBaseUrl, config.appDir,fs);
                    } else {
                        //The dir output baseUrl is same as regular baseUrl, both
                        //relative to the absFilePath.
                        config.baseUrl = build.makeAbsPath(config[prop], absFilePath,fs);
                    }
                } else {
                    config[prop] = build.makeAbsPath(config[prop], absFilePath,fs);
                }

                config[prop] = endsWithSlash(config[prop]);
            }
        }

        build.makeAbsObject((config.out === "stdout" ? ["cssIn"] : ["out", "cssIn"]),
                            config, absFilePath,fs);
        build.makeAbsObject(["startFile", "endFile"], config.wrap, absFilePath,fs);
        build.makeAbsObject(["externExportsPath"], config.closure, absFilePath,fs);
    };

    /**
     * Creates a relative path to targetPath from refPath.
     * Only deals with file paths, not folders. If folders,
     * make sure paths end in a trailing '/'.
     */
    build.makeRelativeFilePath = function (refPath, targetPath,fs) {
        var i, dotLength, finalParts, length, targetParts, targetName,
            refParts = refPath.split('/'),
            hasEndSlash = endsWithSlashRegExp.test(targetPath),
            dotParts = [];

        targetPath = fs.normalize(targetPath);
        if (hasEndSlash && !endsWithSlashRegExp.test(targetPath)) {
            targetPath += '/';
        }
        targetParts = targetPath.split('/');
        //Pull off file name
        targetName = targetParts.pop();

        //Also pop off the ref file name to make the matches against
        //targetParts equivalent.
        refParts.pop();

        length = refParts.length;

        for (i = 0; i < length; i += 1) {
            if (refParts[i] !== targetParts[i]) {
                break;
            }
        }

        //Now i is the index in which they diverge.
        finalParts = targetParts.slice(i);

        dotLength = length - i;
        for (i = 0; i > -1 && i < dotLength; i += 1) {
            dotParts.push('..');
        }

        return dotParts.join('/') + (dotParts.length ? '/' : '') +
               finalParts.join('/') + (finalParts.length ? '/' : '') +
               targetName;
    };

    build.nestedMix = {
        paths: true,
        has: true,
        hasOnSave: true,
        pragmas: true,
        pragmasOnSave: true
    };

    /**
     * Mixes additional source config into target config, and merges some
     * nested config, like paths, correctly.
     */
    function mixConfig(target, source, skipArrays) {
        var prop, value, isArray, targetValue;

        for (prop in source) {
            if (hasProp(source, prop)) {
                //If the value of the property is a plain object, then
                //allow a one-level-deep mixing of it.
                value = source[prop];
                isArray = lang.isArray(value);
                if (typeof value === 'object' && value &&
                        !isArray && !lang.isFunction(value) &&
                        !lang.isRegExp(value)) {

                    // TODO: need to generalize this work, maybe also reuse
                    // the work done in requirejs configure, perhaps move to
                    // just a deep copy/merge overall. However, given the
                    // amount of observable change, wait for a dot release.
                    // This change is in relation to #645
                    if (prop === 'map') {
                        if (!target.map) {
                            target.map = {};
                        }
                        lang.deepMix(target.map, source.map);
                    } else {
                        target[prop] = lang.mixin({}, target[prop], value, true);
                    }
                } else if (isArray) {
                    if (!skipArrays) {
                        // Some config, like packages, are arrays. For those,
                        // just merge the results.
                        targetValue = target[prop];
                        if (lang.isArray(targetValue)) {
                            target[prop] = targetValue.concat(value);
                        } else {
                            target[prop] = value;
                        }
                    }
                } else {
                    target[prop] = value;
                }
            }
        }

        //Set up log level since it can affect if errors are thrown
        //or caught and passed to errbacks while doing config setup.
        if (lang.hasProp(target, 'logLevel')) {
            logger.logLevel(target.logLevel);
        }
    }

    /**
     * Converts a wrap.startFile or endFile to be start/end as a string.
     * the startFile/endFile values can be arrays.
     */
    function flattenWrapFile(config, keyName, absFilePath) {
        var wrap = config.wrap,
            keyFileName = keyName + 'File',
            keyMapName = '__' + keyName + 'Map',
            fs = config.env.fs;

        if (typeof wrap[keyName] !== 'string' && wrap[keyFileName]) {
            wrap[keyName] = '';
            if (typeof wrap[keyFileName] === 'string') {
                wrap[keyFileName] = [wrap[keyFileName]];
            }
            wrap[keyMapName] = [];
            wrap[keyFileName].forEach(function (fileName) {
                var absPath = build.makeAbsPath(fileName, absFilePath,fs),
                    fileText = endsWithNewLine(fs.readFile(absPath));
                wrap[keyMapName].push(function (fileContents, cfg, sourceMapGenerator) {
                    return appendToFileContents(fileContents, fileText, absPath, cfg, null, sourceMapGenerator);
                });
                wrap[keyName] += fileText;
            });
        } else if (wrap[keyName] === null ||  wrap[keyName] === undefined) {
            //Allow missing one, just set to empty string.
            wrap[keyName] = '';
        } else if (typeof wrap[keyName] === 'string') {
            wrap[keyName] = endsWithNewLine(wrap[keyName]);
            wrap[keyMapName] = [
                function (fileContents, cfg, sourceMapGenerator) {
                    var absPath = build.makeAbsPath("config-wrap-" + keyName + "-default.js", absFilePath,fs);
                    return appendToFileContents(fileContents, wrap[keyName], absPath, cfg, null, sourceMapGenerator);
                }
            ];
        } else {
            throw new Error('wrap.' + keyName + ' or wrap.' + keyFileName + ' malformed');
        }
    }

    function normalizeWrapConfig(config, absFilePath) {
        //Get any wrap text.
        var fs = config.env.fs;
        try {
            if (config.wrap) {
                if (config.wrap === true) {
                    //Use default values.
                    config.wrap = {
                        start: '(function () {\n',
                        end: '}());',
                        __startMap: [
                            function (fileContents, cfg, sourceMapGenerator) {
                                return appendToFileContents(fileContents, "(function () {\n",
                                                            build.makeAbsPath("config-wrap-start-default.js",
                                                                              absFilePath,fs), cfg, null,
                                                            sourceMapGenerator);
                            }
                        ],
                        __endMap: [
                            function (fileContents, cfg, sourceMapGenerator) {
                                return appendToFileContents(fileContents, "}());",
                                                            build.makeAbsPath("config-wrap-end-default.js", absFilePath,fs),
                                                            cfg, null, sourceMapGenerator);
                            }
                        ]
                    };
                } else {
                    flattenWrapFile(config, 'start', absFilePath);
                    flattenWrapFile(config, 'end', absFilePath);
                }
            }
        } catch (wrapError) {
            throw new Error('Malformed wrap config: ' + wrapError.toString());
        }
    }

    /**
     * Creates a config object for an optimization build.
     * It will also read the build profile if it is available, to create
     * the configuration.
     *
     * @param {Object} cfg config options that take priority
     * over defaults and ones in the build file. These options could
     * be from a command line, for instance.
     *
     * @param {Object} the created config object.
     */
    build.createConfig = function (cfg) {
        /*jslint evil: true */
        var fs = cfg.env.fs;

        var buildFileContents, buildFileConfig, mainConfig,
            mainConfigFile, mainConfigPath, buildFile, absFilePath,
            config = {},
            buildBaseConfig = makeBuildBaseConfig(fs);


        //Make sure all paths are relative to current directory.

        absFilePath = fs.absPath('.');
        build.makeAbsConfig(cfg, absFilePath,fs);
        build.makeAbsConfig(buildBaseConfig, absFilePath,fs);

        lang.mixin(config, buildBaseConfig);
        lang.mixin(config, cfg, true);


        //Set up log level early since it can affect if errors are thrown
        //or caught and passed to errbacks, even while constructing config.
        if (lang.hasProp(config, 'logLevel')) {
            logger.logLevel(config.logLevel);
        }

        if (config.buildFile) {
            //A build file exists, load it to get more config.
            buildFile = fs.absPath(config.buildFile);

            //Find the build file, and make sure it exists, if this is a build
            //that has a build profile, and not just command line args with an in=path
            if (!fs.exists(buildFile)) {
                throw new Error("ERROR: build file does not exist: " + buildFile);
            }

            absFilePath = config.baseUrl = fs.absPath(fs.parent(buildFile));

            //Load build file options.
            buildFileContents = fs.readFile(buildFile);
            try {
                //Be a bit lenient in the file ending in a ; or ending with
                //a //# sourceMappingUrl comment, mostly for compiled languages
                //that create a config, like typescript.
                buildFileContents = buildFileContents
                                    .replace(/\/\/\#[^\n\r]+[\n\r]*$/, '')
                                    .trim()
                                    .replace(/;$/, '');

                buildFileConfig = eval("(" + buildFileContents + ")");
                build.makeAbsConfig(buildFileConfig, absFilePath,fs);

                //Mix in the config now so that items in mainConfigFile can
                //be resolved relative to them if necessary, like if appDir
                //is set here, but the baseUrl is in mainConfigFile. Will
                //re-mix in the same build config later after mainConfigFile
                //is processed, since build config should take priority.
                mixConfig(config, buildFileConfig);
            } catch (e) {
                throw new Error("Build file " + buildFile + " is malformed: " + e);
            }
        }

        mainConfigFile = config.mainConfigFile || (buildFileConfig && buildFileConfig.mainConfigFile);
        if (mainConfigFile) {
            if (typeof mainConfigFile === 'string') {
                mainConfigFile = [mainConfigFile];
            }

            mainConfigFile.forEach(function (configFile) {
                configFile = build.makeAbsPath(configFile, absFilePath,fs);
                if (!fs.exists(configFile)) {
                    throw new Error(configFile + ' does not exist.');
                }
                try {
                    mainConfig = parse.findConfig(fs.readFile(configFile)).config;
                } catch (configError) {
                    throw new Error('The config in mainConfigFile ' +
                            configFile +
                            ' cannot be used because it cannot be evaluated' +
                            ' correctly while running in the optimizer. Try only' +
                            ' using a config that is also valid JSON, or do not use' +
                            ' mainConfigFile and instead copy the config values needed' +
                            ' into a build file or command line arguments given to the optimizer.\n' +
                            'Source error from parsing: ' + configFile + ': ' + configError);
                }
                if (mainConfig) {
                    mainConfigPath = configFile.substring(0, configFile.lastIndexOf('/'));

                    //Add in some existing config, like appDir, since they can be
                    //used inside the configFile -- paths and baseUrl are
                    //relative to them.
                    if (config.appDir && !mainConfig.appDir) {
                        mainConfig.appDir = config.appDir;
                    }

                    //If no baseUrl, then use the directory holding the main config.
                    if (!mainConfig.baseUrl) {
                        mainConfig.baseUrl = mainConfigPath;
                    }

                    build.makeAbsConfig(mainConfig, mainConfigPath,fs);
                    mixConfig(config, mainConfig);
                }
            });
        }

        //Mix in build file config, but only after mainConfig has been mixed in.
        //Since this is a re-application, skip array merging.
        if (buildFileConfig) {
            mixConfig(config, buildFileConfig, true);
        }

        //Re-apply the override config values. Command line
        //args should take precedence over build file values.
        //Since this is a re-application, skip array merging.
        mixConfig(config, cfg, true);

        //Fix paths to full paths so that they can be adjusted consistently
        //lately to be in the output area.
        lang.eachProp(config.paths, function (value, prop) {
            if (lang.isArray(value)) {
                throw new Error('paths fallback not supported in optimizer. ' +
                                'Please provide a build config path override ' +
                                'for ' + prop);
            }
            config.paths[prop] = build.makeAbsPath(value, config.baseUrl,fs);
        });

        //Set final output dir
        if (hasProp(config, "baseUrl")) {
            if (config.appDir) {
                if (!config.originalBaseUrl) {
                    throw new Error('Please set a baseUrl in the build config');
                }
                config.dirBaseUrl = build.makeAbsPath(config.originalBaseUrl, config.dir,fs);
            } else {
                config.dirBaseUrl = config.dir || config.baseUrl;
            }
            //Make sure dirBaseUrl ends in a slash, since it is
            //concatenated with other strings.
            config.dirBaseUrl = endsWithSlash(config.dirBaseUrl);
        }

        if (config.bundlesConfigOutFile) {
            if (!config.dir) {
                throw new Error('bundlesConfigOutFile can only be used with optimizations ' +
                                'that use "dir".');
            }
            config.bundlesConfigOutFile = build.makeAbsPath(config.bundlesConfigOutFile, config.dir,fs);
        }

        //If out=stdout, write output to STDOUT instead of a file.
        ///if (config.out && config.out === 'stdout') {
        ///    config.out = function (content) {
        ///        var e = env.get();
        ///        if (e === 'rhino') {
        ///            var out = new java.io.PrintStream(java.lang.System.out, true, 'UTF-8');
        ///            out.println(content);
        ///        } else if (e === 'node') {
        ///            process.stdout.write(content, 'utf8');
        ///        } else {
        ///            console.log(content);
        ///        }
        ///    };
        ///}

        //Check for errors in config
        if (config.main) {
            throw new Error('"main" passed as an option, but the ' +
                            'supported option is called "name".');
        }
        if (config.out && !config.name && !config.modules && !config.include &&
                !config.cssIn) {
            throw new Error('Missing either a "name", "include" or "modules" ' +
                            'option');
        }
        if (config.cssIn) {
            if (config.dir || config.appDir) {
                throw new Error('cssIn is only for the output of single file ' +
                    'CSS optimizations and is not compatible with "dir" or "appDir" configuration.');
            }
            if (!config.out) {
                throw new Error('"out" option missing.');
            }
        }
        if (!config.cssIn && !config.baseUrl) {
            //Just use the current directory as the baseUrl
            config.baseUrl = './';
        }
        if (!config.out && !config.dir) {
            throw new Error('Missing either an "out" or "dir" config value. ' +
                            'If using "appDir" for a full project optimization, ' +
                            'use "dir". If you want to optimize to one file, ' +
                            'use "out".');
        }
        if (config.appDir && config.out) {
            throw new Error('"appDir" is not compatible with "out". Use "dir" ' +
                            'instead. appDir is used to copy whole projects, ' +
                            'where "out" with "baseUrl" is used to just ' +
                            'optimize to one file.');
        }
        if (config.out && config.dir) {
            throw new Error('The "out" and "dir" options are incompatible.' +
                            ' Use "out" if you are targeting a single file' +
                            ' for optimization, and "dir" if you want the appDir' +
                            ' or baseUrl directories optimized.');
        }


        if (config.dir) {
            // Make sure the output dir is not set to a parent of the
            // source dir or the same dir, as it will result in source
            // code deletion.
            if (!config.allowSourceOverwrites && (config.dir === config.baseUrl ||
                config.dir === config.appDir ||
                (config.baseUrl && build.makeRelativeFilePath(config.dir,
                                           config.baseUrl,fs).indexOf('..') !== 0) ||
                (config.appDir &&
                    build.makeRelativeFilePath(config.dir, config.appDir,fs).indexOf('..') !== 0))) {
                throw new Error('"dir" is set to a parent or same directory as' +
                                ' "appDir" or "baseUrl". This can result in' +
                                ' the deletion of source code. Stopping. If' +
                                ' you want to allow possible overwriting of' +
                                ' source code, set "allowSourceOverwrites"' +
                                ' to true in the build config, but do so at' +
                                ' your own risk. In that case, you may want' +
                                ' to also set "keepBuildDir" to true.');
            }
        }

        if (config.insertRequire && !lang.isArray(config.insertRequire)) {
            throw new Error('insertRequire should be a list of module IDs' +
                            ' to insert in to a require([]) call.');
        }

        //Support older configs with uglify2 settings, but now that uglify1 has
        //been removed, just translate it to 'uglify' settings.
        if (config.optimize === 'uglify2') {
            config.optimize = 'uglify';
        }
        if (config.uglify2) {
            config.uglify = config.uglify2;
            delete config.uglify2;
        }

        if (config.generateSourceMaps) {
            if (config.preserveLicenseComments && !(config.optimize === 'none' || config.optimize === 'uglify')) {
                throw new Error('Cannot use preserveLicenseComments and ' +
                    'generateSourceMaps together, unless optimize is set ' +
                    'to \'uglify\'. Either explicitly set preserveLicenseComments ' +
                    'to false (default is true) or turn off generateSourceMaps. ' +
                    'If you want source maps with license comments, see: ' +
                    'http://requirejs.org/docs/errors.html#sourcemapcomments');
            } else if (config.optimize !== 'none' &&
                       config.optimize !== 'closure' &&
                       config.optimize !== 'uglify') {
                //Allow optimize: none to pass, since it is useful when toggling
                //minification on and off to debug something, and it implicitly
                //works, since it does not need a source map.
                throw new Error('optimize: "' + config.optimize +
                    '" does not support generateSourceMaps.');
            }
        }

        if ((config.name || config.include) && !config.modules) {
            //Just need to build one file, but may be part of a whole appDir/
            //baseUrl copy, but specified on the command line, so cannot do
            //the modules array setup. So create a modules section in that
            //case.
            config.modules = [
                {
                    name: config.name,
                    out: config.out,
                    create: config.create,
                    include: config.include,
                    exclude: config.exclude,
                    excludeShallow: config.excludeShallow,
                    insertRequire: config.insertRequire,
                    stubModules: config.stubModules
                }
            ];
            delete config.stubModules;
        } else if (config.modules && config.out) {
            throw new Error('If the "modules" option is used, then there ' +
                            'should be a "dir" option set and "out" should ' +
                            'not be used since "out" is only for single file ' +
                            'optimization output.');
        } else if (config.modules && config.name) {
            throw new Error('"name" and "modules" options are incompatible. ' +
                            'Either use "name" if doing a single file ' +
                            'optimization, or "modules" if you want to target ' +
                            'more than one file for optimization.');
        }

        if (config.out && !config.cssIn) {
            //Just one file to optimize.

            //Does not have a build file, so set up some defaults.
            //Optimizing CSS should not be allowed, unless explicitly
            //asked for on command line. In that case the only task is
            //to optimize a CSS file.
            if (!cfg.optimizeCss) {
                config.optimizeCss = "none";
            }
        }

        //Normalize cssPrefix
        if (config.cssPrefix) {
            //Make sure cssPrefix ends in a slash
            config.cssPrefix = endsWithSlash(config.cssPrefix);
        } else {
            config.cssPrefix = '';
        }

        //Cycle through modules and normalize
        if (config.modules && config.modules.length) {
            config.modules.forEach(function (mod) {
                if (lang.isArray(mod) || typeof mod === 'string' || !mod) {
                    throw new Error('modules config item is malformed: it should' +
                                    ' be an object with a \'name\' property.');
                }

                //Combine any local stubModules with global values.
                if (config.stubModules) {
                    mod.stubModules = config.stubModules.concat(mod.stubModules || []);
                }

                //Create a hash lookup for the stubModules config to make lookup
                //cheaper later.
                if (mod.stubModules) {
                    mod.stubModules._byName = {};
                    mod.stubModules.forEach(function (id) {
                        mod.stubModules._byName[id] = true;
                    });
                }

                // Legacy command support, which allowed a single string ID
                // for include.
                if (typeof mod.include === 'string') {
                    mod.include = [mod.include];
                }

                //Allow wrap config in overrides, but normalize it.
                if (mod.override) {
                    normalizeWrapConfig(mod.override, absFilePath);
                }
            });
        }

        normalizeWrapConfig(config, absFilePath);

        //Do final input verification
        if (config.context) {
            throw new Error('The build argument "context" is not supported' +
                            ' in a build. It should only be used in web' +
                            ' pages.');
        }

        //Set up normalizeDirDefines. If not explicitly set, if optimize "none",
        //set to "skip" otherwise set to "all".
        if (!hasProp(config, 'normalizeDirDefines')) {
            if (config.optimize === 'none' || config.skipDirOptimize) {
                config.normalizeDirDefines = 'skip';
            } else {
                config.normalizeDirDefines = 'all';
            }
        }

        //Set fs.fileExclusionRegExp if desired
        if (hasProp(config, 'fileExclusionRegExp')) {
            if (typeof config.fileExclusionRegExp === "string") {
                fs.exclusionRegExp = new RegExp(config.fileExclusionRegExp);
            } else {
                fs.exclusionRegExp = config.fileExclusionRegExp;
            }
        } else if (hasProp(config, 'dirExclusionRegExp')) {
            //Set fs.dirExclusionRegExp if desired, this is the old
            //name for fileExclusionRegExp before 1.0.2. Support for backwards
            //compatibility
            fs.exclusionRegExp = config.dirExclusionRegExp;
        }

        //Track the deps, but in a different key, so that they are not loaded
        //as part of config seeding before all config is in play (#648). Was
        //going to merge this in with "include", but include is added after
        //the "name" target. To preserve what r.js has done previously, make
        //sure "deps" comes before the "name".
        if (config.deps) {
            config._depsInclude = config.deps;
        }


        //Remove things that may cause problems in the build.
        //deps already merged above
        delete config.deps;
        delete config.jQuery;
        delete config.enforceDefine;
        delete config.urlArgs;

        return config;
    };

    /**
     * finds the module being built/optimized with the given moduleName,
     * or returns null.
     * @param {String} moduleName
     * @param {Array} modules
     * @returns {Object} the module object from the build profile, or null.
     */
    build.findBuildModule = function (moduleName, modules) {
        var i, module;
        for (i = 0; i < modules.length; i++) {
            module = modules[i];
            if (module.name === moduleName) {
                return module;
            }
        }
        return null;
    };

    /**
     * Removes a module name and path from a layer, if it is supposed to be
     * excluded from the layer.
     * @param {String} moduleName the name of the module
     * @param {String} path the file path for the module
     * @param {Object} layer the layer to remove the module/path from
     */
    build.removeModulePath = function (module, path, layer) {
        var index = layer.buildFilePaths.indexOf(path);
        if (index !== -1) {
            layer.buildFilePaths.splice(index, 1);
        }
    };

    /**
     * Uses the module build config object to trace the dependencies for the
     * given module.
     *
     * @param {Object} module the module object from the build config info.
     * @param {Object} config the build config object.
     * @param {Object} [baseLoaderConfig] the base loader config to use for env resets.
     *
     * @returns {Object} layer information about what paths and modules should
     * be in the flattened module.
     */
    build.traceDependencies = function (module, config, baseLoaderConfig) {
        var include, override, layer, context, oldContext,
            rawTextByIds,
            syncChecks = {
                rhino: true,
                node: true,
                xpconnect: true
            },
            deferred = prim();

        //Reset some state set up in requirePatch.js, and clean up require's
        //current context.
        oldContext = require._buildReset();

        //Grab the reset layer and context after the reset, but keep the
        //old config to reuse in the new context.
        layer = require._layer;
        context = layer.context;

        //Put back basic config, use a fresh object for it.
        if (baseLoaderConfig) {
            require(copyConfig(baseLoaderConfig));
        }

        logger.trace("\nTracing dependencies for: " + (module.name ||
                     (typeof module.out === 'function' ? 'FUNCTION' : module.out)));
        include = config._depsInclude ||  [];
        include = include.concat(module.name && !module.create ? [module.name] : []);
        if (module.include) {
            include = include.concat(module.include);
        }

        //If there are overrides to basic config, set that up now.;
        if (module.override) {
            if (baseLoaderConfig) {
                override = build.createOverrideConfig(baseLoaderConfig, module.override);
            } else {
                override = copyConfig(module.override);
            }
            require(override);
        }

        //Now, populate the rawText cache with any values explicitly passed in
        //via config.
        rawTextByIds = require.s.contexts._.config.rawText;
        if (rawTextByIds) {
            lang.eachProp(rawTextByIds, function (contents, id) {
                var url = require.toUrl(id) + '.js';
                require._cachedRawText[url] = contents;
            });
        }


        //Configure the callbacks to be called.
        deferred.reject.__requireJsBuild = true;

        //Use a wrapping function so can check for errors.
        function includeFinished(value) {
            //If a sync build environment, check for errors here, instead of
            //in the then callback below, since some errors, like two IDs pointed
            //to same URL but only one anon ID will leave the loader in an
            //unresolved state since a setTimeout cannot be used to check for
            //timeout.
            var hasError = false;
            if (syncChecks[config.env.name]) {
                try {
                    build.checkForErrors(context, layer);
                } catch (e) {
                    hasError = true;
                    deferred.reject(e);
                }
            }

            if (!hasError) {
                deferred.resolve(value);
            }
        }
        includeFinished.__requireJsBuild = true;

        //Figure out module layer dependencies by calling require to do the work.
        require(include, includeFinished, deferred.reject);

        // If a sync env, then with the "two IDs to same anon module path"
        // issue, the require never completes, need to check for errors
        // here.
        if (syncChecks[config.env.name]) {
            build.checkForErrors(context, layer);
        }

        return deferred.promise.then(function () {
            //Reset config
            if (module.override && baseLoaderConfig) {
                require(copyConfig(baseLoaderConfig));
            }

            build.checkForErrors(context, layer);

            return layer;
        });
    };

    build.checkForErrors = function (context, layer) {
        //Check to see if it all loaded. If not, then throw, and give
        //a message on what is left.
        var id, prop, mod, idParts, pluginId, pluginResources,
            errMessage = '',
            failedPluginMap = {},
            failedPluginIds = [],
            errIds = [],
            errUrlMap = {},
            errUrlConflicts = {},
            hasErrUrl = false,
            hasUndefined = false,
            defined = context.defined,
            registry = context.registry;

        function populateErrUrlMap(id, errUrl, skipNew) {
            // Loader plugins do not have an errUrl, so skip them.
            if (!errUrl) {
                return;
            }

            if (!skipNew) {
                errIds.push(id);
            }

            if (errUrlMap[errUrl]) {
                hasErrUrl = true;
                //This error module has the same URL as another
                //error module, could be misconfiguration.
                if (!errUrlConflicts[errUrl]) {
                    errUrlConflicts[errUrl] = [];
                    //Store the original module that had the same URL.
                    errUrlConflicts[errUrl].push(errUrlMap[errUrl]);
                }
                errUrlConflicts[errUrl].push(id);
            } else if (!skipNew) {
                errUrlMap[errUrl] = id;
            }
        }

        for (id in registry) {
            if (hasProp(registry, id) && id.indexOf('_@r') !== 0) {
                hasUndefined = true;
                mod = getOwn(registry, id);
                idParts = id.split('!');
                pluginId = idParts[0];

                if (id.indexOf('_unnormalized') === -1 && mod && mod.enabled) {
                    populateErrUrlMap(id, mod.map.url);
                }

                //Look for plugins that did not call load()
                //But skip plugin IDs that were already inlined and called
                //define() with a name.
                if (!hasProp(layer.modulesWithNames, id) && idParts.length > 1) {
                    if (falseProp(failedPluginMap, pluginId)) {
                        failedPluginIds.push(pluginId);
                    }
                    pluginResources = failedPluginMap[pluginId];
                    if (!pluginResources) {
                        pluginResources = failedPluginMap[pluginId] = [];
                    }
                    pluginResources.push(id + (mod.error ? ': ' + mod.error : ''));
                }
            }
        }

        // If have some modules that are not defined/stuck in the registry,
        // then check defined modules for URL overlap.
        if (hasUndefined) {
            for (id in defined) {
                if (hasProp(defined, id) && id.indexOf('!') === -1) {
                    populateErrUrlMap(id, require.toUrl(id) + '.js', true);
                }
            }
        }

        if (errIds.length || failedPluginIds.length) {
            if (failedPluginIds.length) {
                errMessage += 'Loader plugin' +
                    (failedPluginIds.length === 1 ? '' : 's') +
                    ' did not call ' +
                    'the load callback in the build:\n' +
                    failedPluginIds.map(function (pluginId) {
                        var pluginResources = failedPluginMap[pluginId];
                        return pluginId + ':\n  ' + pluginResources.join('\n  ');
                    }).join('\n') + '\n';
            }
            errMessage += 'Module loading did not complete for: ' + errIds.join(', ');

            if (hasErrUrl) {
                errMessage += '\nThe following modules share the same URL. This ' +
                              'could be a misconfiguration if that URL only has ' +
                              'one anonymous module in it:';
                for (prop in errUrlConflicts) {
                    if (hasProp(errUrlConflicts, prop)) {
                        errMessage += '\n' + prop + ': ' +
                                      errUrlConflicts[prop].join(', ');
                    }
                }
            }
            throw new Error(errMessage);
        }
    };

    build.createOverrideConfig = function (config, override) {
        var cfg = copyConfig(config),
            oride = copyConfig(override);

        lang.eachProp(oride, function (value, prop) {
            if (hasProp(build.objProps, prop)) {
                //An object property, merge keys. Start a new object
                //so that source object in config does not get modified.
                cfg[prop] = {};
                lang.mixin(cfg[prop], config[prop], true);
                lang.mixin(cfg[prop], override[prop], true);
            } else {
                cfg[prop] = override[prop];
            }
        });

        return cfg;
    };

    /**
     * Uses the module build config object to create an flattened version
     * of the module, with deep dependencies included.
     *
     * @param {Object} module the module object from the build config info.
     *
     * @param {Object} layer the layer object returned from build.traceDependencies.
     *
     * @param {Object} the build config object.
     *
     * @returns {Object} with two properties: "text", the text of the flattened
     * module, and "buildText", a string of text representing which files were
     * included in the flattened module text.
     */
    build.flattenModule = function (module, layer, config) {
        var fileContents, sourceMapGenerator,
            sourceMapBase,
            buildFileContents = '',
            fs = config.env.fs;

        return prim().start(function () {
            var reqIndex, currContents, fileForSourceMap,
                moduleName, shim, packageName,
                parts, builder, writeApi,
                namespace, namespaceWithDot, stubModulesByName,
                context = layer.context,
                onLayerEnds = [],
                onLayerEndAdded = {},
                pkgsMainMap = {};

            //Use override settings, particularly for pragmas
            //Do this before the var readings since it reads config values.
            if (module.override) {
                config = build.createOverrideConfig(config, module.override);
            }

            namespace = config.namespace || '';
            namespaceWithDot = namespace ? namespace + '.' : '';
            stubModulesByName = (module.stubModules && module.stubModules._byName) || {};

            //Start build output for the module.
            module.onCompleteData = {
                name: module.name,
                path: (config.dir ? module._buildPath.replace(config.dir, "") : module._buildPath),
                included: []
            };

            buildFileContents += "\n" +
                                  module.onCompleteData.path +
                                 "\n----------------\n";

            //If there was an existing file with require in it, hoist to the top.
            if (layer.existingRequireUrl) {
                reqIndex = layer.buildFilePaths.indexOf(layer.existingRequireUrl);
                if (reqIndex !== -1) {
                    layer.buildFilePaths.splice(reqIndex, 1);
                    layer.buildFilePaths.unshift(layer.existingRequireUrl);
                }
            }

            if (config.generateSourceMaps) {
                sourceMapBase = config.dir || config.baseUrl;
                if (module._buildPath === 'FUNCTION') {
                    fileForSourceMap = (module.name || module.include[0] || 'FUNCTION') + '.build.js';
                } else if (config.out) {
                    fileForSourceMap = module._buildPath.split('/').pop();
                } else {
                    fileForSourceMap = module._buildPath.replace(sourceMapBase, '');
                }
                sourceMapGenerator = new SourceMapGenerator({
                    file: fileForSourceMap
                });
            }

            //Create a reverse lookup for packages main module IDs to their package
            //names, useful for knowing when to write out define() package main ID
            //adapters.
            lang.eachProp(layer.context.config.pkgs, function(value, prop) {
                pkgsMainMap[value] = prop;
            });

            //Write the built module to disk, and build up the build output.
            fileContents = "";
            if (config.wrap && config.wrap.__startMap) {
                config.wrap.__startMap.forEach(function (wrapFunction) {
                    fileContents = wrapFunction(fileContents, config, sourceMapGenerator);
                });
            }

            return prim.serial(layer.buildFilePaths.map(function (path) {
                return function () {
                    var singleContents = '';

                    moduleName = layer.buildFileToModule[path];

                    //If the moduleName is a package main, then hold on to the
                    //packageName in case an adapter needs to be written.
                    packageName = getOwn(pkgsMainMap, moduleName);

                    return prim().start(function () {
                        //Figure out if the module is a result of a build plugin, and if so,
                        //then delegate to that plugin.
                        parts = context.makeModuleMap(moduleName);
                        builder = parts.prefix && getOwn(context.defined, parts.prefix);
                        if (builder) {
                            if (builder.onLayerEnd && falseProp(onLayerEndAdded, parts.prefix)) {
                                onLayerEnds.push(builder);
                                onLayerEndAdded[parts.prefix] = true;
                            }

                            if (builder.write) {
                                writeApi = function (input) {
                                    singleContents += "\n" + addSemiColon(input, config);
                                    if (config.onBuildWrite) {
                                        singleContents = config.onBuildWrite(moduleName, path, singleContents);
                                    }
                                };
                                writeApi.asModule = function (moduleName, input) {
                                    singleContents += "\n" +
                                        addSemiColon(build.toTransport(namespace, moduleName, path, input, layer, {
                                            useSourceUrl: layer.context.config.useSourceUrl
                                        }), config);
                                    if (config.onBuildWrite) {
                                        singleContents = config.onBuildWrite(moduleName, path, singleContents);
                                    }
                                };

                                builder.write(parts.prefix, parts.name, writeApi, {
                                    name: module.onCompleteData.name,
                                    path: module.onCompleteData.path
                                });
                            }
                            return;
                        } else {
                            return prim().start(function () {
                                if (hasProp(stubModulesByName, moduleName)) {
                                    //Just want to insert a simple module definition instead
                                    //of the source module. Useful for plugins that inline
                                    //all their resources.
                                    if (hasProp(layer.context.plugins, moduleName)) {
                                        //Slightly different content for plugins, to indicate
                                        //that dynamic loading will not work.
                                        return 'define({load: function(id){throw new Error("Dynamic load not allowed: " + id);}});';
                                    } else {
                                        return 'define({});';
                                    }
                                } else {
                                    return require._cacheReadAsync(path,undefined,fs);
                                }
                            }).then(function (text) {
                                var hasPackageName;

                                currContents = text;

                                if (config.cjsTranslate &&
                                    (!config.shim || !lang.hasProp(config.shim, moduleName))) {
                                    currContents = commonJs.convert(path, currContents);
                                }

                                if (config.onBuildRead) {
                                    currContents = config.onBuildRead(moduleName, path, currContents);
                                }

                                if (packageName) {
                                    hasPackageName = (packageName === parse.getNamedDefine(currContents));
                                }

                                if (namespace) {
                                    currContents = pragma.namespace(currContents, namespace);
                                }

                                currContents = build.toTransport(namespace, moduleName, path, currContents, layer, {
                                    useSourceUrl: config.useSourceUrl
                                });

                                if (packageName && !hasPackageName) {
                                    currContents = addSemiColon(currContents, config) + '\n';
                                    currContents += namespaceWithDot + "define('" +
                                                    packageName + "', ['" + moduleName +
                                                    "'], function (main) { return main; });\n";
                                }

                                if (config.onBuildWrite) {
                                    currContents = config.onBuildWrite(moduleName, path, currContents);
                                }

                                //Semicolon is for files that are not well formed when
                                //concatenated with other content.
                                singleContents += addSemiColon(currContents, config);
                            });
                        }
                    }).then(function () {
                        var shimDeps, shortPath = path.replace(config.dir, "");

                        module.onCompleteData.included.push(shortPath);
                        buildFileContents += shortPath + "\n";

                        //Some files may not have declared a require module, and if so,
                        //put in a placeholder call so the require does not try to load them
                        //after the module is processed.
                        //If we have a name, but no defined module, then add in the placeholder.
                        if (moduleName && falseProp(layer.modulesWithNames, moduleName) && !config.skipModuleInsertion) {
                            shim = config.shim && (getOwn(config.shim, moduleName) || (packageName && getOwn(config.shim, packageName)));
                            if (shim) {
                                shimDeps = lang.isArray(shim) ? shim : shim.deps;
                                if (config.wrapShim) {

                                    singleContents = '(function(root) {\n' +
                                                     namespaceWithDot + 'define("' + moduleName + '", ' +
                                                     (shimDeps && shimDeps.length ?
                                                            build.makeJsArrayString(shimDeps) + ', ' : '[], ') +
                                                    'function() {\n' +
                                                    '  return (function() {\n' +
                                                             singleContents +
                                                             // Start with a \n in case last line is a comment
                                                             // in the singleContents, like a sourceURL comment.
                                                             '\n' + (shim.exportsFn ? shim.exportsFn() : '') +
                                                             '\n' +
                                                    '  }).apply(root, arguments);\n' +
                                                    '});\n' +
                                                    '}(this));\n';
                                } else {
                                    singleContents += '\n' + namespaceWithDot + 'define("' + moduleName + '", ' +
                                                     (shimDeps && shimDeps.length ?
                                                            build.makeJsArrayString(shimDeps) + ', ' : '') +
                                                     (shim.exportsFn ? shim.exportsFn() : 'function(){}') +
                                                     ');\n';
                                }
                            } else {
                                singleContents += '\n' + namespaceWithDot + 'define("' + moduleName + '", function(){});\n';
                            }
                        }

                        //Add line break at end of file, instead of at beginning,
                        //so source map line numbers stay correct, but still allow
                        //for some space separation between files in case ASI issues
                        //for concatenation would cause an error otherwise.
                        singleContents += '\n';

                        //Add to the source map and to the final contents
                        fileContents = appendToFileContents(fileContents, singleContents, path, config, module,
                                                            sourceMapGenerator);
                    });
                };
            })).then(function () {
                if (onLayerEnds.length) {
                    onLayerEnds.forEach(function (builder, index) {
                        var path;
                        if (typeof module.out === 'string') {
                            path = module.out;
                        } else if (typeof module._buildPath === 'string') {
                            path = module._buildPath;
                        }
                        builder.onLayerEnd(function (input) {
                            fileContents =
                                appendToFileContents(fileContents, "\n" + addSemiColon(input, config),
                                                     'onLayerEnd' + index + '.js', config, module, sourceMapGenerator);
                        }, {
                            name: module.name,
                            path: path
                        });
                    });
                }

                if (module.create) {
                    //The ID is for a created layer. Write out
                    //a module definition for it in case the
                    //built file is used with enforceDefine
                    //(#432)
                    fileContents =
                        appendToFileContents(fileContents, '\n' + namespaceWithDot + 'define("' + module.name +
                                                           '", function(){});\n', 'module-create.js', config, module,
                                             sourceMapGenerator);
                }

                //Add a require at the end to kick start module execution, if that
                //was desired. Usually this is only specified when using small shim
                //loaders like almond.
                if (module.insertRequire) {
                    fileContents =
                        appendToFileContents(fileContents, '\n' + namespaceWithDot + 'require(["' + module.insertRequire.join('", "') +
                                                           '"]);\n', 'module-insertRequire.js', config, module,
                                             sourceMapGenerator);
                }
            });
        }).then(function () {
            if (config.wrap && config.wrap.__endMap) {
                config.wrap.__endMap.forEach(function (wrapFunction) {
                    fileContents = wrapFunction(fileContents, config, sourceMapGenerator);
                });
            }
            return {
                text: fileContents,
                buildText: buildFileContents,
                sourceMap: sourceMapGenerator ?
                              JSON.stringify(sourceMapGenerator.toJSON(), null, '  ') :
                              undefined
            };
        });
    };

    //Converts an JS array of strings to a string representation.
    //Not using JSON.stringify() for Rhino's sake.
    build.makeJsArrayString = function (ary) {
        return '["' + ary.map(function (item) {
            //Escape any double quotes, backslashes
            return lang.jsEscape(item);
        }).join('","') + '"]';
    };

    build.toTransport = function (namespace, moduleName, path, contents, layer, options) {
        var baseUrl = layer && layer.context.config.baseUrl;

        function onFound(info) {
            //Only mark this module as having a name if not a named module,
            //or if a named module and the name matches expectations.
            if (layer && (info.needsId || info.foundId === moduleName)) {
                layer.modulesWithNames[moduleName] = true;
            }
        }

        //Convert path to be a local one to the baseUrl, useful for
        //useSourceUrl.
        if (baseUrl) {
            path = path.replace(baseUrl, '');
        }

        return transform.toTransport(namespace, moduleName, path, contents, onFound, options);
    };

    return require.build = build;
});

define('skylark-rjs/main',[
    "./rjs",
    "./build",
    "./lang",
    "./prim",
    "./logger",
    "./parse",
    "./optimize",
    "./pragma",
    "./transform",
    "./requirePatch",
    "./commonJs",
    "./source-map"
],function (
    rjs,
    build,
    lang,
    prim,
    logger,
    parse,
    optimize,
    pragma,
    transform,
    requirePatch,
    commonJs,
    sourceMap,
    createRjsApi

) {
    'use strict';

    /*return {
    	build,
    	lang,
    	prim,
    	logger,
    	parse,
    	optimize,
    	pragma,
    	transform,
    	requirePatch,
    	commonJs,
    	sourceMap,
    }
    */
    return rjs;
	
});
define('skylark-rjs', ['skylark-rjs/main'], function (main) { return main; });


},this,define,require);
//# sourceMappingURL=sourcemaps/skylark-rjs.js.map
