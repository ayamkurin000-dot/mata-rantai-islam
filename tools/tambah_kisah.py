#!/usr/bin/env python3
"""Tambahkan kartu kisah sebagai ANAK tokoh yang dipilih, bukan saudara tokoh.
Contoh:
 python tools/tambah_kisah.py --tokoh al-junaid-al-baghdadi --slug nasihat-keikhlasan --judul 'NASIHAT KEIKHLASAN' --html-file kisah.html
Jalankan dari folder repo. Tidak mengubah apa pun jika validasi gagal.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
BIO = ROOT / 'data' / 'bio'


def positions(source):
    """Pemetaan pasangan tanda kurung dalam JS; melewati string dan komentar."""
    stack, close, enclosing = [], {}, {}
    i, n = 0, len(source)
    while i < n:
        c = source[i]
        if c in "\"'`":
            q = c; i += 1
            while i < n:
                if source[i] == '\\': i += 2; continue
                if source[i] == q: i += 1; break
                i += 1
            continue
        if source.startswith('//', i):
            j = source.find('\n', i + 2); i = n if j < 0 else j + 1; continue
        if source.startswith('/*', i):
            j = source.find('*/', i + 2)
            if j < 0: raise ValueError('Komentar JS tidak ditutup')
            i = j + 2; continue
        if c in '{[(':
            enclosing[i] = stack[-1][0] if stack else None
            stack.append((i, c))
        elif c in '}])':
            if not stack or '{[('.index(stack[-1][1]) != '}])'.index(c):
                raise ValueError('Struktur JS tidak seimbang')
            j, _ = stack.pop(); close[j] = i
        i += 1
    if stack: raise ValueError('Struktur JS tidak ditutup')
    return close, enclosing


def enclosing_object(mark, enclosing, src):
    # Find the closest JS object (not nested expression) containing the bio marker.
    # Existing repo uses infoNote:"@bio:slug" directly on the node object.
    candidates = [p for p in enclosing if p < mark and src[p] == '{']
    for p in reversed(candidates):
        # Need check that mark occurs before object's closing bracket (using close in caller)
        yield p


def plan(source, tokoh, kisah, title):
    marker = '@bio:' + tokoh + '/' + tokoh   # biografi tokoh kini berada di data/bio/<tokoh>/<tokoh>.html
    occurrences = list(re.finditer(r'infoNote\s*:\s*[\"\']' + re.escape(marker) + r'[\"\']', source))
    if len(occurrences) != 1:
        raise ValueError(f'Tokoh {tokoh!r} harus ditemukan tepat sekali pada infoNote (ditemukan {len(occurrences)}).')
    mark = occurrences[0].start()
    # Node definitions in this repository are compact `{name:..., infoNote:...}`.
    # Parse only the node's JS literal to avoid confusing regex/CSS elsewhere in index.html.
    obj = source.rfind('{name:', 0, mark)
    if obj < 0:
        raise ValueError('Objek kartu tokoh tidak ditemukan.')
    # The lexical scanner only needs the object through the marker and its descendants.
    # Find the closing brace while respecting nested strings, arrays, and objects.
    tail = source[obj:]
    depth, quote, escaped, end_relative = 0, None, False, None
    for k, c in enumerate(tail):
        if quote:
            if escaped: escaped = False
            elif c == "\\": escaped = True
            elif c == quote: quote = None
            continue
        if c in ("\"", "'", "`"): quote = c; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end_relative = k; break
    if end_relative is None or obj + end_relative < mark:
        raise ValueError('Objek tokoh tidak dapat diurai dengan aman.')
    end = obj + end_relative
    fragment = source[obj:end+1]
    close_local, enclosing_local = positions(fragment)
    close = {obj+k: obj+v for k,v in close_local.items()}
    enclosing = {obj+k: (obj+v if v is not None else None) for k,v in enclosing_local.items()}
    end = close[obj]
    fragment = source[obj:end]
    # Reject episode and category nodes; only target explicit existing biography.
    if not re.search(r'\bname\s*:', fragment):
        raise ValueError('Objek tokoh tidak valid')
    if re.search(r'infoNote\s*:\s*[\"\']@bio:' + re.escape(kisah) + r'[\"\']', source):
        raise ValueError(f'Kisah {kisah!r} sudah terdaftar. Tidak dibuat duplikat.')
    new_card = '{name:' + json.dumps(title, ensure_ascii=False) + ',type:"tokohgold",infoNote:"@bio:' + kisah + '"}'
    # Identify a direct children array, not an array inside a nested descendant.
    direct_children = None
    for m in re.finditer(r'\bchildren\s*:\s*\[', fragment):
        bracket = obj + m.end() - 1
        if enclosing.get(bracket) == obj:
            direct_children = bracket
            break
    if direct_children is not None:
        arr_end = close[direct_children]
        if source[direct_children+1:arr_end].strip():
            insertion = ',' + new_card
        else:
            insertion = new_card
        return source[:arr_end] + insertion + source[arr_end:]
    return source[:end] + ',children:[' + new_card + ']' + source[end:]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--tokoh', required=True, help='Slug tokoh = nama folder tokoh di data/bio/ (bagian pertama @bio:<slug>/<slug> di index.html)')
    ap.add_argument('--slug', required=True, help='Nama file kisah tanpa .html, misalnya kisah-keikhlasan')
    ap.add_argument('--judul', required=True, help='Judul kartu kisah pada pohon')
    ap.add_argument('--html-file', required=True, type=Path, help='File HTML berisi isi kisah')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    allowed = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    if not allowed.fullmatch(args.tokoh) or not allowed.fullmatch(args.slug):
        ap.error('Slug harus huruf kecil, angka, dan tanda hubung; tanpa garis miring.')
    if not args.judul.strip(): ap.error('Judul tidak boleh kosong')
    if not args.html_file.is_file(): ap.error('File HTML sumber tidak ditemukan')
    content = args.html_file.read_text(encoding='utf-8')
    if not content.strip(): ap.error('Konten kisah kosong')
    parent_bio = BIO / args.tokoh / (args.tokoh + '.html')
    if not parent_bio.is_file(): ap.error('Bio tokoh induk tidak ditemukan: ' + str(parent_bio))
    dest = BIO / args.tokoh / (args.slug + '.html')
    if dest.exists(): ap.error('Kisah sudah ada: ' + str(dest))
    bio_ref = args.tokoh + '/' + args.slug
    updated = plan(INDEX.read_text(encoding='utf-8'), args.tokoh, bio_ref, args.judul)
    if args.dry_run:
        print('VALID: akan ditambahkan sebagai anak', args.tokoh, '->', dest.relative_to(ROOT))
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding='utf-8')
    INDEX.write_text(updated, encoding='utf-8')
    print('BERHASIL:', dest.relative_to(ROOT), '| tertaut sebagai children dari', args.tokoh)

if __name__ == '__main__':
    main()
