#!/usr/bin/env python3
"""Kluftkrone Inscribed: original geometric chiseled display typeface.

All glyph skeletons, contours and proportions below are original code authored
for KLUFTKRONE on 2026-09-09. No existing font is read, copied or transformed.
Dependencies: fonttools brotli skia-pathops pillow (Pillow only for specimen).
Run: python build_kluftkrone.py
"""
from pathlib import Path
import math
import calendar
import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

OUT = Path(__file__).resolve().parent
UPEM = 1000
CAP = 700
STEM = 68
GLYPHS = {}
WIDTHS = {}
CMAP = {}


def polygon(path, points):
    """Clockwise solid polygon, later unioned to eliminate overlaps."""
    area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))
    if area > 0:
        points = points[::-1]
    path.moveTo(*points[0])
    for p in points[1:]:
        path.lineTo(*p)
    path.close()


def stroke(path, points, width=STEM, closed=False):
    """Original polygonal pen; bevel joins give the engraved stone character."""
    if closed:
        points = points + [points[0]]
    for a,b in zip(points,points[1:]):
        dx,dy=b[0]-a[0],b[1]-a[1]
        length=math.hypot(dx,dy)
        nx,ny=-dy/length*width/2,dx/length*width/2
        polygon(path,[(a[0]+nx,a[1]+ny),(b[0]+nx,b[1]+ny),
                      (b[0]-nx,b[1]-ny),(a[0]-nx,a[1]-ny)])
    joints=points[:-1] if closed else points[1:-1]
    for x,y in joints:
        r=width/2
        polygon(path,[(x-r,y-r*.42),(x-r*.42,y-r),(x+r*.42,y-r),
                      (x+r,y-r*.42),(x+r,y+r*.42),(x+r*.42,y+r),
                      (x-r*.42,y+r),(x-r,y+r*.42)])


def stem(path,x,y0=0,y1=CAP,serifs=True,width=STEM):
    stroke(path,[(x,y0),(x,y1)],width)
    if serifs:
        serif(path,x,y0,1,width)
        serif(path,x,y1,-1,width)


def serif(path,x,y,direction,width=STEM):
    # Triangular shoulders rather than conventional rounded brackets.
    r=width/2
    polygon(path,[(x-r-26,y),(x+r+26,y),(x+r+26,y+direction*15),
                  (x+r,y+direction*42),(x-r,y+direction*42),
                  (x-r-26,y+direction*15)])


def crossbar(path,y,x0,x1,width=56):
    stroke(path,[(x0,y),(x1,y)],width)


def raw(name,advance=660):
    path=pathops.Path()
    GLYPHS[name]=path
    WIDTHS[name]=advance
    return path


def bowl(path,x0,x1,y0,y1,width=STEM,left=True):
    cut=min(92,(y1-y0)*.23)
    pts=[(x0+cut,y0),(x1-cut,y0),(x1,y0+cut),(x1,y1-cut),
         (x1-cut,y1),(x0+cut,y1),(x0,y1-cut),(x0,y0+cut)]
    stroke(path,pts,width,True)


# A-Z. Each letter is explicitly designed from our own centerline geometry.
p=raw('A',670);stroke(p,[(79,0),(329,700),(579,0)],72);crossbar(p,256,166,492);serif(p,79,0,1,72);serif(p,579,0,1,72)
p=raw('B',650);stem(p,114);stroke(p,[(114,674),(414,674),(500,605),(500,449),(420,365),(114,365)]);stroke(p,[(114,365),(442,365),(529,283),(529,109),(442,26),(114,26)])
p=raw('C',654);stroke(p,[(540,581),(448,674),(214,674),(111,568),(111,131),(214,26),(448,26),(540,116)],70);stroke(p,[(540,581),(540,642)],60);stroke(p,[(540,116),(540,57)],60)
p=raw('D',680);stem(p,114);stroke(p,[(114,674),(408,674),(551,526),(551,174),(408,26),(114,26)],70)
p=raw('E',600);stem(p,114);crossbar(p,674,114,512);crossbar(p,362,114,438);crossbar(p,26,114,512);stroke(p,[(512,674),(512,595)],56);stroke(p,[(512,26),(512,103)],56);stroke(p,[(438,326),(438,401)],52)
p=raw('F',590);stem(p,114);crossbar(p,674,114,512);crossbar(p,362,114,430);stroke(p,[(512,674),(512,595)],56);stroke(p,[(430,326),(430,401)],52)
p=raw('G',695);stroke(p,[(564,580),(462,674),(218,674),(111,566),(111,135),(218,26),(472,26),(564,120),(564,325),(376,325)],70);stroke(p,[(564,580),(564,641)],54);serif(p,564,325,1,68)
p=raw('H',700);stem(p,114);stem(p,582);crossbar(p,352,114,582)
p=raw('I',316);stem(p,158)
p=raw('J',553);stem(p,437,137,700);stroke(p,[(437,137),(338,26),(194,26),(103,111),(103,210)],70)
p=raw('K',676);stem(p,114);stroke(p,[(561,700),(114,298)],68);stroke(p,[(315,480),(583,0)],72);serif(p,561,700,-1);serif(p,583,0,1)
p=raw('L',593);stem(p,114);crossbar(p,26,114,505);stroke(p,[(505,26),(505,116)],56)
p=raw('M',831);stem(p,114);stem(p,713);stroke(p,[(114,670),(414,267),(713,670)],62)
p=raw('N',717);stem(p,114);stem(p,600);stroke(p,[(114,667),(600,32)],62)
p=raw('O',703);bowl(p,113,585,26,674,70)
p=raw('P',632);stem(p,114);stroke(p,[(114,674),(418,674),(517,582),(517,416),(421,329),(114,329)],70)
p=raw('Q',703);bowl(p,113,585,26,674,70);stroke(p,[(393,160),(634,-78)],66);polygon(p,[(587,-46),(660,-73),(615,-105)])
p=raw('R',680);stem(p,114);stroke(p,[(114,674),(424,674),(521,582),(521,425),(428,335),(114,335)],70);stroke(p,[(330,335),(582,0)],74);serif(p,582,0,1,74)
p=raw('S',632);stroke(p,[(522,574),(434,674),(211,674),(111,578),(111,460),(211,366),(426,326),(522,239),(522,126),(422,26),(195,26),(100,121)],70);stroke(p,[(522,574),(522,641)],54);stroke(p,[(100,121),(100,59)],54)
p=raw('T',642);stem(p,321);crossbar(p,674,70,572);stroke(p,[(70,674),(70,593)],56);stroke(p,[(572,674),(572,593)],56)
p=raw('U',703);stem(p,114,137,700);stem(p,584,137,700);stroke(p,[(114,137),(217,26),(480,26),(584,137)],70)
p=raw('V',679);stroke(p,[(82,700),(337,0),(592,700)],72);serif(p,82,700,-1,72);serif(p,592,700,-1,72)
p=raw('W',976);stroke(p,[(82,700),(280,0),(485,470),(690,0),(890,700)],72);serif(p,82,700,-1,72);serif(p,890,700,-1,72)
p=raw('X',676);stroke(p,[(87,700),(584,0)],70);stroke(p,[(584,700),(87,0)],66);serif(p,87,700,-1);serif(p,584,0,1);serif(p,584,700,-1);serif(p,87,0,1)
p=raw('Y',675);stem(p,337,0,299);stroke(p,[(82,700),(337,299),(592,700)],68);serif(p,82,700,-1);serif(p,592,700,-1)
p=raw('Z',632);stroke(p,[(104,674),(530,674),(104,26),(530,26)],66);stroke(p,[(104,674),(104,591)],56);stroke(p,[(530,26),(530,109)],56)

# Numerals use the same faceted geometry with a narrower, fixed 600 unit set.
p=raw('zero',600);bowl(p,104,495,26,674,68);stroke(p,[(163,146),(436,556)],38)
p=raw('one',600);stroke(p,[(148,570),(311,680),(311,0)],68);crossbar(p,26,171,451)
p=raw('two',600);stroke(p,[(102,560),(197,674),(403,674),(496,583),(496,473),(106,26),(498,26)],68);stroke(p,[(498,26),(498,106)],52)
p=raw('three',600);stroke(p,[(107,596),(195,674),(410,674),(491,584),(491,463),(389,359),(250,359)],66);stroke(p,[(389,359),(494,249),(494,124),(405,26),(191,26),(98,118)],68)
p=raw('four',600);stroke(p,[(442,0),(442,700),(96,213),(534,213)],66);serif(p,442,0,1)
p=raw('five',600);stroke(p,[(493,674),(129,674),(107,374),(389,374),(490,274),(490,132),(396,26),(188,26),(101,109)],68)
p=raw('six',600);stroke(p,[(473,601),(397,674),(222,674),(108,548),(108,131),(201,26),(407,26),(495,128),(495,287),(405,379),(201,379),(108,285)],68)
p=raw('seven',600);stroke(p,[(100,674),(500,674),(209,0)],68);crossbar(p,346,216,468,48)
p=raw('eight',600);bowl(p,116,484,373,674,66);bowl(p,101,499,26,373,68)
p=raw('nine',600);stroke(p,[(121,100),(202,26),(377,26),(490,151),(490,570),(397,674),(191,674),(105,570),(105,410),(195,319),(397,319),(490,412)],68)


def transform(source,sx=1,sy=1,dx=0,dy=0):
    return GLYPHS[source].transform(sx,0,0,sy,dx,dy)


def add_name(name,char,path,width):
    GLYPHS[name]=path;WIDTHS[name]=width;CMAP[ord(char)]=name


for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    CMAP[ord(ch)]=ch
    add_name(ch.lower(),ch.lower(),transform(ch,.82,.79,0,0),round(WIDTHS[ch]*.82))
for n,name in enumerate(['zero','one','two','three','four','five','six','seven','eight','nine']):
    CMAP[48+n]=name


def umlaut(base,name,char,small=False):
    path=transform(base)
    center=WIDTHS[base]/2
    y=655 if small else 833
    gap=76 if small else 91
    r=29 if small else 35
    for x in (center-gap,center+gap):
        polygon(path,[(x-r,y),(x,y-r),(x+r,y),(x,y+r)])
    add_name(name,char,path,WIDTHS[base])


for base,name,ch in [('A','Adieresis','Ä'),('O','Odieresis','Ö'),('U','Udieresis','Ü'),('a','adieresis','ä'),('o','odieresis','ö'),('u','udieresis','ü')]:
    umlaut(base,name,ch,base.islower())

# Distinct capital sharp S: open upper facet and long diagonal double bowl.
p=raw('Germandbls',676);stem(p,114);stroke(p,[(114,673),(376,673),(464,583),(393,464),(303,369),(472,313),(564,216),(564,112),(468,26),(304,26)],68)
CMAP[ord('ẞ')]='Germandbls'
add_name('germandbls','ß',transform('Germandbls',.82,.79),554)

# A small punctuation set makes title copy and a stand-alone font practical.
p=raw('space',300);CMAP[32]='space'
p=raw('period',290);polygon(p,[(103,26),(145,-16),(187,26),(145,68)]);CMAP[46]='period'
p=raw('periodcentered',330);polygon(p,[(123,340),(165,298),(207,340),(165,382)]);CMAP[183]='periodcentered';CMAP[0x2022]='periodcentered'
p=raw('comma',290);polygon(p,[(105,61),(185,61),(178,-22),(108,-98),(143,-16),(105,-16)]);CMAP[44]='comma'
p=raw('colon',290)
for y in (26,397):polygon(p,[(103,y),(145,y-42),(187,y),(145,y+42)])
CMAP[58]='colon'
p=raw('semicolon',290);p.addPath(transform('comma'));polygon(p,[(103,397),(145,355),(187,397),(145,439)]);CMAP[59]='semicolon'
p=raw('hyphen',440);crossbar(p,330,85,355,62);CMAP[45]='hyphen'
p=raw('endash',650);crossbar(p,330,85,565,62);CMAP[0x2013]='endash'
p=raw('emdash',920);crossbar(p,330,85,835,62);CMAP[0x2014]='emdash'
p=raw('exclam',302);stroke(p,[(151,700),(151,221)],76);polygon(p,[(109,26),(151,-16),(193,26),(151,68)]);CMAP[33]='exclam'
p=raw('question',570);stroke(p,[(99,570),(185,674),(384,674),(475,583),(475,457),(283,291),(283,202)],66);polygon(p,[(241,26),(283,-16),(325,26),(283,68)]);CMAP[63]='question'
p=raw('slash',500);stroke(p,[(80,-50),(420,750)],58);CMAP[47]='slash'
p=raw('parenleft',350);stroke(p,[(270,750),(129,564),(129,136),(270,-50)],54);CMAP[40]='parenleft'
p=raw('parenright',350);stroke(p,[(80,750),(221,564),(221,136),(80,-50)],54);CMAP[41]='parenright'
p=raw('plus',600);crossbar(p,350,95,505,58);stroke(p,[(300,145),(300,555)],58);CMAP[43]='plus'
p=raw('ampersand',760);stroke(p,[(665,0),(196,494),(196,593),(277,674),(395,674),(481,590),(481,502),(111,185),(111,114),(213,26),(433,26),(625,238),(660,328)],62);CMAP[38]='ampersand'
p=raw('apostrophe',260);polygon(p,[(91,700),(168,700),(160,602),(105,549),(130,622),(91,622)]);CMAP[39]='apostrophe';CMAP[0x2019]='apostrophe'
p=raw('quotedbl',430);p.addPath(transform('apostrophe'));p.addPath(transform('apostrophe',1,1,170,0));CMAP[34]='quotedbl'
p=raw('copyright',780);bowl(p,87,687,41,658,44);stroke(p,[(535,503),(461,554),(305,554),(229,474),(229,225),(305,145),(460,145),(535,206)],48);CMAP[169]='copyright'
p=raw('.notdef',620);stroke(p,[(90,0),(530,0),(530,700),(90,700)],56,True);stroke(p,[(120,45),(500,655)],46)

ORDER=['.notdef','space']+[x for x in GLYPHS if x not in ('.notdef','space')]
font_glyphs={}
metrics={}
for name in ORDER:
    path=pathops.simplify(GLYPHS[name],fix_winding=True,keep_starting_points=True)
    pen=TTGlyphPen(None)
    path.draw(pen)
    glyph=pen.glyph()
    font_glyphs[name]=glyph
    bounds=path.bounds
    metrics[name]=(WIDTHS[name],round(bounds[0]) if len(path) else 0)

fb=FontBuilder(UPEM,isTTF=True)
fb.setupGlyphOrder(ORDER)
fb.setupCharacterMap(CMAP)
fb.setupGlyf(font_glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=950,descent=-200,lineGap=0)
fb.setupNameTable({'familyName':'Kluftkrone Inscribed','styleName':'Regular',
    'uniqueFontIdentifier':'Kluftkrone Inscribed Regular 1.000 2026',
    'fullName':'Kluftkrone Inscribed Regular','psName':'KluftkroneInscribed-Regular',
    'version':'Version 1.000',
    'copyright':'Original glyph design and code created for KLUFTKRONE, 2026. Released under CC0 1.0.',
    'description':'An original faceted, chiseled serif display face. Lowercase forms are small capitals. Designed for titles only.',
    'licenseDescription':'CC0 1.0 Universal: free to use, modify and redistribute.',
    'licenseInfoURL':'https://creativecommons.org/publicdomain/zero/1.0/'})
fb.setupOS2(sTypoAscender=950,sTypoDescender=-200,sTypoLineGap=0,usWinAscent=950,usWinDescent=200,
    sxHeight=553,sCapHeight=700,usWeightClass=400,usWidthClass=5,fsType=0,fsSelection=0x40)
fb.setupPost(keepGlyphNames=True)
fb.setupMaxp()
fb.font['head'].fontRevision=1.0
fb.font.recalcTimestamp=False
fb.font['head'].created=fb.font['head'].modified=calendar.timegm((2026,9,9,0,0,0))+2082844800
addOpenTypeFeaturesFromString(fb.font,'''
languagesystem DFLT dflt;
languagesystem latn dflt;
feature kern {
  pos A V -68; pos A W -48; pos A Y -70; pos A T -40;
  pos V A -68; pos W A -48; pos Y A -70; pos T A -45;
  pos T O -25; pos L T -48; pos L V -65; pos L Y -65;
  pos F A -35; pos P A -45; pos R T -15;
  pos a v -48; pos a w -30; pos a y -50; pos a t -25;
  pos v a -48; pos w a -30; pos y a -50; pos t a -30;
  pos l t -30; pos l v -44; pos l y -44;
} kern;
''')
fb.save(OUT/'KluftkroneInscribed-Regular.ttf')
fb.font.flavor='woff2'
fb.font.save(OUT/'KluftkroneInscribed-Regular.woff2')
print(f'Built {len(ORDER)} original glyphs; {len(CMAP)} Unicode mappings.')

try:
    from PIL import Image,ImageDraw,ImageFont
    im=Image.new('RGB',(1720,1120),'#121719')
    dr=ImageDraw.Draw(im)
    fontpath=str(OUT/'KluftkroneInscribed-Regular.ttf')
    lines=[('KLUFTKRONE',126),('INSCRIBED',72),('ABCDEFGHIJKLMNOPQRSTUVWXYZ',60),
           ('abcdefghijklmnopqrstuvwxyz',62),('0123456789',80),('Ä Ö Ü ẞ   ä ö ü ß',83),
           ('KLUFTKRONE  ·  DIE EWIGE GLUT',67),('REICH DES STEINS',79)]
    y=45
    for i,(txt,size) in enumerate(lines):
        font=ImageFont.truetype(fontpath,size)
        dr.text((65,y),txt,font=font,fill=('#e5bc73' if i<2 else '#c9c1ae'),stroke_width=0)
        y+=size+28
    im.save(OUT/'kluftkrone-specimen.png')
except ImportError:
    pass
