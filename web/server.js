require('dotenv').config({ path: '.env.local' });

const express = require('express');
const next = require('next');
const cookieParser = require('cookie-parser');
const { serialize } = require('cookie');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Firebase/Firestore imports are loaded on first use
var firestoreModule = null;
var roomUtilsModule = null;

async function getFirestore() {
  if (!firestoreModule) {
    firestoreModule = require('./libs/firestore');
  }
  return firestoreModule;
}

function getRoomUtils() {
  if (!roomUtilsModule) {
    roomUtilsModule = require('./utils/room');
  }
  return roomUtilsModule;
}

app.prepare().then(() => {
  const server = express();

  server.use(express.json());
  server.use(cookieParser());

  // ==========================================
  // API Routes (migrated from pages/api/room/)
  // ==========================================

  // POST /api/room/create
  server.post('/api/room/create', async (req, res) => {
    try {
      const firestore = await getFirestore();
      const result = await firestore.createRoom();
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      res.setHeader('Set-Cookie', [
        serialize('roomId', result.roomId, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        }),
        serialize('userId', result.userId, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        }),
      ]);

      res.status(200).json({ roomId: result.roomId, userId: result.userId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /api/room/join
  server.post('/api/room/join', async (req, res) => {
    try {
      const roomId = req.body && req.body.roomId;
      if (!roomId) {
        return res.status(400).json({ error: 'ルームIDを入力してください' });
      }

      const firestore = await getFirestore();
      const result = await firestore.joinRoom(roomId);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      res.setHeader('Set-Cookie', [
        serialize('roomId', result.roomId, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        }),
        serialize('userId', result.userId, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        }),
      ]);

      res.status(200).json({ roomId: result.roomId, userId: result.userId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /api/room/select-chair
  server.post('/api/room/select-chair', async (req, res) => {
    try {
      const roomId = req.body && req.body.roomId;
      const roundData = req.body && req.body.roundData;

      if (!roomId || !roundData) {
        return res.status(400).json({ status: 400, error: 'ルームIDとラウンドデータを指定してください' });
      }

      const firestore = await getFirestore();
      const result = await firestore.updateRoom(roomId, { round: roundData });
      if (result.status !== 200) {
        return res.status(result.status).json({ status: result.status, error: result.error });
      }

      res.status(200).json({ status: 200, error: '' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: 500, error: 'Internal Server Error' });
    }
  });

  // POST /api/room/activate
  server.post('/api/room/activate', async (req, res) => {
    try {
      const roomId = req.body && req.body.roomId;
      if (!roomId) {
        return res.status(400).json({ status: 400, error: 'ルームIDを指定してください' });
      }

      const firestore = await getFirestore();
      const { isSuccessfulGetRoomResponse } = getRoomUtils();
      const room = await firestore.getRoom(roomId);

      if (!isSuccessfulGetRoomResponse(room)) {
        return res.status(room.status).json({ status: room.status, error: room.error });
      }

      var players = room.data.players;
      var round = room.data.round;
      var isShocked = round.electricChair === round.seatedChair;

      var updatedPlayers = players.map(function(player) {
        if (player.id === round.attackerId) {
          return {
            id: player.id,
            point: isShocked ? 0 : player.point + (round.seatedChair || 0),
            shockedCount: isShocked ? player.shockedCount + 1 : player.shockedCount,
            ready: player.ready,
          };
        }
        return player;
      });

      var remainingChairs = isShocked
        ? room.data.remainingChairs
        : room.data.remainingChairs.filter(function(chair) { return chair !== round.seatedChair; });

      var winnerId = null;
      var attackerId = round.attackerId;
      var defenderId = null;
      for (var i = 0; i < room.data.players.length; i++) {
        if (room.data.players[i].id !== attackerId) {
          defenderId = room.data.players[i].id;
          break;
        }
      }

      for (var j = 0; j < updatedPlayers.length; j++) {
        if (updatedPlayers[j].point >= 40) {
          winnerId = round.attackerId;
          break;
        }
        if (updatedPlayers[j].shockedCount === 3) {
          winnerId = defenderId;
          break;
        }
      }

      if (!winnerId && remainingChairs.length === 1) {
        var winner = updatedPlayers.reduce(function(prev, current) {
          if (current.point > prev.point) {
            return current;
          } else if (current.point === prev.point) {
            return { id: 'draw' };
          }
          return prev;
        });
        winnerId = winner.id;
      }

      var data = {
        players: updatedPlayers,
        remainingChairs: remainingChairs,
        winnerId: winnerId,
        round: {
          count: round.count,
          turn: round.turn,
          attackerId: round.attackerId,
          phase: 'result',
          electricChair: round.electricChair,
          seatedChair: round.seatedChair,
          result: {
            status: isShocked ? 'shocked' : 'safe',
            confirmedIds: round.result.confirmedIds,
            shownResult: round.result.shownResult || false,
          },
        },
      };

      var updateResult = await firestore.updateRoom(roomId, data);
      if (updateResult.status !== 200) {
        return res.status(updateResult.status).json({ status: updateResult.status, error: updateResult.error });
      }

      res.status(200).json({ status: 200, error: '' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: 500, error: 'Internal Server Error' });
    }
  });

  // POST /api/room/change-turn
  server.post('/api/room/change-turn', async (req, res) => {
    try {
      const roomId = req.body && req.body.roomId;
      const userId = req.body && req.body.userId;

      if (!roomId || !userId) {
        return res.status(400).json({ status: 400, error: 'roomId と userId を指定してください' });
      }

      const firestore = await getFirestore();
      const { plainRoundData } = getRoomUtils();

      const result = await firestore.confirmTurnResult(roomId, userId, function(round, confirmedIds) {
        if (confirmedIds.length === 1) {
          return {
            round: {
              count: round.count,
              turn: round.turn,
              attackerId: round.attackerId,
              phase: round.phase,
              electricChair: round.electricChair,
              seatedChair: round.seatedChair,
              result: {
                status: round.result.status,
                confirmedIds: confirmedIds,
                shownResult: true,
              },
            },
          };
        }

        if (confirmedIds.length === 2) {
          var nextAttackerId = null;
          for (var i = 0; i < confirmedIds.length; i++) {
            if (confirmedIds[i] !== round.attackerId) {
              nextAttackerId = confirmedIds[i];
              break;
            }
          }
          if (!nextAttackerId) {
            nextAttackerId = confirmedIds[0];
          }

          if (round.turn === 'top') {
            return {
              round: {
                count: round.count,
                turn: 'bottom',
                attackerId: nextAttackerId,
                phase: plainRoundData.round.phase,
                electricChair: plainRoundData.round.electricChair,
                seatedChair: plainRoundData.round.seatedChair,
                result: {
                  status: plainRoundData.round.result.status,
                  confirmedIds: plainRoundData.round.result.confirmedIds,
                  shownResult: plainRoundData.round.result.shownResult,
                },
              },
            };
          }

          return {
            round: {
              count: round.count + 1,
              turn: 'top',
              attackerId: nextAttackerId,
              phase: plainRoundData.round.phase,
              electricChair: plainRoundData.round.electricChair,
              seatedChair: plainRoundData.round.seatedChair,
              result: {
                status: plainRoundData.round.result.status,
                confirmedIds: plainRoundData.round.result.confirmedIds,
                shownResult: plainRoundData.round.result.shownResult,
              },
            },
          };
        }

        return null;
      });

      if (result.status !== 200) {
        return res.status(result.status).json({ status: result.status, error: result.error });
      }

      res.status(200).json({ status: 200, error: '' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: 500, error: 'Internal Server Error' });
    }
  });

  // ==========================================
  // Page Routes
  // ==========================================

  // Dynamic room route: /room/:roomId
  server.get('/room/:roomId', (req, res) => {
    const actualPage = '/room';
    const queryParams = { roomId: req.params.roomId };
    app.render(req, res, actualPage, queryParams);
  });

  // All other routes handled by Next.js
  server.get('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:' + port);
  });
});
