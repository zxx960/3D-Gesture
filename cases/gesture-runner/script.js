// Game State
let gameState = {
    score: 0,
    speed: 0.5,
    isGameOver: false,
    isPlaying: false
};

// Three.js Variables
let scene, camera, renderer;
let player, ground;
let obstacles = [];
const laneWidth = 4;
const totalLanes = 3; // -1, 0, 1 (Left, Center, Right)
const pathLength = 100;

// Hand Tracking Variables
let handX = 0.5; // Normalized 0-1 (0.5 is center)

// Initialize
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, -10);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    scene.add(dirLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 1000);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -500;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lane markers
    createLaneMarkers();

    // Player
    const playerGeometry = new THREE.BoxGeometry(2, 2, 2);
    const playerMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = 1;
    player.castShadow = true;
    scene.add(player);

    // Initial Obstacles
    spawnInitialObstacles();

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    
    // Start loop
    animate();
}

function createLaneMarkers() {
    const geometry = new THREE.PlaneGeometry(0.2, 1000);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Lane lines
    const line1 = new THREE.Mesh(geometry, material);
    line1.rotation.x = -Math.PI / 2;
    line1.position.x = -laneWidth / 2;
    line1.position.z = -500;
    scene.add(line1);

    const line2 = new THREE.Mesh(geometry, material);
    line2.rotation.x = -Math.PI / 2;
    line2.position.x = laneWidth / 2;
    line2.position.z = -500;
    scene.add(line2);
}

function spawnInitialObstacles() {
    for (let i = 0; i < 10; i++) {
        spawnObstacle(-20 - i * 30);
    }
}

function spawnObstacle(zPos) {
    const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    
    // Random lane (-1, 0, 1)
    const lane = Math.floor(Math.random() * 3) - 1;
    obstacle.position.set(lane * laneWidth, 1, zPos);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updatePlayerPosition() {
    // Map hand position (0-1) to lanes (-laneWidth, 0, laneWidth)
    // 0.0 - 0.33 -> Left
    // 0.33 - 0.66 -> Center
    // 0.66 - 1.0 -> Right
    
    // Smooth Lerp for visual effect
    let targetX = 0;
    
    if (handX < 0.4) {
        targetX = -laneWidth;
    } else if (handX > 0.6) {
        targetX = laneWidth;
    } else {
        targetX = 0;
    }
    
    // Smooth movement
    player.position.x += (targetX - player.position.x) * 0.1;
}

function updateObstacles() {
    if (gameState.isGameOver) return;

    // Move obstacles towards camera
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.position.z += gameState.speed;

        // Collision detection
        // Simple AABB collision since boxes are same size and aligned
        const playerBox = new THREE.Box3().setFromObject(player);
        const obsBox = new THREE.Box3().setFromObject(obs);
        
        // Shrink boxes slightly for forgiving collision
        playerBox.expandByScalar(-0.2); 
        
        if (playerBox.intersectsBox(obsBox)) {
            gameOver();
        }

        // Remove if passed player
        if (obs.position.z > 10) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            
            // Score up
            gameState.score += 10;
            document.getElementById('score').innerText = `Score: ${gameState.score}`;
            
            // Increase speed slightly
            gameState.speed += 0.005;
            
            // Spawn new obstacle
            spawnObstacle(-100);
        }
    }
}

function gameOver() {
    gameState.isGameOver = true;
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score').innerText = gameState.score;
}

function animate() {
    requestAnimationFrame(animate);

    if (!gameState.isGameOver && gameState.isPlaying) {
        updatePlayerPosition();
        updateObstacles();
        
        // Dynamic ground effect (illusion of movement)
        // In this simple version, we move obstacles instead of player forward
        // To make it look better, we could texture the ground and scroll UVs
    }

    renderer.render(scene, camera);
}

// MediaPipe Setup
const videoElement = document.getElementById('input_video');
const loadingElement = document.getElementById('loading');

function onResults(results) {
    if (!results.multiHandLandmarks) return;
    
    if (!gameState.isPlaying && results.multiHandLandmarks.length > 0) {
        gameState.isPlaying = true;
        loadingElement.style.display = 'none';
    }

    if (results.multiHandLandmarks.length > 0) {
        // Get the first hand
        const landmarks = results.multiHandLandmarks[0];
        
        // Use the wrist or palm center (index 9 is middle finger mcp, roughly center)
        const x = landmarks[9].x;
        
        // Update global hand position (mirrored input handled by CSS, but coordinates need care)
        // MediaPipe x is 0(left) to 1(right) of image.
        // Since we mirrored the video with CSS, visually left is left.
        // But the coordinate system is still 0-1 from the original image.
        // If I move my hand to my left (screen left), that corresponds to the camera seeing me on its right side?
        // Let's test:
        // Real Left -> Camera Right -> x close to 1
        // Real Right -> Camera Left -> x close to 0
        // But wait, if we CSS mirror, we just flip visual.
        // Let's assume standard webcam mirror behavior.
        // If x is 1 (right side of image), that's my left hand if not mirrored?
        // Let's just use 1-x to be safe if it feels reversed, or stick to raw x.
        // Usually: x=0 is left side of the video frame, x=1 is right.
        
        handX = 1 - x; // Reverse because of selfie mode intuition
    }
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

// Initialize Three.js
init();

// Start Camera
cameraUtils.start().then(() => {
    console.log("Camera started");
}).catch(err => {
    console.error("Error starting camera:", err);
    loadingElement.innerText = "Camera Error! Allow access.";
});

