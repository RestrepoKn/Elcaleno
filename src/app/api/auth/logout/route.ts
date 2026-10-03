import { NextResponse } from "next/server";
import { deleteUserSession } from "@/lib/auth";

export async function POST(request: Request) {
  await deleteUserSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}