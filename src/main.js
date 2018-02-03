
'use strict';

// Constants
var WINDOW_WIDTH = 800;
var WINDOW_HEIGHT = 600;

var PLANE_WIDTH = 10;
var PLANE_LENGTH = 1000;
var OBSTACLE_WIDTH = 1;
var N_OBSTACLES = 100;
var N_BULLETS_POOL = 10;
var BULLET_SPEED = 0.1;

// Globals
var scene = null;
var camera = null;
var renderer = null;
var controls = null;

var geoObstacle = null;
var matObstacle = null;
var obstacles = [];
var player = null;

var geoBullet = null;
var matBullet = null;
var bullets = [];
var currentBulletIdx = 0;

var lastTime = 0.0;

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

	add3DAxis();
	initGame();
	onRender(); // start update loop
}

function initGame() {
	var geoPlane = new THREE.BoxGeometry(PLANE_WIDTH, PLANE_LENGTH, 0.001);
	var matPlane = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
	var plane = new THREE.Mesh(geoPlane, matPlane);
	plane.position.set(0,PLANE_LENGTH/2,0);
	scene.add(plane);

	geoObstacle = new THREE.BoxGeometry(1,OBSTACLE_WIDTH,1);
	matObstacle = new THREE.MeshBasicMaterial( {color: 0xff0000} );
	generateObstacles();
	addObstacles();

	var geoPlayer = new THREE.SphereGeometry( 0.5, 32, 32 );
	var matPlayer = new THREE.MeshBasicMaterial( {color: 0xffff00} );
	player = new THREE.Mesh(geoPlayer, matPlayer);
	player.position.set(0,1,0);
	scene.add(player);

	geoBullet = new THREE.SphereGeometry( 0.1, 32, 32 );
	matBullet = new THREE.MeshBasicMaterial( {color: 0xff00ff} );
	createBulletPool();
}

function createBulletPool() {
	for(var i = 0; i < N_BULLETS_POOL; i++) {
		var bullet = new THREE.Mesh(geoBullet, matBullet);
		bullet.position.set(player.position.x,player.position.y,player.position.z);
		bullets.push(bullet);
		scene.add(bullet);
	}
	currentBulletIdx = 0;
}

function onKeypress(e) {
	//console.log(e.key);
	//console.log(e.keyCode);

	if(e.keyCode == 32) {
		shootBullet();
	}
}

function shootBullet() {
	console.log("shoot!!");
	if(currentBulletIdx >= N_BULLETS_POOL) {
		console.log("reset bullets pool");
		currentBulletIdx = 0;
	}
	bullets[currentBulletIdx].position.set(player.position.x,player.position.y,player.position.z);
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
	obstacle.position.set(x,y,0);
	scene.add(obstacle);
}

function onUpdate() {
	var dt = performance.now()-lastTime;
	lastTime = performance.now();

	//console.log(dt);

	//controls.update();
	camera.position.y += 0.5;
	player.position.y += 0.5;

	// update player
	var time = performance.now() * 0.005;
	player.position.x = Math.sin( time * 0.7 ) * 1 + 0;

	// update bullets
	for(var i = 0; i < bullets.length; i++) {
		var bullet = bullets[i];
		bullet.position.y += BULLET_SPEED*dt;
	}
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
