import { getFirestoreApp } from "@/libs/firestore/config";
import { GameRoom } from "@/types/room";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

export function useRoomWatcher({
  roomId,
  setRoomData,
  previousRoomDataRef,
}: {
  roomId: string | null;
  setRoomData: React.Dispatch<React.SetStateAction<GameRoom | null>>;
  previousRoomDataRef: React.MutableRefObject<GameRoom | null>;
}) {
  useEffect(() => {
    const watchRoom = async () => {
      const db = await getFirestoreApp();
      const docRef = doc(db, "rooms", roomId!);
      const unsubscribe = onSnapshot(docRef, (doc) => {
        const data = doc.data() as GameRoom;

        setRoomData((prev) => {
          if (data.round.phase === "activating") {
            previousRoomDataRef.current = prev;
          }
          return data;
        });
      });
      return unsubscribe;
    };

    const unsubScribePromise = watchRoom();

    return () => {
      unsubScribePromise.then((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
