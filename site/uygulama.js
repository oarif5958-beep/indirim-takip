"use strict";

const MARKETLER = {
  bim: "BİM",
  a101: "A101",
  migros: "Migros",
};
const SAYFA_BOYU = 40;
const TAKIP_ANAHTAR = "indirimTakip.kelimeler";

const durum = {
  urunler: [],
  market: "",
  kategori: "",
  sirala: "yuzde",
  arama: "",
  sonuc: [],
  gosterilen: 0,
};

const $ = (id) => document.getElementById(id);
const bugun = new Date().toLocaleDateString("sv-SE"); // yerel saatle YYYY-AA-GG

// "Çay" ile "cay", "IŞIK" ile "ışık" aynı sonucu versin diye harfleri sadeleştirir
function sadelestir(metin) {
  return (metin || "")
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâî]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[h])
    .replace(/\s+/g, " ")
    .trim();
}

function eslesir(urun, metin) {
  const kelimeler = sadelestir(metin).split(" ").filter(Boolean);
  return kelimeler.every((k) => urun._ara.includes(k));
}

const paraBicim = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const para = (n) => paraBicim.format(n) + " ₺";

const gunBicim = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" });

function tarihYazisi(u) {
  if (!u.baslangic) return { metin: "", yakinda: false };
  const bas = new Date(u.baslangic + "T00:00:00");
  if (u.baslangic > bugun) return { metin: "Yakında · " + gunBicim.format(bas), yakinda: true };
  if (u.bitis) return { metin: u.tarihEtiket + " arası", yakinda: false };
  return { metin: u.tarihEtiket + " itibariyle", yakinda: false };
}

function yuzdeHesapla(u) {
  if (u.indirimYuzde) return u.indirimYuzde;
  if (u.eskiFiyat && u.eskiFiyat > u.fiyat) return Math.round((1 - u.fiyat / u.eskiFiyat) * 100);
  return 0;
}

// ---- Kart çizimi ----

const sablon = $("kart-sablon");

function kartYap(u) {
  const kart = sablon.content.firstElementChild.cloneNode(true);
  kart.querySelector(".kart-link").href = u.link;
  const img = kart.querySelector(".kart-gorsel");
  if (u.gorsel) img.src = u.gorsel;
  else img.remove();

  const etiket = kart.querySelector(".market-etiket");
  etiket.textContent = MARKETLER[u.market] || u.market;
  etiket.classList.add(u.market);

  const t = tarihYazisi(u);
  const tarih = kart.querySelector(".tarih");
  tarih.textContent = t.metin;
  tarih.classList.toggle("yakinda", t.yakinda);

  kart.querySelector(".kart-ad").textContent = u.ad;
  kart.querySelector(".kart-alt").textContent = [u.marka && !sadelestir(u.ad).includes(sadelestir(u.marka)) ? u.marka : "", u.gramaj, u.aciklama]
    .filter(Boolean)
    .join(" · ");
  kart.querySelector(".fiyat").textContent = para(u.fiyat);
  if (u.eskiFiyat) kart.querySelector(".eski-fiyat").textContent = para(u.eskiFiyat);
  if (u._yuzde) kart.querySelector(".yuzde").textContent = "%" + u._yuzde;
  kart.querySelector(".kampanya").textContent = u.kampanya || "";
  return kart;
}

// ---- Tüm indirimler sekmesi ----

function sirala(liste) {
  const kopya = liste.slice();
  if (durum.sirala === "ucuz") kopya.sort((a, b) => a.fiyat - b.fiyat);
  else if (durum.sirala === "yeni") kopya.sort((a, b) => (b.baslangic || "").localeCompare(a.baslangic || "") || b._yuzde - a._yuzde);
  else kopya.sort((a, b) => b._yuzde - a._yuzde || (b.kampanya ? 1 : 0) - (a.kampanya ? 1 : 0));
  return kopya;
}

function listeyiYenile() {
  durum.sonuc = sirala(
    durum.urunler.filter(
      (u) =>
        (!durum.market || u.market === durum.market) &&
        (!durum.kategori || u.kategori === durum.kategori) &&
        (!durum.arama || eslesir(u, durum.arama))
    )
  );
  durum.gosterilen = 0;
  $("liste").replaceChildren();
  $("sonuc-sayi").textContent = durum.sonuc.length
    ? durum.sonuc.length.toLocaleString("tr-TR") + " indirimli ürün"
    : "";
  if (!durum.sonuc.length) {
    const bos = document.createElement("li");
    bos.className = "bos";
    bos.textContent = durum.arama ? `"${durum.arama}" için indirim bulunamadı.` : "Bu filtrede ürün yok.";
    $("liste").append(bos);
  }
  dahaGoster();
}

function dahaGoster() {
  const parca = durum.sonuc.slice(durum.gosterilen, durum.gosterilen + SAYFA_BOYU);
  $("liste").append(...parca.map(kartYap));
  durum.gosterilen += parca.length;
}

new IntersectionObserver(
  (girdiler) => {
    if (girdiler[0].isIntersecting && durum.gosterilen < durum.sonuc.length) dahaGoster();
  },
  { rootMargin: "800px" }
).observe($("daha"));

function marketDugmeleri(veri) {
  const kutu = $("marketler");
  const sayilar = {};
  for (const u of durum.urunler) sayilar[u.market] = (sayilar[u.market] || 0) + 1;
  const dugmeler = [["", "Tümü", durum.urunler.length, false]];
  for (const [kod, ad] of Object.entries(MARKETLER)) {
    const bilgi = veri.marketler[kod];
    if (bilgi) dugmeler.push([kod, ad, sayilar[kod] || 0, bilgi.durum === "hata"]);
  }
  kutu.replaceChildren(
    ...dugmeler.map(([kod, ad, sayi, hata]) => {
      const d = document.createElement("button");
      d.className = "market-dugme" + (kod === durum.market ? " secili" : "") + (hata ? " hata" : "");
      d.innerHTML = `${ad} <small>${hata ? "güncellenemedi" : sayi.toLocaleString("tr-TR")}</small>`;
      d.onclick = () => {
        durum.market = kod;
        kutu.querySelectorAll(".market-dugme").forEach((x) => x.classList.toggle("secili", x === d));
        kategorileriDoldur();
        listeyiYenile();
      };
      return d;
    })
  );
}

function kategorileriDoldur() {
  const secim = $("kategori");
  const sayilar = {};
  for (const u of durum.urunler) {
    if (!durum.market || u.market === durum.market) sayilar[u.kategori] = (sayilar[u.kategori] || 0) + 1;
  }
  const adlar = Object.keys(sayilar).sort((a, b) => a.localeCompare(b, "tr"));
  if (!adlar.includes(durum.kategori)) durum.kategori = "";
  secim.replaceChildren(new Option("Tüm kategoriler", ""), ...adlar.map((k) => new Option(`${k} (${sayilar[k]})`, k)));
  secim.value = durum.kategori;
}

// ---- Takibim sekmesi ----

function takipKelimeleri() {
  try {
    return JSON.parse(localStorage.getItem(TAKIP_ANAHTAR)) || [];
  } catch {
    return [];
  }
}

function takipKaydet(kelimeler) {
  try {
    localStorage.setItem(TAKIP_ANAHTAR, JSON.stringify(kelimeler));
  } catch {}
}

function takipCiz() {
  const kelimeler = takipKelimeleri();
  const kutu = $("takip-liste");
  kutu.replaceChildren();
  let toplam = 0;

  if (!kelimeler.length) {
    const bos = document.createElement("p");
    bos.className = "bos";
    bos.textContent = "Henüz takip ettiğin ürün yok. Yukarıya bir ürün adı yaz.";
    kutu.append(bos);
  }

  for (const kelime of kelimeler) {
    const bulunan = sirala(durum.urunler.filter((u) => eslesir(u, kelime)));
    toplam += bulunan.length;
    const grup = document.createElement("section");
    grup.className = "takip-grup";
    const baslik = document.createElement("div");
    baslik.className = "takip-baslik";
    const h2 = document.createElement("h2");
    h2.textContent = kelime + " ";
    const kucuk = document.createElement("small");
    kucuk.textContent = bulunan.length ? `${bulunan.length} indirim` : "şu an indirimde değil";
    h2.append(kucuk);
    const sil = document.createElement("button");
    sil.className = "takip-sil";
    sil.textContent = "Kaldır";
    sil.onclick = () => {
      takipKaydet(takipKelimeleri().filter((k) => k !== kelime));
      takipCiz();
    };
    baslik.append(h2, sil);
    const ul = document.createElement("ul");
    ul.className = "liste";
    ul.append(...bulunan.slice(0, 30).map(kartYap));
    grup.append(baslik, ul);
    kutu.append(grup);
  }

  const rozet = $("takip-sayi");
  rozet.hidden = !toplam;
  rozet.textContent = toplam;
}

$("takip-form").onsubmit = (e) => {
  e.preventDefault();
  const giris = $("takip-kelime");
  const kelime = giris.value.trim();
  if (!kelime) return;
  const kelimeler = takipKelimeleri().filter((k) => sadelestir(k) !== sadelestir(kelime));
  takipKaydet([kelime, ...kelimeler]);
  giris.value = "";
  giris.blur();
  takipCiz();
};

// ---- Sekmeler, arama, filtreler ----

document.querySelectorAll(".sekme").forEach((s) => {
  s.onclick = () => {
    document.querySelectorAll(".sekme").forEach((x) => x.classList.toggle("secili", x === s));
    $("hepsi-bolum").hidden = s.dataset.sekme !== "hepsi";
    $("takip-bolum").hidden = s.dataset.sekme !== "takip";
    $("arama").parentElement.hidden = s.dataset.sekme !== "hepsi";
    window.scrollTo(0, 0);
  };
});

let aramaZamanlayici;
$("arama").oninput = (e) => {
  clearTimeout(aramaZamanlayici);
  $("arama-temizle").hidden = !e.target.value;
  aramaZamanlayici = setTimeout(() => {
    durum.arama = e.target.value.trim();
    listeyiYenile();
  }, 200);
};
$("arama-temizle").onclick = () => {
  $("arama").value = "";
  $("arama-temizle").hidden = true;
  durum.arama = "";
  listeyiYenile();
};
$("kategori").onchange = (e) => {
  durum.kategori = e.target.value;
  listeyiYenile();
};
$("sirala").onchange = (e) => {
  durum.sirala = e.target.value;
  listeyiYenile();
};

// ---- Başlangıç ----

function guncellemeYazisi(iso) {
  const t = new Date(iso);
  const fark = Math.round((Date.now() - t) / 60000);
  if (fark < 60) return "Az önce güncellendi";
  if (fark < 24 * 60) return `${Math.round(fark / 60)} saat önce güncellendi`;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(t) + " güncellendi";
}

async function basla() {
  $("sonuc-sayi").textContent = "İndirimler yükleniyor…";
  try {
    const yanit = await fetch("veri/indirimler.json", { cache: "no-cache" });
    const veri = await yanit.json();
    durum.urunler = veri.urunler.map((u) => ({
      ...u,
      _yuzde: yuzdeHesapla(u),
      _ara: sadelestir([u.ad, u.marka, u.gramaj, u.aciklama, u.kategori, u.kampanya].join(" ")),
    }));
    $("guncelleme").textContent = guncellemeYazisi(veri.guncelleme);
    marketDugmeleri(veri);
    kategorileriDoldur();
    listeyiYenile();
    takipCiz();
  } catch (hata) {
    $("sonuc-sayi").textContent = "İndirimler yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.";
    console.error(hata);
  }
}

basla();
