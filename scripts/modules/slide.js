/* Slider Widget

id : 'element_id',       // (Required) ID of container element

HTML:

  <div id="slide1" class="slide-wrapper loader">
    <div class="slide-container">
      <ul class="slides">
        <li class="slide"></li>
        ...
      </ul>
    </div>
    <div class="slide-nav clearfix">
      <span class="slide-prev"></span>
      <div class="slide-handles"></div>
      <span class="slide-next"></span>
    </div>
  </div>

*/

define(['jquery', 'pubsub'], function ($, ps) {

    // CONSTANTS
    var NOT_SLIDING = 0,
        START_SLIDING = 1,
        CURRENTLY_SLIDING = 2;

    // VARIABLES
    var configs = {},
        id = null,
        $wrapper = null,
        sliding = 0,
        slideCount = null,
        start = 0;

    var init = function (options) {

      configs = options || {};
      id = configs.id || null;
      $wrapper = $(document.getElementById(id));
      slideCount = $wrapper.find('.slide').length,
      start = $wrapper.data('start') || 0;

      $wrapper.data('slide', start);
      $wrapper.data('pixelOffset', 0);
      $wrapper.data('startPixelOffset', 0);
      $wrapper.data('startClientX', 0);

      $wrapper.on("touchstart", '.slide', slideStart);
      $wrapper.on("touchend", '.slide', slideEnd);
      $wrapper.on("touchmove", '.slide', slide);

      $wrapper.on("click", '.slide-prev, .slide-next', slideArrow);
      $wrapper.on("click", '.slide-handle', slideBullet);
      $wrapper.on("click", '.slide-to', slideTo);

      $(document).bind("keydown", slideArrowByKey);

      $wrapper.on("webkitTransitionEnd transitionend oTransitionEnd", '.slides', function(e){
        // Ignore transitions that may occur inside the slider
        if( $(e.target).hasClass('slides') ){
          $.publish('slider.slide.end', $wrapper);
        }
      });

      createBullets();

      if(start > 0) {
        animate('none');
        updateControls();
      }

    };

    var slideStart = function (event) {
      if (event.originalEvent.touches) {
        event = event.originalEvent.touches[0];
      }

      if (sliding == NOT_SLIDING) { // user is not sliding yet
        sliding = START_SLIDING;
        $wrapper.data('startClientY', event.clientY);
        $wrapper.data('startClientX', event.clientX); // store the mouse or touch position where the user initiated the slide
      }
    };

    var slide = function (event) {
      var _event = null;

      if(!Modernizr.csstransforms3d){
        return false;
      }
      if (event.originalEvent.touches){
        _event = event.originalEvent.touches[0];
      }

      var deltaSlideY = Math.abs(_event.clientY - $wrapper.data('startClientY'));
      var deltaSlideX = _event.clientX - $wrapper.data('startClientX'); // stores the number of pixels that we’ve moved since our mousedown or touchstart

      if(deltaSlideY > Math.abs(deltaSlideX)){ // Swipe UP/DOWN
        sliding = NOT_SLIDING;
      } else {
        event.preventDefault();
      }

      if (sliding == START_SLIDING && deltaSlideX !== 0) {
        sliding = CURRENTLY_SLIDING;
        $wrapper.data('startPixelOffset', $wrapper.data('pixelOffset') ); // store the current pixels that the entire #slides container was already changed to
      }

      if (sliding == CURRENTLY_SLIDING) {
        var touchPixelRatio = 1; // sliding exactly 1 pixel for every pixel of mouse or touch movement
        var _currentSlide = $wrapper.data('slide');
        var _startClientX = $wrapper.data('startClientX');

        if ((_currentSlide === 0 && _event.clientX > _startClientX) || (_currentSlide == slideCount - 1 && _event.clientX < _startClientX)) {
          touchPixelRatio = 2; // Apple’s rubber-band effect. Moving first slide to the right or last slide to the left.
        }

        $wrapper.data('pixelOffset', $wrapper.data('startPixelOffset') + deltaSlideX / touchPixelRatio); // calculate the number of pixels that we need to offset .slides

        /* Hardware Acceleration. Yay!! */
        $wrapper.find('.slides').css({
          '-webkit-transition' : 'all 0.3s ease-out',
          '-moz-transition' : 'all 0.3s ease-out',
          '-ms-transition' : 'all 0.3s ease-out',
          '-o-transition' : 'all 0.3s ease-out',
          'transition' : 'all 0.3s ease-out',
          '-webkit-transform' : 'translate3d(' + $wrapper.data('pixelOffset') + 'px,0,0)',
          '-moz-transform' : 'translate3d(' + $wrapper.data('pixelOffset') + 'px,0,0)',
          '-ms-transform' : 'translate3d(' + $wrapper.data('pixelOffset') + 'px,0,0)',
          '-o-transform' : 'translate3d(' + $wrapper.data('pixelOffset') + 'px,0,0)',
          'transform' : 'translate3d(' + $wrapper.data('pixelOffset') + 'px,0,0)'
        });
      }
    };

    var slideEnd = function (event) {
      var _currentSlide = $wrapper.data('slide');
      if (sliding == CURRENTLY_SLIDING) {
        sliding = NOT_SLIDING;
        _newSlide = $wrapper.data('pixelOffset') < $wrapper.data('startPixelOffset') ? _currentSlide + 1 : _currentSlide - 1;
        _newSlide = Math.min(Math.max(_newSlide, 0), slideCount - 1);
        $wrapper.data('slide', _newSlide);
        animate();
        updateControls();
      }
    };

    var slideBullet = function (event) {
      event.preventDefault();
      step($.inArray(event.currentTarget, $wrapper.find('.slide-handle') ));
    };

    var slideTo = function (event) {
      event.preventDefault();
      step($(this).data('index'));
    };

    var slideArrow = function (event) {
      event.preventDefault();
      var _currentSlide = $wrapper.data('slide'),
          _newSlide = event.currentTarget.className.indexOf('slide-next') !== -1 ? _currentSlide + 1 : _currentSlide - 1;

      step(_newSlide);
    };

    var slideArrowByKey = function (event) {
      var _currentSlide = $wrapper.data('slide'),
          key = event.keyCode,
          _newSlide;

      if(key === 39){
        _newSlide = _currentSlide + 1;
        step(_newSlide);
      }
      if(key === 37){
        _newSlide = _currentSlide - 1;
        step(_newSlide);
      }
    };

    var step = function (newSlideIndex) {
      newSlideIndex = Math.min(Math.max(newSlideIndex, 0), slideCount - 1);
      $wrapper.data('slide', newSlideIndex);
      animate();
      updateControls();
    };

    var animate = function (transition) {
      var _currentSlide = Math.min(Math.max($wrapper.data('slide'), 0), slideCount - 1),
          _pixelOffset = _currentSlide * -$wrapper.width(), // use negative value because we are offsetting to the left
          _transition = typeof transition === "undefined" ? 'all 0.3s ease-out' : transition;

      $wrapper.data('pixelOffset', _pixelOffset);

      if(!Modernizr.csstransforms3d){
        $wrapper.find('.slides').addClass('absolute').animate({
          left: _pixelOffset + 'px'
        }, 300, function(){
          $.publish('slider.slide.end', $wrapper);
        });
      } else {

        /* Hardware Acceleration. Yay!! */
        $wrapper.find('.slides').css({
          '-webkit-transition' : _transition,
          '-moz-transition' : _transition,
          '-ms-transition' : _transition,
          '-o-transition' : _transition,
          'transition' : _transition,
          '-webkit-transform' : 'translate3d(' + _pixelOffset + 'px,0,0)',
          '-moz-transform' : 'translate3d(' + _pixelOffset + 'px,0,0)',
          '-ms-transform' : 'translate3d(' + _pixelOffset + 'px,0,0)',
          '-o-transform' : 'translate3d(' + _pixelOffset + 'px,0,0)',
          'transform' : 'translate3d(' + _pixelOffset + 'px,0,0)'
        }).trigger('animationFinish');

      }
    };

    var createBullets = function () {
      $wrapper.find('.slide').each(function (i) {
        $wrapper.find('.slide-handles').append('<span class="slide-handle inactive">&dot;</span>');
      });
      updateControls();
    };

    var updateControls = function () {
      var _currentSlide = Math.min(Math.max($wrapper.data('slide'), 0), slideCount - 1),
          _prev = $wrapper.find('.slide-prev'),
          _next = $wrapper.find('.slide-next'),
          _handle = $wrapper.find('.slide-handle');

      if(_currentSlide === 0){
        _prev.addClass('state-disabled');
      } else {
        _prev.removeClass('state-disabled');
      }

      if(_currentSlide === slideCount - 1) {
        _next.addClass('state-disabled');
      } else {
        _next.removeClass('state-disabled');
      }

      if(_handle.length > 0) {
        _handle.removeClass('active').addClass('inactive');
        $wrapper.find('.slide-handle:nth-child(' + (_currentSlide + 1) + ')').removeClass('inactive').addClass('active');
      }
    };

    var destroy = function () {
      $wrapper.off("touchstart", '.slide');
      $wrapper.off("touchend", '.slide');
      $wrapper.off("touchmove", '.slide');
      $wrapper.off("click", '.slide-prev, .slide-next, .slide-handle, .slide-to');
      $(document).off("keydown");
    };

    return {
      init: init,
      destroy: destroy
    };

});
