// Gera os ícones PNG do PWA (192, 512 e 180) sem dependências externas.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, data])));
  return Buffer.concat([len, tipoBuf, data, crcBuf]);
}

function desenhar(tamanho) {
  const px = Buffer.alloc(tamanho * tamanho * 4);
  const set = (x, y, r, g, b) => {
    const i = (y * tamanho + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) set(x, y, 18, 128, 93); // fundo esmeralda
  }
  for (const ry of [0.16, 0.26, 0.74, 0.84]) { // linhas de caderno
    const y = Math.floor(tamanho * ry);
    for (let x = Math.floor(tamanho * 0.12); x < Math.floor(tamanho * 0.88); x++) set(x, y, 200, 232, 218);
  }
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const r = tamanho * 0.22; // moeda central
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      if (Math.hypot(x - cx, y - cy) <= r) set(x, y, 252, 253, 247);
    }
  }
  for (let x = Math.floor(cx - r * 0.55); x <= Math.floor(cx + r * 0.55); x++) {
    set(x, Math.floor(cy - tamanho * 0.05), 28, 26, 23);
    set(x, Math.floor(cy + tamanho * 0.05), 28, 26, 23);
  }
  const raw = Buffer.alloc(tamanho * (tamanho * 4 + 1));
  for (let y = 0; y < tamanho; y++) {
    raw[y * (tamanho * 4 + 1)] = 0;
    px.copy(raw, y * (tamanho * 4 + 1) + 1, y * tamanho * 4, (y + 1) * tamanho * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return png;
}

const outDir = path.resolve('public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), desenhar(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), desenhar(512));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), desenhar(180));
console.log('Ícones gerados em public/');
