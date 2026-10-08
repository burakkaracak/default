// Oyun verileri: ekonomi, oda tipleri, misafir türleri, personel
const Data = {
  Floor: { H: 3.4, Max: 4 },          // kat yüksekliği, en fazla oda katı (zemin hariç)
  DayLength: 300,                       // bir oyun günü (saniye)
  StartMoney: 120,

  // Oda seviyeleri: fiyat gecelik, yükseltme bedeli
  RoomLevels: [
    { id: 0, name: 'Standart', price: 40, cost: 0, color: '#f4e9d6', icon: '🛏' },
    { id: 1, name: 'Deluxe', price: 85, cost: 420, color: '#e6f1ff', icon: '🛋' },
    { id: 2, name: 'Suit', price: 170, cost: 1300, color: '#fde8f0', icon: '👑' },
  ],
  // Oda açma bedeli: sıraya göre
  RoomCost: n => Math.round(30 * Math.pow(1.38, n) / 5) * 5,
  FloorCost: f => [0, 900, 2800, 6500, 14000][f] || 20000,
  Tip: 0.25,

  Staff: {
    receptionist: { name: 'Resepsiyonist', icon: '🛎', cost: 300, wage: 40, desc: 'Misafirleri senin yerine karşılar ve odaya yerleştirir.' },
    cleaner: { name: 'Temizlikçi', icon: '🧹', cost: [220, 520, 1100, 2200], wage: 30, desc: 'Kirli odaları kendiliğinden temizler.' },
    bellhop: { name: 'Kat görevlisi', icon: '🧳', cost: [350, 800], wage: 35, desc: 'Misafir isteklerini (havlu, su, oda servisi) odaya götürür.' },
    // tesis personeli (ilgili tesis kurulunca işe alınabilir)
    barista: { name: 'Barista', icon: '☕', cost: [400, 900], wage: 35, desc: 'Kafede kahveleri hazırlar, misafirler beklemez.', look: ['character-female-c', 'character-male-a'] },
    asci: { name: 'Aşçı', icon: '👩‍🍳', cost: 700, wage: 55, desc: 'Restoran mutfağında pişirir; servis çok hızlanır.', look: ['character-male-f', 'character-female-f'] },
    garson: { name: 'Garson', icon: '🍽', cost: [500, 1000], wage: 40, desc: 'Restoranda tabakları masalara taşır.', look: ['character-female-e', 'character-male-c'] },
    terapist: { name: 'Terapist', icon: '💆', cost: [800, 1500], wage: 60, desc: 'Spada masaj yapar.', look: ['character-female-f', 'character-male-b'] },
    cankurtaran: { name: 'Cankurtaran', icon: '🛟', cost: 600, wage: 45, desc: 'Havuz başında nöbet tutar; misafirler daha rahat ve mutlu.', look: ['character-male-e', 'character-female-a'] },
    barmen: { name: 'Barmen', icon: '🍹', cost: [900, 1600], wage: 60, desc: 'Çatı barında kokteyl hazırlar.', look: ['character-male-c', 'character-female-b'] },
    bahcivan: { name: 'Bahçıvan', icon: '🌱', cost: 500, wage: 35, desc: 'Çiçekleri bakımlı tutar; açmış bahçe bütün misafirleri mutlu eder.', look: ['character-female-a', 'character-male-a'] },
  },

  // Tesisler: zemin kat (floor 0) ya da çatı ('roof'); unlock = gereken yıldız; roles = tutulabilecek personel
  Facilities: [
    { id: 'kafe', name: 'Kafe', icon: '☕', cost: 1200, unlock: 1, floor: 0, roles: ['barista'], price: 7, desc: 'Lobinin doğu köşesi. Misafirler çıkışta kahve içer; iş insanları bayılır.' },
    { id: 'bahce', name: 'Bahçe', icon: '🌷', cost: 2500, unlock: 1, floor: 'roof', roles: ['bahcivan'], price: 0, desc: 'Çatıda çiçekler, çeşme ve banklar. Ücretsiz gezinti; bahçe açmışken herkes daha mutlu.' },
    { id: 'havuz', name: 'Havuz', icon: '🏊', cost: 3000, unlock: 2, floor: 'roof', roles: ['cankurtaran'], price: 7, desc: 'Çatıda havuz ve şezlonglar. Aileler ve turistler çok sever.' },
    { id: 'spor', name: 'Spor salonu', icon: '🏋', cost: 4000, unlock: 2, floor: 'roof', roles: [], price: 9, desc: 'Koşu bantları, ağırlıklar, minderler. Personel gerekmez; sporcular ve öğrenciler gelir.' },
    { id: 'restoran', name: 'Restoran', icon: '🍝', cost: 5000, unlock: 2, floor: 0, roles: ['garson', 'asci'], price: 16, desc: 'Lobinin kuzeydoğusu. Garson (ya da sen) tabakları taşır; aşçı pişirmeyi hızlandırır.' },
    { id: 'spa', name: 'Spa', icon: '🧖', cost: 7000, unlock: 3, floor: 0, roles: ['terapist'], price: 24, desc: 'Masaj yatakları, jakuzi ve mumlar. Balayı çiftleri ve emekliler için.' },
    { id: 'bar', name: 'Çatı barı', icon: '🍹', cost: 9000, unlock: 3, floor: 'roof', roles: ['barmen'], price: 22, desc: 'Çatıda manzaralı bar, ışık zincirleri. Akşamları hesap 1,5 kat.' },
  ],

  // Misafir türleri (faz 1: temel 6; diğerleri faz 3)
  Guests: [
    { id: 'turist', name: 'Turist', icon: '🧳', pay: 1, patience: 1, nights: [1, 2], w: 5 },
    { id: 'ogrenci', name: 'Öğrenci', icon: '🎒', pay: 0.8, patience: 1.4, nights: [1, 1], w: 3, look: ['character-male-a', 'character-female-c'] },
    { id: 'is', name: 'İş insanı', icon: '💼', pay: 1.45, patience: 0.6, nights: [1, 1], w: 3, look: ['character-male-d', 'character-female-d'] },
    { id: 'aile', name: 'Aile', icon: '👨‍👩‍👧', pay: 1.25, patience: 0.9, nights: [2, 3], w: 3, follower: 0.62 },
    { id: 'emekli', name: 'Emekli', icon: '👵', pay: 1.15, patience: 1.5, nights: [2, 3], w: 2 },
    { id: 'balayi', name: 'Balayı çifti', icon: '💞', pay: 1.9, patience: 0.9, nights: [2, 3], w: 1.5, follower: 1, minStars: 2 },
    { id: 'sporcu', name: 'Sporcu', icon: '🏃', pay: 1.2, patience: 1.1, nights: [1, 2], w: 1.6, minStars: 2, look: ['character-male-b', 'character-female-b'] },
    { id: 'huysuz', name: 'Huysuz misafir', icon: '😤', pay: 1.3, patience: 0.55, nights: [1, 2], w: 1.1, sat0: 2.4, tipMul: 2.5, desc: 'Memnun etmesi zor ama mutlu ederseniz cömert bahşiş bırakır.' },
    { id: 'milyoner', name: 'Gizli milyoner', icon: '🎩', disguise: 'turist', pay: 1, patience: 1, nights: [1, 2], w: 0.35, minStars: 2, desc: 'Turist kılığında gelir; çok memnun kalırsa büyük bahşiş bırakır.' },
    { id: 'mufettis', name: 'Otel müfettişi', icon: '🕵', disguise: 'is', pay: 1.45, patience: 0.7, nights: [1, 1], w: 0.4, minStars: 2, look: ['character-male-d', 'character-female-d'], desc: 'İş insanı gibi görünür; raporu ünü çok etkiler.' },
    { id: 'fenomen', name: 'Fenomen', icon: '🤳', pay: 1.6, patience: 0.8, nights: [1, 2], w: 1, minStars: 3, repMul: 2.5, look: ['character-female-e', 'character-male-e'], desc: 'Takipçilerine anlatır: memnuniyeti ünü katlar.' },
    { id: 'unlu', name: 'Ünlü', icon: '⭐', pay: 3, patience: 0.7, nights: [1, 2], w: 0.5, minStars: 4, repMul: 2, follower: 1, look: ['character-female-f', 'character-male-f'], desc: 'Kapıda hayranlar! Çok öder, beklemeyi sevmez.' },
  ],
  Requests: [
    { id: 'towel', name: 'Havlu', icon: '🧺', tip: 10 },
    { id: 'water', name: 'Su', icon: '💧', tip: 8 },
    { id: 'coffee', name: 'Kahve', icon: '☕', tip: 12 },
    { id: 'service', name: 'Oda servisi', icon: '🍽', tip: 26 },
  ],
  Names: {
    f: ['Ayşe', 'Zeynep', 'Selin', 'Deniz', 'Ece', 'Melis', 'İrem', 'Derya', 'Nehir', 'Burcu', 'Defne', 'Ceren', 'Yasemin', 'Gül'],
    m: ['Mehmet', 'Can', 'Emre', 'Murat', 'Kerem', 'Oğuz', 'Arda', 'Tolga', 'Barış', 'Ali', 'Kaan', 'Efe', 'Mert', 'Selim', 'Hakan'],
  },
  Weather: { sunny: '☀ Güneşli', cloudy: '☁ Bulutlu', rainy: '🌧 Yağmurlu', snowy: '❄ Karlı' },
};
