/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./esprima","./parse","./logger","./lang"],function(d,y,m,b){"use strict";var f,u=/^([ \t]+)/,g=/\{[\r\n]+([ \t]+)/,x=/^[_A-Za-z]([A-Za-z\d_]*)$/,h={"\n":/\n/g,"\r\n":/\r\n/g};return f={toTransport:function(l,i,c,n,a,t){t=t||{};function e(e){return e=t.useSourceUrl?'eval("'+b.jsEscape(e)+"\\n//# sourceURL="+(0===c.indexOf("/")?"":"/")+c+'");\n':e}var r,o,s,p,u=0,f=!1,g=[];try{r=d.parse(n,{loc:!0})}catch(e){return m.trace("toTransport skipping "+c+": "+e.toString()),n}return y.traverse(r,function(e){var n,t,r,i,a,o,s;if("VariableDeclarator"===e.type&&e.id&&"define"===e.id.name&&"Identifier"===e.id.type&&!((s=e.init)&&s.callee&&"CallExpression"===s.callee.type&&s.callee.callee&&"Identifier"===s.callee.callee.type&&"require"===s.callee.callee.name&&s.callee.arguments&&1===s.callee.arguments.length&&"Literal"===s.callee.arguments[0].type&&s.callee.arguments[0].value&&-1!==s.callee.arguments[0].value.indexOf("amdefine")))return!1;if(((s=l&&"CallExpression"===e.type&&e.callee&&e.callee.object&&"Identifier"===e.callee.object.type&&e.callee.object.name===l&&"Identifier"===e.callee.property.type&&"define"===e.callee.property.name)||y.isDefineNodeWithArgs(e))&&(n=e.arguments)&&n.length){if(t=(o=n[0]).loc,1===n.length)"Identifier"===o.type?(i=!0,a="empty"):y.isFnExpression(o)?(r=o,i=!0,a="scan"):"ObjectExpression"===o.type||"Literal"===o.type&&"number"==typeof o.value||"UnaryExpression"===o.type&&"-"===o.operator&&o.argument&&"Literal"===o.argument.type&&"number"==typeof o.argument.value?(i=!0,a="skip"):"MemberExpression"===o.type&&o.object&&o.property&&"Identifier"===o.property.type&&(i=!0,a="empty");else if("ArrayExpression"===o.type)i=!0,a="skip";else{if("Literal"!==o.type||"string"!=typeof o.value)return;i=!1,a=2===n.length&&y.isFnExpression(n[1])?(r=n[1],"scan"):"skip"}if((o={foundId:void 0,needsId:i,depAction:a,namespaceExists:s,node:e,defineLoc:e.loc,firstArgLoc:t,factoryNode:r,sourceUrlData:void 0}).needsId){if(p)return m.trace(c+" has more than one anonymous define. May be a built file from another build system like, Ender. Skipping normalization."),!(g=[]);p=o,g.push(o)}else"scan"===a&&(1<(u+=1)?f||(g=p?[p]:[],f=!0):g.push(o))}}),g.length&&(g.reverse(),o=n.split("\n"),s=function(e,n){var t=e.start.column,e=e.start.line-1,r=o[e];o[e]=r.substring(0,t)+n+r.substring(t,r.length)},g.forEach(function(e){var n,t="",r="";e.needsId&&i&&(t+="'"+i+"',"),"scan"===e.depAction&&(r=(n=y.getAnonDepsFromNode(e.factoryNode)).length?"["+n.map(function(e){return"'"+e+"'"})+"]":"[]",r+=",",e.factoryNode?s(e.factoryNode.loc,r):t+=r),t&&s(e.firstArgLoc,t),l&&!e.namespaceExists&&s(e.defineLoc,l+"."),a&&a(e)}),n=o.join("\n")),e(n)},modifyConfig:function(e,n){var t=y.findConfig(e),r=t.config;return(r=r&&n(r))?f.serializeConfig(r,e,t.range[0],t.range[1],{quote:t.quote}):e},serializeConfig:function(e,n,t,r,i){var a,o="",s=n.substring(0,t),l=n.substring(t,r),c=-1===l.indexOf("\r")?"\n":"\r\n",p=s.lastIndexOf("\n");return(p=u.exec(s.substring((p=-1===p?0:p)+1,t)))&&p[1]&&(o=p[1]),a=!(a=(p=g.exec(l))&&p[1]?p[1]:a)||a.length<o?"  ":a.substring(o.length),t=new RegExp("("+c+")"+a,"g"),l=f.objectToString(e,{indent:a,lineReturn:c,outDentRegExp:t,quote:i&&i.quote}),p=o,e=c,s+l.replace(h[e],"$&"+p)+n.substring(r)},objectToString:function(e,t,n){var r,i,a=!0,o="",s=t.lineReturn,l=t.indent,c=t.outDentRegExp,p=t.quote||'"',u=(n=n||"")+l;return null===e?o="null":void 0===e?o="undefined":"number"==typeof e||"boolean"==typeof e?o=e:"string"==typeof e?o=p+b.jsEscape(e)+p:b.isArray(e)?(b.each(e,function(e,n){o+=(0!==n?","+s:"")+u+f.objectToString(e,t,u)}),r="[",i="]"):b.isFunction(e)||b.isRegExp(e)?o=e.toString().replace(c,"$1"):(b.eachProp(e,function(e,n){o+=(a?"":","+s)+u+(x.test(n)?n:p+b.jsEscape(n)+p)+": "+f.objectToString(e,t,u),a=!1}),r="{",i="}"),o=r?r+s+o+s+n+i:o}}});
//# sourceMappingURL=sourcemaps/transform.js.map
