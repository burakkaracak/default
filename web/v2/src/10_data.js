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
  },

  // Misafir türleri (faz 1: temel 6; diğerleri faz 3)
  Guests: [
    { id: 'turist', name: 'Turist', icon: '🧳', pay: 1, patience: 1, nights: [1, 2], w: 5 },
    { id: 'ogrenci', name: 'Öğrenci', icon: '🎒', pay: 0.8, patience: 1.4, nights: [1, 1], w: 3, look: ['character-male-a', 'character-female-c'] },
    { id: 'is', name: 'İş insanı', icon: '💼', pay: 1.45, patience: 0.6, nights: [1, 1], w: 3, look: ['character-male-d', 'character-female-d'] },
    { id: 'aile', name: 'Aile', icon: '👨‍👩‍👧', pay: 1.25, patience: 0.9, nights: [2, 3], w: 3, follower: 0.62 },
    { id: 'emekli', name: 'Emekli', icon: '👵', pay: 1.15, patience: 1.5, nights: [2, 3], w: 2 },
    { id: 'balayi', name: 'Balayı çifti', icon: '💞', pay: 1.9, patience: 0.9, nights: [2, 3], w: 1.5, follower: 1, minStars: 2 },
  ],
  Requests: [
    { id: 'towel', name: 'Havlu', icon: '🧺', tip: 10 },
    { id: 'water', name: 'Su', icon: '💧', tip: 8 },
    { id: 'coffee', name: 'Kahve', icon: '☕', tip: 12 },
    { id: 'service', name: 'Oda servisi', icon: '🍽', tip: 26 },
  ],
  Names: {
    f: ['Ayşe', 'Zeynep', 'Selin', 'Deniz', 'Ece', 'Melis', 'İrem', 'Derya', 'Nehir', 'Burcu', 'Defne', 'Ceren', 'Yasemin', 'Gül', 'Elif'],
    m: ['Mehmet', 'Can', 'Emre', 'Murat', 'Kerem', 'Oğuz', 'Arda', 'Tolga', 'Barış', 'Ali', 'Kaan', 'Efe', 'Mert', 'Selim', 'Hakan'],
  },
  Weather: { sunny: '☀ Güneşli', cloudy: '☁ Bulutlu', rainy: '🌧 Yağmurlu', snowy: '❄ Karlı' },
};
