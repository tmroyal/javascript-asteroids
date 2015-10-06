var Game = {};

function InitGame(Game){
	var screen = document.getElementById("screen");
	var screenWriter = screen.getContext("2d");
	var x = 0;
	var bodies = [];
	var screenPad = 5;

	function screenWrapper(center){
		if ( center.x < -screenPad){ center.x = screen.width + screenPad; }
		if ( center.x > screen.width + screenPad){ center.x = -screenPad; }

		if ( center.y < -screenPad){ center.y = screen.height + screenPad; }
		if ( center.y > screen.height + screenPad){ center.y = -screenPad; }
	}

	function thereAreAsteroids()	{
		return bodies.some(function(body){
			return body.type === "asteroid";
		});
	}
	screenWriter.font = "48px serif";

	function tick(){
		screenWriter.clearRect(0,0,screen.width, screen.height);
		sr = screenWriter;
		for( var i = bodies.length-1; i >= 0 ; i--){
			bodies[i].update(screenWrapper, Game);
			if(bodies[i].dead){
				bodies.splice(i,1);
			} else {
				bodies[i].draw(screenWriter);
			}
			if(!thereAreAsteroids()){
				screenWriter.fillStyle = "#000";
				screenWriter.fillText("You win!!!", screen.width/2, screen.height/2);
			} else if(bodies[0].type !== "player" ){
				screenWriter.fillStyle = "#000";
				screenWriter.fillText("You loose!",screen.width/2, screen.height/2);
			}
		}

		requestAnimationFrame(tick);
	}

	Game.play =  function(){
		tick();
	};

	Game.addBody = function(body){
		bodies.push(body);
	};

	Game.makeExplosion = function(x,y,strength, ship){
		bodies.push(new Explosion(x,y,strength,ship));
	}

	Game.checkForCollisionsBetween = function(body1, bodyType, cb){
		var box1 = body1.box;
		var box2;
		var checkedBodyType;
		var i;
		for(var i = 0; i<bodies.length; i++){
			box2 = bodies[i].box;
			checkedBodyType = bodies[i].type;
			if(bodyType ===  checkedBodyType &&
				box1.x1 < box2.x2 &&
				box1.x2 > box2.x1 &&
				box1.y1 < box2.y2 &&
				box1.y2 > box2.y1	
			){
				// call back with colliding body and game object
				cb(this,bodies[i]);
				return;
			}
		}

	}

	Game.addBody(new Player(screen.width/2, screen.height/2));
	Game.addBody(new Asteroid(50,50, 1, Math.random()*Math.PI*2, 16));
	Game.addBody(new Asteroid(screen.width-50, screen.height-50, 1, Math.random()*Math.PI*2, 16));
};

var Util = {};

Util.makePoint = function(x,y){
	return {x: x, y: y};
};

Util.scalePoint = function(point, factor){
	return {x: point.x*factor, y: point.y*factor};
};

Util.addPoint = function(point1, point2){
	return { x: point1.x+point2.x,
			 y: point1.y+point2.y
	};
};

Util.makeBox = function(center, size){
	return {
		x1: center.x - size/2,
		y1: center.y - size/2,
		x2: center.x + size/2, 
		y2: center.y + size/2
	};
};

function generateAsteroidPoints(size){
	var curAngle = 0;
	var points = [];
	var dist;
	var x, y;

	do{
		dist = size - Math.random()*size*0.2;
		x = dist*Math.cos(curAngle);
		y = dist*Math.sin(curAngle);
		points.push(Util.makePoint(x,y));

		curAngle += Math.random()*0.6+0.1;
	} while(curAngle < Math.PI*2);

	points.push(points[0]);
	return points;
};

function Asteroid(x,y, vel, ang, size){
	var center = Util.makePoint(x,y);
	var velocity = Util.makePoint(vel*Math.cos(ang), vel*Math.sin(ang));
	var points; 

	function divisionCB(game, bullet){
		var bulletVelocity = Util.scalePoint(bullet.getVelocity(), 0.2);
		bullet.dead = true;
		this.dead = true;
		game.makeExplosion(center.x, center.y, size);
		if(size > 1){
			game.addBody(new Asteroid(
								center.x, 
								center.y, 
								velocity.x+bulletVelocity.y, 
								velocity.y-bulletVelocity.x, 
								size/2
			));
			game.addBody(new Asteroid(
								center.x, 
								center.y, 
								velocity.x-bulletVelocity.y, 
								velocity.y+bulletVelocity.x, 
								size/2
			));
		}
	}

	this.dead = false;
	this.size = size;
	this.boxSize = this.size*8;
	this.type = "asteroid";
	this.box = Util.makeBox(center, this.boxSize);

	points = generateAsteroidPoints(this.boxSize);		

	this.update = function(screenWrapper, game){
		game.checkForCollisionsBetween(this,"bullet", divisionCB.bind(this));
		center = Util.addPoint(center, velocity);
		this.box = Util.makeBox(center, this.boxSize);
		screenWrapper(center);
	};

	this.draw = function(screenWriter){
		screenWriter.save();
		screenWriter.translate(center.x, center.y);
		screenWriter.beginPath();
		screenWriter.moveTo(points[0].x, points[0].y);

		for(var i = 1; i < points.length; i++){
			screenWriter.lineTo( points[i].x, points[i].y);
		}
		screenWriter.stroke();
		screenWriter.closePath();
		screenWriter.restore();
	};

}

function Bullet(x,y, angle){
	var center = Util.makePoint(x,y);
	var velocity = Util.makePoint(
		6*Math.cos(angle),
		6*Math.sin(angle)
	);
	var strength = 1;

	this.dead = false;	
	this.type = "bullet";
	this.box = Util.makeBox(center, 5);
	function colorForStrength(strength){
		var scaledStrength = strength*255;
		return "rgba(255,0,0," + scaledStrength + ")";
	}
	this.getVelocity = function(){ return velocity; }

	this.update = function(screenWrapper, game){
		center = Util.addPoint(center, velocity);
		this.box = Util.makeBox(center, 5);
		strength *= 0.85;

		screenWrapper(center);

		if (strength < 0.001){
			this.dead = true;
		}
	};

	this.draw = function(screenWriter){
		screenWriter.save();
		screenWriter.fillStyle = colorForStrength(strength);
		screenWriter.fillRect(center.x, center.y, 5, 5);
		screenWriter.restore();

	};
}

function Player(x,y){
	var center = Util.makePoint(x,y);
	var velocity = Util.makePoint(0,-1);
	var angle = Math.PI*-0.5;
	var rotVel = 0;
	var toAddBullet = false;


	function handleKeyPress(kp){
		switch (kp){
			case "left":
				rotVel -= 0.05;
				break;
			case "right":
				rotVel += 0.05;
				break;
			case "up":
				velocity.x += 0.5*Math.cos(angle);
				velocity.y += 0.5*Math.sin(angle);
				break;
			case "down":
				velocity.x -= 0.5*Math.cos(angle);
				velocity.y -= 0.5*Math.sin(angle);
				break;
			case "space":
				toAddBullet = true;
				break;
		}
		if(angle > Math.PI*2){
			angle = 0;
		};
	}

	this.box = Util.makeBox(center, 20);

	this.dead = false;

	this.type = "player";

	this.update = function(screenWrapper, game){
		var self = this;

		game.checkForCollisionsBetween(this, "asteroid", 
						function(game){
							this.dead = true;
							game.makeExplosion(center.x, center.y, 20, true);
						}.bind(this)
		);
		if(!this.dead){
			velocity = Util.scalePoint(velocity, 0.99);
			center = Util.addPoint(center, velocity);
			this.box = Util.makeBox(center, 20);
			screenWrapper(center);

			rotVel *= 0.98;
			angle += rotVel;

			if(toAddBullet){
				toAddBullet = false;
				game.addBody(new Bullet(center.x, center.y, angle));
			}
		}
	}

	this.draw = function(screenWriter){

		screenWriter.save();

		screenWriter.translate(center.x, center.y);
		screenWriter.rotate(angle);
		screenWriter.translate(-center.x, -center.y);

		screenWriter.beginPath();
		screenWriter.moveTo(center.x-10, center.y-10);
		screenWriter.lineTo(center.x-10, center.y+10);
		screenWriter.lineTo(center.x+20, center.y);
		screenWriter.lineTo(center.x-10, center.y-10);

		screenWriter.stroke();
		screenWriter.closePath();

		screenWriter.restore();


	}

	setKeyBoardActions(handleKeyPress);
}

function ExplosionPoint(x,y, velocity, ship){
	var strength = 1;
	var r = Math.floor(Math.random()*64+192);
	var g = Math.floor(Math.random()*192+16);
	var b = Math.floor(Math.random()*16);
	var rgb = "rgba("+r+","+g+","+b+",";
	var center = Util.makePoint(x,y);
	var size = ship ? 3 : 1;

	this.dead = false;


	this.update = function(){
		strength *= 0.9 + Math.random()*0.1;
		if(strength < 0.01){ this.dead = true; }
		center = Util.addPoint(center, velocity)
 	};

	this.draw = function(screenWriter){
		screenWriter.fillStyle = rgb+((1-strength)*255)+")";
		screenWriter.fillRect(center.x, center.y, size, size);
	};
}

function Explosion(x,y,strength, ship){
	var center = Util.makePoint(x,y);
	var points = [];
	var nPoints = Math.random()*strength*100+5;
	var velStr = strength*0.5;
	var pointVel;

	for(var i = 0; i < nPoints; i++){
		pointVel = Util.makePoint(
			Math.random()*velStr-velStr/2,
			Math.random()*velStr-velStr/2
		);
		points.push(new ExplosionPoint(center.x, center.y, pointVel, ship));
	}

	this.dead = false;

	this.update = function(){
		for(var i = points.length - 1; i >= 0; i--){
			points[i].update();
			if(points[i].dead){
				points.splice(i,1);	
			}
		}
		if(points.length === 0){
			this.dead = true;
		}
	};
	this.draw = function(screenWriter){
		points.forEach(function(point){
			point.draw(screenWriter);
		});
	};
}

function setKeyBoardActions(cb){
	window.onkeydown = function(e){
		if(e.keyCode === 37){
			cb("left");
		} else if(e.keyCode === 39){
			cb("right");
		} else if(e.keyCode === 38){
			cb("up");
		} else if(e.keyCode === 40){
			cb("down");
		} else if(e.keyCode === 32){
			cb("space");
		}
	}
};

window.onload = function(){
	InitGame(Game);
	Game.play();
}