(function() {
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

  var POP = {
    WIDTH: 320,
    HEIGHT: 480,
    RATIO: null,
    currentWidth: null,
    currentHeight: null,
    canvas: null,
    ctx: null,
    scale: 0,
    offset: {top: 0, left: 0},
    entities: [],
    isRunning: true,

    levels: [
      // LEVEL 1
      {
        nextBubbleDuration: 100,
        bubbleSpeed: (Math.random() * 1) + 2,
        goal: 20
      },
      // LEVEL 2
      {
        nextBubbleDuration: 100,
        bubbleSpeed: (Math.random() * 2) + 3,
        goal: 30,
        waterDuration: 0.01
      },
      // LEVEL 3
      {
        nextBubbleDuration: 90,
        bubbleSpeed: (Math.random() * 2) + 3,
        goal: 40,
        waterDuration: 0.02
      },
      // LEVEL 4
      {
        nextBubbleDuration: 80,
        bubbleSpeed: (Math.random() * 3) + 1,
        goal: 30,
        waterDuration: 0.02
      }
    ],

    pause: function() {
      POP.isRunning = !POP.isRunning;

      if (POP.isRunning) {
        POP.loop();
      }
    },

    clearScore: function(level) {
      level = level || 0;

      if (level > POP.levels.length) {
        throw new Error('Too hight level number');
        return;
      }

      POP.score = {
        level: level,
        taps: 0,
        hit: 0,
        escaped: 0,
        accuracy: 0,
        goal: POP.levels[level].goal
      }
    },

    restart: function(level) {
      POP.clearScore(level);
      POP.wave.restart();
      POP.entities = [];
      POP.nextBubbleDuration = POP.levels[POP.score.level].nextBubbleDuration;
      POP.nextBubble = POP.nextBubbleDuration;
      POP.waterDuration = POP.levels[POP.score.level].waterDuration;
    },

    init: function() {
      POP.restart(0);

      POP.RATIO = POP.WIDTH / POP.HEIGHT;

      POP.currentWidth = POP.WIDTH;
      POP.currentHeight = POP.HEIGHT;

      POP.canvas = document.getElementsByTagName('canvas')[0];

      POP.canvas.width = POP.WIDTH;
      POP.canvas.height = POP.HEIGHT;

      POP.ctx = POP.canvas.getContext('2d');

      POP.ua = navigator.userAgent.toLowerCase();
      POP.android = POP.ua.indexOf('android') > -1 ? true : false;
      POP.ios = ( POP.ua.indexOf('iphone') > -1 || POP.ua.indexOf('ipad') > -1  ) ? true : false;

      POP.resize();

      POP.DRAW.clear();
      POP.DRAW.rect(120, 120, 150, 150, 'green');
      POP.DRAW.circle(100, 100, 50, 'rgba(255,0,0,0.5)');
      POP.DRAW.text('Hello world', 100, 100, 10, '#000');

      POP.loop();

      POP.wave.total = Math.ceil(POP.WIDTH / POP.wave.r) + 1;
    },

    update: function() {
      var i;
      var checkCollision = false;

      POP.nextBubble -= 1;

      if (POP.nextBubble < 0) {
        POP.entities.push(new POP.Bubble());
        POP.nextBubble = POP.nextBubbleDuration;
      }

      if (POP.Input.tapped) {
        POP.score.taps += 1;
        POP.entities.push(new POP.Touch(POP.Input.x, POP.Input.y));
        POP.Input.tapped = false;
        checkCollision = true;
      }

      for (i = 0; i < POP.entities.length; i += 1) {
        POP.entities[i].update();

        if (POP.entities[i].type === 'bubble' && checkCollision) {
          hit = POP.collides(POP.entities[i],
                              {x : POP.Input.x, y: POP.Input.y, r: 7});

          if (hit) {
            POP.score.hit += 1;

            for (var j = 0; j < 10; j++) {
              POP.entities.push(new POP.Particle(
                POP.entities[i].x,
                POP.entities[i].y,
                2,
                'rgba(255,255,255,' + Math.random() + 1 + ')'
                ))
            }

            if (POP.score.hit === POP.score.goal) {
              POP.restart(POP.score.level + 1);
            }
          }

          POP.entities[i].remove = hit;
        }

        if (POP.entities[i].remove) {
          POP.entities.splice(i, 1);
        }
      }

      POP.score.accuracy = POP.score.hit / POP.score.taps * 100;
      POP.score.accuracy = isNaN(POP.score.accuracy) ? 0 : ~~(POP.score.accuracy);

      POP.wave.update();

      if (POP.wave.getWaterLevel() >= POP.HEIGHT) {
        POP.isRunning = false;
      }
    },

    render: function() {
      POP.DRAW.clear();

      POP.DRAW.rect(0, 0, POP.WIDTH, POP.HEIGHT, '#036');

      for (var i = 0; i < POP.entities.length; i += 1) {
        POP.entities[i].render();
      }

      var fontSize = 14;

      var fontColor = {
        level: POP.wave.getWaterLevel() > 20 ? '#036' : '#fff',
        hit: POP.wave.getWaterLevel() > 40 ? '#036' : '#fff',
        escaped: POP.wave.getWaterLevel() > 60 ? '#036': '#fff',
        accuracy: POP.wave.getWaterLevel() > 70 ? '#036': '#fff'
      };

      POP.wave.render();
      POP.DRAW.text('LEVEL: ' + parseInt(POP.score.level + 1), 20, 30, fontSize + 5, fontColor.level);
      POP.DRAW.text('Hit: ' + POP.score.hit + '/' + POP.score.goal, 20, 50, fontSize, fontColor.hit);
      POP.DRAW.text('Escaped: ' + POP.score.escaped, 20, 70, fontSize, fontColor.escaped);
      POP.DRAW.text('Accuracy: ' + POP.score.accuracy + '%', 20, 90, fontSize, fontColor.accuracy);

      if (!POP.isRunning) {
        POP.DRAW.text('GAME OVER', 50, POP.HEIGHT / 2, 40, '#036');
      }

    },

    loop: function() {
      if (POP.isRunning) {
        requestAnimFrame(POP.loop);
      }

      POP.update();
      POP.render();
      POP.wave.update();
    },

    resize: function() {
      POP.currentHeight = window.innerHeight;

      POP.currentWidth = POP.currentHeight * POP.RATIO;

      if (POP.android || POP.ios) {
        document.body.style.height = (window.innerHeight + 50) + 'px';
      }

      POP.canvas.style.width = POP.currentWidth + 'px';
      POP.canvas.style.height = POP.currentHeight + 'px';

      POP.scale = POP.currentWidth / POP.WIDTH;
      POP.offset.top = POP.canvas.offsetTop;
      POP.offset.left = POP.canvas.offsetLeft;

      window.setTimeout(function() {
        window.scrollTo(0,1);
      }, 1);
    },

    DRAW: {
      clear: function() {
        POP.ctx.clearRect(0, 0, POP.WIDTH, POP.HEIGHT);
      },

      rect: function(x, y, w, h, col) {
        POP.ctx.fillStyle = col;
        POP.ctx.fillRect(x, y, w, h);
      },

      circle: function(x, y, r, col, stroke) {
        POP.ctx.fillStyle = col;
        POP.ctx.beginPath();
        POP.ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
        POP.ctx.closePath();
        if (stroke) {
          POP.ctx.lineWidth = 3;
          POP.ctx.strokeStyle = stroke;
          POP.ctx.stroke();
        }

        POP.ctx.fill();
      },

      text: function(string, x, y, size, col) {
        POP.ctx.font = 'bold ' + size + 'px Monospace';
        POP.ctx.fillStyle = col;
        POP.ctx.fillText(string, x, y);
      }
    },

    Input: {
      x: 0,
      y: 0,
      tapped: false,

      set: function(data) {
        this.x = (data.pageX - POP.offset.left) / POP.scale;
        this.y = (data.pageY - POP.offset.top) / POP.scale;
        this.tapped = true;

        POP.DRAW.circle(this.x, this.y, 10, 'red');
      }
    },

    Touch: function(x, y) {
      if (!POP.isRunning) {
        return;
      }

      this.type = 'touch';
      this.x = x;
      this.y = y;
      this.r = 20;
      this.opacity = 1;
      this.fade = 0.05;
      this.remove = false;

      this.update = function() {
        this.opacity -= this.fade;
        this.remove = (this.opacity < 0);
      }

      this.render = function() {
        POP.DRAW.circle(this.x, this.y, this.r, 'rgba(255, 0, 0, ' + this.opacity + ')');
      }
    },

    Bubble: function() {
      this.type = 'bubble';
      this.r = (Math.random() * 20) + 10;
      this.x = (Math.random() * (POP.WIDTH  - this.r));
      this.y = POP.HEIGHT + (Math.random() * 100) + 100;

      this.waveSize = 5 + this.r;
      this.xConstant = this.x;
      this.speed = POP.levels[POP.score.level].bubbleSpeed;
      this.remove = false;

      this.update = function() {
        var time = new Date().getTime() * 0.002;
        this.y -= this.speed;

        this.x = this.waveSize * Math.sin(time) + this.xConstant;
        if (this.y < POP.wave.getWaterLevel()) {
          for (var j = 0; j < 10; j++) {
            POP.entities.push(new POP.Particle(
              this.x,
              this.y,
              2,
              'rgba(255,255,255,' + Math.random() + 1 + ')'
              ))
          }

          POP.score.escaped += 1;
          POP.wave.decWaterLevel(3);
          this.remove = true;
        }
      }

      this.render = function() {
        POP.DRAW.circle(this.x, this.y, this.r, 'rgba(255,255,255,0.4)', '#fff')
      }
    },

    collides: function(a, b) {
      var distanceSquared = ( ((a.x - b.x) * (a.x - b.x)) +
                              ( (a.y - b.y) * (a.y - b.y)));

      var radiiSquared = (a.r + b.r) * (a.r + b.r);
      return (distanceSquared < radiiSquared);
    },

    Particle: function(x, y, r, col) {
      this.x = x;
      this.y = y;
      this.r = r;
      this.col = col;
      this.dir = (Math.random() * 2 > 1) ? 1 : -1;

      this.vx = ~~(Math.random() * 4) * this.dir;
      this.vy = ~~(Math.random() * 7);

      this.remove = false;

      this.update = function() {

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.99;
        this.vy *= 0.99;

        this.vy -= 0.25;

        if (this.y < 0) {
          this.remove = true;
        }
      },

      this.render = function() {
        POP.DRAW.circle(this.x, this.y, this.r, this.col);
      }
    },

    wave: {
      x: -25,
      initialY: -40,
      y: -40,
      r: 50,
      time: 0,
      offset: 0,
      rectHeight: 0,
      speed: 0.05,

      restart: function() {
        this.y = this.initialY;
        this.rectHeight = 0;
      },

      decWaterLevel: function(speed) {
        this.y += speed;
        this.rectHeight += speed;
      },

      incWaterLevel: function(speed) {
        this.y -= speed;
        this.rectHeight -= speed;
      },

      update: function() {
        POP.wave.time = new Date().getTime() * 0.002;
        POP.wave.offset = Math.sin(POP.wave.time * 0.8) * 5;

        if (!!POP.waterDuration) {
          this.decWaterLevel(POP.waterDuration);
        }
      },

      getWaterLevel: function() {
        return this.y + this.r;
      },

      render: function() {
        for (var i=0; i < POP.wave.total; i++) {
          POP.DRAW.circle(
              POP.wave.x + POP.wave.offset + (i * POP.wave.r),
              POP.wave.y,
              POP.wave.r,
              '#FFF');
        }

        POP.DRAW.rect(0, 0, POP.currentWidth, this.rectHeight, '#fff');
      }

    }
  }

  window.addEventListener('load', POP.init, false);
  window.addEventListener('resize', POP.resize, false);

  window.addEventListener('click', function(e) {
    e.preventDefault();
    POP.Input.set(e);
  }, false);

  window.addEventListener('touchstart', function(e) {
    e.preventDefault();

    POP.Input.set(e.touches[0]);
  }, false);

  window.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, false);

  window.addEventListener('touchend', function(e) {
    e.preventDefault();
  }, false);

  window.init = POP.init;
  window.pause = POP.pause;
  window.restart = POP.restart;
})();