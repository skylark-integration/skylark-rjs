/*global define, Reflect */

/*
 * xpcshell has a smaller stack on linux and windows (1MB vs 9MB on mac),
 * and the recursive nature of esprima can cause it to overflow pretty
 * quickly. So favor it built in Reflect parser:
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
 */
define(['skylark-espree'], function (esprima) {
    return esprima;
});
