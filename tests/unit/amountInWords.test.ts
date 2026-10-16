import { describe, it, expect } from 'vitest';
import { amountInWordsPE } from '../../core/services/amountInWords';

describe('amountInWordsPE', () => {
  it.each([
    [0, 'SON: CERO CON 00/100 SOLES'],
    [1, 'SON: UN CON 00/100 SOLES'],
    [21.5, 'SON: VEINTIUN CON 50/100 SOLES'],
    [100, 'SON: CIEN CON 00/100 SOLES'],
    [236, 'SON: DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES'],
    [1000, 'SON: MIL CON 00/100 SOLES'],
    [2016.16, 'SON: DOS MIL DIECISÉIS CON 16/100 SOLES'],
    [1_000_000, 'SON: UN MILLÓN CON 00/100 SOLES'],
    [3_250_040.99, 'SON: TRES MILLONES DOSCIENTOS CINCUENTA MIL CUARENTA CON 99/100 SOLES'],
    [10.995, 'SON: ONCE CON 00/100 SOLES'],
  ])('%s → %s', (amount, expected) => {
    expect(amountInWordsPE(amount)).toBe(expected);
  });
});
