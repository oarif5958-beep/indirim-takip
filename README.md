# İndirim Takip

BİM, A101 ve Migros indirimlerini tek ekranda gösteren telefon uygulaması.

## Nasıl çalışır

- `toplayici/` her gün 06:00 ve 14:00'te GitHub üzerinde kendiliğinden çalışır.
  Marketlerin sitelerinden indirimleri toplar ve `site/veri/indirimler.json` dosyasına yazar.
- `site/` telefonda açılan uygulamadır, GitHub Pages'te yayınlanır.
- Bir market o gün hata verirse uygulama o marketin son başarılı verisini göstermeye devam eder.

## Elle güncelleme

Bilgisayarda:

```
cd toplayici
python calistir.py
```

GitHub'da: Actions → "İndirimleri güncelle" → Run workflow.

## Marketler

| Market | Kaynak |
|---|---|
| BİM | bim.com.tr Aktüel Ürünler sayfası (tüm tarih sekmeleri) |
| Migros | migros.com.tr indirimli ürünler listesi |
| A101 | Henüz eklenmedi (site otomatik erişimi engelliyor) |
