# Customer stock table (`stockWeb.DBF`)

The reference copy of the customer's product table is **`stock/stockWeb.DBF`** at the repo root. It is the source of truth for the table's structure. If anything else in the repo disagrees with this file, the file wins. `dbf-to-csv-parser.py` reads `stock/stockWeb.DBF` by default (run it from the repo root).

`stock/` is in `.gitignore`: the table holds the customer's real catalog and costs, so it is never committed. Ask for a fresh copy when you need it. Each time a new copy arrives, re-check it against this document (see [Inspecting a new copy](#inspecting-a-new-copy)).

Everything below was measured on the copy last updated **2026-10-14**.

## File facts

| Property | Value |
| --- | --- |
| Format | Visual FoxPro table (version byte `0x30`) |
| Code page | `0x03` = Windows ANSI (**cp1252**) |
| Records | 23,045 (5 marked deleted, so 23,040 live) |
| Fields | 60 |
| Record length | 877 bytes (header 2,216 bytes) |
| Last update (header) | 2026-10-14 |
| Companion files | **None shipped.** The table flags claim a structural index (`.CDX`) and a memo file (`.FPT`), but neither comes with it. |

Consequences:

- **Memo file is missing, but no data is lost.** `STDETALLE` is the only memo field, and its pointer is 0 in every record. Readers must tolerate the missing `.FPT` (`dbfread` needs `ignore_missing_memofile=True`).
- **Read text as cp1252, not latin-1.** The two differ only in bytes `0x80`–`0x9F`. Today that affects exactly one character: the `…` (`0x85`) in product `0071261`'s description. latin-1 turns it into an invisible control character. The parser reads cp1252.
- **Deleted records** carry the usual `*` flag. `dbfread` skips them by default. The `STBORRAR` field is *not* how this table marks deletions (see below).
- **`STWEB` is true in every record.** This export seems to be the customer's catalog already filtered to web products (hence the file name), so the importer doesn't have to filter on it.

## Fields

Types: `C` character, `N` numeric (`size,decimals`), `L` logical, `D` date (`YYYYMMDD`), `M` memo. Character values are space-padded and should be trimmed.

The field names come from the customer's system and are not documented anywhere. The **Meaning** column is inferred from the names and the data and should be confirmed with the customer before anything important depends on it. "Unused" means the field is blank, `0` or `F` in every live record.

### Identity and description

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STCODIGO` | C 9 | Product code. Always 7 zero-padded digits (`0000001`). **Not unique** (see [Data quirks](#data-quirks)). |
| `STDESCRIP` | C 80 | Product name. Always filled. |
| `STCADENA` | C 80 | Identical to `STDESCRIP` in every record. |
| `STDETALLE` | M | Long description (memo). Empty in every record. |
| `STBARRA` | C 20 | Barcode (EAN-13 and similar). Filled in 19,883 records. |
| `CBARRAGRAL` | C 30 | Another barcode. Filled in 20,136 records. Equal to `STBARRA` in 19,118 of the 20,270 records that have either one. |

### Prices and costs

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STPRECUNI1` | N 12,3 | Price list 1. Lower than `STPRECUNI2` in 21,970 records, equal in 1,063, higher in 7. Zero in 4 records. |
| `STPRECUNI2` | N 12,3 | Price list 2, the higher list (retail). Never zero. |
| `STPRECUNI3` | N 12,3 | Unused. |
| `STCOSTO` | N 12,3 | Unit cost. |
| `STPRECIO1` | N 10,3 | Equal to `STCOSTO` in every record. |
| `STPRECIO2` | N 10,3 | Zero in 20,559 records. Otherwise looks like a previous cost. |
| `STPORCEL1` | N 10,2 | Markup % for list 1 (30, 40, 50, 100, …). Set in only 341 records. Where set, `STPRECUNI1 ≈ STCOSTO × (1 + %/100)` holds for about 60% of them. |
| `STPORCEL2` | N 10,2 | Same, for list 2 (343 records). |
| `STPORCEL3` | N 10,2 | Unused. |
| `STPORCIVA`, `STPORCEIVA` | N | VAT %. Unused (always 0). |
| `STCOSTOIVA` | L | Unused. |
| `STCOSTO1`, `STCOSTO2` | N 15,2 | Unused. |
| `STPORCE1`, `STPORCE2` | N 15,4 | Unused. |
| `STMONEDA` | C 3 | Currency. Unused. |
| `STFECHAP1` | D | Date of the last price-1 change, probably. Filled in 20,130 records. |
| `STFECHAP2` | D | Same for price 2. Filled in 57 records. |
| `STFECACTU` | D | Last update. Filled in 16,744 records, ranging from 2017-03-18 to 2026-10-14. |

Markups are rarely set, so treat the `STPRECUNI*` fields as the actual prices. Don't recompute them from cost.

### Category

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STFAMILIA` | C 3 | Family (category) code. `000` means "no family" (565 records). A real code appears in only 83 records. |
| `STNOMFAM` | C 50 | Family name. Filled in 82 records. |

The family pairs present today are: `869` MARTIZ (29), `870` PUNTO CERO (26), `110` HOJAS VARIAS (9), `239` SOBRES (5), `867` ASB (4), `551` SOBRES MANILA (2), `552` SOBRES BOLSA (2), and one product each in `040` CARTULINAS ESCOLARES, `089` ETIQUETAS COMERCIALES, `171` PAPEL EN RESMAS, `318` PROVINCIAS and `557` SOBRES OFICIO INGLES. One record has code `30` with no name.

**More than 99% of products have no category.**

### Suppliers

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STPROV` / `STPROV1` | C 5 | Primary supplier code (30 distinct). The two match in every record but one. |
| `STNOMPROV` / `STNOMPROV1` | C 40 / C 50 | Primary supplier name (BARILOCHE, CASA LEMA, AIKEN, LAMA, …). |
| `STCODPROV` / `STCODPROV1` | C 15 | The product's code in the supplier's catalog. Usually equal (22,174 records). |
| `STPROV2`, `STNOMPROV2`, `STCODPROV2` | C | Secondary supplier. Filled in about 2,100 to 2,400 records. |
| `STPROVEDOR` | C 20 | Unused. |

### Units and stock

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STCANT` | N 12,3 | Quantity on hand. **Always 0**, so this export carries no stock levels. |
| `STUNICOMP` | N 15 | Purchase pack size (12, 3, 6, 10, …). Non-zero in about 600 records. |
| `STUNIVENTA` | N 15 | Sale pack size. Unused. |
| `STUNIDAD` | C 10 | Unit. Filled in 9 records (`1`, `0`, `10`). |
| `STANCHO` | N 10,3 | The name means "width", but it holds the same value as `STCOSTO` in 20,764 records and 0 in most of the rest. **Not a dimension.** Don't map it to `dimension_width`. |

### Flags

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STWEB` | L | Published on the web. True in every record. |
| `STBORRAR` | L | Soft-delete mark. False in every record. |
| `STLISTAPRE`, `STIMPRIMAY`, `STIMPRIMIN`, `STIMPRIPUB`, `STSELECC`, `STCONLOTE` | L | Print and selection flags for the customer's desktop app. All false. |
| `STORDEN` | C 1 | Always `1`. |

### Other

| Field | Type | Meaning / content |
| --- | --- | --- |
| `STTIPOCON` | C 3 | Filled in 38 records (`198`, `110`, `020`, …). The codes overlap with family codes. Meaning unknown. |
| `STORIGEN` | N 10 | Unused (always 0). |
| `STTELAR`, `STDESPACHO`, `STTINTO`, `STNOMTINTO`, `STCAJON`, `STCAJON2` | C | Unused. |

## Mapping to the import CSV

`dbf-to-csv-parser.py --formato api` turns the table into the CSV format of `example.csv`. Current mapping:

| CSV column | Source |
| --- | --- |
| `sku` | `STCODIGO` |
| `name` | `STDESCRIP` |
| `description` | `STDETALLE`, falling back to `STDESCRIP` (always the fallback today, because the memo field is empty) |
| `regular_price` | `STPRECUNI2` |
| `special_price` | `STPRECUNI1`, when it is > 0 and lower than the regular price |
| `sale_price` | Not mapped (no source field identified) |
| `category_slug` | Slug of `STNOMFAM`, falling back to `STFAMILIA` (except `000`, which means no family) |
| `is_active` | `not STBORRAR` |
| images, video, weight, dimensions | Empty. The table has no such data. |

## Data quirks

These are known issues in the data and in the export as of this copy:

- **Duplicate SKU `0000694`.** Two different products use it: "ROLLO FILM AUTOADHESIVO 30cm x30mt" and "ROLLO FILM ALUMAX 30cm x30mt". The import upserts by SKU, so the second row overwrites the first and one product disappears.
- **Bare family codes.** The `STFAMILIA` fallback turns a record with code `30` and no name into `category_slug=30`. The importer ignores slugs that match no category.
- **Barcodes are not imported.** Most products have one (`STBARRA` / `CBARRAGRAL`), but the import CSV has no column for it.

## Inspecting a new copy

To dump every column so you can compare a new copy against this document, run the parser in `dbf` mode (`pip install dbfread python-dotenv` first):

```bash
python src/scripts/import-products/dbf-to-csv-parser.py \
  --dbf stock/stockWeb.DBF --formato dbf --salida tmp/stock-all-fields.csv
```

Things worth re-checking each time: the field list and sizes, the code page byte, whether `STWEB` / `STBORRAR` / `STCANT` are still constant, whether a `.FPT` file now comes with the table, and whether `STCODIGO` is unique.
