import { describe, it, expect } from 'vitest';
import { parseHeader, parseLine, departmentFromUbigeo, normalizeHeader } from '../../server/services/padronParser';

const HEADER = 'RUC|NOMBRE O RAZÓN SOCIAL|ESTADO DEL CONTRIBUYENTE|CONDICIÓN DE DOMICILIO|UBIGEO|TIPO DE VÍA|NOMBRE DE VÍA|CÓDIGO DE ZONA|TIPO DE ZONA|NÚMERO|INTERIOR|LOTE|DEPARTAMENTO|MANZANA|KILÓMETRO|';

describe('padronParser (padrón reducido SUNAT)', () => {
  it('normaliza encabezados con tildes', () => {
    expect(normalizeHeader(' Condición  de Domicilio ')).toBe('CONDICION DE DOMICILIO');
  });

  it('lee una fila completa y arma la dirección', () => {
    const cols = parseHeader(HEADER);
    const r = parseLine('20100070970|SUPERMERCADOS PERUANOS S.A.|ACTIVO|HABIDO|150131|CAL.|MORELLI|-|-|181|INT. P-2|-|-|-|-|', cols);
    expect(r).toEqual({
      ruc: '20100070970', businessName: 'SUPERMERCADOS PERUANOS S.A.', status: 'ACTIVO', condition: 'HABIDO',
      ubigeo: '150131', address: 'CAL. MORELLI NRO. 181 INT. P-2',
    });
  });

  it('tolera columnas en otro orden', () => {
    const cols = parseHeader('UBIGEO|RUC|ESTADO DEL CONTRIBUYENTE|NOMBRE O RAZÓN SOCIAL|CONDICIÓN DE DOMICILIO');
    expect(parseLine('040101|10456782912|ACTIVO|GÓMEZ JUAN|NO HABIDO', cols)?.ruc).toBe('10456782912');
  });

  it('descarta filas sin RUC válido', () => {
    const cols = parseHeader(HEADER);
    expect(parseLine('ABC|fila corrupta|', cols)).toBeNull();
    expect(parseLine('', cols)).toBeNull();
  });

  it('falla con un encabezado desconocido', () => {
    expect(() => parseHeader('COL1|COL2')).toThrow(/RUC/);
  });

  it('obtiene el departamento del ubigeo', () => {
    expect(departmentFromUbigeo('150131')).toBe('Lima');
    expect(departmentFromUbigeo('040101')).toBe('Arequipa');
    expect(departmentFromUbigeo('990101')).toBe('');
  });
});
