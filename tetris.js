// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#3877FF', // I
    '#FFE138', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#0DC2FF', // T
    '#FF0D72', // Z
];

// Tetromino shapes
const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

// Game state
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let dropInterval = 1000;
let lastDropTime = 0;
let spaceKeyPressed = false;

// Canvas elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

// UI elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const gameOverDiv = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Initialize the game board
function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Create a new piece
function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return {
        shape: SHAPES[type],
        color: type,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0
    };
}

// Draw a block
function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = COLORS[color];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE / 3, BLOCK_SIZE / 3);
}

// Draw the board
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
}

// Draw the current piece
function drawPiece() {
    if (!currentPiece) return;
    
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
            }
        });
    });
}

// Draw the next piece
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;
    
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(nextCtx, offsetX + x, offsetY + y, nextPiece.color);
            }
        });
    });
}

// Check collision
function checkCollision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Merge piece to board
function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check the same row again
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += [0, 100, 300, 500, 800][linesCleared] * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateUI();
    }
}

// Move piece
function movePiece(dx, dy) {
    if (!checkCollision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// Rotate piece
function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    
    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    // Wall kick
    if (checkCollision(currentPiece)) {
        // Try moving left or right
        if (!checkCollision(currentPiece, 1, 0)) {
            currentPiece.x++;
        } else if (!checkCollision(currentPiece, -1, 0)) {
            currentPiece.x--;
        } else {
            currentPiece.shape = previousShape;
        }
    }
}

// Hard drop
function hardDrop() {
    while (movePiece(0, 1)) {
        score += 2;
    }
    lockPiece();
}

// Lock piece and spawn new one
function lockPiece() {
    mergePiece();
    clearLines();
    
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    if (checkCollision(currentPiece)) {
        gameOver();
    }
    
    drawNextPiece();
    updateUI();
}

// Update UI
function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// Game over
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    finalScoreElement.textContent = score;
    gameOverDiv.classList.remove('hidden');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// Start game
function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    gameRunning = true;
    gamePaused = false;
    gameOverDiv.classList.add('hidden');
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    updateUI();
    drawNextPiece();
    lastDropTime = Date.now();
    gameLoop();
}

// Pause game
function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
    
    if (!gamePaused) {
        lastDropTime = Date.now();
        gameLoop();
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    const now = Date.now();
    const deltaTime = now - lastDropTime;
    
    if (deltaTime > dropInterval) {
        if (!movePiece(0, 1)) {
            lockPiece();
        }
        lastDropTime = now;
    }
    
    drawBoard();
    drawPiece();
    
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1;
                updateUI();
            }
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            if (!spaceKeyPressed) {
                spaceKeyPressed = true;
                hardDrop();
            }
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    
    drawBoard();
    drawPiece();
});

// Reset space key flag when released
document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
        spaceKeyPressed = false;
    }
});

// Button event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', startGame);

// Initialize
initBoard();
drawBoard();
