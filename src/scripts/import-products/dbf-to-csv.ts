/**
 * Exports the customer's stock table (Visual FoxPro DBF) to CSV, with the same
 * conversion the API runs on POST /api/imports/dbf.
 *
 * Usage (from the repo root):
 *   npm run dbf:export                                    # stock/stockWeb.DBF -> stock_export.csv (import format)
 *   npm run dbf:export -- --dbf other.DBF --out out.csv
 *   npm run dbf:export -- --format raw --out tmp/stock-all-fields.csv   # every DBF column
 *
 * Table structure and mapping: see STOCK_DBF.md in this folder.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { dbfToCsv } from '../../modules/imports/dbf/dbf-to-csv.js';
import type { DbfCsvFormat } from '../../modules/imports/dbf/dbf-to-csv.js';

const { values } = parseArgs({
  options: {
    dbf: { type: 'string', default: 'stock/stockWeb.DBF' },
    out: { type: 'string', default: 'stock_export.csv' },
    format: { type: 'string', default: 'api' },
  },
});

if (values.format !== 'api' && values.format !== 'raw') {
  console.error(`[ERROR] --format must be "api" or "raw", got "${values.format}"`);
  process.exit(1);
}

const { csv, rowCount } = dbfToCsv(
  readFileSync(values.dbf),
  values.format as DbfCsvFormat
);
const outPath = resolve(values.out);
writeFileSync(outPath, csv, 'utf-8');
// eslint-disable-next-line no-console
console.log(`[OK] ${rowCount} rows -> ${outPath}`);
