"""Tüm marketleri toplar ve site/veri/indirimler.json dosyasını yazar.

Bir market hata verirse diğerleri yine yazılır; hatalı marketin önceki verisi korunur.
"""
import json
import sys
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bim
import migros

TOPLAYICILAR = {"bim": bim.topla, "migros": migros.topla}
CIKTI = Path(__file__).resolve().parent.parent / "site" / "veri" / "indirimler.json"
TR_SAATI = timezone(timedelta(hours=3))


def main():
    try:
        onceki = json.loads(CIKTI.read_text(encoding="utf-8"))
    except Exception:
        onceki = {"marketler": {}, "urunler": []}

    simdi = datetime.now(TR_SAATI).isoformat(timespec="minutes")
    marketler, urunler, hata_var = {}, [], False
    for ad, topla in TOPLAYICILAR.items():
        try:
            liste = topla()
            if not liste:
                raise RuntimeError("hiç ürün gelmedi")
            marketler[ad] = {"guncelleme": simdi, "adet": len(liste), "durum": "tamam"}
            print(f"{ad}: {len(liste)} ürün")
        except Exception:
            hata_var = True
            traceback.print_exc()
            liste = [u for u in onceki["urunler"] if u["market"] == ad]
            eski = onceki["marketler"].get(ad, {})
            marketler[ad] = {**eski, "durum": "hata", "adet": len(liste)}
            print(f"{ad}: HATA, önceki {len(liste)} ürün korundu")
        urunler.extend(liste)

    CIKTI.parent.mkdir(parents=True, exist_ok=True)
    CIKTI.write_text(json.dumps(
        {"guncelleme": simdi, "marketler": marketler, "urunler": urunler},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Toplam", len(urunler), "ürün yazıldı:", CIKTI)
    return 1 if hata_var and not urunler else 0


if __name__ == "__main__":
    sys.exit(main())
