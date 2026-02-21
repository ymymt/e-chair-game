import React from 'react';
import { Layout } from '@/components/Layout';
import Room from '@/features/room/page/Room';

var firestoreModule = require('@/libs/firestore');
var roomUtils = require('@/utils/room');

function RoomPage(props) {
  if (!props.initialData || !props.initialData.room) {
    return null;
  }
  return (
    <Layout>
      <Room initialData={props.initialData} />
    </Layout>
  );
}

RoomPage.getInitialProps = async function(context) {
  // getInitialProps runs on server for initial load, client for navigation
  var req = context.req;
  var query = context.query;

  // On client-side, we cannot access cookies directly
  if (!req) {
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  var cookies = req.cookies || {};
  var userId = cookies.userId;
  var roomId = cookies.roomId;
  var pathRoomId = query.roomId;

  if (
    !userId ||
    !roomId ||
    !pathRoomId ||
    pathRoomId !== roomId
  ) {
    // Redirect to home
    if (context.res) {
      context.res.writeHead(302, { Location: '/' });
      context.res.end();
    }
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  var room = await firestoreModule.getRoom(roomId);
  if (!roomUtils.isSuccessfulGetRoomResponse(room)) {
    if (context.res) {
      context.res.writeHead(302, { Location: '/' });
      context.res.end();
    }
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  var isPlayer = false;
  for (var i = 0; i < room.data.players.length; i++) {
    if (room.data.players[i].id === userId) {
      isPlayer = true;
      break;
    }
  }

  if (!isPlayer) {
    if (context.res) {
      context.res.writeHead(302, { Location: '/' });
      context.res.end();
    }
    return { initialData: { room: null, userId: null, roomId: null } };
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

  var updateRes = await firestoreModule.updateRoom(roomId, {
    players: playersData,
  });

  if (updateRes.status !== 200 || !updateRes.data) {
    if (context.res) {
      context.res.writeHead(302, { Location: '/' });
      context.res.end();
    }
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  return {
    initialData: {
      room: updateRes.data,
      userId: userId,
      roomId: roomId,
    },
  };
};

export default RoomPage;
