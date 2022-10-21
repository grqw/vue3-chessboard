import { read } from 'chessground/fen';
import { possibleMoves, shortToLongColor, getThreats } from '@/helper/Board';
import type { ChessInstance } from 'chess.js';
import type { Api } from 'chessground/api';
import type { BoardState } from '@/typings/BoardState';
import type { LichessOpening } from '@/typings/BoardAPI';

/**
 * class for modifying and reading data from the board, \
 * extends the lichess chessground api & chess.js api \
 * lichess documentation: https://github.com/lichess-org/chessground/blob/master/src/api.ts \
 * chess.js documentation: https://github.com/jhlywa/chess.js/blob/master/README.md
 */
export class BoardApi {
  constructor(
    public game: ChessInstance,
    public board: Api,
    public boardState: BoardState
  ) {}

  /**
   * Reset the board to the initial starting position.
   */
  resetBoard() {
    this.game.reset();
    this.board.set(this.boardState.boardConfig);
    this.board.state.check = undefined;
    this.board.selectSquare(null);
    if (this.boardState.showThreats) {
      this.board.setShapes(getThreats(this.game.moves({ verbose: true })));
    }
  }

  /**
   * undo last Move, if possible
   */
  undoLastMove() {
    const lastMove = this.game.undo();
    if (lastMove == null) return;
    this.board.state.pieces = read(this.game.fen());

    this.board.state.turnColor = shortToLongColor(lastMove.color);
    if (history.length === 1) {
      this.board.state.lastMove = undefined;
    } else {
      this.board.state.lastMove = [lastMove?.from, lastMove?.to];
    }

    this.board.state.movable.color = this.board.state.turnColor;
    this.board.state.movable.dests = possibleMoves(this.game);
    this.board.redrawAll();

    if (this.boardState.showThreats) {
      // redraw threats in new position if enabled
      this.board.setShapes(getThreats(this.game.moves({ verbose: true })));
    }
  }

  /**
   * returns the current material count for white, black and the diff.
   * If diff > 0 white is leading, else black.
   */
  getMaterialCount() {
    const pieces = this.board.state.pieces;
    const pieceToNum = new Map([
      ['pawn', 1],
      ['knight', 3],
      ['bishop', 3],
      ['rook', 5],
      ['queen', 9],
      ['king', 0],
    ]);

    const materialCount = {
      materialWhite: 0,
      materialBlack: 0,
      materialDiff: 0,
    };

    pieces.forEach((piece) => {
      if (piece.color === 'white') {
        materialCount.materialWhite += pieceToNum.get(piece.role) || 0;
      } else {
        materialCount.materialBlack += pieceToNum.get(piece.role) || 0;
      }
    });
    materialCount.materialDiff =
      materialCount.materialWhite - materialCount.materialBlack;

    return materialCount;
  }

  /**
   * enable drawing of threats/possible moves on the board
   */
  showThreats() {
    this.boardState.showThreats = true;
    this.board.setShapes(getThreats(this.game.moves({ verbose: true })));
  }

  /**
   * disable drawing of threats/possible moves on the board
   */
  hideThreats() {
    this.boardState.showThreats = false;
    this.board.setShapes([]);
  }

  /**
   * toggle drawing of threats/possible moves on the board
   */
  toggleThreats() {
    this.boardState.showThreats = !this.boardState.showThreats;
    if (this.boardState.showThreats) {
      this.board.setShapes(getThreats(this.game.moves({ verbose: true })));
    } else {
      this.board.setShapes([]);
    }
  }

  /**
   * returns the opening name for the current position
   */
  async getOpeningName() {
    try {
      const movesArr: string[] = [];
      const history = this.game.history({ verbose: true });
      history.forEach((move) => {
        movesArr.push(move.from + move.to);
      });
      const moves = movesArr.join(',');

      const res = await fetch(
        `https://explorer.lichess.ovh/masters?play=${moves}`
      );
      const data: LichessOpening = await res.json();

      return data.opening?.name ?? null;
    } catch (_) {
      return null;
    }
  }
}

export default BoardApi;
