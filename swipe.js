/*
 * Swipe 2.0.0
 * Brad Birdsall
 * https://github.com/thebird/Swipe
 * Copyright 2013-2015, MIT License
 * 
 * changed by wudi3 @ 2016-03-07
*/
/* eslint-disable */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.Swipe = factory();
    }
}(this, function () {
    'use strict';
    return function Swipe (container, options) {
        // 为了兼容scroll
        var disableMove = false;
        var firstMove = true;
        var killed = false;

        // utilities
        var noop = function() {}; // simple no operation function
        var offloadFn = function(fn) { setTimeout(fn || noop, 0); }; // offload a functions execution

        // check browser capabilities
        var browser = {
            addEventListener: !!window.addEventListener,
            touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch,
            transitions: (function(temp) {
                var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
                for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
                return false;
            })(document.createElement('swipe'))
        };

        // quit if no root element
        if (!container) return;
        var element = container.children[0];
        var titleNode = container.children[1];
        var slides, slidePos, width, length;
        options = options || {};
        var index = parseInt(options.startSlide, 10) || 0;
        var speed = options.speed || 300;
        options.continuous = options.continuous !== undefined ? options.continuous : true;

        function setup() {
            // cache slides
            slides = element.children[0].children;
            length = slides.length;

            // set continuous to false if only one slide
            if (slides.length < 2) options.continuous = false;

            // create an array to store current positions of each slide
            slidePos = new Array(slides.length);

            // determine width of each slide
            width = container.getBoundingClientRect().width || container.offsetWidth;

            container.style.visibility = 'visible';
        }

        function prev() {
            slide(index-1);
        }

        function next() {
            slide(index+1);
        }

        function adaptIndex(index){
            if ( index < 0) index = length - 1;
            if (index >= length ) index = 0;
            return index;
        }

        function slide(to, slideSpeed, direction) {
            // do nothing if already on requested slide
            if (index == to) return;

            direction = direction || true; // true:顺时针；false:逆时针

            //调整index边界值
            to = adaptIndex(to);

            //更改title
            fadeTitle(titleNode, options.sliderData[to]['title']);

            //获取下个状态每个位置的slide；//区分方向
            var _showSlidesIndex = [adaptIndex(to + (direction?-1:1)), to, adaptIndex(to + (direction?1:-1))];

            if (browser.transitions) {
                //用CSS3的方式
                translate(_showSlidesIndex[0], options.imgPosition['left'], speed);
                translate(_showSlidesIndex[1], options.imgPosition['current'], speed);
                translate(_showSlidesIndex[2], options.imgPosition['right'], speed);
                for (var i = 0; i < length; i++) {
                    //性能优化：当位置不变时（left），不执行动画，保证每次最多移动4个；
                    if (_showSlidesIndex.indexOf(i) < 0 && parseFloat(slides[i].style.left) !== options.imgPosition['none']['left']) {
                        translate(i, options.imgPosition['none'], speed);
                    }
                }
            } else {
                //用js的方式
            }

            index = to;

            delay = options.auto || 0;
            if (!killed) begin();
            options.callback && options.callback(index);
        }

        function translate(index, posInfo, speed) {
            var slide = slides[index];
            var style = slide && slide.style;

            if (!style) return;

            style.webkitTransitionDuration =
            style.transitionDuration = speed + 'ms';
            style.webkitTransitionProperty =
            style.transitionProperty = 'all';

            style.left = posInfo["left"]+"px";
            style.top = posInfo["top"]+"px";
            style.width = posInfo["width"]+"px";
            style.height = posInfo["height"]+"px";
            style.zIndex = posInfo["zIndex"];
            style.opacity = posInfo["opacity"];
        }

        function fadeTitle(element, text) {
            if (!element)  return;
            text = text || element.innerHTML;
            element.style.opacity = 0;
            var _titleID = setTimeout(function(){
                element.innerHTML = text;
                element.style.opacity = 1;
                clearTimeout(_titleID);
            }, 200);
        }

        // setup auto slideshow
        var delay = options.auto || 0;
        var interval;

        function begin() {
            clearTimeout(interval);
            interval = setTimeout(next, 3000);
        }

        function stop() {
            delay = 0;
            clearTimeout(interval);
        }

        function resizeHandler(){
            options.callback && options.callback(index, true);
        }


        // setup initial vars
        var start = {};
        var delta = {};
        var isScrolling;

        // setup event capturing
        var events = {
            handleEvent: function(event) {
                switch (event.type) {
                    case 'touchstart': this.start(event); break;
                    case 'touchmove': this.move(event); break;
                    case 'touchend': offloadFn(this.end(event)); break;
                    case 'resize': offloadFn(resizeHandler); break;
                }

                if (options.stopPropagation) event.stopPropagation();
            },
            start: function(event) {
                disableMove = false;
                options.isInSlider(true);
                var touches = event.touches[0];

                stop();

                // measure start values
                start = {
                    // get initial touch coords
                    x: touches.pageX,
                    y: touches.pageY,

                    // store time to determine touch duration
                    time: +new Date()
                };

                // used for testing first move event
                isScrolling = undefined;

                // reset delta and end measurements
                delta = {};

                // attach touchmove and touchend listeners
                container.addEventListener('touchmove', this, false);
                container.addEventListener('touchend', this, false);

            },
            move: function(event) {
                // ensure swiping with one touch and not pinching
                if ( event.touches.length > 1 || event.scale && event.scale !== 1) return;

                if (options.disableScroll) event.preventDefault();

                var touches = event.touches[0];

                // measure change in x and y
                delta = {
                    x: touches.pageX - start.x,
                    y: touches.pageY - start.y
                };

                if(firstMove){
                    var deltaX = touches.clientX - start.x;
                    var deltaY = touches.clientY - start.y;

                    disableMove = Math.abs(deltaX) < Math.abs(deltaY) ? true : false;
                    firstMove = false;
                }
                if(disableMove) return;

                // determine if scrolling test has run - one time test
                if ( typeof isScrolling == 'undefined') {
                    isScrolling = !!( isScrolling || Math.abs(delta.x) < Math.abs(delta.y) );
                }

                // if user is not trying to scroll vertically
                if (!isScrolling) {
                    // prevent native scrolling
                    event.preventDefault();
                    // stop slideshow
                    stop();
                }

            },
            end: function(event) {
                options.isInSlider(false);
                if (disableMove) {
                    return;
                }

                // measure duration
                var duration = +new Date() - start.time;

                // determine if slide attempt triggers next/prev slide
                var isValidSlide =
                            Number(duration) < 250 &&                 // if slide duration is less than 250ms
                            Math.abs(delta.x) > 20 ||                 // and if slide amt is greater than 20px
                            Math.abs(delta.x) > width/10;            // or if slide amt is greater than half the width

                // determine if slide attempt is past start and end
                var isPastBounds =
                            !index && delta.x > 0 ||                                            // if first slide and slide amt is greater than 0
                            index == slides.length - 1 && delta.x < 0;        // or if last slide and slide amt is less than 0

                if (options.continuous) isPastBounds = false;

                // determine direction of swipe (true:right, false:left)
                var direction = delta.x < 0;

                delay = options.auto || 0;

                //点击事件
                if (!delta.x && !delta.y) {
                    var _url = slides[index].getAttribute("data-href");
                    _url && (window.location.replace(_url));
                }

                // if not scrolling vertically
                if (!isScrolling) {
                    //不是垂直滚动
                    if (isValidSlide && !isPastBounds) {
                        if (direction) {
                            next();
                        } else {
                            prev();
                        }
                    } else {
                        begin();
                        //回到原位置
                    }
                }

                if (isScrolling === true || isScrolling === undefined) {
                    begin();
                }

                // kill touchmove and touchend event listeners until touchstart called again
                container.removeEventListener('touchmove', events, false);
                container.removeEventListener('touchend', events, false);
            }
        };

        // trigger setup
        setup();

        // start auto slideshow if applicable
        if ( true || delay) begin();


        // add event listeners
        if (browser.addEventListener) {
            // set touchstart event on element
            if (browser.touch) container.addEventListener('touchstart', events, false);

            // set resize event on window
            window.addEventListener('resize', events, false);
        } else {
            window.onresize = function () { setup(); }; // to play nice with old IE
        }

        // expose the Swipe API
        return {
            setup: function() {
                killed = false
                setup();
            },
            slide: function(to, speed) {
                // cancel slideshow
                stop();

                slide(to, speed);
            },
            prev: function() {
                // cancel slideshow
                stop();

                prev();
            },
            next: function() {
                // cancel slideshow
                stop();

                next();
            },
            stop: function() {
                // cancel slideshow
                stop();
            },
            getPos: function() {
                // return current index position
                return index;
            },
            getNumSlides: function() {
                // return total number of slides
                return length;
            },
            kill: function() {
                // cancel slideshow
                stop();
                killed = true;

                // removed event listeners
                if (browser.addEventListener) {
                    // remove current event listeners
                    container.removeEventListener('touchstart', events, false);
                    window.removeEventListener('resize', events, false);
                } else {
                    window.onresize = null;
                }
            }
        };
    };
}));
