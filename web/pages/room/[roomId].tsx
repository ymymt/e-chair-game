import React from "react";

import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import Room from "@/features/room/page/Room";
import { getRoom, updateRoom } from "@/libs/firestore";
import { isSuccessfulGetRoomResponse } from "@/utils/room";
import type { GameRoom } from "@/types/room";

type RoomPageProps = {
  initialData: {
    room: GameRoom;
    userId: string;
    roomId: string;
  };
};

export default function RoomPage({ initialData }: RoomPageProps) {
  return <Room initialData={initialData} />;
}

export const getServerSideProps: GetServerSideProps<RoomPageProps> = async (
  context: GetServerSidePropsContext
) => {
  const userId = context.req.cookies.userId;
  const roomId = context.req.cookies.roomId;
  const pathRoomId = context.params?.roomId;

  if (
    !userId ||
    !roomId ||
    !pathRoomId ||
    typeof pathRoomId !== "string" ||
    pathRoomId !== roomId
  ) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const room = await getRoom(roomId);
  if (!isSuccessfulGetRoomResponse(room)) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const isPlayer = room.data.players.some((player) => player.id === userId);
  if (!isPlayer) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const playersData = room.data.players.map((player) => {
    if (player.id === userId) {
      return {
        ...player,
        ready: true,
      };
    }
    return player;
  });

  const updateRes = await updateRoom(roomId, {
    ...room.data,
    players: playersData,
  });

  if (updateRes.status !== 200 || !updateRes.data) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialData: {
        room: updateRes.data as GameRoom,
        userId,
        roomId,
      },
    },
  };
};
