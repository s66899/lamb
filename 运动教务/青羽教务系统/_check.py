# -*- coding: utf-8 -*-
# Use unicode escapes to avoid encoding issues in source file
chars_expected = [
    ('\u7f8a', 0xD1F2), ('\u7684', 0xB5C4), ('\u6559', 0xBDCC), ('\u52a1', 0xCEF1),
    ('\u7ba1', 0xB9DC), ('\u7406', 0xC0ED), ('\u7cfb', 0xCFB5), ('\u7edf', 0xCDB3),
    ('\u6d4f', 0xE4AF), ('\u89c8', 0xC0C0), ('\u5668', 0xC6F7),
    ('\u68c0', 0xBCEC), ('\u67e5', 0xB2E9), ('\u9519', 0xB4ED), ('\u8bef', 0xCEF3),
    ('\u672a', 0xB4EF), ('\u6d4b', 0xB2E2), ('\u5230', 0xB5BD),
    ('\u8bf7', 0xC7EB), ('\u5b89', 0xB0B2), ('\u88c5', 0xD7B0),
    ('\u6216', 0xBBF2), ('\u66f4', 0xB8FC), ('\u9ad8', 0xB8DF), ('\u7248', 0xB0E6), ('\u672c', 0xB1BE),
    ('\u9996', 0xCAD7), ('\u6b21', 0xB4CE), ('\u7a0d', 0xC9D4), ('\u5019', 0xBAF2),
    ('\u4f9d', 0xD2C0), ('\u8d56', 0xC0B5), ('\u5df2', 0xD2D1), ('\u5c31', 0xBED3), ('\u7eea', 0xD0F7),
    ('\u6b63', 0xD5FD), ('\u5728', 0xD4DA), ('\u542f', 0xC6F4), ('\u52a8', 0xB6AF),
    ('\u670d', 0xB7FE), ('\u52a1', 0xCEF1), ('\u8fd0', 0xD4CB), ('\u884c', 0xD0D0), ('\u4e2d', 0xD6D0),
    ('\u8bbf', 0xB7C3), ('\u95ee', 0xCECA), ('\u5730', 0xB5D8), ('\u5740', 0xD6B7),
    ('\u505c', 0xCDA3), ('\u6b62', 0xD6B9), ('\u6309', 0xB0B4),
    ('\u5173', 0xB9D8), ('\u95ed', 0xC1D5),
    ('\u53cc', 0xCBAB), ('\u51fb', 0xBBF7), ('\u5373', 0xBCB4), ('\u53ef', 0xC9F9),
    ('\u65e0', 0xCEDE), ('\u9ed1', 0xBADA), ('\u7a97', 0xB4B0), ('\u53e3', 0xDAF8),
    ('\u81ea', 0xD7D4), ('\u6253', 0xB4F2), ('\u5f00', 0xBFA9),
    ('\u9759', 0xBEB2), ('\u9ed8', 0xC4AC),
    ('\u811a', 0xBDC5),
]

all_ok = True
for ch, expected in chars_expected:
    actual = int.from_bytes(ch.encode('gbk'), 'big')
    status = 'OK' if actual == expected else 'MISMATCH'
    if status != 'OK':
        all_ok = False
    print(f'{ch} expected={expected:04X} actual={actual:04X} {status}')

print()
if all_ok:
    print('ALL OK!')
else:
    print('SOME MISMATCHES FOUND!')
