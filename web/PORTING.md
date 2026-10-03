# Unity (C#) → web (JS) taşıma kuralları

Kaynak: `unity/Assets/Scripts/*.cs`. Hedef: `web/src/NN_ad.js`. Motor: `web/src/00_engine.js` (önce bunu oku).
Bütün `src/*.js` dosyaları sırayla TEK bir betikte birleşir (`node build.mjs`). Yani her dosyadaki üst düzey
`class`/`const`/`function` adları diğer dosyalardan doğrudan görülür. `import`/`export` YAZMA. `THREE`, `GLTFLoader`,
`SkeletonUtils` hazır. Aynı üst düzey adı iki dosyada tanımlarsan derleme durur.

Amaç: oyunu Unity'deki ile AYNI davranışla taşımak. Sayıları, metinleri (Türkçe), renkleri, konumları birebir koru.
Satır satır çeviri tercih edilir; kendi tasarımını ekleme.

## Koordinatlar
Tüm oyun nesneleri `W` grubunun içinde. W'nin z ölçeği -1, bu yüzden Unity'deki konum/ölçek/döndürme
sayıları aynen geçerli. `new GameObject()` + parent yoksa → W'ye eklenir.
- `transform.position` (W'nin doğrudan çocuğu için) → `obj.position` (THREE.Vector3). İç içe nesnede dünya konumu: `worldPos(obj)` / `setWorldPos(obj, v)`.
- `localPosition` → `obj.position`; `localScale` → `obj.scale`.
- `Quaternion.Euler(x,y,z)` → `setEuler(obj, x, y, z)` (derece). `rotation = Quaternion.LookRotation(d)` → `lookRotation(obj, d)`.
- `transform.forward` → `forwardOf(obj)` (sadece y dönüşü). `transform.Rotate(0,a,0)` → `obj.rotation.y += a * Mathf.Deg2Rad`.
- `Quaternion.Euler(0,a,0) * v` → `Vec.rotY(v, a)`.

## Vector3 bir BAŞVURU tipi (çok önemli)
Unity'de Vector3 değer tipidir; JS'te THREE.Vector3 nesnedir. Bir vektörü saklarken/değiştirirken mutlaka kopya al.
- `new Vector3(x,y,z)` → `V(x,y,z)`; `Vector3.zero/up/forward/right/back/one` → `Vec.zero` vb. (her seferinde yeni nesne).
- `a + b` → `Vec.add(a,b)`; `a - b` → `Vec.sub(a,b)`; `a * k` → `Vec.mul(a,k)`; `Vector3.Lerp` → `Vec.lerp`;
  `Vector3.Distance` → `Vec.dist`; `.magnitude` → `Vec.len(v)`; `.normalized` → `Vec.norm(v)`; `Vector3.Scale` → `Vec.scale`.
- `U.Flat(a, b)` (yatay mesafe) → `U.FlatDist(a, b)`. (`U.Flat(name,...)` kutu yapan sürüm aynı adla kaldı.)
- `Vector2` → `{x, y}` düz nesne (`V2(x,y)`).

## Renk
`new Color(r,g,b[,a])` → `C(r,g,b[,a])`; `Color.white/black/clear/green` → `Col.white` vb.; `Color.Lerp` → `Col.lerp`;
`c * k` → `Col.mul(c,k)`; `Color.HSVToRGB` → `Col.HSVToRGB`. `U.UI(c)` → sadece `c`.

## Unity karşılıkları
- `MonoBehaviour` → `class X extends Behaviour`. `new GameObject("n").AddComponent<X>()` → `new X()` (boş bir Group oluşur ve W'ye eklenir; `this.go` / `this.transform`).
  `Awake()` → constructor sonu; `Update()`/`LateUpdate()` aynı adlı metot (motor her kare çağırır; nesne gizliyse çağırmaz).
- `gameObject.SetActive(b)` → `SetActive(obj, b)`; `activeSelf` → `activeSelf(obj)`; `Destroy(x)` → `Destroy(x)`; `if (obj)` (yok edildi mi) → `alive(obj)`.
- `transform.Find("ad")` → `findChild(obj, 'ad')`.
- `Time.deltaTime`, `Time.time`, `Time.unscaledDeltaTime`, `Time.timeScale` aynı.
- `Mathf.*` aynı adlarla var (RoundToInt Unity gibi çifte yuvarlar). `Random.value`, `Random.Range(a,b)` = float.
  **İki tamsayı ile** `Random.Range(0, n)` (üst sınır hariç) → `Random.RangeInt(0, n)`. `System.Random` → `new SysRandom(seed)` (`NextDouble()`, `Next(a,b)`).
- `List<T>` → dizi. `Count` → `length`, `Add` → `push`, `Remove(x)` → `arrRemove(arr,x)`, `RemoveAt(i)` → `splice(i,1)`, `Contains` → `includes`, `Clear()` → `arr.length = 0`. `Dictionary` → `Map` ya da nesne.
- Coroutine / `WaitForSeconds` → `Tween.After(sn, fn)` ya da kare kare sayaç.
- Statik sınıf → `const X = { ... }` ya da `class X { static ... }`. Statik özellik (get) → `get Ad() {...}` ya da `static get Ad()`.
- `enum` → donmuş nesne `{ A: 0, B: 1 }`; dizi indeksi olarak kullanılanlar sayı olsun.
- Biçim: `Eco.TL(v)` ("₺1.234"). `x.ToString("0.0")` (tr-TR) → `fmt1(x)` ("3,5"). `ToString("00")` → `pad2(n)`.
- `Store.SetInt/GetInt/SetFloat/GetFloat/SetString/GetString/HasKey/DeleteKey/Save` aynı (localStorage).
- `Sfx.Play(ad, vol)` aynı.

## U yardımcıları (00_engine.js)
`U.Box(name, parent, pos, scale, color, type)` — type: `'Cube'` (varsayılan) `'Sphere'` `'Cylinder'` `'Capsule'`
(`PrimitiveType.Sphere` → `'Sphere'`). `U.Prim(name, parent, pos, scale, material, type)`, `U.Flat(...)` (gölgesiz kutu),
`U.Mat(c)`, `U.Mat(c, smooth)`, `U.Mat(c, tex, tiling{x,y}, smooth, emission)`, `U.Glow(c, k)`, `U.Bright(c)`,
`U.TileTex/WoodTex/CarpetTex/GrassTex/StripeTex`, `U.Pivot(parent, pos, name)`, `U.NoShadow(obj)`,
`U.Furn(name, parent, pos, yRot, scale, fbSize, fbColor)` → `Bounds` (`min,max,center,size`),
`U.WorldBounds(obj)`, `U.Burst(pos, colorA, colorB, count, speed)`, `U.Walk(obj, pathArray, speed, rig)`, `U.Face(obj, dir)`,
`U.Halo(parent, worldPos, size, c)`, `U.Skin`.
- `GetComponent<Renderer>().sharedMaterial = m` → `obj.material = m`. `.bounds` → `U.WorldBounds(obj)`.
- `U.Text(parent, pos, s, size, color, shadow)` → `TextMesh` nesnesi: `.text`, `.color`, `.characterSize`, `.gameObject`/`.transform` (Object3D).
  Kameraya dönük yazılar (Unity'de `CamRot`) zaten kameraya bakar. Yere yatık yazı (`Euler(90,0,0)`) → `.makeFlat()`.
- `ProgressPad`, `Rig` (`Rig.Model(parent, variant)`, `.act = Rig.Act.Sit`, `.Tick(m)`, `.go`) hazır.
- `MoneyPile`, `Customer`, `Room`, `Player`, `Reception`, `Laundry`, `Cleaner`, `Elevator`, `DayNight`, `Eco`, `GameManager` ana oturumda taşınıyor; adları ve genel üyeleri C#'takiyle AYNI olacak (`GameManager.I.money`, `GameManager.I.Notify(s)`, `GameManager.I.rooms` ...). Sen de onları C#'taki gibi çağır.

## OnGUI (arayüz)
Unity IMGUI'nin karşılığı `GUI` nesnesi (her kare yeniden çizilir, koordinatlar CSS pikseli, y aşağı).
- `void OnGUI()` → bir metot; kurulumda `RegisterGUI(depth, () => this.OnGUI())` ile kaydet (`GUI.depth` değeri; küçük olan üstte).
- `GUI.Label(rect, text, style)`, `GUI.Button(rect, text, style)` (bool), `GUI.DrawTexture(rect, 'circle'|'white'|'round'|'roundSmall')`,
  `GUI.color = C(...)`, `GUI.Box(...)`, `GUI.BeginGroup/EndGroup`,
  `scroll = GUI.BeginScrollView(rect, scroll, viewRect)` … `GUI.EndScrollView()`,
  `GUI.TextField(rect, value, maxLen, 'benzersiz-anahtar')`.
- `U.CircleTex` → `'circle'`, `Texture2D.whiteTexture` → `'white'`, `U.RoundTex` → `'round'`.
- Yuvarlak köşeli panel (C#'ta `Panel(r, c)` / `GameManager.I.Panel`) → `GUI.Panel(r, c)`.
- `new Rect(x,y,w,h)`, `Rect.MinMaxRect`, `.Contains({x,y})`, `.xMax/.yMax/.center` hazır.
- `new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold }` →
  `new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold })`. `style.fontSize`, `style.normal.textColor`, `style.wordWrap` aynı.
- Tam ekran açılır pencerenin arkasındaki tıklamaları yutmak için pencereyi çizmeden önce `GUI.Block()` (ya da `GUI.Block(rect)`).
- `Event.current.Use()`, `GUIUtility.ExitGUI()` → yok say / `return`.

## Yardımcılar (01_util.js)
`arrRemove(arr, x)`, `fmt1(v)`, `pad2(n)`, `trUpper(s)`.
