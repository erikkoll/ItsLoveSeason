// assets/chess-logic.js

// Import Stockfish as an ES Module
import STOCKFISH from './vendor/stockfish.js';

/* --- Best win embed --- */
const BEST_ID = 'JGHVTwkz';
document.getElementById('gameEmbed').src =
  `https://lichess.org/embed/game/${BEST_ID}?theme=auto&bg=auto`;

/* --- Ratings (best-effort) --- */
fetch('https://lichess.org/api/user/erikkoll')
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (!data) return;
    const p = data.perfs || {};
    const items = [['Bullet', p.bullet?.rating], ['Blitz', p.blitz?.rating], ['Rapid', p.rapid?.rating]]
      .filter(([, r]) => typeof r === 'number');
    if (items.length) {
      const box = document.getElementById('ratingBox');
      const list = document.getElementById('ratingList');
      box.hidden = false;
      list.innerHTML = items.map(([k, v]) => `<span><strong>${k}:</strong> ${v}</span>`).join('');
    }
  }).catch(() => { /* Silently fail on network error */ });

/* --- Eric-level bot --- */
const statusEl = document.getElementById('engineStatus');
const newBtn = document.getElementById('newGameBtn');
const colorRadios = Array.from(document.querySelectorAll('input[name="color"]'));
const ELO_TARGET = 1614;

// Check if chess libraries loaded correctly
if (typeof Chessboard === 'undefined' || typeof Chess === 'undefined') {
  statusEl.textContent = 'Could not load chess libraries.';
  throw new Error("Chess libraries not found. Ensure chess.js and chessboard.js are loaded.");
}

const game = new Chess();
let board, engine, engineReady = false;
let playerColor = (document.querySelector('input[name="color"]:checked')?.value) || 'white';

function initBoard() {
  board = Chessboard('ericBotBoard', {
    draggable: true,
    position: 'start',
    orientation: playerColor,
    onDragStart: (src, piece) => {
      // Do not pick up pieces if the game is over
      if (game.game_over()) return false;
      // Only pick up pieces for the side to move
      if (playerColor === 'white' && piece.startsWith('b')) return false;
      if (playerColor === 'black' && piece.startsWith('w')) return false;
    },
    onDrop: (src, tgt) => {
      // See if the move is legal
      const mv = game.move({ from: src, to: tgt, promotion: 'q' });
      // Illegal move
      if (!mv) return 'snapback';
    },
    onSnapEnd: () => {
      // Update the board position after the piece snap
      board.position(game.fen());
      // Let the engine play its move
      maybeEngineMove();
    }
  });
  // Ensure the board is responsive
  setTimeout(() => board.resize(), 0);
  window.addEventListener('resize', () => board && board.resize());
}

// MODIFIED: This function now uses the imported STOCKFISH module
function createEngine() {
  try {
    // The imported STOCKFISH is a factory function that returns a new engine instance
    return STOCKFISH();
  } catch (e) {
    console.error('Error creating Stockfish engine:', e);
    return null;
  }
}

function initEngine() {
  engine = createEngine();
  if (!engine) {
    statusEl.textContent = 'Could not load Stockfish.';
    return;
  }

  statusEl.textContent = 'Loading engine…';

  engine.onmessage = (e) => {
    const line = (typeof e === 'string') ? e : e.data;
    if (!line) return;

    if (line === 'uciok') {
      engine.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      engineReady = true;
      statusEl.textContent = 'Engine ready';
      // Configure the engine to the target Elo
      engine.postMessage('setoption name UCI_LimitStrength value true');
      engine.postMessage(`setoption name UCI_Elo value ${ELO_TARGET}`);
      engine.postMessage('setoption name Skill Level value 8'); // Mid-range skill level
      maybeEngineMove();
      return;
    }
    if (line.startsWith('bestmove')) {
      const best = line.split(/\s+/)[1];
      if (best && best !== '(none)') {
        const from = best.slice(0, 2), to = best.slice(2, 4), promo = best.slice(4) || 'q';
        game.move({ from, to, promotion: promo });
        board.position(game.fen());
        statusEl.textContent = ''; // Clear "Thinking..." status
        maybeEngineMove();
      }
    }
  };

  // Initialize the UCI interface
  engine.postMessage('uci');
}

function engineGo() {
  if (!engineReady) return;
  engine.postMessage(`position fen ${game.fen()}`);
  engine.postMessage('go movetime 1200'); // Think for 1.2 seconds
  statusEl.textContent = 'Thinking…';
}

function maybeEngineMove() {
  const engineColor = (playerColor === 'white') ? 'b' : 'w';
  if (!game.game_over() && game.turn() === engineColor) {
    // Add a small delay for a more natural feel
    setTimeout(engineGo, 300);
  }
}

function resetGame() {
  game.reset();
  board.orientation(playerColor);
  board.start();
  if (engine) engine.postMessage('ucinewgame');
  board.resize(); // Ensure board is correctly sized after potential layout shifts
  maybeEngineMove();
}

// --- Event Listeners ---
colorRadios.forEach(r => r.addEventListener('change', () => {
  playerColor = document.querySelector('input[name="color"]:checked').value;
  resetGame();
}));
newBtn.addEventListener('click', resetGame);

// --- Initialisation ---
initBoard();
initEngine();

// If the player chooses Black, the engine makes the first move
if (playerColor === 'black') {
  maybeEngineMove();
}