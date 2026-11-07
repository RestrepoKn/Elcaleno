// Buzón de sugerencias (extensión M5): los encargados escriben; el administrador lee todas.

import { LIMITE_LISTADO } from "@/lib/config/inventario";
import { conErrores, filas } from "@/lib/datos/comun";
import type { Sugerencia } from "@/lib/datos/tipos";
import { ErrorDeNegocio } from "@/lib/reglas/errores";
import { validarSugerencia, type CategoriaSugerencia } from "@/lib/reglas/sugerencias";

const SELECT_SUGERENCIA = `
  select id, autor_email as "autorEmail", autor_nombre as "autorNombre", categoria, mensaje,
         leida, leida_at as "leidaAt", created_at as "createdAt"
  from sugerencias`;

function idValido(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

/** Guarda la sugerencia con el nombre de la cuenta (si no hay nombre, el correo). */
export async function crearSugerencia(
  autorEmail: string,
  d: { categoria: CategoriaSugerencia; mensaje: string },
): Promise<Sugerencia> {
  validarSugerencia(d);
  return conErrores(async () => {
    const [cuenta] = await filas<{ name: string }>(null, "select name from users where email = $1", [autorEmail]);
    const [creada] = await filas<Sugerencia>(
      null,
      `with nueva as (
         insert into sugerencias (autor_email, autor_nombre, categoria, mensaje)
         values ($1, $2, $3, $4)
         returning *
       )
       select id, autor_email as "autorEmail", autor_nombre as "autorNombre", categoria, mensaje,
              leida, leida_at as "leidaAt", created_at as "createdAt"
       from nueva`,
      [autorEmail, (cuenta?.name ?? autorEmail).slice(0, 120), d.categoria, d.mensaje.trim()],
    );
    if (!creada) throw new Error("La inserción de la sugerencia no devolvió la fila.");
    return creada;
  });
}

/** Bandeja del administrador: las más recientes primero. */
export async function listarSugerencias(f: { soloNoLeidas?: boolean | undefined } = {}): Promise<Sugerencia[]> {
  const donde = f.soloNoLeidas ? "where not leida" : "";
  return filas<Sugerencia>(null, `${SELECT_SUGERENCIA} ${donde} order by created_at desc, id desc limit $1`, [LIMITE_LISTADO]);
}

/** Lo que ve el encargado: solo sus propias sugerencias. */
export async function listarMisSugerencias(autorEmail: string): Promise<Sugerencia[]> {
  return filas<Sugerencia>(
    null,
    `${SELECT_SUGERENCIA} where autor_email = $1 order by created_at desc, id desc limit $2`,
    [autorEmail, LIMITE_LISTADO],
  );
}

export async function contarSugerenciasNoLeidas(): Promise<number> {
  const [fila] = await filas<{ n: number }>(null, "select count(*) as n from sugerencias where not leida");
  return fila?.n ?? 0;
}

export async function marcarSugerencia(id: number, leida: boolean): Promise<Sugerencia> {
  const [fila] = idValido(id)
    ? await filas<Sugerencia>(
        null,
        `update sugerencias set leida = $2, leida_at = case when $2 then coalesce(leida_at, now()) else null end
         where id = $1
         returning id, autor_email as "autorEmail", autor_nombre as "autorNombre", categoria, mensaje,
                   leida, leida_at as "leidaAt", created_at as "createdAt"`,
        [id, leida],
      )
    : [];
  if (!fila) throw new ErrorDeNegocio("SUGERENCIA_NO_ENCONTRADA");
  return fila;
}

export async function eliminarSugerencia(id: number): Promise<void> {
  const borradas = idValido(id) ? await filas(null, "delete from sugerencias where id = $1 returning id", [id]) : [];
  if (borradas.length === 0) throw new ErrorDeNegocio("SUGERENCIA_NO_ENCONTRADA");
}
