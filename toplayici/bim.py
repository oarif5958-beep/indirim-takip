"""BİM: Aktüel Ürünler sayfasındaki tüm tarih sekmelerini (aktüel + haftalık indirim) toplar."""
import re
import time

from ortak import baslik_yap, fiyat_oku, getir, tarih_oku, temizle

SITE = "https://www.bim.com.tr"
ANA_SAYFA = SITE + "/Categories/100/aktuel-urunler.aspx"


def sekmeleri_bul(sayfa):
    """Menüdeki tabloyu okur: sol sütun aktüel günleri, sağ sütun indirim haftalarıdır."""
    tablo = re.search(r'class="subMenu aktuelsubmenu".*?</table>', sayfa, re.S)
    sekmeler = {}
    if not tablo:
        return sekmeler
    for satir in re.findall(r"<tr>(.*?)</tr>", tablo.group(0), re.S):
        hucreler = re.findall(r'<td class="link"><a href="([^"]*)">([^<]*)</a></td>', satir)
        for sira, (link, etiket) in enumerate(hucreler):
            anahtar = re.search(r"Bim_AktuelTarihKey=(\d+)", link)
            if anahtar and etiket.strip():
                sekmeler[anahtar.group(1)] = {
                    "etiket": etiket.strip(),
                    "tur": "aktuel" if sira == 0 else "indirim",
                }
    return sekmeler


def urunleri_oku(sayfa, sekme):
    baslangic, bitis = tarih_oku(sekme["etiket"])
    alan = sayfa.split('class="productArea"', 1)[-1]
    urunler = []
    for blok in alan.split('<div class="product col')[1:]:
        ad = re.search(r'<h2 class="title">(.*?)</h2>', blok, re.S)
        if not ad:
            continue
        link = re.search(r'<a href="(/aktuel-urunler/[^"]+)"', blok)
        gorsel = re.search(r'<img src="([^"]+)"', blok)
        marka = re.search(r'<h2 class="subTitle">(.*?)</h2>', blok, re.S)
        gramaj = re.search(r'<div class="gramajadet">(.*?)</div>', blok, re.S)
        maddeler = [temizle(x) for x in re.findall(r'<span class="text">(.*?)</span>', blok, re.S)]

        # Güncel fiyat: tam kısmı "text quantify" içinde, kuruşu "kusurArea" içinde
        yeni = re.search(
            r'class="gButton triangle"[^>]*>\s*<div class="text quantify">([^<]*)</div>'
            r'\s*<div class="kusurArea">\s*<span class="number">([^<]*)</span>', blok, re.S)
        eski = re.search(r'class="CountButton strikethrough"><div class="text quantify">([^<]*)</div>', blok)
        yuzde = re.search(r'class="DiscountButton[^"]*">\s*%\s*(\d+)', blok)
        fiyat = fiyat_oku(yeni.group(1) + yeni.group(2)) if yeni else None

        urunler.append({
            "market": "bim",
            "ad": baslik_yap(temizle(ad.group(1))),
            "marka": temizle(marka.group(1)) if marka else "",
            "gramaj": temizle(gramaj.group(1)).lstrip("• ").strip() if gramaj else "",
            "aciklama": ", ".join(m for m in maddeler if m)[:200],
            "fiyat": fiyat,
            "eskiFiyat": fiyat_oku(eski.group(1)) if eski else None,
            "indirimYuzde": int(yuzde.group(1)) if yuzde else None,
            "kampanya": "",
            "kategori": "Aktüel Ürünler" if sekme["tur"] == "aktuel" else "Haftalık İndirim",
            "tur": sekme["tur"],
            "tarihEtiket": sekme["etiket"],
            "baslangic": baslangic,
            "bitis": bitis,
            "gorsel": gorsel.group(1) if gorsel else "",
            "link": SITE + link.group(1) if link else ANA_SAYFA,
        })
    return urunler


def topla():
    ana = getir(ANA_SAYFA)
    sekmeler = sekmeleri_bul(ana)
    hepsi = []
    for anahtar, sekme in sekmeler.items():
        sayfa = getir(f"{ANA_SAYFA}?top=1&Bim_AktuelTarihKey={anahtar}")
        hepsi.extend(urunleri_oku(sayfa, sekme))
        time.sleep(1)
    return hepsi


if __name__ == "__main__":
    sonuc = topla()
    print(len(sonuc), "ürün")
    for u in sonuc[:5]:
        print(u)
