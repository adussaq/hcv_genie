/*! modernizr 3.3.1 (Custom Build) | MIT *
 * http://modernizr.com/download/?-blobconstructor-canvas-canvastext-datauri-eventlistener-fileinput-filereader-postmessage-promises-todataurljpeg_todataurlpng_todataurlwebp-webworkers-xhrresponsetypetext-setclasses !*/
!function(e,n,t){function a(e,n){return typeof e===n}function o(){var e,n,t,o,r,i,s;for(var d in f)if(f.hasOwnProperty(d)){if(e=[],n=f[d],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(t=0;t<n.options.aliases.length;t++)e.push(n.options.aliases[t].toLowerCase());for(o=a(n.fn,"function")?n.fn():n.fn,r=0;r<e.length;r++)i=e[r],s=i.split("."),1===s.length?Modernizr[s[0]]=o:(!Modernizr[s[0]]||Modernizr[s[0]]instanceof Boolean||(Modernizr[s[0]]=new Boolean(Modernizr[s[0]])),Modernizr[s[0]][s[1]]=o),u.push((o?"":"no-")+s.join("-"))}}function r(e){var n=c.className,t=Modernizr._config.classPrefix||"";if(l&&(n=n.baseVal),Modernizr._config.enableJSClass){var a=new RegExp("(^|\\s)"+t+"no-js(\\s|$)");n=n.replace(a,"$1"+t+"js$2")}Modernizr._config.enableClasses&&(n+=" "+t+e.join(" "+t),l?c.className.baseVal=n:c.className=n)}function i(){return"function"!=typeof n.createElement?n.createElement(arguments[0]):l?n.createElementNS.call(n,"http://www.w3.org/2000/svg",arguments[0]):n.createElement.apply(n,arguments)}function s(e,n){if("object"==typeof e)for(var t in e)A(e,t)&&s(t,e[t]);else{e=e.toLowerCase();var a=e.split("."),o=Modernizr[a[0]];if(2==a.length&&(o=o[a[1]]),"undefined"!=typeof o)return Modernizr;n="function"==typeof n?n():n,1==a.length?Modernizr[a[0]]=n:(!Modernizr[a[0]]||Modernizr[a[0]]instanceof Boolean||(Modernizr[a[0]]=new Boolean(Modernizr[a[0]])),Modernizr[a[0]][a[1]]=n),r([(n&&0!=n?"":"no-")+a.join("-")]),Modernizr._trigger(e,n)}return Modernizr}var u=[],f=[],d={_version:"3.3.1",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var t=this;setTimeout(function(){n(t[e])},0)},addTest:function(e,n,t){f.push({name:e,fn:n,options:t})},addAsyncTest:function(e){f.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=d,Modernizr=new Modernizr,Modernizr.addTest("blobconstructor",function(){try{return!!new Blob}catch(e){return!1}},{aliases:["blob-constructor"]}),Modernizr.addTest("postmessage","postMessage"in e),Modernizr.addTest("promises",function(){return"Promise"in e&&"resolve"in e.Promise&&"reject"in e.Promise&&"all"in e.Promise&&"race"in e.Promise&&function(){var n;return new e.Promise(function(e){n=e}),"function"==typeof n}()}),Modernizr.addTest("filereader",!!(e.File&&e.FileList&&e.FileReader)),Modernizr.addTest("webworkers","Worker"in e);var c=n.documentElement,l="svg"===c.nodeName.toLowerCase();Modernizr.addTest("canvas",function(){var e=i("canvas");return!(!e.getContext||!e.getContext("2d"))}),Modernizr.addTest("canvastext",function(){return Modernizr.canvas===!1?!1:"function"==typeof i("canvas").getContext("2d").fillText});var p=i("canvas");Modernizr.addTest("todataurljpeg",function(){return!!Modernizr.canvas&&0===p.toDataURL("image/jpeg").indexOf("data:image/jpeg")}),Modernizr.addTest("todataurlpng",function(){return!!Modernizr.canvas&&0===p.toDataURL("image/png").indexOf("data:image/png")}),Modernizr.addTest("todataurlwebp",function(){var e=!1;try{e=!!Modernizr.canvas&&0===p.toDataURL("image/webp").indexOf("data:image/webp")}catch(n){}return e}),Modernizr.addTest("fileinput",function(){if(navigator.userAgent.match(/(Android (1.0|1.1|1.5|1.6|2.0|2.1))|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/))return!1;var e=i("input");return e.type="file",!e.disabled}),Modernizr.addTest("eventlistener","addEventListener"in e);var g=function(e){if("undefined"==typeof XMLHttpRequest)return!1;var n=new XMLHttpRequest;n.open("get","/",!0);try{n.responseType=e}catch(t){return!1}return"response"in n&&n.responseType==e};Modernizr.addTest("xhrresponsetypetext",g("text"));var A;!function(){var e={}.hasOwnProperty;A=a(e,"undefined")||a(e.call,"undefined")?function(e,n){return n in e&&a(e.constructor.prototype[n],"undefined")}:function(n,t){return e.call(n,t)}}(),d._l={},d.on=function(e,n){this._l[e]||(this._l[e]=[]),this._l[e].push(n),Modernizr.hasOwnProperty(e)&&setTimeout(function(){Modernizr._trigger(e,Modernizr[e])},0)},d._trigger=function(e,n){if(this._l[e]){var t=this._l[e];setTimeout(function(){var e,a;for(e=0;e<t.length;e++)(a=t[e])(n)},0),delete this._l[e]}},Modernizr._q.push(function(){d.addTest=s}),Modernizr.addAsyncTest(function(){function e(){var e=new Image;e.onerror=function(){s("datauri",!0),Modernizr.datauri=new Boolean(!0),Modernizr.datauri.over32kb=!1},e.onload=function(){s("datauri",!0),Modernizr.datauri=new Boolean(!0),Modernizr.datauri.over32kb=1==e.width&&1==e.height};for(var n="R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";n.length<33e3;)n="\r\n"+n;e.src="data:image/gif;base64,"+n}-1!==navigator.userAgent.indexOf("MSIE 7.")&&setTimeout(function(){s("datauri",!1)},10);var n=new Image;n.onerror=function(){s("datauri",!1)},n.onload=function(){1==n.width&&1==n.height?e():s("datauri",!1)},n.src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="}),o(),r(u),delete d.addTest,delete d.addAsyncTest;for(var v=0;v<Modernizr._q.length;v++)Modernizr._q[v]();e.Modernizr=Modernizr}(window,document);