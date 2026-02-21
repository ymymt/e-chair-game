import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get("userId") as string | undefined;
  const roomId = request.cookies.get("roomId") as string | undefined;
  const pathRoomId = request.nextUrl.pathname.split("/").pop();

  if (!userId || !roomId || roomId !== pathRoomId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/room/:roomId"],
};
