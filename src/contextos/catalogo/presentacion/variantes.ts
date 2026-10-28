import { BadRequestException } from '@nestjs/common';

// La clave es estable para conservar los SKU de las variantes existentes.
export type AtributosVariante = Record<string, string>;
export function claveVariante(atributos: AtributosVariante): string {
  return JSON.stringify(Object.entries(atributos).sort(([a], [b]) => a.localeCompare(b)));
}

export function combinacionesVariantes(details: Record<string, unknown>): AtributosVariante[] {
  let grupos = details.atributosVariantes;
  if (grupos === undefined) {
    const colores = details.colores as string[];
    const capacidades = details.capacidades as string[];
    if (!colores?.length || !capacidades?.length) return [];
    grupos = [{ nombre:'Color', valores:colores }, { nombre:'Capacidad', valores:capacidades }];
  }
  if (!Array.isArray(grupos) || grupos.length > 3) throw new BadRequestException('Usa hasta 3 atributos de variante.');
  const nombres = new Set<string>();
  let combinaciones: AtributosVariante[] = [{}];
  for (const grupo of grupos) {
    if (!grupo || typeof grupo !== 'object' || Array.isArray(grupo)) throw new BadRequestException('El atributo de variante no es válido.');
    const { nombre, valores } = grupo as { nombre: unknown; valores: unknown };
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 50 || !Array.isArray(valores) || !valores.length || valores.length > 20) throw new BadRequestException('Cada atributo requiere un nombre y entre 1 y 20 valores.');
    const key = nombre.trim().toLocaleLowerCase('es');
    if (nombres.has(key)) throw new BadRequestException('Los nombres de atributos no pueden repetirse.');
    nombres.add(key);
    const valoresLimpios = valores.map(v => {
      if (typeof v !== 'string' || !v.trim() || v.trim().length > 50) throw new BadRequestException('Cada valor debe tener entre 1 y 50 caracteres.');
      return v.trim();
    });
    if (new Set(valoresLimpios.map(v => v.toLocaleLowerCase('es'))).size !== valoresLimpios.length) throw new BadRequestException('Los valores de un atributo no pueden repetirse.');
    combinaciones = combinaciones.flatMap(a => valoresLimpios.map(v => ({ ...a, [key]:v })));
    if (combinaciones.length > 100) throw new BadRequestException('El producto admite hasta 100 variantes.');
  }
  return grupos.length ? combinaciones : [];
}
