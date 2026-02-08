"""Exporta la tabla STOCK.DBF (Visual FoxPro) a CSV.

Por defecto genera un CSV con el mismo formato de columnas que
`example.csv` (pensado para importación vía API).

USO:
    python export_stock_csv.py                                   # stock.DBF -> stock_export.csv (formato API)
    python export_stock_csv.py --dbf STOCK.DBF --salida out.csv
    python export_stock_csv.py --delim ';'                       # Cambiar delimitador (por defecto ,)
    python export_stock_csv.py --formato dbf                      # Exporta todas las columnas del DBF (modo anterior)
    python export_stock_csv.py --limit 100                         # Exporta solo los primeros 100 productos
    python export_stock_csv.py --offset 200 --limit 50             # Salta 200 y exporta 50

Requisitos:
  pip install dbfread python-dotenv

Variables opcionales (.env):
  STOCK_DBF_PATH   Ruta al DBF (por defecto stock.DBF)
  STOCK_CSV_PATH   Ruta destino CSV (por defecto stock_export.csv)

Notas:
    - Formato API: columnas fijas y mapeadas desde el DBF.
    - Formato DBF: incluye todas las columnas/fields tal como aparecen en el DBF.
    - No filtra filas: exporta todas.
    - Codificación de salida: UTF-8 con BOM (utf-8-sig) para Excel.
    - Sustituye valores None por cadena vacía.
"""
from __future__ import annotations
import os
import csv
from pathlib import Path
from typing import Any
from argparse import ArgumentParser
from dotenv import load_dotenv
from dbfread import DBF

# -------- Configuración --------
DBF_DEFAULT = 'stock.DBF'
CSV_DEFAULT = 'stock_export.csv'

# -------- .env --------
load_dotenv()
DBF_ENV = os.getenv('STOCK_DBF_PATH', DBF_DEFAULT)
CSV_ENV = os.getenv('STOCK_CSV_PATH', CSV_DEFAULT)

# -------- Utilidades --------

def normalize_value(v: Any) -> Any:
    """Normaliza valores para CSV: None -> '', strings recortadas, otros tipos a str si es necesario."""
    if v is None:
        return ''
    if isinstance(v, str):
        return v.strip()
    return v


def _is_blank_string(v: Any) -> bool:
    return isinstance(v, str) and v.strip() == ''


def pick_str(rec: dict[str, Any], fields: tuple[str, ...]) -> str:
    for field in fields:
        v = rec.get(field)
        if v is None or _is_blank_string(v):
            continue
        return normalize_value(v)
    return ''


def pick_num(rec: dict[str, Any], fields: tuple[str, ...]) -> float | None:
    for field in fields:
        v = rec.get(field)
        if v is None:
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return None


def format_price(v: float | None) -> str:
    if v is None:
        return ''
    # 2 decimales para coincidir con el ejemplo (99.99)
    return f"{v:.2f}"


def slugify(v: str) -> str:
    s = (v or '').strip().lower()
    if not s:
        return ''
    out: list[str] = []
    prev_dash = False
    for ch in s:
        is_alnum = ('a' <= ch <= 'z') or ('0' <= ch <= '9')
        if is_alnum:
            out.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                out.append('-')
                prev_dash = True
    slug = ''.join(out).strip('-')
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug


def parse_boolish(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ('', 'null', 'none'):
            return None
        if s in ('1', 'true', 't', 'y', 'yes', 'si', 's'):
            return True
        if s in ('0', 'false', 'f', 'n', 'no'):
            return False
    return None


API_HEADERS = [
    'sku',
    'name',
    'description',
    'regular_price',
    'sale_price',
    'special_price',
    'category_slug',
    'image_url',
    'video_url',
    'weight',
    'dimension_length',
    'dimension_width',
    'dimension_height',
    'is_active',
]


def map_record_to_api_row(rec: dict[str, Any]) -> list[str]:
    sku = pick_str(rec, ('STCODIGO',))
    name = pick_str(rec, ('STDESCRIP',))
    description = pick_str(rec, ('STDETALLE', 'STDESCRIP'))

    regular = pick_num(rec, ('STPRECUNI2'))
    # TODO: PRECIO DE OFERTA
    sale = None
    # TODO: PRECIO ESPECIAL
    special = pick_num(rec, ('STPRECUNI1'))

    sale_price = ''
    if sale is not None and regular is not None and sale > 0 and sale < regular:
        sale_price = format_price(sale)

    special_price = ''
    if special is not None and regular is not None and special > 0 and special < regular:
        special_price = format_price(special)

    fam_name = pick_str(rec, ('STNOMFAM',))
    fam_code = pick_str(rec, ('STFAMILIA',))
    category_slug = slugify(fam_name) or slugify(fam_code)

    # En el DBF no hay URLs de imagen/video.
    image_url = ''
    video_url = ''

    weight = ''
    dimension_length = ''
    dimension_width = ''
    dimension_height = ''

    # STBORRAR suele ser una marca de baja. Si está "verdadero", el producto no está activo.
    borrar = parse_boolish(rec.get('STBORRAR'))
    is_active = True if borrar is None else (not borrar)

    return [
        sku,
        name,
        description,
        format_price(regular),
        sale_price,
        special_price,
        category_slug,
        image_url,
        video_url,
        weight,
        dimension_length,
        dimension_width,
        dimension_height,
        'true' if is_active else 'false',
    ]

# -------- Exportación --------

def export_stock_all_fields(
    dbf_path: str,
    csv_path: str,
    delimiter: str = ',',
    limit: int | None = None,
    offset: int = 0,
) -> tuple[int, int]:
    """Exporta DBF a CSV con todas las columnas devolviendo (columnas, filas)."""
    if not Path(dbf_path).is_file():
        raise FileNotFoundError(f"No se encontró el archivo DBF: {dbf_path}")

    table = DBF(dbf_path, load=False, encoding='latin-1', ignore_missing_memofile=True)
    headers = list(table.field_names)

    rows_written = 0
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=delimiter)
        writer.writerow(headers)
        skipped = 0
        for rec in table:  # Iteración en streaming, sin cargar todo en memoria
            if offset and skipped < offset:
                skipped += 1
                continue
            row = [normalize_value(rec.get(h)) for h in headers]
            writer.writerow(row)
            rows_written += 1
            if limit is not None and limit > 0 and rows_written >= limit:
                break

    return (len(headers), rows_written)


def export_stock_api_format(
    dbf_path: str,
    csv_path: str,
    delimiter: str = ',',
    limit: int | None = None,
    offset: int = 0,
) -> tuple[int, int]:
    """Exporta DBF a CSV en formato API (mapeado) devolviendo (columnas, filas)."""
    if not Path(dbf_path).is_file():
        raise FileNotFoundError(f"No se encontró el archivo DBF: {dbf_path}")

    table = DBF(dbf_path, load=False, encoding='latin-1', ignore_missing_memofile=True)
    rows_written = 0

    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=delimiter)
        writer.writerow(API_HEADERS)
        skipped = 0
        for rec in table:
            if offset and skipped < offset:
                skipped += 1
                continue
            writer.writerow(map_record_to_api_row(rec))
            rows_written += 1
            if limit is not None and limit > 0 and rows_written >= limit:
                break

    return (len(API_HEADERS), rows_written)

# -------- CLI --------

def parse_args():
    p = ArgumentParser(description='Exporta stock.DBF a CSV (formato API o DBF completo)')
    p.add_argument('--dbf', default=DBF_ENV, help='Ruta al archivo stock.DBF')
    p.add_argument('--salida', default=CSV_ENV, help='Ruta del CSV de salida')
    p.add_argument('--delim', default=',', help='Delimitador CSV (por defecto ,)')
    p.add_argument('--limit', type=int, default=0, help='Máximo de productos/filas a exportar (0 = sin límite)')
    p.add_argument('--offset', type=int, default=0, help='Cantidad de productos/filas a saltear al inicio')
    p.add_argument(
        '--formato',
        default='api',
        choices=('api', 'dbf'),
        help='Formato de salida: api (columnas mapeadas) o dbf (todas las columnas).',
    )
    return p.parse_args()

# -------- Main --------

def main():
    args = parse_args()
    print(f"[INFO] Leyendo DBF: {args.dbf}")
    limit = None if not args.limit or args.limit <= 0 else args.limit
    offset = 0 if not args.offset or args.offset < 0 else args.offset
    if args.formato == 'dbf':
        cols, rows = export_stock_all_fields(args.dbf, args.salida, args.delim, limit=limit, offset=offset)
    else:
        cols, rows = export_stock_api_format(args.dbf, args.salida, args.delim, limit=limit, offset=offset)
    print(f"[OK] Exportadas {rows} filas y {cols} columnas -> {Path(args.salida).resolve()}")

if __name__ == '__main__':
    main()
