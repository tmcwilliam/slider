requirejs.config({
    baseUrl: 'scripts/lib',
    paths: {
        modules: '../modules'
    }
});

requirejs(["jquery", "modules/slide"], function($, slider) {
    // Initialize the Slider
    slider.init({id:'slide1'});

    $.subscribe('slider.slide.end', function(wrapper){
      console.log("execute a function when slider transition is finished");
    });
});
