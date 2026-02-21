var firestore = require('firebase/firestore');
var nanoid = require('nanoid');
var config = require('./config');

var createRoom = async function() {
  var alphanumeric = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var db = await config.getFirestoreApp();

  try {
    var newRoomId = await createRoomId();
    var createrId = nanoid.customAlphabet(alphanumeric, 5)();
    await firestore.setDoc(firestore.doc(db, 'rooms', newRoomId), {
      status: 'waiting',
      createrId: createrId,
      round: {
        count: 1,
        turn: 'top',
        phase: 'setting',
        attackerId: createrId,
        electricChair: null,
        seatedChair: null,
        result: {
          status: null,
          confirmedIds: [],
        },
      },
      players: [
        {
          id: createrId,
          point: 0,
          shockedCount: 0,
          ready: false,
        },
      ],
      remainingChairs: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    });
    return { status: 200, roomId: newRoomId, userId: createrId };
  } catch (e) {
    if (e instanceof Error) {
      return { status: 500, error: e.message };
    }
    return { status: 500, error: 'ルーム作成に失敗しました' };
  }
};

var joinRoom = async function(roomId) {
  var db = await config.getFirestoreApp();
  var alphanumeric = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var docRef = firestore.doc(db, 'rooms', roomId);

  try {
    var docSnap = await firestore.getDoc(docRef);
    if (!docSnap.exists()) {
      return { status: 404, error: 'ルームが見つかりませんでした' };
    }

    var players = docSnap.data().players;
    if (Object.keys(players).length >= 2) {
      return { status: 400, error: 'ルームは満員です' };
    }
    var userId = nanoid.customAlphabet(alphanumeric, 5)();
    var player = {
      id: userId,
      point: 0,
      shockedCount: 0,
      ready: false,
    };
    players.push(player);
    await firestore.updateDoc(docRef, {
      players: players,
    });
    return { status: 200, roomId: roomId, userId: userId };
  } catch (e) {
    if (e instanceof Error) {
      return { status: 500, error: e.message };
    }
    return { status: 500, error: 'ルーム参加に失敗しました' };
  }
};

var updateRoom = async function(roomId, data) {
  var db = await config.getFirestoreApp();
  var docRef = firestore.doc(db, 'rooms', roomId);

  try {
    await firestore.updateDoc(docRef, data);
    var docSnap = await firestore.getDoc(docRef);
    return { status: 200, data: docSnap.data() };
  } catch (e) {
    if (e instanceof Error) {
      return { status: 500, error: e.message };
    }
    return { status: 500, error: 'ルーム更新に失敗しました' };
  }
};

var getRoom = async function(roomId) {
  var db = await config.getFirestoreApp();
  var docRef = firestore.doc(db, 'rooms', roomId);
  var docSnap = await firestore.getDoc(docRef);
  if (docSnap.exists()) {
    return { status: 200, data: docSnap.data() };
  } else {
    return { status: 404, error: 'Room not found' };
  }
};

var watchRoom = async function(roomId) {
  var db = await config.getFirestoreApp();
  var docRef = firestore.doc(db, 'rooms', roomId);

  var unsubscribe = firestore.onSnapshot(docRef, function(doc) {
    return doc.data();
  });

  return unsubscribe;
};

var createRoomId = async function() {
  var db = await config.getFirestoreApp();
  var alphanumeric = '23456789abcdefghjklmnpqrstuvwxyz';
  var newId = nanoid.customAlphabet(alphanumeric, 7)();
  var snapshot = await firestore.getDoc(firestore.doc(db, 'rooms', newId));
  if (snapshot.exists()) {
    return createRoomId();
  }
  return newId;
};

var confirmTurnResult = async function(roomId, userId, getNextRoundData) {
  var db = await config.getFirestoreApp();
  var docRef = firestore.doc(db, 'rooms', roomId);

  try {
    var result = await firestore.runTransaction(db, async function(transaction) {
      var docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        return { status: 404, error: 'Room not found' };
      }

      var room = docSnap.data();
      var round = room.round;

      if (round.result.confirmedIds.indexOf(userId) !== -1) {
        return { status: 403, error: 'すでに確認済みです' };
      }

      var newConfirmedIds = round.result.confirmedIds.concat([userId]);
      var nextData = getNextRoundData(round, newConfirmedIds);

      if (nextData === null) {
        return { status: 400, error: '不正なリクエストです' };
      }

      transaction.update(docRef, nextData);

      var merged = {};
      var keys = Object.keys(room);
      for (var i = 0; i < keys.length; i++) {
        merged[keys[i]] = room[keys[i]];
      }
      var nextKeys = Object.keys(nextData);
      for (var j = 0; j < nextKeys.length; j++) {
        merged[nextKeys[j]] = nextData[nextKeys[j]];
      }

      return { status: 200, data: merged };
    });

    return result;
  } catch (e) {
    if (e instanceof Error) {
      return { status: 500, error: e.message };
    }
    return { status: 500, error: 'ターン確認に失敗しました' };
  }
};

module.exports = {
  createRoom: createRoom,
  joinRoom: joinRoom,
  updateRoom: updateRoom,
  getRoom: getRoom,
  watchRoom: watchRoom,
  confirmTurnResult: confirmTurnResult,
};
