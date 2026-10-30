/* ZIP sem compressao (metodo "store") — basta para JPEG e PDF, que ja sao comprimidos. */

const TAB = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32 (u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = TAB[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosData (d = new Date()) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, data };
}

export async function zipar (arquivos) {
  const enc = new TextEncoder();
  const { hora, data } = dosData();
  const locais = [];
  const central = [];
  let offset = 0;

  for (const { nome, dados } of arquivos) {
    const u8 = dados instanceof Uint8Array ? dados : new Uint8Array(await dados.arrayBuffer());
    const bn = enc.encode(nome);
    const crc = crc32(u8);

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034B50, true); lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);     /* nome em UTF-8 */
    lh.setUint16(8, 0, true);
    lh.setUint16(10, hora, true); lh.setUint16(12, data, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, u8.length, true); lh.setUint32(22, u8.length, true);
    lh.setUint16(26, bn.length, true); lh.setUint16(28, 0, true);
    locais.push(new Uint8Array(lh.buffer), bn, u8);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014B50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, hora, true); ch.setUint16(14, data, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, u8.length, true); ch.setUint32(24, u8.length, true);
    ch.setUint16(28, bn.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), bn);

    offset += 30 + bn.length + u8.length;
  }

  const tamCentral = central.reduce((a, p) => a + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054B50, true);
  fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, offset, true);

  return new Blob([...locais, ...central, new Uint8Array(fim.buffer)], { type: 'application/zip' });
}

export function baixar (blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
