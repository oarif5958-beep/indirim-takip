"""Migros: Sanal Market'in indirimli ürünler listesini veri bağlantısından sayfa sayfa toplar."""
import time

from ortak import getir

SITE = "https://www.migros.com.tr"
LISTE = SITE + "/rest/search/screens/indirimli-urunler-dt-0?sayfa={sayfa}"


def urunu_cevir(p):
    fiyat = p["shownPrice"] / 100
    eski = p["regularPrice"] / 100 if p["regularPrice"] > p["shownPrice"] else None
    kampanyalar = [t["tag"] for t in p.get("crmDiscountTags", []) if t.get("tag")]
    if any(b.get("name") == "MIGROSKOP" for b in p.get("badges", [])):
        kampanyalar.append("Migroskop")
    ustler = p.get("categoryAscendants") or []
    kategori = ustler[-1]["name"] if ustler else p.get("category", {}).get("name", "")
    gorseller = p.get("images") or [{}]
    return {
        "market": "migros",
        "ad": p["name"],
        "marka": (p.get("brand") or {}).get("name", ""),
        "gramaj": "",
        "aciklama": p.get("unitPrice", "").strip("() "),
        "fiyat": round(fiyat, 2),
        "eskiFiyat": round(eski, 2) if eski else None,
        "indirimYuzde": p.get("discountRate") or None,
        "kampanya": " · ".join(kampanyalar),
        "kategori": kategori,
        "tur": "indirim",
        "tarihEtiket": "",
        "baslangic": None,
        "bitis": None,
        "gorsel": gorseller[0].get("urls", {}).get("PRODUCT_DETAIL", ""),
        "link": f"{SITE}/{p['prettyName']}",
    }


def topla():
    ilk = getir(LISTE.format(sayfa=1), json_mi=True)["data"]["searchInfo"]
    ham = list(ilk["storeProductInfos"])
    for sayfa in range(2, ilk["pageCount"] + 1):
        time.sleep(0.5)
        ham.extend(getir(LISTE.format(sayfa=sayfa), json_mi=True)["data"]["searchInfo"]["storeProductInfos"])
    gorulen, urunler = set(), []
    for p in ham:
        if p["id"] in gorulen or p.get("status") != "IN_SALE":
            continue
        gorulen.add(p["id"])
        urunler.append(urunu_cevir(p))
    return urunler


if __name__ == "__main__":
    sonuc = topla()
    print(len(sonuc), "ürün")
    for u in sonuc[:5]:
        print(u)
