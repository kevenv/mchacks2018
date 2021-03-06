
'use strict';

// Constants
var WINDOW_WIDTH = 800;
var WINDOW_HEIGHT = 600;

var PLANE_WIDTH = 10;
var PLANE_LENGTH = 10000;
var OBSTACLE_WIDTH = 1;
var N_OBSTACLES = 1000;
var N_BULLETS_POOL = 2;
var BULLET_SPEED = 0.1;
var BULLET_SIZE = 0.1;
var PLAYER_SIZE = 0.5;
var PLAYER_INIT_POS = new THREE.Vector3(0,0,0);
var PLAYER_MAX_HEALTH = 50;
var HEALTH_BAR_WIDTH = 2.15;

// Globals
var scene = null;
var camera = null;
var renderer = null;
var controls = null;

var geoObstacle = null;
var matObstacle = null;
var obstacles = [];
var obstacle_meshes = [];
var bool_obstacles = [];
var player = null;
var playerAABB = null;

var geoBullet = null;
var matBullet = null;
var bullets = [];
var currentBulletIdx = 0;

var lastTime = 0.0;
var playerXPos = null;

var playerHealth = PLAYER_MAX_HEALTH;
var healthBar = null;

var playerScore = 0;

var started = false;
var startScreenMesh = null;

// Events & callbacks
document.addEventListener("load", onLoad());
document.addEventListener("keypress", onKeypress);

function onLoad() {
	initRenderer();
}

function onRender() {
	requestAnimationFrame(onRender);
	onUpdate();
	renderer.render(scene, camera);
}

// Renderer
function initRenderer() {
	// viewport
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
	var viewport = document.getElementById("viewport");
	viewport.appendChild(renderer.domElement);

	scene = new THREE.Scene();

	// camera
	camera = new THREE.PerspectiveCamera(37, WINDOW_WIDTH/WINDOW_HEIGHT, 0.1, 1000);
	camera.up.set(0,0,1);
	camera.position.set(0,-4,1);
	camera.lookAt(new THREE.Vector3(0,0,1));

	// controls
	//controls = new THREE.OrbitControls(camera, renderer.domElement);
	//controls.target.set(0,0,1);

	// cubemap
	var path = "assets/textures/";
	var format = '.png';
	var urls = [
			path + 'py' + format, path + 'py' + format,
			path + 'py' + format, path + 'py' + format,
			path + 'py' + format, path + 'py' + format
		];
	var reflectionCube = new THREE.CubeTextureLoader().load( urls );
	reflectionCube.format = THREE.RGBFormat;
	scene.background = reflectionCube;

	//add3DAxis();
	initGame();
}

function onAfterLoad() {
	setInterval(function() {
		if(playerHealth > 0){
			if (started) {
			playerScore++;
			document.getElementById('playerScore').innerHTML = playerScore;
		}
		}
	}, 1000)
	//onRender(); // uncomment this if want to use without Myo; comment if want to use with Myo
	initMyo(); // comment this if want to use without Myo; uncomment if want to use with Myo
	startScreen();
}

function initGame() {
	// textures
	var texture = new THREE.TextureLoader().load( 'assets/textures/floor.png' );
	var textureMetal = new THREE.TextureLoader().load( 'assets/textures/metal.png' );
	// var maxAnisotropy = renderer.getMaxAnisotropy();
	var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
	
	texture.anisotropy = maxAnisotropy;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	
	textureMetal.anisotropy = maxAnisotropy;
	textureMetal.wrapS = textureMetal.wrapT = THREE.RepeatWrapping;

	var tmpx, tmpy;
	tmpx = PLANE_WIDTH;
	tmpy = 256 * PLANE_LENGTH/1000;
	texture.repeat.set( tmpx, tmpy );
	textureMetal.repeat.set( 1, 1 );

	var geoPlane = new THREE.BoxGeometry(PLANE_WIDTH, PLANE_LENGTH, 0.001);
	var matPlane = new THREE.MeshBasicMaterial( {map : texture} );
	var plane = new THREE.Mesh(geoPlane, matPlane);
	plane.position.set(0,PLANE_LENGTH/2,0);
	scene.add(plane);

	var geoHealthBar = new THREE.BoxGeometry(HEALTH_BAR_WIDTH, 1, 0.5);
	var matHealthBar = new THREE.MeshBasicMaterial( {color: 0xff0000} );
	healthBar = new THREE.Mesh(geoHealthBar, matHealthBar);
	healthBar.position.set(0,1,3);
	healthBar.scale.x = HEALTH_BAR_WIDTH;
	scene.add(healthBar);

	geoObstacle = new THREE.BoxGeometry(OBSTACLE_WIDTH,OBSTACLE_WIDTH,OBSTACLE_WIDTH);
	matObstacle = new THREE.MeshBasicMaterial( {map : textureMetal} );
	generateObstacles();
	addObstacles();

	geoBullet = new THREE.SphereGeometry( BULLET_SIZE, 16, 16 );
	matBullet = new THREE.MeshBasicMaterial( {color: 0xff00ff} );
	createBulletPool();

	// create lights
	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
	directionalLight.position.set( 1, 1, 1 ).normalize();
	scene.add( directionalLight );

	createPlayer();
}

function createPlayer() {
	/*var geoPlayer = new THREE.SphereGeometry( PLAYER_SIZE, 32, 32 );
	var matPlayer = new THREE.MeshBasicMaterial( {color: 0xffff00} );
	player = new THREE.Mesh(geoPlayer, matPlayer);
	player.position.set(0,2*PLAYER_SIZE,0);
	scene.add(player);*/

	var onProgress = function ( xhr ) {
	if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			console.log( Math.round(percentComplete, 2) + '% downloaded' );
		}
	};
	var onError = function ( xhr ) { };

	THREE.Loader.Handlers.add( /\.tga$/i, new THREE.TGALoader() );

	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.setPath( '../../assets/Light Cycle/' );
	mtlLoader.load( 'HQ_Movie cycle.mtl', function( materials ) {
		materials.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.setPath( '../../assets/Light Cycle/' );
		objLoader.load( 'HQ_Movie cycle.obj', function ( object ) {
			object.scale.set(PLAYER_SIZE,PLAYER_SIZE,PLAYER_SIZE);
			player = object;

			playerAABB = new THREE.Box3();
			playerAABB.setFromCenterAndSize(player.position, new THREE.Vector3(0.25,1,1));
			//playerAABB.setFromObject(player);
			//console.log(playerAABB);
			//var helper = new THREE.Box3Helper(playerAABB, 0xffff00 );
			//scene.add( helper );

			scene.add(object);
			onAfterLoad();
		}, onProgress, onError );
	});

}

function createBulletPool() {
	for(var i = 0; i < N_BULLETS_POOL; i++) {
		var bullet = new THREE.Mesh(geoBullet, matBullet);
		bullet.position.set(PLAYER_INIT_POS.x, PLAYER_INIT_POS.y, PLAYER_INIT_POS.z);
		bullets.push({"mesh":bullet, "alive":false});
		scene.add(bullet);
	}
	currentBulletIdx = 0;
}

function onKeypress(e) {
	//console.log(e.key);
	//console.log(e.keyCode);

	if(e.keyCode == 32) {
		shootBullet();
		started = true;
	}
}

function startScreen() {
	// textures
	var texture = new THREE.TextureLoader().load( 'assets/textures/start.jpg' );
	/*var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
	texture.anisotropy = maxAnisotropy;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(685/2, 494/2);*/
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( 1,1	);

	var geoPlane = new THREE.BoxGeometry(685, 0.001, 494);
	var matPlane = new THREE.MeshBasicMaterial( {map : texture} );
	startScreenMesh = new THREE.Mesh(geoPlane, matPlane);
	startScreenMesh.scale.set(0.1/14,0.1/14,0.1/14);
	startScreenMesh.position.set(0,0.5,1);
	scene.add(startScreenMesh);
}

function shootBullet() {
	console.log("shoot!!");
	if(currentBulletIdx >= N_BULLETS_POOL) {
		console.log("reset bullets pool");
		currentBulletIdx = 0;
	}
	var bullet = bullets[currentBulletIdx];
	bullet.mesh.position.set(player.position.x,player.position.y,player.position.z);
	bullet.alive = true;
	bullet.mesh.visible = true;
	currentBulletIdx++;
}

function generateObstacles() {
	/*obstacles = [
		positionObstacle(0.5,80),
		positionObstacle(0.75,100),
		positionObstacle(0,150),
	];*/
	for(var i = 0; i < N_OBSTACLES; i++) {
		var x = Math.random();
		var y = Math.random();
		var obstacle = positionObstacle(x,y);
		obstacles.push(obstacle);
		bool_obstacles.push(false);
	}
}

function positionObstacle(x,y) {
	var v = new THREE.Vector3(0,0,0);

	// 0(-PW/2) +1(PW/2)
	var W = (PLANE_WIDTH/2 - -PLANE_WIDTH/2) - 2*OBSTACLE_WIDTH/2;
	var L = PLANE_LENGTH;
	v.x = W*x + -PLANE_WIDTH/2 + OBSTACLE_WIDTH/2;
	v.y = L*y;
	//v.y = y;

	return v;
}

function addObstacles() {
	for(var i = 0; i < obstacles.length; i++) {
		var obstacle = obstacles[i];
		addObstacle(obstacle.x, obstacle.y);
	}
}

function addObstacle(x,y) {
	var obstacle = new THREE.Mesh(geoObstacle,matObstacle);
	obstacle_meshes.push(obstacle);
	obstacle.position.set(x,y,0);
	scene.add(obstacle);
}

function repaint() {
	scene = new THREE.Scene();
	// camera
	camera = new THREE.PerspectiveCamera(37, WINDOW_WIDTH/WINDOW_HEIGHT, 0.1, 1000);
	camera.up.set(0,0,1);
	camera.position.set(0,-4,1);
	camera.lookAt(new THREE.Vector3(0,0,1));
}

function onUpdate() {
	if(!started) {
		return;
	}
	var dt = performance.now()-lastTime;
	lastTime = performance.now();

	//console.log(dt);

	//controls.update();
	camera.position.y += 0.5;
	player.position.y += 0.5;
	healthBar.position.y += 0.5;

	// update player
	var time = performance.now() * 0.005;
	checkPlayerCollision(player);
	if (playerHealth <= 0) {
		// camera.up.set(0,0,1);
		// camera.position.set(0,-4,1);

		console.log('Player score ' + playerScore);
		repaint()



	} 

	// if Myo gives playerXPos, use it
	if (playerXPos == null) {
		player.position.x = Math.sin( time * 0.7 ) * 1 + 0;
	} else {
		player.position.x = playerXPos;
	}

	// update bullets
	for(var i = 0; i < bullets.length; i++) {
		var bullet = bullets[i];
		if(bullet.alive) {
			bullet.mesh.position.y += BULLET_SPEED*dt;
			checkBulletCollision(bullet);
		}
	}
}

function checkBulletCollision(bullet) {
	for(var i = 0; i < obstacles.length; i++) {
		var obstacle = obstacles[i];
		if(isBulletCollideObstacle(bullet.mesh,obstacle)) {
			console.log("collide!");
			playerScore = playerScore + 5;
			//todo: kill bullet
			bullet.alive = false;
			bullet.mesh.visible = false;
			//console.log(obstacle_meshes);
			obstacle_meshes[i].visible = false;
			bool_obstacles[i] = true;

		}
	}
}

function isBulletCollideObstacle(bullet, obstacle) {

	var minBulletBox = new THREE.Vector3(bullet.position.x,bullet.position.y,bullet.position.z);
	minBulletBox.sub(new THREE.Vector3(BULLET_SIZE,BULLET_SIZE,BULLET_SIZE));
	var maxBulletBox = new THREE.Vector3(bullet.position.x,bullet.position.y,bullet.position.z);
	maxBulletBox.add(new THREE.Vector3(BULLET_SIZE,BULLET_SIZE,BULLET_SIZE));

	var minObsBox = new THREE.Vector3(obstacle.x,obstacle.y,obstacle.z);
	minObsBox.sub(new THREE.Vector3(OBSTACLE_WIDTH,OBSTACLE_WIDTH,OBSTACLE_WIDTH));
	var maxObsBox = new THREE.Vector3(obstacle.x,obstacle.y,obstacle.z);
	maxObsBox.add(new THREE.Vector3(OBSTACLE_WIDTH,OBSTACLE_WIDTH,OBSTACLE_WIDTH));

	var bulletAABB = new THREE.Box3(minBulletBox,maxBulletBox);
	var obstacleAABB = new THREE.Box3(minObsBox,maxObsBox);
	return bulletAABB.intersectsBox(obstacleAABB);
}

function checkPlayerCollision(player) {
	for(var i = 0; i < obstacles.length; i++) {
		var obstacle = obstacles[i];
		if (bool_obstacles[i] == false) {
			if(isPlayerCollideObstacle(player,obstacle)) {
				playerHealth--;
				healthBar.scale.x = HEALTH_BAR_WIDTH - (HEALTH_BAR_WIDTH * ( 1 - (playerHealth / PLAYER_MAX_HEALTH)));
				console.log(healthBar.scale.x);
			}
		}
	}
}
			
function isPlayerCollideObstacle(player, obstacle) {
	/*
	var minPlayerBox = new THREE.Vector3(player.position.x,player.position.y,player.position.z);
	minPlayerBox.sub(new THREE.Vector3(PLAYER_SIZE,PLAYER_SIZE,PLAYER_SIZE));
	var maxPlayerBox = new THREE.Vector3(player.position.x,player.position.y,player.position.z);
	maxPlayerBox.add(new THREE.Vector3(PLAYER_SIZE,PLAYER_SIZE,PLAYER_SIZE));
	*/

	var minObsBox = new THREE.Vector3(obstacle.x,obstacle.y,obstacle.z);
	minObsBox.sub(new THREE.Vector3(OBSTACLE_WIDTH,OBSTACLE_WIDTH,OBSTACLE_WIDTH));
	var maxObsBox = new THREE.Vector3(obstacle.x,obstacle.y,obstacle.z);
	maxObsBox.add(new THREE.Vector3(OBSTACLE_WIDTH,OBSTACLE_WIDTH,OBSTACLE_WIDTH));

	//var playerAABB = new THREE.Box3(minPlayerBox,maxPlayerBox);
	var obstacleAABB = new THREE.Box3(minObsBox,maxObsBox);

	var playerAABB2 = playerAABB.clone();
	playerAABB2.translate(player.position);
	
	return playerAABB2.intersectsBox(obstacleAABB);
}

function add3DAxis() {
	var K = 10;
	var matX = new THREE.LineBasicMaterial({color:0xff0000});
	var matY = new THREE.LineBasicMaterial({color:0x00ff00});
	var matZ = new THREE.LineBasicMaterial({color:0x0000ff});
	var geometryX = new THREE.Geometry();
	geometryX.vertices.push(new THREE.Vector3(0, 0, 0));
	geometryX.vertices.push(new THREE.Vector3(K, 0, 0));
	var lineX = new THREE.Line(geometryX, matX);
	scene.add(lineX);
	var geometryY = new THREE.Geometry();
	geometryY.vertices.push(new THREE.Vector3(0, 0, 0));
	geometryY.vertices.push(new THREE.Vector3(0, K, 0));
	var lineY = new THREE.Line(geometryY, matY);
	scene.add(lineY);
	var geometryZ = new THREE.Geometry();
	geometryZ.vertices.push(new THREE.Vector3(0, 0, 0));
	geometryZ.vertices.push(new THREE.Vector3(0, 0, K));
	var lineZ = new THREE.Line(geometryZ, matZ);
	scene.add(lineZ);
}
