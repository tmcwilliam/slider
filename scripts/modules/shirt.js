//my/shirt.js now does setup work
//before returning its module definition.
define(function () {
    //Do setup work here
    var configs = {};
    var init = function(options){
      configs = options;
    };

    var showConfigs = function(){
      console.log(configs);
    };

    return {
        color: "black",
        size: "unisize",
        init: init,
        showConfigs: showConfigs
    };
});
