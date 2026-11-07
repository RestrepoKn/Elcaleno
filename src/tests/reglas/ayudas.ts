import { expect } from "vitest";
import { ErrorDeNegocio, type CodigoError } from "@/lib/reglas/errores";

/** Ejecuta fn y comprueba que lanza un ErrorDeNegocio con el código indicado. */
export function esperarCodigo(fn: () => unknown, codigo: CodigoError): void {
  let capturado: unknown = null;
  try {
    fn();
  } catch (error) {
    capturado = error;
  }
  expect(capturado, `se esperaba el error ${codigo}`).toBeInstanceOf(ErrorDeNegocio);
  expect((capturado as ErrorDeNegocio).codigo).toBe(codigo);
}
