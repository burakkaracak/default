# PNG → ham RGBA (oyuna DataTexture olarak gömülür; çalışırken resim çözmeye gerek kalmaz)
import struct, zlib, sys, base64, json
def decode(path):
    d = open(path, 'rb').read(); assert d[:8] == b'\x89PNG\r\n\x1a\n'
    i = 8; idat = b''; plte = None; trns = None
    while i < len(d):
        n, = struct.unpack('>I', d[i:i+4]); t = d[i+4:i+8]; c = d[i+8:i+8+n]; i += 12 + n
        if t == b'IHDR': w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', c)
        elif t == b'IDAT': idat += c
        elif t == b'PLTE': plte = c
        elif t == b'tRNS': trns = c
    assert bd == 8 and il == 0, (bd, il)
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat); stride = w * ch; out = bytearray(); prev = bytearray(stride); p = 0
    for y in range(h):
        f = raw[p]; p += 1; line = bytearray(raw[p:p+stride]); p += stride
        for x in range(stride):
            a = line[x-ch] if x >= ch else 0; b = prev[x]; cc = prev[x-ch] if x >= ch else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(b - cc), abs(a - cc), abs(a + b - 2 * cc)
                pr = a if pa <= pb and pa <= pc else b if pb <= pc else cc
                line[x] = (line[x] + pr) & 255
        prev = line
        for x in range(w):
            px = line[x*ch:(x+1)*ch]
            if ct == 6: out += px
            elif ct == 2: out += px + b'\xff'
            elif ct == 0: out += bytes([px[0]] * 3) + b'\xff'
            elif ct == 4: out += bytes([px[0]] * 3) + bytes([px[1]])
            elif ct == 3:
                k = px[0]; out += plte[k*3:k*3+3] + bytes([trns[k] if trns and k < len(trns) else 255])
    return w, h, bytes(out)
w, h, rgba = decode(sys.argv[1])
# GLTFExporter resmi dikey çevirerek gömdü (UV'ler buna göre): satırları ters çevir
rgba = b''.join(rgba[(h - 1 - y) * w * 4:(h - y) * w * 4] for y in range(h))
json.dump({'w': w, 'h': h, 'rgba': base64.b64encode(rgba).decode()}, open(sys.argv[2], 'w'))
print(w, h, len(rgba))
