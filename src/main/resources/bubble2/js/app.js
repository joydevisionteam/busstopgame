
// http://paulirish.com/2011/requestanimationframe-for-smart-animating
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// namespace our game
var POP = {

    // set up some inital values
    WIDTH: 900,
    HEIGHT:  1600,
    scale:  1,
    // the position of the canvas
    // in relation to the screen
    offset: {top: 0, left: 0},
    // store all bubble, touches, particles etc
    entities: [],
    // the amount of game ticks until
    // we spawn a bubble
    nextBubble: 100,
    // for tracking player's progress
    score: {
        taps: 0,
        hit: 0,
        escaped: 0,
        accuracy: 0
    },
    // we'll set the rest of these
    // in the init function
    RATIO:  null,
    currentWidth:  null,
    currentHeight:  null,
    canvas: null,
    ctx:  null,
    ua:  null,
    android: null,
    ios:  null,
	COMPLEXITY_MIN: 0,
	COMPLEXITY_MAX: 100,
	COMPLEXITY_STEP: 10,
	complexity: 0,
	// complexity of the gameplay. (1..100)
	bubblesThrown: 0,
	bubblesCaught: 0,
	caughtTime: 0,
	lastTouchTime: 0,
	isIdle: true,
	// percentage of caught bubbles (1..100)
	alpha: 0.5,          /// current alpha
    delta: 0.01,        /// delta value = speed
	

    init: function() {

        // the proportion of width to height
        POP.RATIO = POP.WIDTH / POP.HEIGHT;
        // these will change when the screen is resize
        POP.currentWidth = POP.WIDTH;
        POP.currentHeight = POP.HEIGHT;
        // this is our canvas element
        POP.canvas = document.getElementsByTagName('canvas')[0];
        // it's important to set this
        // otherwise the browser will
        // default to 320x200
        POP.canvas.width = POP.WIDTH;
        POP.canvas.height = POP.HEIGHT;
        // the canvas context allows us to
        // interact with the canvas api
        POP.ctx = POP.canvas.getContext('2d');
        // we need to sniff out android & ios
        // so we can hide the address bar in
        // our resize function
        POP.ua = navigator.userAgent.toLowerCase();
        POP.android = POP.ua.indexOf('android') > -1 ? true : false;
        POP.ios = ( POP.ua.indexOf('iphone') > -1 || POP.ua.indexOf('ipad') > -1  ) ? true : false;

        // set up our wave effect
        // basically, a series of overlapping circles
        // across the top of screen
        POP.wave = {
            x: -25, // x coord of first circle
            y: -40, // y coord of first circle
            r: 50, // circle radius
            time: 0, // we'll use this in calculating the sine wave
            offset: 0 // this will be the sine wave offset
        };
        // calculate how many circles we need to
        // cover the screen width
        POP.wave.total = Math.ceil(POP.WIDTH / POP.wave.r) + 1;

        // listen for clicks
        window.addEventListener('click', function(e) {
            e.preventDefault();
            POP.Input.set([e]);
        }, false);

        // listen for touches
        window.addEventListener('touchstart', function(e) {
            e.preventDefault();
            // the event object has an array
            // called touches, we just want
            // the first touchhttp://borismus.github.io/mobile-web-samples/browser-ninja/
            // console.log('TOUCHES:');
            // console.log(e.touches);
            POP.Input.set(e.touches);
        }, false);
        window.addEventListener('touchmove', function(e) {
            // we're not interested in this
            // but prevent default behaviour
            // so the screen doesn't scroll
            // or zoom
            e.preventDefault();
        }, false);
        window.addEventListener('touchend', function(e) {
            // as above
            e.preventDefault();
        }, false);

        // we're ready to resize
        POP.resize();

        POP.loop();

    },


    resize: function() {

        POP.currentHeight = window.innerHeight;
        // resize the width in proportion
        // to the new height
        POP.currentWidth = POP.currentHeight * POP.RATIO;

        // this will create some extra space on the
        // page, allowing us to scroll pass
        // the address bar, and thus hide it.
        if (POP.android || POP.ios) {
            document.body.style.height = (window.innerHeight + 50) + 'px';
        }

        // set the new canvas style width & height
        // note: our canvas is still 320x480 but
        // we're essentially scaling it with CSS
        POP.canvas.style.width = POP.currentWidth + 'px';
        POP.canvas.style.height = POP.currentHeight + 'px';

        // the amount by which the css resized canvas
        // is different to the actual (480x320) size.
        POP.scale = POP.currentWidth / POP.WIDTH;
        // position of canvas in relation to
        // the screen
        POP.offset.top = POP.canvas.offsetTop;
        POP.offset.left = POP.canvas.offsetLeft;

        // we use a timeout here as some mobile
        // browsers won't scroll if there is not
        // a small delay
        window.setTimeout(function() {
                window.scrollTo(0,1);
        }, 1);
    },

    // this is where all entities will be moved
    // and checked for collisions etc
    update: function() {
        function clearSlates() {
        //    POP.entities = [];  // wrong behaviour - it breaks up bubbles flow, clears all bubbles from screen
            logoStraight_index = 0;
            logoStraight_count = 0;
            logoStraights = 0;
        }
        var i,
            checkCollision = false; // we only need to check for a collision
                                // if the user tapped on this game tick

		currentTime = new Date().getTime();
		if ((currentTime - POP.caughtTime) > 5000) {
            POP.setComplexity();
            POP.bubblesThrown = 0;
            POP.bubblesCaught = 0;
            POP.caughtTime = currentTime;
		}

        if ((currentTime - POP.lastTouchTime) > 15000) {
            clearSlates();
			POP.isIdle = true;
		}


        // decrease our nextBubble counter
        POP.nextBubble -= 1;
        // if the counter is less than zero
        if (POP.nextBubble < 0) {
            // put a new instance of bubble into our entities array
            POP.entities.push(new POP.Bubble());
			POP.bubblesThrown +=1; 
            // reset the counter with a random value
            POP.nextBubble = (POP.COMPLEXITY_MAX - POP.complexity)*0.5 + 1;
//            POP.nextBubble = 100;
//            POP.nextBubble = ( Math.random() * 100 ) + 100;
        }

        // spawn a new instance of Touch
        // if the user has tapped the screen
        var touches = [];
        if (POP.Input.tapped) {
            while (POP.Input.touches.length > 0) {
                var touch = POP.Input.touches.shift();
                touches.push(touch);
                // keep track of taps; needed to
                // calculate accuracy
                POP.score.taps += 1;
                // add a new touch
                POP.entities.push(new POP.Touch(touch.x, touch.y));
            }
            // set tapped back to false
            // to avoid spawning a new touch
            // in the next cycle
            POP.Input.tapped = false;

            checkCollision = true;
        }

        // cycle through all entities and update as necessary
        for (i = 0; i < POP.entities.length; i += 1) {

            if (touches.length > 0 && POP.entities[i].type === 'bubble' && checkCollision) {
                var hit = false;
                for (var iTouch = 0; iTouch < touches.length; iTouch++) {
                    var touch = touches[iTouch];
                    if (POP.collides(POP.entities[i], {x: touch.x, y: touch.y, r: 7})) {
                    //if (POP.collides(touch, POP.entities[i])) {
                        touches.splice(iTouch,1);
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    // spawn an exposion
		         	POP.bubblesCaught++;
                    if (POP.entities[i].logo == logoStraight_index) {
                        logoStraight_count++;
                        if (logoStraight_count >= logoStraight_MAX) {
                            logoStraights++;
                            logoStraight_count = 0;
                        }
                    } else {
                        logoStraight_index = POP.entities[i].logo;
                        logoStraight_count = 1;
                    }
/*
                    for (var n = 0; n < 5; n +=1 ) {
                        POP.entities.push(new POP.Particle(
                            POP.entities[i].x,
                            POP.entities[i].y,
                            2,
                            // random opacity to spice it up a bit
                            'rgba(255,255,255,'+Math.random()*1+')'
                        ));
                    }
*/
                    POP.score.hit += 1;
                }

                POP.entities[i].remove = hit;
            }

            // delete from array if remove property
            // flag is set to true
            if (POP.entities[i].remove) {
                POP.entities.splice(i, 1);
            } else {
                POP.entities[i].update();
            }
        }

        // update wave offset
        // feel free to play with these values for
        // either slower or faster waves
        POP.wave.time = new Date().getTime() * 0.002;
        POP.wave.offset = Math.sin(POP.wave.time * 0.8) * 5;

        // calculate accuracy
        POP.score.accuracy = (POP.score.hit / POP.score.taps) * 100;
        POP.score.accuracy = isNaN(POP.score.accuracy) ?
            0 :
            ~~(POP.score.accuracy); // a handy way to round floats

    },

    


    // this is where we draw all the entities
    render: function() {
        function renderStats() {
            // display scores
            POP.Draw.text('BUBBLES: ' + POP.bubblesCaught + ' / ' + POP.bubblesThrown, 20, 40, 40, '#fff');
            POP.Draw.text('LOGO STRAIGHTS: ' + logoStraights + ' (' + logoStraight_count + ')', 20, 80, 40, '#fff');
            POP.Draw.text('DIFFICULTY: ' + Math.round(POP.complexity/POP.COMPLEXITY_MAX*10) , POP.WIDTH * 0.6, 40, 40, '#fff');
        }

        var i;

        POP.Draw.rect(0, 0, POP.WIDTH, POP.HEIGHT, '#036');
        renderStats();


        // display snazzy wave effect
//        for (i = 0; i < POP.wave.total; i++) {
//
//            POP.Draw.circle(
//                        POP.wave.x + POP.wave.offset +  (i * POP.wave.r),
//                        POP.wave.y,
//                        POP.wave.r,
//                       '#fff');
//        }
//
        // cycle through all entities and render to canvas
        for (i = POP.entities.length-1; i >= 0; i-- ) {
            POP.entities[i].render();
        }

        renderStats();

		if (POP.isIdle) {
			var img = new Image();
			img.src = "img/Tap-icon.png";		
        	POP.alpha += POP.delta;
        	if (POP.alpha <= 0.3 || POP.alpha >= 0.7) POP.delta = -POP.delta;
        	POP.ctx.globalAlpha = POP.alpha;
			margin = POP.WIDTH/8;
			side = POP.WIDTH-margin*2;
        	POP.ctx.drawImage(img, margin, (POP.HEIGHT - side)/2, side, side);
        	POP.ctx.globalAlpha = 1;
		};
    },


    // the actual loop
    // requests animation frame
    // then proceeds to update
    // and render
    loop: function() {

        requestAnimFrame( POP.loop );

        POP.update();
        POP.render();
    },


	setComplexity: function() {
		if (POP.bubblesCaught / POP.bubblesThrown < 0.5) {
			if (POP.complexity > POP.COMPLEXITY_MIN + POP.COMPLEXITY_STEP) {			
				POP.complexity -= POP.COMPLEXITY_STEP;
			} 
		} else {
			if (POP.complexity < POP.COMPLEXITY_MAX - POP.COMPLEXITY_STEP) {
				POP.complexity += POP.COMPLEXITY_STEP;
			} 
		}		
	}

};

// checks if two entties are touching
POP.collides = function(a, b) {

        var distance_squared = ( ((a.x - b.x) * (a.x - b.x)) +
                                ((a.y - b.y) * (a.y - b.y)));

        var radii_squared = (a.r + b.r) * (a.r + b.r);

        if (distance_squared < radii_squared) {
            return true;
        } else {
            return false;
        }
};


var LOGOS = [];
LOGOS.push('img/dr-oetker3.png');
LOGOS.push('img/santa_claus_rovaniemi-b2.png');
LOGOS.push('img/JCDecaux.png');
LOGOS.push('img/santaclausland_Log_1102_5.png');
LOGOS.push('img/santaclauslive_logo.png');
LOGOS.push('img/twitter circle.png');
LOGOS.push('img/upm.png');
LOGOS.push('img/yousician.png');
LOGOS.push('img/JCDecaux.png');
LOGOS.push('img/JCDecaux.png');

var logoStraight_count = 0;
var logoStraight_index = 0;
var logoStraight_MAX = 5;
var logoStraights = 0;

// abstracts various canvas operations into
// standalone functions
POP.Draw = {

    clear: function() {
        POP.ctx.clearRect(0, 0, POP.WIDTH, POP.HEIGHT);
    },

    img: function(x, y, w, h, img) {
        POP.ctx.drawImage(img, x, y, x+w, y+h)
    },


    rect: function(x, y, w, h, col) {
		var grd = POP.ctx.createLinearGradient(0, 0, 0, h);
		grd.addColorStop(1, "#001D47");
		grd.addColorStop(0.5, "#005DE5");
		grd.addColorStop(0.5, "#005DE5");
		grd.addColorStop(0, "#89D7FF");
		POP.ctx.fillStyle = grd;
   //     POP.ctx.fillStyle = col;
        POP.ctx.fillRect(x, y, w, h);
    },

    circle: function(x, y, r, col, logo) {
        POP.ctx.fillStyle = col;
        POP.ctx.beginPath();
        POP.ctx.arc(x, y, r, 0,  Math.PI * 2, true);
        POP.ctx.closePath();
//		POP.ctx.clip();
//    	POP.ctx.drawImage(POP.img, x - r, y - r, x + r, y + r);
        POP.ctx.fill();
        if (logo) {
            var image = new Image();
            image.src = LOGOS[logo % LOGOS.length];
        }
        POP.ctx.drawImage(image, x-r, y-r, r*2, r*2);
//		POP.ctx.restore();
//        POP.ctx.clearRect(x, y, r, r);
    },


    text: function(string, x, y, size, col) {
        POP.ctx.font = 'bold '+size+'px Monospace';
        POP.ctx.fillStyle = col;
        POP.ctx.fillText(string, x, y);
    }

};


var TOUCH_SCALE = 8;

POP.Input = {

    x: 0,
    y: 0,
    tapped :false,
    touches: [],

    set: function(data) {
        for (i = 0; i < data.length; i += 1) {
          var touch = {};
          touch.x = (data[i].pageX - POP.offset.left) / POP.scale;
          touch.y = (data[i].pageY - POP.offset.top) / POP.scale;
          //touch.r = (Math.max(data[i].radiusX, data[i].radiusY) * 2) * TOUCH_SCALE;
          touch.r = TOUCH_SCALE;
          this.touches.push(touch);
        }
        //this.x = (data.pageX - POP.offset.left) / POP.scale;
        //this.y = (data.pageY - POP.offset.top) / POP.scale;
        this.tapped = true;

    }

};

POP.Touch = function(x, y) {

    this.type = 'touch';    // we'll need this later
    this.x = x;             // the x coordinate
    this.y = y;             // the y coordinate
    this.r = 5;             // the radius
    this.opacity = 1;       // inital opacity. the dot will fade out
    this.fade = 0.05;       // amount by which to fade on each game tick
    // this.remove = false;    // flag for removing this entity. POP.update
                            // will take care of this

    this.update = function() {
        // reduct the opacity accordingly
        this.opacity -= this.fade;
        // if opacity if 0 or less, flag for removal
        this.remove = (this.opacity < 0) ? true : false;
    };

	POP.isIdle = false;
	POP.lastTouchTime = new Date().getTime();

    this.render = function() {
//        POP.Draw.circle(this.x, this.y, this.r, 'rgba(255,0,0,'+this.opacity+')');
    };



};

POP.Bubble = function() {

    this.type = 'bubble';
    this.r = (Math.random() * 20) + 50;
    this.speed = (Math.random() * 2) + 2;

    this.x = (Math.random() * (POP.WIDTH) - this.r);
    this.y = POP.HEIGHT + (Math.random() * 100) + 100;

    this.logo = Math.floor( Math.random() * ( 1 + 10 - 1 ) ) + 1;

    // the amount by which the bubble
    // will move from side to side
    this.waveSize = 5 + this.r;
    this.wavePeriod = 0.1 + Math.random();
    this.wavePhase =  Math.random() * 2;
    this.YwaveSize =  Math.random() * 4;
    this.YwavePeriod = 0.1 + Math.random();
    // we need to remember the original
    // x position for our sine wave calculation
    this.xConstant = this.x;

    this.remove = false;


    this.update = function() {

        // a sine wave is commonly a function of time
        var time = new Date().getTime() * 0.002;

        this.y -= this.speed + this.YwaveSize * Math.sin(this.YwavePeriod * time);
        // the x coord to follow a sine wave
        this.x = this.waveSize * Math.sin(this.wavePeriod * time + this.wavePhase) + this.xConstant;

        // if offscreen flag for removal
        if (this.y < -10) {
            POP.score.escaped += 1; // update score
            this.remove = true;
        }

    };

    this.render = function() {

        POP.Draw.circle(this.x, this.y, this.r, 'rgba(255,255,255,1)', this.logo);
    };

};

POP.Particle = function(x, y,r, col) {

    this.x = x;
    this.y = y;
    this.r = r;
    this.col = col;

    // determines whether particle will
    // travel to the right of left
    // 50% chance of either happening
    this.dir = (Math.random() * 2 > 1) ? 1 : -1;

    // random values so particles do no
    // travel at the same speeds
    this.vx = ~~(Math.random() * 4) * this.dir;
    this.vy = ~~(Math.random() * 7);

    this.remove = false;

    this.update = function() {

        // update coordinates
        this.x += this.vx;
        this.y += this.vy;

        // increase velocity so particle
        // accelerates off screen
        this.vx *= 0.99;
        this.vy *= 0.99;

        // adding this negative amount to the
        // y velocity exerts an upward pull on
        // the particle, as if drawn to the
        // surface
        this.vy -= 0.25;

        // offscreen
        if (this.y < 0) {
            this.remove = true;
        }

    };


    this.render = function() {
        POP.Draw.circle(this.x, this.y, this.r, this.col);
    };

};

window.addEventListener('load', POP.init, false);
window.addEventListener('resize', POP.resize, false);
