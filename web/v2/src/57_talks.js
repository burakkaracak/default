// Sohbet metinleri (eski oyundan taşındı + yeni türler). [misafirin sözü, [[cevap, misafirin tepkisi, puan -1..2], ...]]
const TalkData = {
 "talks": {
  "turist": [
   [
    "Merhaba! Otel çok şirin görünüyor. Siz mi işletiyorsunuz?",
    [
     [
      "Evet, her köşesiyle biz ilgileniyoruz. Hoş geldiniz!",
      "Ne güzel, insan bunu hissediyor. Teşekkürler!",
      2
     ],
     [
      "Evet, bir şeye ihtiyacınız olursa bana söyleyin.",
      "Çok naziksiniz, aklımda tutacağım.",
      1
     ],
     [
      "Evet. Başka bir şey var mı?",
      "Ah... yok, yok. Peki.",
      -1
     ]
    ]
   ],
   [
    "Buralarda yürüyüş yapılacak güzel bir yer var mı?",
    [
     [
      "Otelin batısındaki bahçe akşamüstü harika olur, mutlaka gidin!",
      "Harika, gün batımında giderim!",
      2
     ],
     [
      "Caddenin sonunda küçük bir park var.",
      "Tamam, bakarım, teşekkürler.",
      1
     ],
     [
      "Bilmiyorum, hiç gitmedim.",
      "Hmm, anladım.",
      -1
     ]
    ]
   ],
   [
    "İlk kez geliyorum! Mutlaka görmem gereken bir yer var mı?",
    [
     [
      "Eski çarşıyı gezin, dönüşte otelin kafesinde kahve molası verin!",
      "Not aldım, çok teşekkürler!",
      2
     ],
     [
      "Haritada işaretli yerler var, resepsiyondan alabilirsiniz.",
      "Tamam, alırım.",
      1
     ],
     [
      "Her yer aynı, pek bir şey yok.",
      "Öyle mi... biraz hevesim kaçtı.",
      -1
     ]
    ]
   ],
   [
    "Fotoğraf çekmek için otelde güzel bir köşe var mı?",
    [
     [
      "Lobideki büyük kırmızı halının önü ve bahçedeki çiçekli ağaçlar tam fotoğraflık!",
      "Hemen çekiyorum, teşekkürler!",
      2
     ],
     [
      "Bahçe güzeldir.",
      "Tamam, bakarım.",
      1
     ],
     [
      "Pek yok açıkçası.",
      "Hmm, peki.",
      -1
     ]
    ]
   ]
  ],
  "is": [
   [
    "Hızlı Wi-Fi şifresi var mı? Bir saat sonra toplantım var.",
    [
     [
      "Tabii! Şifre odanızdaki kartta. Sessiz bir masa da ayarlayabilirim.",
      "Süper, tam ihtiyacım olan şey. Teşekkürler!",
      2
     ],
     [
      "Resepsiyonda yazıyor.",
      "Peki, oradan alırım.",
      1
     ],
     [
      "İnternet bazen gidiyor, kusura bakmayın.",
      "Eyvah... bu hiç iyi olmadı.",
      -1
     ]
    ]
   ],
   [
    "Yarın sabah çok erken çıkacağım, kahvaltı kaçta başlıyor?",
    [
     [
      "Sizin için 6'da hafif bir kahvaltı hazırlatırım.",
      "Vay, bu çok düşünceli. Sağ olun!",
      2
     ],
     [
      "Yedide başlıyor.",
      "Biraz geç ama idare ederim.",
      1
     ],
     [
      "Erken çıkacaksanız yolda bir şey yersiniz.",
      "Haklısınız... sanırım.",
      -1
     ]
    ]
   ]
  ],
  "balayi": [
   [
    "Balayımızdayız! Bu akşam eşime sürpriz yapmak istiyorum, bir fikriniz var mı?",
    [
     [
      "Odanıza çiçek ve küçük bir pasta gönderelim, kimseye söylemem!",
      "Harikasınız! Çok sevinecek ♥",
      2
     ],
     [
      "Restoranda güzel bir masa ayırabilirim.",
      "Güzel fikir, teşekkürler!",
      1
     ],
     [
      "Bilmem, siz bilirsiniz.",
      "Hmm... kendim bir şey düşüneyim.",
      -1
     ]
    ]
   ],
   [
    "Burası çok romantik! Kaç yıldır bu otel var?",
    [
     [
      "Bu otel aileden kaldı, her köşesine sevgiyle bakıyoruz.",
      "Ne kadar güzel bir hikâye! ♥",
      2
     ],
     [
      "Epey oldu, sürekli yeniliyoruz.",
      "Belli oluyor, çok şık.",
      1
     ],
     [
      "Hatırlamıyorum.",
      "Öyle mi... peki.",
      0
     ]
    ]
   ]
  ],
  "aile": [
   [
    "Çocuklar çok enerjik, oyalanacak bir şey var mı?",
    [
     [
      "Havuz ve bahçe tam onlara göre! Kafede çocuklara sıcak çikolata da var.",
      "Kurtardınız bizi, teşekkürler!",
      2
     ],
     [
      "Bahçede koşabilirler.",
      "Tamam, oraya çıkarırız.",
      1
     ],
     [
      "Lütfen lobide koşmasınlar.",
      "Peki... kusura bakmayın.",
      -1
     ]
    ]
   ],
   [
    "Odamıza fazladan bir battaniye alabilir miyiz?",
    [
     [
      "Hemen göndereyim, bir de yastık ekleyeyim mi?",
      "Çok iyi olur, çok teşekkürler!",
      2
     ],
     [
      "Tabii, temizlik ekibine söylerim.",
      "Teşekkürler.",
      1
     ],
     [
      "Dolaptakiler yetmiyor mu?",
      "Yetmiyor ki istedik...",
      -1
     ]
    ]
   ]
  ],
  "fenomen": [
   [
    "Takipçilerime otelinizi göstereceğim! Bir cümleyle anlatsanız?",
    [
     [
      "Burada herkes misafir değil, ailemizin bir parçası ♥",
      "Bu çok güzel! Hemen paylaşıyorum ✨",
      2
     ],
     [
      "Temiz, rahat ve güler yüzlü bir otel.",
      "Kısa ve net, beğendim!",
      1
     ],
     [
      "Ne yazarsanız yazın.",
      "Peki... bakalım ne yazacağım.",
      -1
     ]
    ]
   ],
   [
    "Odanın ışığı fotoğraf için biraz loş, ne yapabiliriz?",
    [
     [
      "Size halka ışık getirebilirim, bir de pencere kenarında çekmeyi deneyin!",
      "Süpersiniz! Paylaşımda sizi etiketleyeceğim ✨",
      2
     ],
     [
      "Perdeyi açarsanız güzel olur.",
      "Deneyeceğim.",
      1
     ],
     [
      "Lamba bu kadar.",
      "Hmm, anladım.",
      -1
     ]
    ]
   ]
  ],
  "emekli": [
   [
    "Gençken bu şehre sık gelirdim. Çok değişmiş her yer!",
    [
     [
      "Bize o zamanları anlatır mısınız? Çayınızı da ben ısmarlayayım.",
      "Ah, ne tatlı evladım! Seve seve anlatırım.",
      2
     ],
     [
      "Evet, çok değişti gerçekten.",
      "Öyle, öyle...",
      1
     ],
     [
      "Şimdi biraz işim var.",
      "Tabii, tabii, kusura bakma.",
      -1
     ]
    ]
   ],
   [
    "Asansör nerede evladım? Merdiven biraz zor geliyor.",
    [
     [
      "Gelin, birlikte gidelim, koluma girin.",
      "Allah razı olsun, ne iyi insansın!",
      2
     ],
     [
      "Lobinin sağında.",
      "Sağ ol.",
      1
     ],
     [
      "Tabelalarda yazıyor.",
      "Göremedim ama...",
      -1
     ]
    ]
   ]
  ],
  "ogrenci": [
   [
    "Biraz bütçem kısıtlı, yakında uygun yemek yiyebileceğim bir yer var mı?",
    [
     [
      "Kafemizde öğrencilere indirim var, bir de akşam çorba ikramımız olur!",
      "Süpersiniz, çok teşekkürler!",
      2
     ],
     [
      "Caddenin köşesinde ucuz bir dürümcü var.",
      "Tamam, giderim.",
      1
     ],
     [
      "Burası pahalı bir yer değil zaten.",
      "Hmm, peki.",
      -1
     ]
    ]
   ],
   [
    "Sınavım var, çalışabileceğim sessiz bir yer var mı?",
    [
     [
      "Bekleme salonu sabahları çok sessiz, size bir de çay getireyim.",
      "Harika, tam ihtiyacım olan şey!",
      2
     ],
     [
      "Odanızda çalışabilirsiniz.",
      "Tamam, teşekkürler.",
      1
     ],
     [
      "Burası kütüphane değil.",
      "Haklısınız...",
      -1
     ]
    ]
   ]
  ],
  "sporcu": [
   [
    "Sabah koşusu için güzel bir rota önerir misiniz?",
    [
     [
      "Otelin önünden bahçeye, oradan caddenin sonuna kadar: tam 3 kilometre!",
      "Mükemmel, yarın deniyorum!",
      2
     ],
     [
      "Bahçede koşabilirsiniz.",
      "Tamam.",
      1
     ],
     [
      "Koşmayı pek bilmem.",
      "Peki.",
      0
     ]
    ]
   ],
   [
    "Havuz sabah kaçta açılıyor? Antrenman yapacağım.",
    [
     [
      "Sizin için erkenden açtırırım, havlunuzu da hazır ederiz!",
      "Çok iyisiniz, teşekkürler!",
      2
     ],
     [
      "Sekizde açılıyor.",
      "Tamam, olur.",
      1
     ],
     [
      "Saatlerde değişiklik yapamayız.",
      "Hmm, anladım.",
      -1
     ]
    ]
   ]
  ],
  "huysuz": [
   [
    "Odamın havlusu yeterince yumuşak değil. Bu otelde standartlar nerede?",
    [
     [
      "Haklısınız, hemen en yumuşak havluları getiriyorum. Bir de çay ısmarlayayım mı?",
      "Hmm... Çay iyi gider. Teşekkür ederim.",
      2
     ],
     [
      "Havluları az önce yıkadık, ama değiştirebilirim.",
      "Peki, değiştirin bakalım.",
      1
     ],
     [
      "Başka kimse şikâyet etmedi.",
      "Demek öyle! Çok kötü!",
      -2
     ]
    ]
   ],
   [
    "Her yer çok gürültülü! Sessiz bir köşe yok mu?",
    [
     [
      "Çatı bahçesi ve bekleme salonu sabahları sessizdir, size bir köşe ayırayım.",
      "Bakın, bu işe yarar. Sağ olun.",
      2
     ],
     [
      "Odanız kapıdan uzakta, orada daha sessiz.",
      "Deneyeceğim.",
      1
     ],
     [
      "Otel burası, ses olur.",
      "Bu kadar kabalık!",
      -2
     ]
    ]
   ]
  ],
  "unlu": [
   [
    "Pardon, çok hızlı girdik, fotoğrafçılar peşimde. Sessiz bir yol var mı?",
    [
     [
      "Arka koridordan asansöre buyurun, kimse görmez. Hoş geldiniz!",
      "Ne kadar düşüncelisiniz, teşekkürler ♥",
      2
     ],
     [
      "Resepsiyondan geçebilirsiniz.",
      "Tamam, deneyelim.",
      1
     ],
     [
      "Fotoğraflar otele reklam olur.",
      "Hmm... pek hoş değil.",
      -1
     ]
    ]
   ],
   [
    "Odada çiçek ve bir fincan sıcak çikolata olabilir mi?",
    [
     [
      "Hemen gönderiyorum, bir de el yapımı kurabiye ekleyeyim!",
      "Siz harikasınız! Hayranlarıma anlatacağım ✨",
      2
     ],
     [
      "Çiçek var, çikolatayı sorarım.",
      "Olur, teşekkürler.",
      1
     ],
     [
      "Servisimiz kısıtlı.",
      "Anladım...",
      -1
     ]
    ]
   ]
  ]
 },
 "waiting": [
  "Sıra biraz uzun galiba, ne kadar bekleriz?",
  [
   [
    "Çok özür dilerim, sizi hemen alacağız. Bu arada size bir içecek ikram edeyim mi?",
    "Ah, ne kadar naziksiniz, teşekkürler!",
    2
   ],
   [
    "Birkaç dakika sürer.",
    "Peki, bekleyelim.",
    1
   ],
   [
    "Herkes bekliyor.",
    "Hmm... tamam.",
    -1
   ]
  ]
 ],
 "second": {
  "genel": [
   [
    "Bu arada, otelin en sevdiğiniz köşesi neresi?",
    [
     [
      "Lobi! Misafirleri karşılamayı çok seviyorum ♥",
      "Belli oluyor, çok sıcak karşılıyorsunuz!",
      1
     ],
     [
      "Bahçe, akşamları ışıklar yanınca çok güzel.",
      "Akşam bir bakayım o zaman!",
      1
     ],
     [
      "Hepsi aynı bence.",
      "Hmm, peki.",
      0
     ]
    ]
   ],
   [
    "Personeliniz çok ilgili, nasıl başarıyorsunuz?",
    [
     [
      "Hepimiz bir aileyiz, birbirimize iyi bakıyoruz.",
      "Bu her halinizden belli ♥",
      1
     ],
     [
      "Herkes işini seviyor.",
      "Ne güzel!",
      1
     ],
     [
      "Maaşlarını veriyorum işte.",
      "Hmm... peki.",
      -1
     ]
    ]
   ]
  ],
  "restoran": [
   [
    "Akşam yemeği için bir öneriniz var mı?",
    [
     [
      "Restoranımızın tatlısını mutlaka deneyin, şefimizin imzası!",
      "Tatlıya hayır demem, gidiyorum!",
      1
     ],
     [
      "Restoranımız açık.",
      "Tamam, bakarım.",
      1
     ],
     [
      "Dışarıda bir yer bulursunuz.",
      "Hmm.",
      -1
     ]
    ]
   ]
  ],
  "spa": [
   [
    "Çok yoruldum, dinlenmek için ne önerirsiniz?",
    [
     [
      "Spamızda masaj var, size en iyi saati ayırayım!",
      "Harika, tam ihtiyacım olan şey!",
      1
     ],
     [
      "Odanızda dinlenebilirsiniz.",
      "Olur.",
      0
     ],
     [
      "Erken yatın.",
      "Hmm.",
      -1
     ]
    ]
   ]
  ],
  "havuz": [
   [
    "Havuz kaçta en sakin olur?",
    [
     [
      "Sabah erken ve akşamüstü! Havlunuzu hazırlatırım.",
      "Süper, sabah gelirim!",
      1
     ],
     [
      "Gün boyu açık.",
      "Tamam.",
      1
     ],
     [
      "Fark etmez.",
      "Peki...",
      0
     ]
    ]
   ]
  ]
 }
};
