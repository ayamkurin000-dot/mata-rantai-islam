#!/usr/bin/env python3
"""Pindahkan SEMUA file biografi ke folder tokohnya masing-masing, dan perbarui index.html.

Aturan hasil akhir (satu aturan untuk semua tokoh):
  data/bio/<slug-tokoh>/<slug-tokoh>.html     biografi tokoh itu sendiri
  data/bio/<slug-tokoh>/<slug-kisah>.html     tiap kartu kisah milik tokoh itu
  data/bio/00-kategori/<slug>.html           kartu kategori / periode (bukan tokoh)
  data/bio/00-arsip-duplikat/<slug>.html   salinan lama yang tidak dipakai index.html

Pemilik tiap kisah ditentukan dari struktur `children` di index.html (bukan dari tebakan nama file).
Butuh Python 3.8+ dan Node.js (hanya untuk membaca data pohon di index.html).

Pakai (dari akar repo, commit dulu sebelum --terapkan):
  python tools/pindah_ke_folder_tokoh.py            # simulasi saja, tidak mengubah apa pun
  python tools/pindah_ke_folder_tokoh.py --terapkan # pindahkan file + tulis ulang index.html + verifikasi
  python tools/pindah_ke_folder_tokoh.py --cek      # audit struktur kapan saja (tidak mengubah apa pun)
"""
import argparse, collections, hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
BIO = ROOT / 'data' / 'bio'
EKSTRAK = ROOT / 'tools' / '_ekstrak_pohon.js'
KATEGORI, ARSIP = '00-kategori', '00-arsip-duplikat'
POHON_SILSILAH = {'treeData', 'descChildren'}   # di pohon ini infoNote bersarang = tokoh, bukan kisah
SLUG_RE = re.compile(r'@bio:([^"\'\s\\+]+)')


def baca_pohon(index_path):
    tmp = Path(tempfile.mkdtemp()) / 'pohon.json'
    r = subprocess.run(['node', str(EKSTRAK), str(index_path), str(tmp)], capture_output=True, text=True)
    if r.returncode != 0 or not tmp.exists():
        sys.exit('Gagal membaca pohon dari index.html (butuh Node.js):\n' + r.stdout + r.stderr)
    return json.loads(tmp.read_text(encoding='utf-8'))['roots']


def kandidat(slug):
    """Urutan alamat yang dicoba loadBioFile() di index.html."""
    c = [slug + '.html']
    if '/' in slug:
        c += [slug.split('/')[-1] + '.html', slug.replace('/', '-') + '.html']
    return c


def file_asli(slug):
    for c in kandidat(slug):
        if (BIO / c).is_file():
            return c
    return None


def klasifikasi(roots):
    recs = []
    def walk(n, root, anc):
        note = n['infoNote']
        if note:
            slug = note[5:]
            pemilik = next((a['infoNote'][5:] for a in reversed(anc) if a['infoNote'] and not a['periode']), None)
            if n['periode'] or slug.startswith('kategori-') or slug.startswith('dan-tokoh-'):
                peran = 'kategori'
            elif root in POHON_SILSILAH or pemilik is None:
                peran = 'tokoh'
            else:
                peran = 'kisah'
            recs.append(dict(slug=slug, nama=n['name'], peran=peran, pemilik=pemilik if peran == 'kisah' else None))
        for c in n['children']:
            walk(c, root, anc + [n])
    for k, v in roots.items():
        for r in (v if isinstance(v, list) else [v]):
            walk(r, k, [])
    return recs


def rencana(recs):
    peta, galat = {}, []
    dasar = lambda s: s.split('/')[-1]
    peran = {}
    for r in recs:
        peran.setdefault(r['slug'], set()).add(r['peran'])
    for s, p in peran.items():
        if len(p) > 1:
            galat.append(f'Slug dengan peran ganda: {s} {sorted(p)}')
    kisah_pemilik = {}
    for r in recs:
        if r['peran'] == 'kisah':
            kisah_pemilik.setdefault(r['slug'], set()).add(r['pemilik'])
    for s, o in kisah_pemilik.items():
        if len(o) > 1:
            galat.append(f'Kisah dimiliki lebih dari satu tokoh: {s} -> {sorted(o)}')
    for r in recs:
        s = r['slug']
        if s in peta:
            continue
        if r['peran'] == 'tokoh':
            peta[s] = f'{dasar(s)}/{dasar(s)}'
        elif r['peran'] == 'kategori':
            peta[s] = f'{KATEGORI}/{dasar(s)}'
        else:
            pemilik = dasar(r['pemilik'])
            bagian = s.split('/')
            sub = '/'.join(bagian[1:-1]) if len(bagian) > 2 else ''   # subfolder yang sudah ada (mis. karamah/) dipertahankan
            peta[s] = '/'.join(x for x in (pemilik, sub, bagian[-1]) if x)
    tujuan = collections.defaultdict(list)
    for lama, baru in peta.items():
        tujuan[baru].append(lama)
    for baru, lamas in tujuan.items():
        if len(lamas) > 1:
            galat.append(f'Tabrakan tujuan {baru}.html dari {lamas}')
    return peta, galat


def jalankan(terapkan):
    if not INDEX.is_file() or not BIO.is_dir():
        sys.exit('Jalankan dari akar repo (harus ada index.html dan data/bio).')
    src = INDEX.read_text(encoding='utf-8')
    recs = klasifikasi(baca_pohon(INDEX))
    peta, galat = rencana(recs)
    # sumber nyata tiap slug
    pindah = {}   # path_lama(rel) -> path_baru(rel)
    tanpa_file = []
    for lama, baru in peta.items():
        f = file_asli(lama)
        if f is None:
            tanpa_file.append(lama); continue
        pindah[f] = baru + '.html'
    if tanpa_file:
        galat.append(f'{len(tanpa_file)} rujukan tanpa file, mis. {tanpa_file[:5]}')
    dipakai = set(pindah)
    semua = {str(p.relative_to(BIO)).replace(os.sep, '/') for p in BIO.rglob('*.html')}
    yatim = sorted(semua - dipakai)
    for y in yatim:
        pindah[y] = f'{ARSIP}/{y.replace("/", "--")}'
    # peta folder-lama -> pemilik, untuk berkas non-html (mis. DAFTAR-KARTU.md)
    ekstra = {}
    for p in BIO.rglob('*'):
        if p.is_file() and p.suffix != '.html':
            rel = str(p.relative_to(BIO)).replace(os.sep, '/')
            folder_lama = os.path.dirname(rel)
            pemilik = {pindah[f].split('/')[0] for f in dipakai if f.startswith(folder_lama + '/')} if folder_lama else set()
            if len(pemilik) == 1:
                ekstra[rel] = f'{pemilik.pop()}/{os.path.basename(rel)}'
            else:
                galat.append(f'Berkas non-html tanpa pemilik jelas: {rel}')
    tujuan_semua = collections.Counter(list(pindah.values()) + list(ekstra.values()))
    for t, n in tujuan_semua.items():
        if n > 1: galat.append(f'Tabrakan tujuan akhir: {t}')
    terlama = max((len(v) for v in pindah.values()), default=0)
    lap = [
        f'Tokoh: {len({s for s,v in peta.items() if v.split("/")[0] not in (KATEGORI,) and s in [r["slug"] for r in recs if r["peran"]=="tokoh"]})}  '
        f'Kisah: {sum(1 for r in recs if r["peran"]=="kisah")}  Kategori: {sum(1 for r in recs if r["peran"]=="kategori")}',
        f'File dipindah: {sum(1 for a,b in pindah.items() if a + "" != b)} (termasuk {len(yatim)} salinan lama ke {ARSIP}/)',
        f'Path terpanjang di bawah data/bio/: {terlama} karakter',
    ]
    print('\n'.join(lap))
    if galat:
        print('\nGALAT — tidak ada yang diubah:'); [print(' -', g) for g in galat]; sys.exit(1)
    if not terapkan:
        print('\nSimulasi selesai, tidak ada yang diubah. Jalankan dengan --terapkan untuk memindahkan.'); return
    # 1) pindah file
    for lama, baru in pindah.items():
        if lama == baru: continue
        (BIO / baru).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(BIO / lama), str(BIO / baru))
    for lama, baru in ekstra.items():
        (BIO / baru).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(BIO / lama), str(BIO / baru))
    # 2) tulis ulang index.html
    def ganti(m):
        s = m.group(1)
        if s not in peta: sys.exit('Slug tidak terpetakan: ' + s)
        return '@bio:' + peta[s]
    baru_src = SLUG_RE.sub(ganti, src)
    n_dinamis = baru_src.count('"@bio:"+t')
    baru_src = baru_src.replace('"@bio:"+t', '"@bio:' + KATEGORI + '/"+t')   # kategori yang disusun dinamis
    INDEX.write_text(baru_src, encoding='utf-8')
    # 3) bersihkan folder kosong
    for dp, dn, fn in sorted(os.walk(BIO, topdown=False)):
        if not os.listdir(dp) and Path(dp) != BIO:
            os.rmdir(dp)
    (ROOT / 'tools' / 'peta-migrasi.json').write_text(json.dumps(dict(slug=peta, file=pindah, ekstra=ekstra), ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\nSelesai: {sum(1 for a,b in pindah.items() if a != b)} file dipindah, {len(peta)} rujukan di index.html diperbarui ({n_dinamis} pola dinamis). Peta tersimpan di tools/peta-migrasi.json')
    cek()


def cek():
    """Audit: semua rujukan ada file, tidak ada file yatim, tidak ada html lepas di data/bio."""
    src = INDEX.read_text(encoding='utf-8')
    recs = klasifikasi(baca_pohon(INDEX))
    masalah = []
    slugs = {r['slug'] for r in recs}
    pakai = set()
    for s in slugs:
        p = BIO / (s + '.html')
        if p.is_file(): pakai.add(str(p.relative_to(BIO)).replace(os.sep, '/'))
        else: masalah.append(f'RUJUKAN TANPA FILE (alamat pertama tidak ada): @bio:{s}')
    semua = {str(p.relative_to(BIO)).replace(os.sep, '/') for p in BIO.rglob('*.html')}
    arsip = sorted(f for f in semua - pakai if f.startswith(ARSIP + '/'))
    for f in sorted(semua - pakai - set(arsip)): masalah.append(f'FILE YATIM (tidak dirujuk index.html): {f}')
    for f in sorted(x for x in semua if '/' not in x): masalah.append(f'HTML LEPAS di data/bio (harus di folder tokoh): {f}')
    for r in recs:
        if r['peran'] == 'kisah':
            if s := r['slug']:
                if s.split('/')[0] != r['pemilik'].split('/')[0]:
                    masalah.append(f'KISAH BUKAN DI FOLDER PEMILIKNYA: {s} (pemilik {r["pemilik"]})')
    if masalah:
        print(f'CEK: {len(masalah)} masalah'); [print(' -', m) for m in masalah[:200]]; sys.exit(1)
    print(f'CEK OK: {len(slugs)} rujukan, {len(semua) - len(arsip)} file html terpakai, semua konsisten.')
    if arsip:
        print(f'Catatan: {len(arsip)} salinan lama menunggu keputusan Anda di data/bio/{ARSIP}/ (tidak dipakai website).')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--terapkan', action='store_true'); ap.add_argument('--cek', action='store_true')
    a = ap.parse_args()
    cek() if a.cek else jalankan(a.terapkan)
