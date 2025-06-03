// --- START OF FILE script.js ---

// --- Piece-Square Tables (Global within this script) ---
const pawnTable = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];
const knightTable = [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,  0,  5,  5,  0,-20,-40],[-30,  5, 10, 15, 15, 10,  5,-30],[-30,  0, 15, 20, 20, 15,  0,-30],[-30,  5, 15, 20, 20, 15,  5,-30],[-30,  0, 10, 15, 15, 10,  0,-30],[-40,-20,  0,  0,  0,  0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
const bishopTable = [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,  0,  0,  0,  0,  0,  0,-10],[-10,  0,  5, 10, 10,  5,  0,-10],[-10,  5,  5, 10, 10,  5,  5,-10],[-10,  0, 10, 10, 10, 10,  0,-10],[-10, 10, 10, 10, 10, 10, 10,-10],[-10,  5,  0,  0,  0,  0,  5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
];
const rookTable = [
    [0,  0,  0,  5,  5,  0,  0,  0],[-5,  0,  0,  0,  0,  0,  0, -5],[-5,  0,  0,  0,  0,  0,  0, -5],[-5,  0,  0,  0,  0,  0,  0, -5],[-5,  0,  0,  0,  0,  0,  0, -5],[-5,  0,  0,  0,  0,  0,  0, -5],[5, 10, 10, 10, 10, 10, 10,  5],[0,  0,  0,  0,  0,  0,  0,  0]
];
const queenTable = [
    [-20,-10,-10, -5, -5,-10,-10,-20],[-10,  0,  5,  0,  0,  0,  0,-10],[-10,  5,  5,  5,  5,  5,  0,-10],[0,  0,  5,  5,  5,  5,  0, -5],[-5,  0,  5,  5,  5,  5,  0, -5],[-10,  0,  5,  5,  5,  5,  0,-10],[-10,  0,  0,  0,  0,  0,  0,-10],[-20,-10,-10, -5, -5,-10,-10,-20]
];
const kingTableEarly = [
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20, 20,  0,  0,  0,  0, 20, 20],[20, 30, 10,  0,  0, 10, 30, 20]
];
const kingTableEnd = [
    [-50,-40,-30,-20,-20,-30,-40,-50],[-30,-20,-10,  0,  0,-10,-20,-30],[-30,-10, 20, 30, 30, 20,-10,-30],[-30,-10, 30, 40, 40, 30,-10,-30],[-30,-10, 30, 40, 40, 30,-10,-30],[-30,-10, 20, 30, 30, 20,-10,-30],[-30,-30,  0,  0,  0,  0,-30,-30],[-50,-30,-30,-30,-30,-30,-30,-50]
];
const pieceValuesBase = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };

function getPieceSquareValue(piece, squareName, currentGame) {
    if (!piece || !currentGame) return 0;
    const file = squareName.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(squareName.charAt(1));
    if (rank < 0 || rank > 7 || file < 0 || file > 7) return 0;
    let table;
    switch (piece.type) {
        case 'p': table = pawnTable; break;
        case 'n': table = knightTable; break;
        case 'b': table = bishopTable; break;
        case 'r': table = rookTable; break;
        case 'q': table = queenTable; break;
        case 'k':
            const boardFenPieces = currentGame.fen().split(' ')[0];
            const allPiecesString = boardFenPieces.replace(/\//g, '').replace(/[1-8]/g, '');
            const pieceCount = allPiecesString.length;
            const queenCount = (allPiecesString.match(/q/gi) || []).length;
            table = (pieceCount < 12 || queenCount < 2) ? kingTableEnd : kingTableEarly;
            break;
        default: return 0;
    }
    return (piece.color === 'w') ? table[rank][file] : -table[7 - rank][file];
}

const AI_SEARCH_DEPTH = 2; // Increased from 2
const AI_ENDGAME_SEARCH_DEPTH = 3; // Increased from 3
const ENDGAME_NON_PAWN_KING_PIECE_THRESHOLD = 4;
const MATE_SCORE = 1000000;
const ABSOLUTE_INFINITY = MATE_SCORE * 10;
const QUIESCENCE_MAX_DEPTH = 3; // Quiescence depth for tactical stability

// --- Global variables for draw/concession states ---
let gameEndedManually = false;
let gameEndReason = '';
let playerOfferedDrawPendingAIResponse = false;
let aiOfferedDrawPendingPlayerResponse = false;
let aiOfferedDrawMoveSAN = null; // Stores the move AI would make if player declines its draw offer

const AI_OFFERS_DRAW_SCORE_THRESHOLD = 20; // Centipawns (e.g. +/- 0.2 pawns). AI offers draw if its best move leads to eval within this from 0.
const MIN_MOVES_FOR_AI_DRAW_OFFER = 10 * 2; // AI won't offer draw before 10 full moves (20 half-moves).
const AI_ACCEPTS_PLAYER_DRAW_OFFER_THRESHOLD = 50; // AI accepts player's draw offer if AI's current eval is below this (i.e., not clearly winning).

const OPENING_BOOK_MAX_PLY = 12; // Up to 6 full moves for book

function isEndgamePhaseForSearch(gameState) {
    if (!gameState) return false;
    const boardFenPieces = gameState.fen().split(' ')[0];
    const allPiecesString = boardFenPieces.replace(/\//g, '').replace(/[1-8]/g, '');
    const numNonPawnNonKingPieces = allPiecesString.replace(/[pkPK]/g, '').length;
    return numNonPawnNonKingPieces <= ENDGAME_NON_PAWN_KING_PIECE_THRESHOLD;
}

function evaluateBoard(current_game_state, ai_color_perspective) {
    let totalEvaluation = 0;
    const mobilityFactor = 1; // Small bonus for more legal moves
    const doubledPawnPenalty = 10;
    const isolatedPawnPenalty = 12;
    const passedPawnBonusByWhiteRankIdx = [0, 100, 75, 50, 30, 15, 5, 0]; // Bonus for passed pawns by rank from white's perspective
    const rookOnOpenFileBonus = 15;
    const rookOnSemiOpenFileBonus = 8;
    const rookOnSeventhRankBonus = 25; // Bonus for rook on 7th (player) or 2nd (AI if black)

    let whitePawnsOnFiles = Array(8).fill(0);
    let blackPawnsOnFiles = Array(8).fill(0);
    let whitePawnRanksByFile = [[], [], [], [], [], [], [], []]; // Stores ranks (0-7 from white's view) of white pawns per file
    let blackPawnRanksByFile = [[], [], [], [], [], [], [], []]; // Stores ranks (0-7 from white's view) of black pawns per file

    // Populate pawn structure arrays
    for (let r_scan = 0; r_scan < 8; r_scan++) { // r_scan = 0 (rank 8) to 7 (rank 1)
        for (let f_scan = 0; f_scan < 8; f_scan++) {
            const piece_scan = current_game_state.get('abcdefgh'[f_scan] + (8 - r_scan));
            if (piece_scan && piece_scan.type === 'p') {
                if (piece_scan.color === 'w') {
                    whitePawnsOnFiles[f_scan]++;
                    if (Array.isArray(whitePawnRanksByFile[f_scan])) {
                        whitePawnRanksByFile[f_scan].push(r_scan);
                    } else { // Should not happen if initialized correctly
                        console.error("CRITICAL: whitePawnRanksByFile[" + f_scan + "] is not an array during population!");
                        whitePawnRanksByFile[f_scan] = [r_scan]; // Attempt recovery
                    }
                } else { // black pawn
                    blackPawnsOnFiles[f_scan]++;
                     if (Array.isArray(blackPawnRanksByFile[f_scan])) {
                        blackPawnRanksByFile[f_scan].push(r_scan);
                    } else { // Should not happen
                        console.error("CRITICAL: blackPawnRanksByFile[" + f_scan + "] is not an array during population!");
                        blackPawnRanksByFile[f_scan] = [r_scan]; // Attempt recovery
                    }
                }
            }
        }
    }


    for (let r_idx = 0; r_idx < 8; r_idx++) { // r_idx = 0 (rank 8) to 7 (rank 1)
        for (let f_idx = 0; f_idx < 8; f_idx++) { // f_idx = 0 (file 'a') to 7 (file 'h')
            const squareName = 'abcdefgh'[f_idx] + (8 - r_idx);
            const piece = current_game_state.get(squareName);

            if (piece) {
                let piece_value = pieceValuesBase[piece.type] + getPieceSquareValue(piece, squareName, current_game_state);
                let positional_bonus = 0;

                // Pawn structure evaluation
                if (piece.type === 'p') {
                    // Doubled pawns
                    if (piece.color === 'w' && whitePawnsOnFiles[f_idx] > 1) positional_bonus -= doubledPawnPenalty;
                    if (piece.color === 'b' && blackPawnsOnFiles[f_idx] > 1) positional_bonus -= doubledPawnPenalty;

                    // Isolated pawns
                    let isIsolated = true;
                    const friendlyPawns = piece.color === 'w' ? whitePawnsOnFiles : blackPawnsOnFiles;
                    if (f_idx > 0 && friendlyPawns[f_idx - 1] > 0) isIsolated = false;
                    if (f_idx < 7 && friendlyPawns[f_idx + 1] > 0) isIsolated = false;
                    if (isIsolated) positional_bonus -= isolatedPawnPenalty;

                    // Passed pawns
                    let isPassed = true;
                    const enemyPawnRanksToCheck = piece.color === 'w' ? blackPawnRanksByFile : whitePawnRanksByFile;
                    for (let check_f = f_idx - 1; check_f <= f_idx + 1; check_f++) { // Check current and adjacent files
                        if (check_f < 0 || check_f > 7) continue;
                        if (Array.isArray(enemyPawnRanksToCheck[check_f])) {
                            for (const enemyPawnRank of enemyPawnRanksToCheck[check_f]) {
                                // If white pawn, check for black pawns ahead of it (smaller rank index)
                                if (piece.color === 'w' && enemyPawnRank < r_idx) { isPassed = false; break; }
                                // If black pawn, check for white pawns ahead of it (larger rank index)
                                if (piece.color === 'b' && enemyPawnRank > r_idx) { isPassed = false; break; }
                            }
                        } else {
                             console.warn("WARN: enemyPawnRanksToCheck[" + check_f + "] was not an array in passed pawn check.");
                        }
                        if (!isPassed) break;
                    }
                    if (isPassed) {
                        positional_bonus += (piece.color === 'w') ? passedPawnBonusByWhiteRankIdx[r_idx]
                                                                 : passedPawnBonusByWhiteRankIdx[7 - r_idx]; // For black, rank is mirrored
                    }
                } else if (piece.type === 'r') { // Rook evaluation
                    const friendlyPawnsOnThisFile = (piece.color === 'w') ? whitePawnsOnFiles[f_idx] : blackPawnsOnFiles[f_idx];
                    const enemyPawnsOnThisFile    = (piece.color === 'w') ? blackPawnsOnFiles[f_idx] : whitePawnsOnFiles[f_idx];

                    if (friendlyPawnsOnThisFile === 0) { // No friendly pawns on this file
                        if (enemyPawnsOnThisFile === 0) positional_bonus += rookOnOpenFileBonus; // Open file
                        else positional_bonus += rookOnSemiOpenFileBonus; // Semi-open file
                    }
                    // Rook on 7th rank (from player's perspective)
                    if ((piece.color === 'w' && r_idx === 1) || (piece.color === 'b' && r_idx === 6)) { // Rank 7 for white is r_idx 1, Rank 2 for black is r_idx 6
                        positional_bonus += rookOnSeventhRankBonus;
                    }
                }
                // Add other positional bonuses here (e.g., knight outposts, bishop pair, king safety)

                piece_value += positional_bonus;
                totalEvaluation += (piece.color === ai_color_perspective ? piece_value : -piece_value);
            }
        }
    }

    // Mobility (simple version: count legal moves for current player)
    const turn_player = current_game_state.turn();
    const legal_moves_for_turn_player = current_game_state.moves();
    let mobility_score = legal_moves_for_turn_player.length * mobilityFactor;
    totalEvaluation += (turn_player === ai_color_perspective ? mobility_score : -mobility_score);

    // Bonus if opponent is in check
    if (current_game_state.in_check()) {
        if (turn_player !== ai_color_perspective) totalEvaluation += 35; // Opponent is in check, good for AI
        // else: AI is in check, this is generally bad, but mobility reduction might cover it.
        // Could add a penalty if turn_player === ai_color_perspective and in_check.
    }

    return totalEvaluation;
}

function quiescenceSearch(gameState, alpha, beta, aiColorPerspective, currentQuiescenceDepth) {
    const originalFenForDebug = gameState.fen(); // For debugging failed undo

    // Check for terminal game states (mate/draw)
    if (gameState.in_checkmate()) {
        // If current player to move is checkmated, it's bad for them.
        // Score from the perspective of the player whose turn it was *before* this node.
        return (gameState.turn() === aiColorPerspective) ? -MATE_SCORE + currentQuiescenceDepth * 10 : MATE_SCORE - currentQuiescenceDepth * 10;
    }
    if (gameState.in_draw() || gameState.in_stalemate() || gameState.insufficient_material()) {
        return 0; // Draw
    }

    // "Stand pat" score: evaluation of the current position without making further moves.
    // This score is from the perspective of the current player to move at this node.
    let standPatScore = evaluateBoard(gameState, aiColorPerspective);
    // If it's not AI's turn at this quiescence node, evaluation needs to be flipped for negamax.
    if (gameState.turn() !== aiColorPerspective) standPatScore = -standPatScore;


    // Depth limit for quiescence search
    if (currentQuiescenceDepth >= QUIESCENCE_MAX_DEPTH) {
        return standPatScore;
    }

    // Alpha-beta pruning based on stand-pat score
    if (standPatScore >= beta) return beta; // Fail-hard beta cutoff
    if (standPatScore > alpha) alpha = standPatScore; // Update alpha if stand-pat is better

    // Generate moves to consider in quiescence:
    // - If in check, all legal moves (evasions).
    // - If not in check, only "forcing" moves (captures, promotions).
    let movesToConsider = [];
    const allMoves = gameState.moves({ verbose: true });

    if (gameState.in_check()) { // If in check, all evasions must be considered
        if (currentQuiescenceDepth < QUIESCENCE_MAX_DEPTH) { // Only if not at max depth for check evasions
             movesToConsider = allMoves;
        } else {
            return standPatScore; // At max depth and in check, return eval, don't search deeper
        }
    } else { // Not in check, only consider captures and promotions
        movesToConsider = allMoves.filter(move => move.captured || move.promotion);
    }


    // Sort moves: promotions, then MVV-LVA for captures (Most Valuable Victim - Least Valuable Aggressor)
    movesToConsider.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (a.promotion) scoreA += (pieceValuesBase[a.promotion] || pieceValuesBase['q']) * 10; // Promotions are high priority
        if (a.captured) {
            const victimPiece = pieceValuesBase[a.captured] || 0;
            const attackerPieceOnFrom = gameState.get(a.from); // Get the piece object
            const attackerPieceType = attackerPieceOnFrom ? attackerPieceOnFrom.type : 'p'; // Default to pawn if somehow null
            const attackerValue = pieceValuesBase[attackerPieceType] || 0;
            scoreA += victimPiece * 10 - attackerValue; // MVV-LVA heuristic
        }

        if (b.promotion) scoreB += (pieceValuesBase[b.promotion] || pieceValuesBase['q']) * 10;
        if (b.captured) {
            const victimPiece = pieceValuesBase[b.captured] || 0;
            const attackerPieceOnFrom = gameState.get(b.from);
            const attackerPieceType = attackerPieceOnFrom ? attackerPieceOnFrom.type : 'p';
            const attackerValue = pieceValuesBase[attackerPieceType] || 0;
            scoreB += victimPiece * 10 - attackerValue;
        }
        return scoreB - scoreA; // Sort descending
    });


    for (const move of movesToConsider) {
        const moveResult = gameState.move(move.san);
        if (!moveResult) {
            console.warn(`Quiescence: chess.js failed to make move ${move.san} from FEN ${originalFenForDebug}. Skipping.`);
            continue;
        }

        // Recursive call for the next ply (opponent's turn)
        // Score is negated as it's from the opponent's perspective.
        let score = -quiescenceSearch(gameState, -beta, -alpha, aiColorPerspective, currentQuiescenceDepth + 1);

        const undoResult = gameState.undo();
        if (!undoResult) {
            console.error(`Quiescence: CRITICAL - Failed to undo move ${move.san}. FEN: ${originalFenForDebug}. Attempting restore.`);
            gameState.load(originalFenForDebug); // Attempt to restore from FEN if undo fails
            return alpha; // Might be unstable, but better than crashing or returning wrong score
        }

        if (score >= beta) return beta; // Fail-hard beta cutoff
        if (score > alpha) alpha = score; // New best move found
    }

    return alpha; // Return the best score found for this node
}


function negamax(gameState, currentPly, maxPlyToReach, alpha, beta, aiColorPerspective) {
    const originalFenForDebug = gameState.fen(); // For debugging if undo fails

    // Base cases for recursion
    if (currentPly > 0 && gameState.in_checkmate()) { // Checkmate found at this node
        // Score from perspective of player whose turn it was *before* this node
        // If it's AI's turn at this node and AI is checkmated, it's -MATE_SCORE for AI.
        // Negamax handles perspective, so this should be just -MATE_SCORE relative to current player.
        return -MATE_SCORE + currentPly * 10; // Penalize deeper mates slightly (prefer quicker mates)
    }
    if (currentPly > 0 && (gameState.in_draw() || gameState.in_stalemate() || gameState.insufficient_material())) {
        return 0; // Draw
    }

    if (currentPly === maxPlyToReach) { // Depth limit reached, switch to quiescence search
        return quiescenceSearch(gameState, alpha, beta, aiColorPerspective, 0);
    }

    let maxEval = -ABSOLUTE_INFINITY; // Initialize with a very low score
    const moves = gameState.moves({ verbose: true });

    if (moves.length === 0) { // No legal moves
        if (gameState.in_checkmate()) return -MATE_SCORE + currentPly * 10; // Checkmated
        return 0; // Stalemate
    }

    // Move ordering (simple heuristic: captures, promotions, checks first)
    moves.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        // MVV-LVA for captures
        if (a.captured) scoreA += 100 + (pieceValuesBase[a.captured] || 0) - (pieceValuesBase[gameState.get(a.from)?.type] || 0);
        if (a.promotion) scoreA += (pieceValuesBase[a.promotion || 'q'] || pieceValuesBase['q']) * 10; // Promotions are good
        if (a.san.includes('+') || a.san.includes('#')) scoreA += 5; // Checks are good

        if (b.captured) scoreB += 100 + (pieceValuesBase[b.captured] || 0) - (pieceValuesBase[gameState.get(b.from)?.type] || 0);
        if (b.promotion) scoreB += (pieceValuesBase[b.promotion || 'q'] || pieceValuesBase['q']) * 10;
        if (b.san.includes('+') || b.san.includes('#')) scoreB += 5;
        return scoreB - scoreA; // Sort descending
    });

    for (const move of moves) {
        const moveResult = gameState.move(move.san);
        if (!moveResult) {
            console.error(`Negamax: chess.js failed to make move ${move.san} from FEN ${originalFenForDebug}. Skipping.`);
            continue;
        }

        // Recursive call for the next ply (opponent's turn)
        // Score is negated as it's from the opponent's perspective.
        let currentEval = -negamax(gameState, currentPly + 1, maxPlyToReach, -beta, -alpha, aiColorPerspective);

        const undoResult = gameState.undo();
        if (!undoResult) {
            console.error(`Negamax: CRITICAL - Failed to undo move ${move.san}. FEN: ${originalFenForDebug}. Attempting restore.`);
            gameState.load(originalFenForDebug); // Attempt to restore from FEN if undo fails
            // This state is problematic. Returning a very bad score for current player might be safest.
            return -ABSOLUTE_INFINITY; // Or some other error indicator
        }


        if (currentEval > maxEval) maxEval = currentEval;
        alpha = Math.max(alpha, currentEval); // Update alpha (lower bound)

        if (alpha >= beta) break; // Beta cutoff (pruning)
    }
    return maxEval;
}

function getOpeningBookMove(currentGame, aiColor) {
    if (currentGame.history().length >= OPENING_BOOK_MAX_PLY) return null;

    const historyVerbose = currentGame.history({ verbose: true });
    const possibleMovesVerbose = currentGame.moves({ verbose: true });

    // Helper to check if a specific piece type has moved to a square, optionally from a specific square
    const hasMoved = (pieceType, toSquare, fromSquare = null, color = aiColor) =>
        historyVerbose.some(m => m.color === color && m.piece === pieceType && m.to === toSquare && (fromSquare ? m.from === fromSquare : true));

    if (aiColor === 'w') {
        // Target London System structure: d4, Ng1-f3, Bc1-f4, e3, c3, Nb1-d2, Bf1-d3, O-O
        // Order of preference for development:
        // 1. d2-d4
        if (!hasMoved('p', 'd4', 'd2')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'p' && m.from === 'd2' && m.to === 'd4');
            if (move) return move.san;
        }
        // 2. Ng1-f3
        if (hasMoved('p', 'd4', 'd2') && !hasMoved('n', 'f3', 'g1')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'n' && m.from === 'g1' && m.to === 'f3');
            if (move) return move.san;
        }
        // 3. Bc1-f4
        if (hasMoved('p', 'd4', 'd2') && !hasMoved('b', 'f4', 'c1')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'b' && m.from === 'c1' && m.to === 'f4');
            if (move) return move.san;
        }
        // 4. e2-e3
        if (hasMoved('p', 'd4', 'd2') && !hasMoved('p', 'e3', 'e2')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'p' && m.from === 'e2' && m.to === 'e3');
            if (move) return move.san;
        }
        // 5. Nb1-d2
        if (hasMoved('p', 'd4', 'd2') && !hasMoved('n', 'd2', 'b1')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'n' && m.from === 'b1' && m.to === 'd2');
            if (move) return move.san;
        }
        // 6. c2-c3
        if (hasMoved('p', 'd4', 'd2') && !hasMoved('p', 'c3', 'c2')) {
            const move = possibleMovesVerbose.find(m => m.piece === 'p' && m.from === 'c2' && m.to === 'c3');
            if (move) return move.san;
        }
        // 7. Bf1-d3 (only if f1 bishop hasn't moved, e.g. to e2)
        const f1Bishop = currentGame.get('f1'); // Check if bishop is still on f1
        if (f1Bishop && f1Bishop.type === 'b' && f1Bishop.color === 'w' &&
            hasMoved('p', 'd4', 'd2') && // d4 must be played
            !hasMoved('b', 'd3', 'f1') && // Hasn't already moved to d3
            !hasMoved('b', 'e2', 'f1') && // And hasn't moved to e2 either
            !hasMoved('b', 'g2', 'f1') && // And other squares for bishop from f1
            !hasMoved('b', 'h3', 'f1') ) {
            const move = possibleMovesVerbose.find(m => m.piece === 'b' && m.from === 'f1' && m.to === 'd3');
            if (move) return move.san;
        }
        // 8. O-O (Kingside castling)
        // Check if castling is still possible and king/rook haven't moved from original squares relevant to castling.
        // A simpler check: if it's a legal move and white hasn't castled kingside yet.
        if (hasMoved('p', 'd4', 'd2') && // Prerequisite structure moves
            (hasMoved('n','f3','g1') || hasMoved('b','e2','f1')) && // King's path clear
            !historyVerbose.some(m => m.color === 'w' && (m.flags.includes('k') || m.flags.includes('q')))) { // Not already castled
            const move = possibleMovesVerbose.find(m => m.flags.includes('k')); // 'k' for kingside castling
            if (move) return move.san;
        }

    } else if (aiColor === 'b') {
        // Caro-Kann Defense: 1. e4 c6; 2. d4 d5
        if (historyVerbose.length === 1 &&
            historyVerbose[0].piece === 'p' && historyVerbose[0].from === 'e2' && historyVerbose[0].to === 'e4') { // White played 1.e2-e4
            const move = possibleMovesVerbose.find(m => m.piece === 'p' && m.from === 'c7' && m.to === 'c6');
            if (move) return move.san;
        }
        if (historyVerbose.length === 3 &&
            historyVerbose[0].piece === 'p' && historyVerbose[0].from === 'e2' && historyVerbose[0].to === 'e4' && // 1. e2-e4
            historyVerbose[1].piece === 'p' && historyVerbose[1].from === 'c7' && historyVerbose[1].to === 'c6' && // 1...c7-c6
            historyVerbose[2].piece === 'p' && historyVerbose[2].from === 'd2' && historyVerbose[2].to === 'd4') { // 2. d2-d4
            const move = possibleMovesVerbose.find(m => m.piece === 'p' && m.from === 'd7' && m.to === 'd5');
            if (move) return move.san;
        }
    }
    return null; // No book move found
}


function getBestMoveAI(currentGame) {
    if (!currentGame || currentGame.game_over() || gameEndedManually) return null;

    const aiColor = currentGame.turn();

    // --- 1. Try Opening Book ---
    const bookMoveSAN = getOpeningBookMove(currentGame, aiColor);
    if (bookMoveSAN) {
        console.log(`[AI getBestMoveAI] Playing from opening book: ${bookMoveSAN}`);
        // For book moves, we don't typically offer draws immediately.
        // Return in the expected object format. Score is not deeply calculated here.
        return { san: bookMoveSAN, score: 0, offerDraw: false };
    }

    // --- 2. If no book move, proceed with regular search ---
    const possibleMoves = currentGame.moves({ verbose: true });
    if (possibleMoves.length === 0) return null; // Should not happen if game not over

    let bestMoveSAN = null;
    let bestScore = -ABSOLUTE_INFINITY;
    const isEndgame = isEndgamePhaseForSearch(currentGame);
    const currentSearchDepth = isEndgame && AI_ENDGAME_SEARCH_DEPTH > AI_SEARCH_DEPTH ? AI_ENDGAME_SEARCH_DEPTH : AI_SEARCH_DEPTH;

    if(isEndgame && currentSearchDepth > AI_SEARCH_DEPTH) {
        console.log(`[AI] Endgame detected. Using deeper fixed search depth: ${currentSearchDepth} (Quiescence up to +${QUIESCENCE_MAX_DEPTH})`);
    }

    // Move ordering for the root node (similar to negamax internal ordering)
    possibleMoves.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (a.captured) scoreA += 100 + (pieceValuesBase[a.captured] || 0) - (pieceValuesBase[currentGame.get(a.from)?.type] || 0);
        if (a.promotion) scoreA += (pieceValuesBase[a.promotion || 'q'] || pieceValuesBase['q']) * 100; // Higher weight for promotions at root
        if (a.san.includes('+') || a.san.includes('#')) scoreA += 5;

        if (b.captured) scoreB += 100 + (pieceValuesBase[b.captured] || 0) - (pieceValuesBase[currentGame.get(b.from)?.type] || 0);
        if (b.promotion) scoreB += (pieceValuesBase[b.promotion || 'q'] || pieceValuesBase['q']) * 100;
        if (b.san.includes('+') || b.san.includes('#')) scoreB += 5;
        return scoreB - scoreA;
    });

    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];
        const fenBeforeMove = currentGame.fen();
        const moveResult = currentGame.move(move.san);

        if (!moveResult) {
            console.error(`[AI getBestMoveAI] Top-Level: chess.js failed to make move: ${move.san} from FEN ${fenBeforeMove}. Skipping.`);
            continue;
        }

        // Check for immediate checkmate after making the move
        if (currentGame.in_checkmate()) {
            currentGame.undo(); // Undo the move
            console.log(`[AI getBestMoveAI] Found immediate checkmate: ${move.san}`);
            return { san: move.san, score: MATE_SCORE, offerDraw: false };
        }

        // Call negamax for the evaluation of this move
        // The score returned by negamax is from the perspective of the player whose turn it is *after* the move.
        // So, a positive score from negamax means it's good for the opponent. We negate it.
        let currentMoveScore = -negamax(currentGame, 1, currentSearchDepth, -ABSOLUTE_INFINITY, ABSOLUTE_INFINITY, aiColor);

        const undoSuccessful = currentGame.undo();
        if (!undoSuccessful) {
            console.error(`[AI getBestMoveAI] Top-Level CRITICAL: Failed to undo move ${move.san}. Original FEN: ${fenBeforeMove}. Restoring FEN.`);
            currentGame.load(fenBeforeMove); // Attempt to restore game state
            continue; // Skip this move evaluation as it's unreliable
        }

        if (currentMoveScore > bestScore) {
            bestScore = currentMoveScore;
            bestMoveSAN = move.san;
        } else if (currentMoveScore === bestScore && (Math.random() < 0.10)) { // Small chance to pick an equally good move for variety
            bestMoveSAN = move.san;
        }
    }

    // --- 3. Draw offer logic based on search results ---
    let offerDrawSignal = false;
    if (bestMoveSAN &&
        !currentGame.in_checkmate() && // Should be covered by bestScore check for MATE_SCORE
        !currentGame.in_draw() &&      // Don't offer if game is already a rule-based draw
        Math.abs(bestScore) < AI_OFFERS_DRAW_SCORE_THRESHOLD && // Evaluation is very close to 0
        currentGame.history().length >= MIN_MOVES_FOR_AI_DRAW_OFFER && // Game has progressed enough
        bestScore < (MATE_SCORE - 1000) && bestScore > (-MATE_SCORE + 1000) // Not in a clear mating sequence
       ) {
        offerDrawSignal = true;
        console.log(`[AI getBestMoveAI] Considering offering a draw. Best move ${bestMoveSAN} leads to score: ${bestScore.toFixed(0)}`);
    }

    // Fallback if somehow no bestMoveSAN was selected but there were possible moves
    if (bestMoveSAN === null && possibleMoves.length > 0) {
        bestMoveSAN = possibleMoves[0].san; // Fallback to the best pre-sorted move (first one after sort)
        bestScore = -ABSOLUTE_INFINITY; // Indicate it's a fallback score, not properly evaluated
        console.warn(`[AI getBestMoveAI] No clear best move from search, picking best sorted: ${bestMoveSAN}`);
    } else if (bestMoveSAN) {
         console.log(`[AI getBestMoveAI] Chosen move: ${bestMoveSAN} with score: ${bestScore.toFixed(0)} (Fixed Depth: ${currentSearchDepth}, Quiescence: +${QUIESCENCE_MAX_DEPTH})${offerDrawSignal ? " (with draw offer)" : ""}`);
    } else if (possibleMoves.length === 0) {
        // This case means no legal moves, game should be over (checkmate/stalemate)
        console.log("[AI getBestMoveAI] No possible moves for AI.");
         return null; // Handled by game over checks usually
    } else { // Should ideally not be reached if possibleMoves.length > 0 and the loop ran
        console.error("[AI getBestMoveAI] CRITICAL: No move selected despite available moves. Picking first sorted.");
        bestMoveSAN = possibleMoves[0].san; // Fallback to the first pre-sorted move
        bestScore = -ABSOLUTE_INFINITY; // Error score
    }

    return bestMoveSAN ? { san: bestMoveSAN, score: bestScore, offerDraw: offerDrawSignal } : null;
}


$(document).ready(function() {
    console.log("Document ready. Main script.js executing with CLICK-ONLY movement.");
    const statusEl = $('#status');
    const turnEl = $('#turn');
    const fenEl = $('#fen');
    const pgnEl = $('#pgn');
    const playerColorSelect = $('#playerColor');
    const newGameButton = $('#newGameButton');
    const undoButton = $('#undoButton');
    const offerDrawButton = $('#offerDrawButton');
    const concedeButton = $('#concedeButton');
    const aiDrawOfferControls = $('#aiDrawOfferControls');
    const acceptAIDrawButton = $('#acceptAIDrawButton');
    const declineAIDrawButton = $('#declineAIDrawButton');

    let board = null;
    let game = null;
    let playerChoosesColor = 'w'; // Default selected in HTML
    let actualPlayerColor = 'w';
    let playerOrientation = 'white';
    let aiIsThinking = false;
    let selectedSquare = null;
    let $liftedPieceElement = null;

    function clearPieceLift() { if ($liftedPieceElement) { $liftedPieceElement.removeClass('piece-lifted'); $liftedPieceElement = null; } }
    function applyPieceLift(squareName) {
        clearPieceLift();
        const $pieceImage = $('#board .square-55d63[data-square="' + squareName + '"] img');
        if ($pieceImage.length) { $pieceImage.addClass('piece-lifted'); $liftedPieceElement = $pieceImage; }
    }
    function clearBoardHighlights() { $('#board .square-55d63').removeClass('highlight-selected highlight-legal highlight-capture'); }
    function clearMoveHighlights() { $('#board .square-55d63').removeClass('highlight-legal highlight-capture'); }

    function highlightLegalMoves(square) {
        clearMoveHighlights();
        if (!game) return;
        const moves = game.moves({ square: square, verbose: true });
        if (moves.length === 0) return;
        moves.forEach(move => {
            const $targetSquare = $('#board .square-55d63[data-square="' + move.to + '"]');
            if (move.captured) { $targetSquare.addClass('highlight-capture'); } else { $targetSquare.addClass('highlight-legal'); }
        });
    }

    async function makeAIMove() {
        if (!game || game.game_over() || gameEndedManually || game.turn() === actualPlayerColor) {
            aiIsThinking = false;
            updateStatus();
            return;
        }
        aiIsThinking = true;
        const isEndgameForSearch = isEndgamePhaseForSearch(game);
        const usingDeeperFixedSearch = isEndgameForSearch && AI_ENDGAME_SEARCH_DEPTH > AI_SEARCH_DEPTH;
        statusEl.text(`OmniBot (Enhanced AI) is thinking${usingDeeperFixedSearch ? " (deep search)..." : "..."}`);
        updateStatus(); // To disable buttons while AI thinks initially
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

        const aiDecision = getBestMoveAI(game);

        if (aiDecision && aiDecision.offerDraw) {
            aiOfferedDrawPendingPlayerResponse = true;
            aiOfferedDrawMoveSAN = aiDecision.san; // Store the move AI wants to make
            aiDrawOfferControls.find('span').text(`AI offers a draw (eval: ${aiDecision.score.toFixed(0)}). Accept?`);
            aiDrawOfferControls.show();
            // aiIsThinking remains true while waiting for player response
            updateStatus(); // Update button states etc.
            return; // Don't make the move yet, wait for player
        }

        // If no draw offer, or if draw offer was handled and this part is reached later (e.g. declined)
        const moveSAN = aiDecision ? aiDecision.san : null;

        if (moveSAN) {
            const moveResult = game.move(moveSAN);
            if (moveResult) {
                if (board) board.position(game.fen());
                playSound('move-opponent'); // Assuming generic move sound for opponent
                if (game.in_check()) playSound('check');
            } else {
                // This is a critical error if getBestMoveAI returned a supposedly valid move
                console.error("[AI makeAIMove] ERROR: chess.js rejected AI's chosen move:", moveSAN, "Current FEN:", game.fen(), "Legal moves:", game.moves());
                // Fallback: try a random move if AI's choice failed
                const fallbackMoves = game.moves();
                if (fallbackMoves.length > 0) {
                    const randomFallback = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                    game.move(randomFallback);
                    if (board) board.position(game.fen());
                    playSound('move-opponent');
                    console.warn("[AI makeAIMove] Made a random fallback move:", randomFallback);
                } else {
                    console.error("[AI makeAIMove] No fallback moves available after AI error.");
                }
            }
        } else {
            console.warn("[AI makeAIMove] getBestMoveAI returned null or no SAN. No move made.");
             if (!game.game_over() && !gameEndedManually && game.moves().length > 0) {
                 console.error("[AI makeAIMove] CRITICAL: AI failed to produce a move in a non-terminal state with legal moves.");
            }
        }
        aiIsThinking = false;
        updateStatus();
    }

    function playSound(type) {
        const sounds = {
            'move-self': document.getElementById('moveSound'),
            'move-opponent': document.getElementById('moveSound'), // Can use same sound as self or a different one
            'capture': document.getElementById('captureSound'),
            'game-start': document.getElementById('notifySound'), // For new game/end game notification
            'undo': document.getElementById('notifySound'),
            'check': document.getElementById('notifySound')
        };
        try {
            if (sounds[type] && typeof sounds[type].play === 'function') {
                sounds[type].currentTime = 0; // Rewind to start
                sounds[type].play().catch(e => console.warn("Sound play failed for", type, ":", e));
            }
        } catch (e) {
            console.warn("Error playing sound type", type, ":", e);
        }
    }

    function handleSquareClick(squareName) {
        if (!game || game.game_over() || gameEndedManually || game.turn() !== actualPlayerColor || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse ) {
            if (selectedSquare) { // If a piece was selected, deselect it on invalid click
                clearPieceLift(); clearBoardHighlights(); selectedSquare = null;
            }
            return;
        }

        const pieceOnClickedSquare = game.get(squareName);
        const $clickedSquareElement = $('#board .square-55d63[data-square="' + squareName + '"]');

        if (!selectedSquare) { // No piece selected yet
            if (pieceOnClickedSquare && pieceOnClickedSquare.color === actualPlayerColor) { // Clicked on player's own piece
                clearBoardHighlights(); // Clear previous highlights
                selectedSquare = squareName;
                $clickedSquareElement.addClass('highlight-selected');
                applyPieceLift(selectedSquare);
                highlightLegalMoves(selectedSquare);
            } else { // Clicked on empty square or opponent's piece without a selection
                clearPieceLift(); clearBoardHighlights(); selectedSquare = null;
            }
        } else { // A piece was already selected (selectedSquare is not null)
            if (squareName === selectedSquare) { // Clicked on the same selected piece
                clearPieceLift(); clearBoardHighlights(); selectedSquare = null; // Deselect
            } else { // Clicked on a different square (potential destination)
                const moves = game.moves({ square: selectedSquare, verbose: true });
                const legalMoveToTarget = moves.find(m => m.to === squareName);

                if (legalMoveToTarget) { // Valid move to the target square
                    const moveAttempt = { from: selectedSquare, to: squareName, promotion: 'q' }; // Default promotion to queen
                    const moveResult = game.move(moveAttempt);

                    if (moveResult) {
                        playSound(moveResult.captured ? 'capture' : 'move-self');
                        if (game.in_check()) playSound('check');

                        clearPieceLift(); clearBoardHighlights(); selectedSquare = null;
                        if (board) board.position(game.fen());
                        updateStatus();

                        // If game not over and it's AI's turn, make AI move
                        if (!game.game_over() && !gameEndedManually && game.turn() !== actualPlayerColor && !aiIsThinking) {
                            makeAIMove();
                        }
                    } else {
                        // This should ideally not happen if legalMoveToTarget was found
                        console.error("[handleSquareClick] CRITICAL: Move failed by game.move() despite verbose check.", moveAttempt);
                        clearPieceLift(); clearBoardHighlights(); selectedSquare = null; // Reset selection
                    }
                } else { // Clicked square is not a legal destination for the selected piece
                    if (pieceOnClickedSquare && pieceOnClickedSquare.color === actualPlayerColor) { // Clicked on another of player's own pieces
                        clearPieceLift(); clearBoardHighlights(); // Clear old selection highlights
                        selectedSquare = squareName; // Select the new piece
                        $clickedSquareElement.addClass('highlight-selected');
                        applyPieceLift(selectedSquare);
                        highlightLegalMoves(selectedSquare);
                    } else { // Clicked on empty square or opponent piece (not a legal move)
                        clearPieceLift(); clearBoardHighlights(); selectedSquare = null; // Deselect
                    }
                }
            }
        }
    }

    function updateStatus() {
        if (!game) { statusEl.text("Game not initialized."); return; }

        let currentStatusText = '';
        const currentTurnColorDisplay = (game.turn() === 'w') ? 'White' : 'Black';
        turnEl.text(currentTurnColorDisplay);

        if (gameEndedManually) {
            currentStatusText = `Game Over: ${gameEndReason}`;
            if (gameEndReason.toLowerCase().includes("draw")) {
                statusEl.css('color', 'orange');
            } else if (gameEndReason.toLowerCase().includes("conceded")) {
                const playerColorName = actualPlayerColor === 'w' ? "White" : "Black";
                if (gameEndReason.includes(playerColorName + " conceded")) {
                    statusEl.css('color', 'red'); // Player conceded
                } else { // AI conceded (not implemented but for future) or other win
                    statusEl.css('color', 'lightgreen');
                }
            } else { // Other manual game endings
                statusEl.css('color', 'white');
            }
        } else if (game.in_checkmate()) {
            currentStatusText = `Game Over: ${currentTurnColorDisplay} is in checkmate.`;
            statusEl.css('color', 'red');
        } else if (game.in_draw()) {
            currentStatusText = 'Game Over: Draw';
            if (game.in_stalemate()) currentStatusText += ' (Stalemate)';
            if (game.in_threefold_repetition()) currentStatusText += ' (Threefold Repetition)';
            if (game.insufficient_material()) currentStatusText += ' (Insufficient Material)'; // Fixed typo
            statusEl.css('color', 'orange');
        } else { // Game ongoing
            const isEndgameForSearch = isEndgamePhaseForSearch(game);
            const usingDeeperFixedSearch = isEndgameForSearch && AI_ENDGAME_SEARCH_DEPTH > AI_SEARCH_DEPTH;
            let thinkingText = "OmniBot (Enhanced AI) is thinking";

            if (aiIsThinking && !aiOfferedDrawPendingPlayerResponse) { // Standard AI thinking, not waiting for draw response
                 if (usingDeeperFixedSearch) thinkingText += " (deep search)..."; else thinkingText += "...";
            }

            if (playerOfferedDrawPendingAIResponse) {
                currentStatusText = "Player offered draw. AI is considering...";
            } else if (aiOfferedDrawPendingPlayerResponse) {
                // The text is already set in aiDrawOfferControls span by makeAIMove or accept/decline handlers
                currentStatusText = aiDrawOfferControls.find('span').text(); // Keep it consistent
            } else { // Normal game flow
                currentStatusText = (game.turn() === actualPlayerColor) ? "Your turn" : (aiIsThinking ? thinkingText : "OmniBot's turn");
            }

            // Append check status if relevant and not overwriting a draw offer status
            if (game.in_check() && !aiOfferedDrawPendingPlayerResponse && !playerOfferedDrawPendingAIResponse) {
                currentStatusText += ` (${currentTurnColorDisplay} is in check).`;
                statusEl.css('color', 'DarkOrange'); // Specific color for check
            } else if (!aiOfferedDrawPendingPlayerResponse && !playerOfferedDrawPendingAIResponse) { // Only set default color if not in draw offer state
                 statusEl.css('color', '#ffc107'); // Default "ongoing game" color
            }
             // If in draw offer state, color might be handled by specific logic or default to #ffc107 if not in check
        }
        statusEl.text(currentStatusText);
        fenEl.text(game.fen());
        pgnEl.val(game.pgn({ max_width: 72, newline_char: '\n' }));
        pgnEl.scrollTop(pgnEl[0].scrollHeight); // Auto-scroll PGN

        // --- Button States ---
        const gameOver = game.game_over() || gameEndedManually;
        // Player can interact with board if it's their turn and no modal-like states (AI thinking/draw offers)
        // const canPlayerMakeMove = !gameOver && !aiIsThinking && !playerOfferedDrawPendingAIResponse && !aiOfferedDrawPendingPlayerResponse && game.turn() === actualPlayerColor;
        // Board interaction is implicitly handled by the conditions at the start of handleSquareClick

        // New Game button: disabled if AI is in a state waiting for player draw response (to avoid interrupting that flow)
        newGameButton.prop('disabled', aiIsThinking && aiOfferedDrawPendingPlayerResponse);

        // Undo button: disabled if game over, no history, or any "modal" AI/player state active
        undoButton.prop('disabled', gameOver || game.history().length === 0 || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse );

        // Offer Draw button: disabled if game over, AI's turn, or any "modal" AI/player state active
        offerDrawButton.prop('disabled', gameOver || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse || game.turn() !== actualPlayerColor);

        // Concede button: disabled if game over, or any "modal" AI/player state active
        concedeButton.prop('disabled', gameOver || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse);


        // Show/hide AI draw offer controls based on its specific pending state
        if (aiOfferedDrawPendingPlayerResponse) {
            aiDrawOfferControls.show();
        } else {
            aiDrawOfferControls.hide();
        }
    }

    function startNewGame() {
        if (aiIsThinking && aiOfferedDrawPendingPlayerResponse) { // If AI offered a draw and is waiting
            console.warn("AI is waiting for draw response, cannot start new game now.");
            statusEl.text("Please respond to AI's draw offer first.");
            return;
        }

        if (typeof Chess !== 'function') { statusEl.text("ERROR: Chess.js library not loaded."); return; }
        if (!playerColorSelect || playerColorSelect.length === 0) { statusEl.text("ERROR: UI element (playerColorSelect) missing."); return; }

        game = new Chess();
        aiIsThinking = false; // Reset AI thinking state
        clearPieceLift(); clearBoardHighlights(); selectedSquare = null; // Reset UI selections

        // Reset game state variables
        gameEndedManually = false;
        gameEndReason = '';
        playerOfferedDrawPendingAIResponse = false;
        aiOfferedDrawPendingPlayerResponse = false;
        aiOfferedDrawMoveSAN = null;
        // aiDrawOfferControls.hide(); // updateStatus will handle this

        playerChoosesColor = playerColorSelect.val();
        actualPlayerColor = (playerChoosesColor === 'random') ? (Math.random() < 0.5 ? 'w' : 'b') : playerChoosesColor.charAt(0);
        playerOrientation = (actualPlayerColor === 'w') ? 'white' : 'black';

        const boardConfig = {
            draggable: false, // Using custom click handling
            position: 'start',
            orientation: playerOrientation,
            pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
            // onSquareClick: handleSquareClick, // Bind click via jQuery delegation later for dynamically created board
        };

        if (board) { // If board already exists, just reconfigure and reset
            board.orientation(playerOrientation);
            board.position('start', false); // false means no animation
        } else { // First time setup
            board = Chessboard('board', boardConfig);
            $(window).resize(board.resize); // Make board responsive
            // Attach click handler to the board container, delegating to squares
            $('#board').on('click', '.square-55d63', function() {
                const clickedSquareName = $(this).attr('data-square');
                if (clickedSquareName) handleSquareClick(clickedSquareName);
            });
        }
        
        updateStatus(); // Call this before playing sound or making AI move
        playSound('game-start'); // This plays the notifySound for game start event

        const bgMusic = document.getElementById('backgroundMusic');
        if (bgMusic && typeof bgMusic.play === 'function') {
            bgMusic.volume = 0.3; // Optional: set volume for background music
            bgMusic.play().catch(e => console.warn("Background music play failed:", e));
        }


        // If it's AI's turn to start, make the first move
        if (!game.game_over() && game.turn() !== actualPlayerColor) {
            makeAIMove();
        } else if (!game.game_over()){
             // updateStatus would have set "Your turn" or similar, player starts
        }
    }

    function undoLastPlayerMove() {
        if (!game || game.history().length === 0 || aiIsThinking || game.game_over() || gameEndedManually) return;

        // Cancel any pending draw offers if undo is pressed
        if (aiOfferedDrawPendingPlayerResponse) {
            aiOfferedDrawPendingPlayerResponse = false;
            aiOfferedDrawMoveSAN = null;
            // aiDrawOfferControls.hide(); // updateStatus will handle this
        }
        if (playerOfferedDrawPendingAIResponse) {
            playerOfferedDrawPendingAIResponse = false;
        }
        aiIsThinking = false; // Reset AI state, as undo might change turn or require recalculation

        clearPieceLift(); clearBoardHighlights(); selectedSquare = null; // Reset UI state
        const historyLen = game.history().length;

        // Undo logic:
        // If AI just moved (player's turn now), undo AI's move and player's previous move. (2 undos)
        // If player just moved (AI's turn now), undo player's move. (1 undo)
        let movesToUndo = 0;
        if (game.turn() === actualPlayerColor && historyLen >= 2) { // AI just moved, it's player's turn. Undo AI then player.
            movesToUndo = 2;
        } else if (game.turn() !== actualPlayerColor && historyLen >= 1) { // Player just moved, it's AI's turn. Undo player.
            movesToUndo = 1;
        } else if (historyLen > 0) { // Fallback for safety, undo one move
             movesToUndo = 1;
        }

        if (movesToUndo === 0) return; // No moves to undo based on logic

        for (let i = 0; i < movesToUndo; i++) {
            game.undo();
        }

        if (board) board.position(game.fen());
        playSound('undo');
        updateStatus();

        // If after undo, it's AI's turn and game not over, make AI move.
        // This can happen if player undid their move, and it became AI's turn again.
        if (!game.game_over() && !gameEndedManually && game.turn() !== actualPlayerColor && !aiIsThinking) {
            makeAIMove();
        }
    }

    offerDrawButton.on('click', function() {
        if (!game || game.game_over() || gameEndedManually || game.turn() !== actualPlayerColor || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse) return;

        playerOfferedDrawPendingAIResponse = true;
        updateStatus(); // Show "AI is considering..."

        // Simulate AI thinking about the draw offer
        setTimeout(() => {
            if (!playerOfferedDrawPendingAIResponse) return; // Offer was cancelled (e.g., by undo or new game)

            const aiActualColor = (actualPlayerColor === 'w' ? 'b' : 'w');
            // AI evaluates the position from its perspective to decide on the draw
            const currentEvalForAI = evaluateBoard(game, aiActualColor); // Score for AI

            if (currentEvalForAI < AI_ACCEPTS_PLAYER_DRAW_OFFER_THRESHOLD) { // If AI is not clearly winning (or is losing)
                gameEndedManually = true;
                gameEndReason = "Draw by agreement (Player offered, AI accepted).";
                playSound('game-start'); // Notify sound for game end
                // statusEl.text(gameEndReason + ` AI eval: ${currentEvalForAI.toFixed(0)}.`); // updateStatus will handle
            } else {
                // AI rejects the draw
                // statusEl.text(`AI rejected draw offer (AI eval: ${currentEvalForAI.toFixed(0)}). Your turn.`); // updateStatus will handle
                // No explicit message here, updateStatus will revert to "Your turn" or similar
            }
            playerOfferedDrawPendingAIResponse = false; // Reset flag
            updateStatus(); // Update UI based on outcome
        }, 1000 + Math.random() * 1000); // AI "thinks" for 1-2 seconds
    });

    concedeButton.on('click', function() {
        if (!game || game.game_over() || gameEndedManually || aiIsThinking || playerOfferedDrawPendingAIResponse || aiOfferedDrawPendingPlayerResponse) return;

        if (confirm("Are you sure you want to concede the game?")) {
            gameEndedManually = true;
            const winner = (actualPlayerColor === 'w' ? 'Black' : 'White');
            const loserColorName = actualPlayerColor === 'w' ? "White" : "Black";
            gameEndReason = `${loserColorName} conceded. ${winner} wins.`;
            playSound('game-start'); // Notify sound for game end
            updateStatus();
        }
    });

    acceptAIDrawButton.on('click', function() {
        if (!aiOfferedDrawPendingPlayerResponse) return; // Should not happen if button is visible

        gameEndedManually = true;
        gameEndReason = "Draw by agreement (AI offered, Player accepted).";
        playSound('game-start'); // Notify sound for game end

        aiOfferedDrawPendingPlayerResponse = false;
        aiOfferedDrawMoveSAN = null; // Clear the stored move
        // aiDrawOfferControls.hide(); // updateStatus handles this
        aiIsThinking = false; // AI is no longer "thinking" about the draw or its next move in this context
        updateStatus();
    });

    declineAIDrawButton.on('click', function() {
        if (!aiOfferedDrawPendingPlayerResponse || !aiOfferedDrawMoveSAN) return; // Should have a stored move

        // aiDrawOfferControls.hide(); // updateStatus handles this
        const moveSANToMake = aiOfferedDrawMoveSAN; // Copy before resetting states

        aiOfferedDrawPendingPlayerResponse = false; // Reset state: player has responded
        aiOfferedDrawMoveSAN = null;                // Clear stored move
        // aiIsThinking remains true because AI will now make its move.
        // Or rather, set it to true to indicate action.
        aiIsThinking = true;

        updateStatus(); // Reflect that player has responded, AI is "proceeding"

        // Short delay to allow status update to render, then AI makes its stored move.
        setTimeout(() => {
            const moveResult = game.move(moveSANToMake);
            if (moveResult) {
                if (board) board.position(game.fen());
                playSound('move-opponent');
                if (game.in_check()) playSound('check');
            } else {
                // This is a critical error if the stored move was invalid
                console.error("[AI DeclineDraw] ERROR: chess.js rejected AI's stored move after draw decline:", moveSANToMake, "FEN:", game.fen());
                // Potentially try a fallback move here if this happens
            }
            aiIsThinking = false; // AI's action (making the move) is complete
            updateStatus();
            // If it's player's turn now and game not over, player can play.
            // If game ended by AI's move (e.g., checkmate), updateStatus covers this.
        }, 50); // Brief delay for UI
    });


    newGameButton.on('click', startNewGame);
    undoButton.on('click', undoLastPlayerMove);

    // Initial game start delayed slightly to ensure all DOM elements are ready
    setTimeout(() => {
        if (typeof Chess === 'function') {
            startNewGame();
        } else {
            console.error("Delayed Start: Chess.js library failed to load or initialize.");
            statusEl.text("Error: Chess.js failed to load. Check console and library paths.");
        }
    }, 300);
});

// --- END OF FILE script.js ---
