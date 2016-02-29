/*global checkPromise window, console, document*/
(function () {
    'use strict';

    var script;
    //On load of this function check for promises and load
        //es6 promise if not avaliable
    if (window.Promise === undefined) {
        script = document.createElement("script");
        script.src = "./js/promises/es6-promise-3.0.2.min.js";
        script.type = "text/javascript";
        document.getElementsByTagName("head")[0].appendChild(script);
    }
}());