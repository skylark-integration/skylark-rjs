/**
 * skylark-rjs - A version of rjs that ported to running on skylarkjs.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["./esprima","./parse","./logger","./lang"],function(e,n,t,r){"use strict";var i,a=/^([ \t]+)/,o=/\{[\r\n]+([ \t]+)/,s=/^[_A-Za-z]([A-Za-z\d_]*)$/,l={"\n":/\n/g,"\r\n":/\r\n/g};return i={toTransport:function(i,a,o,s,l,c){c=c||{};var u,p,f,g,d=0,y=!1,m=[],b=function(e){return c.useSourceUrl&&(e='eval("'+r.jsEscape(e)+"\\n//# sourceURL="+(0===o.indexOf("/")?"":"/")+o+'");\n'),e};try{u=e.parse(s,{loc:!0})}catch(e){return t.trace("toTransport skipping "+o+": "+e.toString()),s}return n.traverse(u,function(e){var r,a,s,l,c,u,p,f,b;if("VariableDeclarator"===e.type&&e.id&&"define"===e.id.name&&"Identifier"===e.id.type&&!((p=e.init)&&p.callee&&"CallExpression"===p.callee.type&&p.callee.callee&&"Identifier"===p.callee.callee.type&&"require"===p.callee.callee.name&&p.callee.arguments&&1===p.callee.arguments.length&&"Literal"===p.callee.arguments[0].type&&p.callee.arguments[0].value&&-1!==p.callee.arguments[0].value.indexOf("amdefine")))return!1;if((b=i&&"CallExpression"===e.type&&e.callee&&e.callee.object&&"Identifier"===e.callee.object.type&&e.callee.object.name===i&&"Identifier"===e.callee.property.type&&"define"===e.callee.property.name)||n.isDefineNodeWithArgs(e)){if(!(r=e.arguments)||!r.length)return;if(s=(a=r[0]).loc,1===r.length)"Identifier"===a.type?(c=!0,u="empty"):n.isFnExpression(a)?(l=a,c=!0,u="scan"):"ObjectExpression"===a.type?(c=!0,u="skip"):"Literal"===a.type&&"number"==typeof a.value?(c=!0,u="skip"):"UnaryExpression"===a.type&&"-"===a.operator&&a.argument&&"Literal"===a.argument.type&&"number"==typeof a.argument.value?(c=!0,u="skip"):"MemberExpression"===a.type&&a.object&&a.property&&"Identifier"===a.property.type&&(c=!0,u="empty");else if("ArrayExpression"===a.type)c=!0,u="skip";else{if("Literal"!==a.type||"string"!=typeof a.value)return;c=!1,2===r.length&&n.isFnExpression(r[1])?(l=r[1],u="scan"):u="skip"}if((f={foundId:void 0,needsId:c,depAction:u,namespaceExists:b,node:e,defineLoc:e.loc,firstArgLoc:s,factoryNode:l,sourceUrlData:void 0}).needsId){if(g)return t.trace(o+" has more than one anonymous define. May be a built file from another build system like, Ender. Skipping normalization."),m=[],!1;g=f,m.push(f)}else"scan"===u&&((d+=1)>1?y||(m=g?[g]:[],y=!0):m.push(f))}}),m.length?(m.reverse(),p=s.split("\n"),f=function(e,n){var t=e.start.column,r=e.start.line-1,i=p[r];p[r]=i.substring(0,t)+n+i.substring(t,i.length)},m.forEach(function(e){var t,r="",o="";e.needsId&&a&&(r+="'"+a+"',"),"scan"===e.depAction&&(o=(t=n.getAnonDepsFromNode(e.factoryNode)).length?"["+t.map(function(e){return"'"+e+"'"})+"]":"[]",o+=",",e.factoryNode?f(e.factoryNode.loc,o):r+=o),r&&f(e.firstArgLoc,r),i&&!e.namespaceExists&&f(e.defineLoc,i+"."),l&&l(e)}),b(s=p.join("\n"))):b(s)},modifyConfig:function(e,t){var r=n.findConfig(e),a=r.config;return a&&(a=t(a))?i.serializeConfig(a,e,r.range[0],r.range[1],{quote:r.quote}):e},serializeConfig:function(e,n,t,r,s){var c,u,p,f="",g=n.substring(0,t),d=n.substring(t,r),y=-1===d.indexOf("\r")?"\n":"\r\n",m=g.lastIndexOf("\n");return-1===m&&(m=0),(u=a.exec(g.substring(m+1,t)))&&u[1]&&(f=u[1]),(u=o.exec(d))&&u[1]&&(c=u[1]),c=!c||c.length<f?"  ":c.substring(f.length),p=new RegExp("("+y+")"+c,"g"),g+function(e,n,t){var r=l[t];return e.replace(r,"$&"+n)}(i.objectToString(e,{indent:c,lineReturn:y,outDentRegExp:p,quote:s&&s.quote}),f,y)+n.substring(r)},objectToString:function(e,n,t){var a,o,l,c=!0,u="",p=n.lineReturn,f=n.indent,g=n.outDentRegExp,d=n.quote||'"';return l=(t=t||"")+f,null===e?u="null":void 0===e?u="undefined":"number"==typeof e||"boolean"==typeof e?u=e:"string"==typeof e?u=d+r.jsEscape(e)+d:r.isArray(e)?(r.each(e,function(e,t){u+=(0!==t?","+p:"")+l+i.objectToString(e,n,l)}),a="[",o="]"):r.isFunction(e)||r.isRegExp(e)?u=e.toString().replace(g,"$1"):(r.eachProp(e,function(e,t){u+=(c?"":","+p)+l+(s.test(t)?t:d+r.jsEscape(t)+d)+": "+i.objectToString(e,n,l),c=!1}),a="{",o="}"),a&&(u=a+p+u+p+t+o),u}}});
//# sourceMappingURL=sourcemaps/transform.js.map
