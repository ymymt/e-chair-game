require('dotenv').config({ path: '.env.local' });

var express = require('express');
var cookieParser = require('cookie-parser');
var serialize = require('cookie').serialize;
var path = require('path');

var dev = process.env.NODE_ENV !== 'production';

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

var server = express();

server.use(express.json());
server.use(cookieParser());

// Dev: webpack-dev-middleware for bundle (must be before express.static to serve fresh in-memory bundle)
if (dev) {
  var webpack = require('webpack');
  var webpackDevMiddleware = require('webpack-dev-middleware');
  var webpackConfig = require('./webpack.config');
  var compiler = webpack(webpackConfig);
  server.use(webpackDevMiddleware(compiler, {
    publicPath: '/static/',
    stats: { colors: true },
  }));
}

// Static files
server.use('/static', express.static(path.join(__dirname, 'static')));

// ==========================================
// API Routes
// ==========================================

// POST /api/room/create
server.post('/api/room/create', async function(req, res) {
  try {
    var firestore = await getFirestore();
    var result = await firestore.createRoom();
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
server.post('/api/room/join', async function(req, res) {
  try {
    var roomId = req.body && req.body.roomId;
    if (!roomId) {
      return res.status(400).json({ error: 'ルームIDを入力してください' });
    }

    var firestore = await getFirestore();
    var result = await firestore.joinRoom(roomId);
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
server.post('/api/room/select-chair', async function(req, res) {
  try {
    var roomId = req.body && req.body.roomId;
    var roundData = req.body && req.body.roundData;

    if (!roomId || !roundData) {
      return res.status(400).json({ status: 400, error: 'ルームIDとラウンドデータを指定してください' });
    }

    var firestore = await getFirestore();
    var result = await firestore.updateRoom(roomId, { round: roundData });
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
server.post('/api/room/activate', async function(req, res) {
  try {
    var roomId = req.body && req.body.roomId;
    if (!roomId) {
      return res.status(400).json({ status: 400, error: 'ルームIDを指定してください' });
    }

    var firestore = await getFirestore();
    var isSuccessfulGetRoomResponse = getRoomUtils().isSuccessfulGetRoomResponse;
    var room = await firestore.getRoom(roomId);

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
server.post('/api/room/change-turn', async function(req, res) {
  try {
    var roomId = req.body && req.body.roomId;
    var userId = req.body && req.body.userId;

    if (!roomId || !userId) {
      return res.status(400).json({ status: 400, error: 'roomId と userId を指定してください' });
    }

    var firestore = await getFirestore();
    var plainRoundData = getRoomUtils().plainRoundData;

    var result = await firestore.confirmTurnResult(roomId, userId, function(round, confirmedIds) {
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

// GET /api/room/:roomId/init — replaces getInitialProps from pages/room.js
server.get('/api/room/:roomId/init', async function(req, res) {
  try {
    var cookies = req.cookies || {};
    var userId = cookies.userId;
    var roomId = cookies.roomId;
    var pathRoomId = req.params.roomId;

    if (!userId || !roomId || !pathRoomId || pathRoomId !== roomId) {
      return res.json({ status: 401 });
    }

    var firestore = await getFirestore();
    var isSuccessfulGetRoomResponse = getRoomUtils().isSuccessfulGetRoomResponse;

    var room = await firestore.getRoom(roomId);
    if (!isSuccessfulGetRoomResponse(room)) {
      return res.json({ status: 401 });
    }

    var isPlayer = false;
    for (var i = 0; i < room.data.players.length; i++) {
      if (room.data.players[i].id === userId) {
        isPlayer = true;
        break;
      }
    }

    if (!isPlayer) {
      return res.json({ status: 401 });
    }

    var playersData = room.data.players.map(function(player) {
      if (player.id === userId) {
        return {
          id: player.id,
          point: player.point,
          shockedCount: player.shockedCount,
          ready: true,
        };
      }
      return player;
    });

    var updateRes = await firestore.updateRoom(roomId, {
      players: playersData,
    });

    if (updateRes.status !== 200 || !updateRes.data) {
      return res.json({ status: 401 });
    }

    res.json({
      status: 200,
      data: {
        room: updateRes.data,
        userId: userId,
        roomId: roomId,
      },
    });
  } catch (e) {
    console.error(e);
    res.json({ status: 500 });
  }
});

// ==========================================
// Page Routes
// ==========================================

// Room pages and top page all serve index.html
server.get('/room/:roomId', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

var port = process.env.PORT || 3000;
server.listen(port, function(err) {
  if (err) throw err;
  console.log('> Ready on http://localhost:' + port);
});
