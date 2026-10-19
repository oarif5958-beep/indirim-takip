"""Toplayıcıların ortak yardımcıları: HTTP isteği, fiyat çevirme, tarih okuma."""
import html
import json
import re
import time
import urllib.request
from datetime import date

TARAYICI = (
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
)

AYLAR = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "haziran": 6,
    "temmuz": 7, "ağustos": 8, "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12,
}


def getir(url, deneme=3, json_mi=False):
    """URL'yi indirir; hata olursa birkaç kez yeniden dener."""
    istek = urllib.request.Request(url, headers={
        "User-Agent": TARAYICI,
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Accept": "application/json" if json_mi else "text/html,*/*",
    })
    for i in range(deneme):
        try:
            with urllib.request.urlopen(istek, timeout=30) as yanit:
                metin = yanit.read().decode("utf-8", errors="replace")
                return json.loads(metin) if json_mi else metin
        except Exception:
            if i == deneme - 1:
                raise
            time.sleep(2 * (i + 1))


def temizle(metin):
    """HTML etiketlerini ve fazla boşlukları atar."""
    metin = re.sub(r"<[^>]+>", " ", metin or "")
    return re.sub(r"\s+", " ", html.unescape(metin)).strip()


def baslik_yap(metin):
    """BÜYÜK HARFLİ adı Türkçe kurallarıyla 'Her Kelimenin Baş Harfi Büyük' yapar."""
    kucuk = metin.replace("I", "ı").replace("İ", "i").lower()
    kelimeler = []
    for kelime in kucuk.split(" "):
        if kelime:
            ilk = {"i": "İ", "ı": "I"}.get(kelime[0], kelime[0].upper())
            kelime = ilk + kelime[1:]
        kelimeler.append(kelime)
    return " ".join(kelimeler)


def fiyat_oku(metin):
    """'1.234,50' gibi Türkçe fiyat yazısını sayıya çevirir."""
    metin = re.sub(r"[^\d,]", "", metin or "")
    if not metin:
        return None
    return round(float(metin.replace(",", ".")), 2)


def tarih_oku(etiket, bugun=None):
    """'21 Ekim Çarşamba' veya '17-23 Ekim' etiketinden başlangıç/bitiş tarihi çıkarır."""
    bugun = bugun or date.today()
    m = re.search(r"(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)", etiket or "")
    if not m:
        return None, None
    ay = AYLAR.get(m.group(3).lower().replace("i̇", "i"))
    if not ay:
        return None, None
    yil = bugun.year
    # Aralıkta görülen Ocak etiketi gelecek yıla, Ocak'ta görülen Aralık etiketi geçen yıla aittir
    if ay - bugun.month > 6:
        yil -= 1
    elif bugun.month - ay > 6:
        yil += 1
    baslangic = date(yil, ay, int(m.group(1)))
    bitis = date(yil, ay, int(m.group(2))) if m.group(2) else None
    return baslangic.isoformat(), bitis.isoformat() if bitis else None
