const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const messageElement = document.getElementById('message');
const startBtn = document.getElementById('startBtn');

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;

// Player
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    speed: 7,
    dx: 0
};

// Bullets
let bullets = [];
const bulletSpeed = 8;

// Invaders
let invaders = [];
const invaderRows = 4;
const invaderCols = 8;
const invaderWidth = 40;
const invaderHeight = 30;
const invaderPadding = 15;
let invaderDirection = 1;
let invaderSpeed = 1;

// Enemy bullets
let enemyBullets = [];
const enemyBulletSpeed = 4;

// Keys
const keys = {
    left: false,
    right: false,
    space: false
};

// Initialize invaders
function createInvaders() {
    invaders = [];
    for (let row = 0; row < invaderRows; row++) {
        for (let col = 0; col < invaderCols; col++) {
            invaders.push({
                x: col * (invaderWidth + invaderPadding) + 50,
                y: row * (invaderHeight + invaderPadding) + 40,
                width: invaderWidth,
                height: invaderHeight,
                alive: true
            });
        }
    }
}

// Draw player (smiley face)
function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const radius = player.width / 2;

    // Face (yellow circle)
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Left eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX - 8, centerY - 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(centerX + 8, centerY - 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 2, 10, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
}

// Draw invaders
function drawInvaders() {
    invaders.forEach(invader => {
        if (invader.alive) {
            ctx.fillStyle = '#f00';
            // Alien body
            ctx.fillRect(invader.x + 5, invader.y + 5, invader.width - 10, invader.height - 10);
            // Alien eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(invader.x + 10, invader.y + 10, 6, 6);
            ctx.fillRect(invader.x + invader.width - 16, invader.y + 10, 6, 6);
            // Alien antennae
            ctx.fillStyle = '#f00';
            ctx.fillRect(invader.x + 8, invader.y, 3, 8);
            ctx.fillRect(invader.x + invader.width - 11, invader.y, 3, 8);
        }
    });
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = '#ff0';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, 4, 15);
    });
}

// Draw enemy bullets
function drawEnemyBullets() {
    ctx.fillStyle = '#f0f';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, 4, 15);
    });
}

// Move player
function movePlayer() {
    player.x += player.dx;
    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

// Move bullets
function moveBullets() {
    bullets = bullets.filter(bullet => bullet.y > 0);
    bullets.forEach(bullet => {
        bullet.y -= bulletSpeed;
    });
}

// Move enemy bullets
function moveEnemyBullets() {
    enemyBullets = enemyBullets.filter(bullet => bullet.y < canvas.height);
    enemyBullets.forEach(bullet => {
        bullet.y += enemyBulletSpeed;
    });
}

// Move invaders
function moveInvaders() {
    let hitEdge = false;

    invaders.forEach(invader => {
        if (invader.alive) {
            invader.x += invaderSpeed * invaderDirection;
            if (invader.x + invader.width > canvas.width - 10 || invader.x < 10) {
                hitEdge = true;
            }
        }
    });

    if (hitEdge) {
        invaderDirection *= -1;
        invaders.forEach(invader => {
            invader.y += 20;
        });
    }
}

// Enemy shooting
function enemyShoot() {
    const aliveInvaders = invaders.filter(inv => inv.alive);
    if (aliveInvaders.length > 0 && Math.random() < 0.02) {
        const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        enemyBullets.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height
        });
    }
}

// Check collisions
function checkCollisions() {
    // Bullets hitting invaders
    bullets.forEach((bullet, bulletIndex) => {
        invaders.forEach(invader => {
            if (invader.alive &&
                bullet.x < invader.x + invader.width &&
                bullet.x + 4 > invader.x &&
                bullet.y < invader.y + invader.height &&
                bullet.y + 15 > invader.y) {
                invader.alive = false;
                bullets.splice(bulletIndex, 1);
                score += 10;
                scoreElement.textContent = score;
            }
        });
    });

    // Enemy bullets hitting player
    enemyBullets.forEach((bullet, index) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + 4 > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + 15 > player.y) {
            enemyBullets.splice(index, 1);
            lives--;
            livesElement.textContent = lives;
            if (lives <= 0) {
                gameOver();
            }
        }
    });

    // Invaders reaching player
    invaders.forEach(invader => {
        if (invader.alive && invader.y + invader.height > player.y) {
            gameOver();
        }
    });
}

// Check win condition
function checkWin() {
    const aliveInvaders = invaders.filter(inv => inv.alive);
    if (aliveInvaders.length === 0) {
        gameRunning = false;
        messageElement.textContent = 'YOU WIN!';
        startBtn.textContent = 'Play Again';
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    messageElement.textContent = 'GAME OVER';
    startBtn.textContent = 'Play Again';
}

// Shoot bullet
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y
    });
}

// Clear canvas
function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    clear();

    movePlayer();
    moveBullets();
    moveEnemyBullets();
    moveInvaders();
    enemyShoot();

    checkCollisions();
    checkWin();

    drawPlayer();
    drawInvaders();
    drawBullets();
    drawEnemyBullets();

    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    score = 0;
    lives = 3;
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    messageElement.textContent = '';

    player.x = canvas.width / 2 - 20;
    bullets = [];
    enemyBullets = [];
    invaderDirection = 1;
    invaderSpeed = 1;

    createInvaders();
    gameRunning = true;
    startBtn.textContent = 'Restart';
    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.dx = -player.speed;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.dx = player.speed;
    }
    if (e.key === ' ' && gameRunning) {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ||
        e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.dx = 0;
    }
});

startBtn.addEventListener('click', startGame);

// Initial draw
clear();
drawPlayer();
