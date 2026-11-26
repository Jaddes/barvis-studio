"""Provera prevoda v6: svaki content/x_<jezik>.py mora imati istu strukturu i iste {zamene} kao x_sr.py.
Pokretanje:  python tools/site/check_content.py"""
import importlib.util
import re
import sys
from pathlib import Path

DIR = Path(__file__).parent / 'content'
LANGS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'zh', 'ja', 'ko', 'hu']


def load(lang):
    spec = importlib.util.spec_from_file_location(f'x_{lang}', DIR / f'x_{lang}.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.X


def walk(a, b, path, errs):
    if isinstance(a, dict):
        if not isinstance(b, dict) or set(a) != set(b):
            errs.append(f'{path}: ključevi {sorted(set(a) ^ set(b if isinstance(b, dict) else {}))}')
            return
        for k in a:
            walk(a[k], b[k], f'{path}.{k}', errs)
    elif isinstance(a, (list, tuple)):
        if not isinstance(b, (list, tuple)) or len(a) != len(b):
            errs.append(f'{path}: dužina {len(a)} ≠ {len(b) if isinstance(b, (list, tuple)) else type(b).__name__}')
            return
        for i, (x, y) in enumerate(zip(a, b)):
            walk(x, y, f'{path}[{i}]', errs)
    elif isinstance(a, str):
        if not isinstance(b, str):
            errs.append(f'{path}: nije tekst')
            return
        pa, pb = sorted(re.findall(r'\{\w+\}', a)), sorted(re.findall(r'\{\w+\}', b))
        if pa != pb:
            errs.append(f'{path}: zamene {pa} ≠ {pb}')
        for tag in ('<a ', '<span class="ed">', '<b>', '<strong>', '<s>'):
            if a.count(tag) != b.count(tag):
                errs.append(f'{path}: oznaka {tag!r} {a.count(tag)} ≠ {b.count(tag)}')


def main():
    ref = load('sr')
    bad = 0
    for lang in LANGS:
        if not (DIR / f'x_{lang}.py').exists():
            print(f'{lang}: NEDOSTAJE'); bad += 1; continue
        errs = []
        walk(ref, load(lang), lang, errs)
        # vrednosti (prvi član) u izborima moraju ostati iste
        X = load(lang)
        for k in ('kinds',):
            if [x[0] for x in X['wiz'][k]] != [x[0] for x in ref['wiz'][k]]:
                errs.append(f'{lang}.wiz.{k}: vrednosti se razlikuju')
        if [x[0] for x in X['form']['services']] != [x[0] for x in ref['form']['services']]:
            errs.append(f'{lang}.form.services: vrednosti se razlikuju')
        print(f'{lang}: ' + ('ok' if not errs else '\n  ' + '\n  '.join(errs)))
        bad += bool(errs)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
