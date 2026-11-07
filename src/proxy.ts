import { NextResponse, type NextRequest } from "next/server";
import { MENSAJES } from "@/lib/reglas/errores";

export function proxy(request: NextRequest) {
  if (!request.cookies.has("elcaleno_session")) {
    // API del inventario: 401 en JSON (plan, sección 11.1) en vez de redirigir.
    if (request.nextUrl.pathname.startsWith("/api/inventario")) {
      return NextResponse.json(
        { ok: false, error: { codigo: "NO_AUTORIZADO", mensaje: MENSAJES.NO_AUTORIZADO, detalles: null } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/status/:path*",
    "/inventario/:path*",
    "/api/inventario/:path*",
  ],
};
