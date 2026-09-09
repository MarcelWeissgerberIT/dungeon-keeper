#!/usr/bin/env python3
"""Build the original Kluftkrone Runenpixel font and inspectable specimens.

No font, outline, image or external glyph source is read. Every shape below is
an original hand-written binary pixel drawing made for Kluftkrone, 2026-09-09.
fontTools only packages these drawings; Pillow only renders the resulting TTF.
Run: python build_runenpixel.py [--out DIRECTORY]
Dependencies: fonttools==4.64.0 brotli==1.2.0 pillow==12.3.0
"""
from __future__ import annotations
import argparse, base64, calendar, hashlib, html, json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables.O_S_2f_2 import Panose
from PIL import Image, ImageDraw, ImageFont

FAMILY = 'Kluftkrone Runenpixel'
STEM = 'KluftkroneRunenpixel-Regular'
UPEM, PIXEL, CAP, XHEIGHT = 1400, 100, 1100, 900
FIXED_TIME = calendar.timegm((2026, 9, 9, 12, 0, 0)) + 2082844800
# A cell is either wholly filled or wholly empty; corners and diagonals follow
# the same 100-unit lattice. Sidebearings and advances are integral cells too.
GLYPHS: dict[str, dict] = {}

def draw(char: str, diagram: str, bottom: int = 0, advance: int | None = None):
    rows = diagram.strip().split('/')
    width = max(map(len, rows))
    assert all(len(r) == width and not set(r) - {'0','1'} for r in rows), char
    cells = {(x, len(rows)-1-y+bottom) for y,r in enumerate(rows)
             for x,v in enumerate(r) if v == '1'}
    GLYPHS[char] = dict(cells=cells, width=width, advance=advance or width+1)

# Eleven-row capitals: clipped bowls, simple shoulders and restrained diagonals.
CAPITALS = {
'A':'00100/01010/10001/10001/10001/11111/10001/10001/10001/10001/10001',
'B':'11110/10001/10001/10001/10010/11110/10001/10001/10001/10001/11110',
'C':'01111/10000/10000/10000/10000/10000/10000/10000/10000/10000/01111',
'D':'11100/10010/10001/10001/10001/10001/10001/10001/10001/10010/11100',
'E':'11111/10000/10000/10000/10000/11110/10000/10000/10000/10000/11111',
'F':'11111/10000/10000/10000/10000/11110/10000/10000/10000/10000/10000',
'G':'01110/10001/10000/10000/10000/10111/10001/10001/10001/10001/01110',
'H':'10001/10001/10001/10001/10001/11111/10001/10001/10001/10001/10001',
'I':'111/010/010/010/010/010/010/010/010/010/111',
'J':'00111/00010/00010/00010/00010/00010/00010/00010/10010/10010/01100',
'K':'10001/10001/10010/10010/10100/11000/10100/10010/10010/10001/10001',
'L':'10000/10000/10000/10000/10000/10000/10000/10000/10000/10000/11111',
'M':'1000001/1100011/1010101/1001001/1001001/1000001/1000001/1000001/1000001/1000001/1000001',
'N':'10001/10001/11001/11001/10101/10101/10101/10011/10011/10001/10001',
'O':'01110/10001/10001/10001/10001/10001/10001/10001/10001/10001/01110',
'P':'11110/10001/10001/10001/10001/11110/10000/10000/10000/10000/10000',
'Q':'01110/10001/10001/10001/10001/10001/10001/10101/10011/10010/01101',
'R':'11110/10001/10001/10001/10001/11110/10100/10010/10010/10001/10001',
'S':'01111/10000/10000/10000/01000/00110/00001/00001/00001/00001/11110',
'T':'11111/00100/00100/00100/00100/00100/00100/00100/00100/00100/00100',
'U':'10001/10001/10001/10001/10001/10001/10001/10001/10001/10001/01110',
'V':'10001/10001/10001/10001/10001/10001/10001/01010/01010/00100/00100',
'W':'1000001/1000001/1000001/1000001/1000001/1000001/1001001/1001001/1010101/1100011/1000001',
'X':'10001/10001/01010/01010/00100/00100/00100/01010/01010/10001/10001',
'Y':'10001/10001/10001/01010/01010/00100/00100/00100/00100/00100/00100',
'Z':'11111/00001/00001/00010/00010/00100/01000/01000/10000/10000/11111',
}
for char,diagram in CAPITALS.items(): draw(char,diagram)
# Actual lowercase: nine-row x-height, eleven-row ascenders, two-row descenders.
# The compact five-cell m/w deliberately fit 90px room slots without tracking hacks.
LOWER = {
'a':'01110/00001/00001/01111/10001/10001/10001/10011/01101',
'b':'10000/10000/10110/11001/10001/10001/10001/10001/10001/11001/10110',
'c':'01111/10000/10000/10000/10000/10000/10000/10000/01111',
'd':'00001/00001/01101/10011/10001/10001/10001/10001/10001/10011/01101',
'e':'01110/10001/10001/10001/11111/10000/10000/10000/01111',
'f':'0011/0100/0100/1110/0100/0100/0100/0100/0100/0100/0100',
'g':'01101/10011/10001/10001/10001/10011/01101/00001/00001/10001/01110',
'h':'10000/10000/10110/11001/10001/10001/10001/10001/10001/10001/10001',
'i':'010/000/110/010/010/010/010/010/010/010/111',
'j':'001/000/011/001/001/001/001/001/001/001/001/101/010',
'k':'10000/10000/10001/10001/10010/10100/11000/10100/10010/10001/10001',
'l':'110/010/010/010/010/010/010/010/010/010/011',
'm':'11010/10101/10101/10101/10101/10101/10101/10101/10101',
'n':'10110/11001/10001/10001/10001/10001/10001/10001/10001',
'o':'01110/10001/10001/10001/10001/10001/10001/10001/01110',
'p':'10110/11001/10001/10001/10001/10001/11001/10110/10000/10000/10000',
'q':'01101/10011/10001/10001/10001/10001/10011/01101/00001/00001/00001',
'r':'1011/1100/1000/1000/1000/1000/1000/1000/1000',
's':'01111/10000/10000/01000/00110/00001/00001/00001/11110',
't':'010/010/111/010/010/010/010/010/010/010/001',
'u':'10001/10001/10001/10001/10001/10001/10001/10011/01101',
'v':'10001/10001/10001/10001/10001/10001/01010/01010/00100',
'w':'10001/10001/10001/10001/10101/10101/10101/10101/01010',
'x':'10001/10001/01010/01010/00100/01010/01010/10001/10001',
'y':'10001/10001/10001/10001/10001/10011/01101/00001/00001/10001/01110',
'z':'11111/00001/00010/00010/00100/01000/01000/10000/11111',
}
for char,diagram in LOWER.items(): draw(char,diagram,-2 if char in 'gjpqy' else 0)
DIGITS = {
'0':'01110/10001/10001/10011/10011/10101/11001/11001/10001/10001/01110',
'1':'010/110/010/010/010/010/010/010/010/010/111',
'2':'01110/10001/00001/00001/00010/00100/01000/10000/10000/10000/11111',
'3':'11110/00001/00001/00001/00010/01110/00001/00001/00001/00001/11110',
'4':'00010/00110/01010/01010/10010/10010/11111/00010/00010/00010/00010',
'5':'11111/10000/10000/10000/11110/00001/00001/00001/00001/10001/01110',
'6':'00110/01000/10000/10000/11110/10001/10001/10001/10001/10001/01110',
'7':'11111/00001/00001/00010/00010/00100/01110/00100/01000/01000/01000',
'8':'01110/10001/10001/10001/01010/01110/10001/10001/10001/10001/01110',
'9':'01110/10001/10001/10001/10001/01111/00001/00001/00010/00100/01100',
}
for char,diagram in DIGITS.items(): draw(char,diagram)
# Punctuation coordinates are baseline-relative, not stretched to a generic cap box.
PUNCT = {
'!':('1/1/1/1/1/1/1/0/0/1/1',0),
'"':('101/101/101',8), "'":('1/1/1',8),
'#':('01010/01010/11111/01010/01010/01010/11111/01010/01010',1),
'$':('00100/01111/10100/10100/01110/00101/00101/11110/00100',1),
'%':('11001/11001/00010/00010/00100/01000/01000/10011/10011',1),
'&':('01100/10010/10010/01100/01000/10101/10010/10010/01101',0),
'(':('001/010/100/100/100/100/100/100/100/010/001',0),
')':('100/010/001/001/001/001/001/001/001/010/100',0),
'*':('00100/10101/01110/10101/00100',6),
'+':('00100/00100/11111/00100/00100',3),
',':('01/01/10',-1), '-':('1111',5), '.':('1/1',0),
'/':('00001/00001/00010/00010/00100/00100/00100/01000/01000/10000/10000',0),
':':('1/1/0/0/0/1/1',1), ';':('01/01/00/00/00/01/01/10',0),
'<':('0001/0010/0100/1000/0100/0010/0001',2),
'=':('11111/00000/00000/11111',4),
'>':('1000/0100/0010/0001/0010/0100/1000',2),
'?':('01110/10001/00001/00001/00010/00100/00100/00000/00000/00100/00100',0),
'@':('0011100/0100010/1000001/1001101/1010101/1010101/1001110/1000000/0111110',0),
'[':('111/100/100/100/100/100/100/100/100/100/111',0),
'\\':('10000/10000/01000/01000/00100/00100/00100/00010/00010/00001/00001',0),
']':('111/001/001/001/001/001/001/001/001/001/111',0),
'^':('00100/01010/10001',8), '_':('11111',-2), '`':('10/01',10),
'{':('0011/0100/0100/0100/0100/1000/0100/0100/0100/0100/0011',0),
'|':('1/1/1/1/1/1/1/1/1/1/1',0),
'}':('1100/0010/0010/0010/0010/0001/0010/0010/0010/0010/1100',0),
'~':('01101/10010',5),
}
for char,(diagram,bottom) in PUNCT.items(): draw(char,diagram,bottom)
GLYPHS[' '] = dict(cells=set(),width=0,advance=3)
GLYPHS['\u00a0'] = dict(cells=set(),width=0,advance=3)
GLYPHS['\u2009'] = dict(cells=set(),width=0,advance=2)
GLYPHS['\u202f'] = dict(cells=set(),width=0,advance=2)
# Umlauts and other useful precomposed Latin accents reuse our own base pixels.
ACCENTS = {'umlaut':[(1,1),(3,1)], 'acute':[(2,1),(3,2)],
 'grave':[(2,2),(3,1)], 'circumflex':[(1,1),(2,2),(3,1)],
 'tilde':[(0,1),(1,2),(2,2),(3,1),(4,2)],
 'ring':[(1,1),(2,2),(3,1),(2,0)]}
def accented(char,base,accent):
    g=GLYPHS[base]; cells=set(g['cells'])
    if base == 'i': cells.discard((1,10))
    top=max(y for x,y in cells)+1
    center=(g['width']-5)//2
    for x,y in ACCENTS[accent]: cells.add((max(0,x+center),top+y))
    GLYPHS[char]=dict(cells=cells,width=g['width'],advance=g['advance'])
for chars,bases,mark in [
 ('ÄÖÜäöü','AOUaou','umlaut'),('ÁÉÍÓÚÝáéíóúý','AEIOUYaeiouy','acute'),
 ('ÀÈÌÒÙàèìòù','AEIOUaeiou','grave'),('ÂÊÎÔÛâêîôû','AEIOUaeiou','circumflex'),
 ('ÃÑÕãñõ','ANOano','tilde'),('Åå','Aa','ring'),('ËÏŸëïÿ','EIYei y'.replace(' ',''),'umlaut'),
]:
    assert len(chars)==len(bases)
    for char,base in zip(chars,bases): accented(char,base,mark)
draw('ß','01100/10010/10010/10100/10100/10010/10001/10001/10001/10001/10110')
draw('ẞ','111100/100010/100010/100100/101000/100100/100010/100001/100001/100001/101110')
draw('Æ','0011111/0101000/1001000/1001000/1001000/1111110/1001000/1001000/1001000/1001000/1001111')
draw('æ','0110110/0001001/0001001/0111111/1001000/1001000/1001000/1001000/0110111')
draw('Œ','0111111/1001000/1001000/1001000/1001000/1001110/1001000/1001000/1001000/1001000/0111111')
draw('œ','0110110/1001001/1001001/1001001/1001111/1001000/1001000/1001000/0110111')
for char,base in [('Ø','O'),('ø','o')]:
    g=GLYPHS[base]; cells=set(g['cells']); h=max(y for _,y in cells)+1
    for y in range(1,h-1): cells.add((min(4,max(0,int(y*5/h))),y))
    GLYPHS[char]=dict(cells=cells,width=5,advance=6)
for char,base in [('Ç','C'),('ç','c')]:
    g=GLYPHS[base]; GLYPHS[char]=dict(cells=g['cells']|{(2,-1),(1,-2)},width=g['width'],advance=g['advance'])
EXTRA = {
'–':('111111',5),'—':('11111111',5),'−':('11111',5),
'…':('10101/10101',0),'·':('1',5),'•':('010/111/010',4),
'‘':('01/10/10',9),'’':('01/01/10',9),'‚':('01/01/10',-1),
'“':('0101/1010/1010',9),'”':('0101/0101/1010',9),'„':('0101/0101/1010',-1),
'«':('001001/010010/100100/010010/001001',3),
'»':('100100/010010/001001/010010/100100',3),
'‹':('001/010/100/010/001',3),'›':('100/010/001/010/100',3),
'→':('0001000/0000100/0000010/1111111/0000010/0000100/0001000',2),
'←':('0001000/0010000/0100000/1111111/0100000/0010000/0001000',2),
'↑':('00100/01110/10101/00100/00100/00100/00100/00100/00100',1),
'↓':('00100/00100/00100/00100/00100/00100/10101/01110/00100',1),
'↔':('0010100/0100010/1111111/0100010/0010100',3),
'↕':('00100/01110/10101/00100/00100/00100/10101/01110/00100',1),
'↗':('11111/00011/00101/01001/10001',3),
'↘':('10001/01001/00101/00011/11111',3),
'↙':('10001/10010/10100/11000/11111',3),
'↖':('11111/11000/10100/10010/10001',3),
'↵':('000001/000001/001001/010001/111111/010000/001000',2),
'×':('10001/01010/00100/01010/10001',3),
'÷':('00100/00000/00000/11111/00000/00000/00100',2),
'±':('00100/00100/11111/00100/00100/00000/00000/11111',1),
'≠':('00010/11111/00100/01000/11111/01000',3),
'≤':('0001/0010/0100/1000/0100/0010/0001/0000/1111',1),
'≥':('1000/0100/0010/0001/0010/0100/1000/0000/1111',1),
'∞':('0110110/1001001/1001001/1001001/0110110',3),
'√':('0000011/0000010/0000010/0000010/1000100/0100100/0100100/0011000',1),
'°':('010/101/010',8),
'€':('00111/01000/10000/11110/10000/11110/10000/01000/00111',1),
'£':('00110/01001/01000/01000/11110/01000/01000/01000/11111',1),
'¥':('10001/10001/01010/00100/11111/00100/11111/00100/00100',1),
'§':('0111/1000/0110/1001/1001/0110/0001/1110',1),
'©':('0011100/0100010/1011101/1010001/1010001/1010001/1011101/0100010/0011100',1),
'®':('0011100/0100010/1011001/1010101/1011001/1010101/1010101/0100010/0011100',1),
'™':('1110101/0101111/0101011/0101001/0101001',6),
'✓':('000001/000010/000100/101000/010000',3),
'✕':('10001/01010/00100/01010/10001',3),
'★':('0001000/0001000/1111111/0111110/0011100/0110110/1000001',2),
'☆':('0001000/0001000/1111111/0100010/0010100/0101010/1000001',2),
'◆':('00100/01110/11111/01110/00100',3),
'◇':('00100/01010/10001/01010/00100',3),
'■':('11111/11111/11111/11111/11111',3),
'□':('11111/10001/10001/10001/11111',3),
}
for char,(diagram,bottom) in EXTRA.items(): draw(char,diagram,bottom)

# The open-box missing-glyph mark is also our own raster drawing.
draw('\ufffd','1111111/1000001/1011101/1000101/1001001/1001001/1000001/1001001/1000001/1000001/1111111')

def glyph_name(char): return 'uni'+format(ord(char),'04X')

def pixel_outline(cells):
    """Merge equal horizontal runs vertically; no diagonal/vector approximation."""
    remaining=set(cells); pen=TTGlyphPen(None)
    while remaining:
        x,y=min(remaining,key=lambda p:(p[1],p[0])); width=1
        while (x+width,y) in remaining: width+=1
        height=1
        while all((xx,y+height) in remaining for xx in range(x,x+width)): height+=1
        for xx in range(x,x+width):
            for yy in range(y,y+height): remaining.remove((xx,yy))
        a,b,c,d=x*PIXEL,y*PIXEL,(x+width)*PIXEL,(y+height)*PIXEL
        pen.moveTo((a,b)); pen.lineTo((a,d)); pen.lineTo((c,d)); pen.lineTo((c,b)); pen.closePath()
    return pen.glyph()

def build(out):
    out.mkdir(parents=True,exist_ok=True)
    order=['.notdef']+[glyph_name(c) for c in sorted(GLYPHS,key=ord)]
    glyphs={'.notdef':pixel_outline(GLYPHS['\ufffd']['cells'])}
    metrics={'.notdef':(800,0)}
    for c,g in GLYPHS.items():
        name=glyph_name(c); glyphs[name]=pixel_outline(g['cells'])
        metrics[name]=(g['advance']*PIXEL,min((x for x,y in g['cells']),default=0)*PIXEL)
    # Tabular alternates preserve lattice positions and support numeric HUD columns.
    for digit in '0123456789':
        name=glyph_name(digit)+'.tnum'; g=GLYPHS[digit]
        shift=(5-g['width'])//2; cells={(x+shift,y) for x,y in g['cells']}
        order.append(name); glyphs[name]=pixel_outline(cells)
        metrics[name]=(600,min(x for x,y in cells)*PIXEL)
    fb=FontBuilder(UPEM,isTTF=True); fb.setupGlyphOrder(order)
    fb.setupCharacterMap({ord(c):glyph_name(c) for c in GLYPHS})
    fb.setupGlyf(glyphs); fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1400,descent=-200,lineGap=0)
    panose=Panose(); panose.bFamilyType=2; panose.bSerifStyle=11
    panose.bWeight=5; panose.bProportion=6; panose.bContrast=2
    fb.setupOS2(version=4,sTypoAscender=1400,sTypoDescender=-200,sTypoLineGap=0,
        usWinAscent=1500,usWinDescent=200,sxHeight=XHEIGHT,sCapHeight=CAP,
        usWeightClass=400,usWidthClass=4,fsType=0,fsSelection=0xC0,panose=panose,
        achVendID='KLUF')
    fb.setupNameTable({'familyName':FAMILY,'styleName':'Regular',
        'uniqueFontIdentifier':'KLUF;2026;'+STEM+';1.000',
        'fullName':FAMILY+' Regular','psName':STEM,'version':'Version 1.000',
        'copyright':'Original pixel glyphs and build source made for Kluftkrone, 2026. CC0 1.0.',
        'manufacturer':'Kluftkrone Project','designer':'Codex for Kluftkrone',
        'description':'Original compact 7x11 rune-inspired pixel interface font; 100-unit lattice, 1400 UPEM.',
        'licenseDescription':'To the extent rights apply, these original glyphs and this generator are dedicated under CC0 1.0 Universal. No Reserved Font Names.',
        'licenseInfoURL':'https://creativecommons.org/publicdomain/zero/1.0/'})
    fb.setupPost(keepGlyphNames=True); fb.setupMaxp()
    fb.font['head'].created=fb.font['head'].modified=FIXED_TIME
    fb.font.recalcTimestamp=False
    gasp=newTable('gasp'); gasp.gaspRange={65535:0x0F}; fb.font['gasp']=gasp
    feature=['feature tnum {']+[f'sub {glyph_name(d)} by {glyph_name(d)}.tnum;' for d in '0123456789']+['} tnum;']
    feature+=['feature kern {']
    for a,b in [('A','V'),('A','W'),('A','Y'),('T','a'),('T','e'),('T','o'),('V','a'),('V','o'),('W','a'),('Y','a'),('Y','o')]:
        feature.append(f'pos {glyph_name(a)} {glyph_name(b)} -100;')
    feature+=['} kern;']; addOpenTypeFeaturesFromString(fb.font,'\n'.join(feature))
    ttf=out/(STEM+'.ttf'); woff2=out/(STEM+'.woff2')
    fb.font.save(ttf); fb.font.flavor='woff2'; fb.font.save(woff2)
    # Always reopen both final artifacts; check actual cmap, advance and lattice.
    required=set(chr(i) for i in range(32,127))|set('ÄÖÜäöüßẞ→←↑↓×÷±≤≥≠€„“”’…–—')
    for path in (ttf,woff2):
        with TTFont(path) as font:
            assert required <= set(map(chr,font.getBestCmap())),path
            assert font['head'].unitsPerEm==UPEM
            for name in font.getGlyphOrder():
                glyph=font['glyf'][name]
                if glyph.numberOfContours>0:
                    assert all(x%PIXEL==0 and y%PIXEL==0 for x,y in glyph.getCoordinates(font['glyf'])[0]),name
    report={'family':FAMILY,'glyphs':len(order),'unicode_mappings':len(GLYPHS),
        'units_per_em':UPEM,'raster_units':PIXEL,'cap_height':CAP,'x_height':XHEIGHT,
        'typographic_ascender':1400,'descender':-200,'pixel_exact_css_sizes':[14,28,42],
        'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (ttf,woff2)},
        'widths_px':{text:{str(size):sum(GLYPHS[c]['advance']*PIXEL for c in text)*size/UPEM for size in [12,14,16,24,28]} for text in ['Schatzkammer','Sammelbanner','Runenarchiv','Schürflinge','Werkstatt','0123456789']}}
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (out/'glyphs.json').write_text(json.dumps({c:{'advance_cells':g['advance'],'pixels':sorted(g['cells'])} for c,g in GLYPHS.items()},ensure_ascii=False,separators=(',',':'))+'\n')
    specimen(out,ttf,woff2)
    print(json.dumps(report,ensure_ascii=False,indent=2))

def specimen(out,ttf,woff2):
    """The PNG is rasterized from our final TTF, never from a system font."""
    bg='#13181b'; fg='#e5d7ab'; dim='#919c9a'; gold='#c7974d'; green='#a9bd80'
    im=Image.new('RGB',(1440,1070),bg); dr=ImageDraw.Draw(im)
    def text(x,y,s,size=14,color=fg):
        dr.text((x,y),s,font=ImageFont.truetype(str(ttf),size),fill=color,anchor='lt')
    text(42,32,'KLUFTKRONE',56); text(44,96,'RUNENPIXEL / ORIGINAL 7×11 RASTER / 14 → 28 PX',14,gold)
    dr.line((42,130,1398,130),fill='#3b403f')
    y=154
    for size,s in [(12,'12 PX  /  GOLD 2400 · MANA 100 · WELLE 3/4 · FORSCHUNG 65%'),
                   (14,'14 px  /  Schatzkammer  Sammelbanner  Runenarchiv  Schürflinge'),
                   (16,'16 px  /  Schatzkammer  Sammelbanner  Runenarchiv  Schürflinge'),
                   (20,'20 px  /  Deine Schürflinge errichten einen Übungshof.'),
                   (24,'24 px  /  Raumplan setzen → Boden beanspruchen'),
                   (28,'28 px  /  HERRSCHAFT DER TIEFE')]:
        text(42,y,s,size);y+=size+24
    text(42,461,'90 PX RAUMSLOTS / TEXT 14 PX',12,gold)
    for j,label in enumerate(['Schatzkammer','Sammelbanner','Runenarchiv','Ruhestätte','Pilzgarten','Übungshof','Werkstatt']):
        x=42+j*104;dr.rectangle((x,493,x+90,535),outline='#666050',fill='#24292a')
        font=ImageFont.truetype(str(ttf),14);w=dr.textlength(label,font=font)
        text(x+(90-w)/2,508,label,14)
    text(42,564,'O0  I1l  S5  B8  Z2  G6   /   ÄÖÜ  äöü  ßẞ   /   0123456789',28,green)
    text(42,616,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',28)
    text(42,658,'abcdefghijklmnopqrstuvwxyz',28)
    text(42,706,'.,:;!?  „Runen“  ‘quotes’  () [] {}  +−×÷=≠≤≥±  €$£  %&@#',20)
    text(42,747,'← ↑ → ↓ ↔ ↕ ↖ ↗ ↙ ↘ ↵   ✓ ✕ ★ ☆ ◆ ◇ ■ □   … – — ° ∞ √',20)
    dr.line((42,798,1398,798),fill='#3b403f')
    text(42,823,'AUS EINZELNEN PIXELN GEZEICHNET',14,gold)
    text(42,855,'Raster: 100 Einheiten · UPEM: 1400 · Versalien: 1100 · x-Höhe: 900',14)
    text(42,882,'14 und 28 px treffen volle Pixel; 16 und 24 px werden geglättet.',14,dim)
    text(42,909,'Echte Kleinbuchstaben, kompakte Breiten, tabellarische Ziffern: tnum.',14,dim)
    text(42,936,'Original glyphs and generator. No imported font or traced outlines. CC0.',14,dim)
    # Two exact-grid high-magnification glyphs provide visual design proof.
    for offset,c in enumerate('A0ß'):
        g=GLYPHS[c]; ox=1084+offset*108;oy=886
        for xx in range(8):dr.line((ox+xx*9,oy-110,ox+xx*9,oy+9),fill='#292f31')
        for yy in range(14):dr.line((ox,oy-yy*9,ox+63,oy-yy*9),fill='#292f31')
        for x,yy in g['cells']:dr.rectangle((ox+x*9,oy-(yy+1)*9,ox+(x+1)*9-1,oy-yy*9-1),fill=gold)
    im.save(out/'runenpixel-specimen.png')
    # A self-contained vector specimen embeds the newly generated font.
    embedded=base64.b64encode(woff2.read_bytes()).decode('ascii')
    rows=[(38,46,28,'KLUFTKRONE RUNENPIXEL'),(38,92,14,'Originales Raster · 14 und 28 px pixelgenau'),
      (38,140,12,'12 PX  GOLD 2400 · MANA 100 · WELLE 3/4'),
      (38,180,14,'14 px  Schatzkammer · Sammelbanner · Schürflinge'),
      (38,224,16,'16 px  Schatzkammer · Sammelbanner · Schürflinge'),
      (38,276,24,'Raumplan setzen → Boden beanspruchen'),
      (38,326,28,'HERRSCHAFT DER TIEFE'),
      (38,390,28,'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),(38,440,28,'abcdefghijklmnopqrstuvwxyz'),
      (38,500,28,'O0 I1l S5 B8 Z2 G6 · ÄÖÜ äöü ßẞ'),
      (38,552,20,'0123456789 · „Runen“ · ± × ÷ ≤ ≥ ≠ € %'),
      (38,604,20,'← ↑ → ↓ ↔ ↕ ↖ ↗ ↙ ↘ ↵  ✓ ✕ ★ ☆ ◆ ◇'),
      (38,662,14,'100-unit grid / 1400 UPEM / Original drawings / CC0')]
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700" viewBox="0 0 1080 700"><style>@font-face{{font-family:R;src:url(data:font/woff2;base64,{embedded}) format("woff2")}}text{{font-family:R;font-kerning:none;fill:{fg}}}</style><rect width="1080" height="700" fill="{bg}"/>'
    svg+=''.join(f'<text x="{x}" y="{y}" font-size="{size}">{html.escape(s)}</text>' for x,y,size,s in rows)+'</svg>'
    (out/'runenpixel-specimen.svg').write_text(svg)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parent)
    build(parser.parse_args().out)
