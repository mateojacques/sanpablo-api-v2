import { describe, it, expect } from 'vitest';
import { parseCsvLine } from './csv-line.js';

describe('parseCsvLine', () => {
  it('keeps commas inside quoted values', () => {
    expect(parseCsvLine('a,"b, c",d')).toEqual(['a', 'b, c', 'd']);
  });

  it('turns doubled quotes inside a quoted value into one quote', () => {
    expect(parseCsvLine('"ROLLO ""FILM"", 30cm",x')).toEqual(['ROLLO "FILM", 30cm', 'x']);
  });
});
