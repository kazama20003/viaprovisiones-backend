import { BadRequestException } from '@nestjs/common';
import { claveVariante, combinacionesVariantes } from './variantes';

describe('combinaciones de variantes', () => {
  it('permite un atributo personalizado y varias combinaciones', () => {
    expect(combinacionesVariantes({ atributosVariantes:[{ nombre:'Talla', valores:['S','M'] }] })).toEqual([{ talla:'S' }, { talla:'M' }]);
  });
  it('combina atributos y mantiene la clave de variantes antiguas', () => {
    const combinaciones = combinacionesVariantes({ colores:['Negro'], capacidades:['4000 mAh'] });
    expect(combinaciones).toEqual([{ color:'Negro', capacidad:'4000 mAh' }]);
    expect(claveVariante(combinaciones[0])).toBe(claveVariante({ capacidad:'4000 mAh', color:'Negro' }));
  });
  it('rechaza atributos o valores repetidos y combinaciones excesivas', () => {
    expect(() => combinacionesVariantes({ atributosVariantes:[{ nombre:'Color', valores:['Rojo','rojo'] }] })).toThrow(BadRequestException);
    expect(() => combinacionesVariantes({ atributosVariantes:[{ nombre:'Color', valores:['Rojo'] }, { nombre:'color', valores:['Azul'] }] })).toThrow(BadRequestException);
    expect(() => combinacionesVariantes({ atributosVariantes:[{ nombre:'A', valores:Array.from({length:11}, (_,i)=>String(i)) }, { nombre:'B', valores:Array.from({length:10}, (_,i)=>String(i)) }] })).toThrow(BadRequestException);
  });
});
