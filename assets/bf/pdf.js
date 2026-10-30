/* Gerador de PDF minimo, sem dependencia externa.
   Suporta: paginas A4, fontes TrueType embutidas (WinAnsi), texto, retangulos,
   caminhos preenchidos e imagens JPEG. Tudo o que as artes A4 precisam. */

const enc = new TextEncoder();

/* tipografia comum que o WinAnsi acomoda acima de 0xFF */
const WINANSI = { 0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85,
  0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A, 0x2039:0x8B,
  0x0152:0x8C, 0x017D:0x8E, 0x2018:0x91, 0x2019:0x92, 0x201C:0x93, 0x201D:0x94,
  0x2022:0x95, 0x2013:0x96, 0x2014:0x97, 0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A,
  0x203A:0x9B, 0x0153:0x9C, 0x017E:0x9E, 0x0178:0x9F };

function latin1 (txt) {
  const out = [];
  for (const ch of String(txt)) {
    const c = ch.codePointAt(0);
    out.push(c <= 0xFF ? c : (WINANSI[c] ?? 63));
  }
  return out;
}

function escapar (bytes) {
  let s = '';
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5C) s += '\\' + String.fromCharCode(b);
    else if (b < 32 || b > 126) s += '\\' + b.toString(8).padStart(3, '0');
    else s += String.fromCharCode(b);
  }
  return s;
}

const n2 = (v) => (Math.round(v * 1000) / 1000).toString();

export class Pdf {
  constructor ({ largura = 595.276, altura = 841.89 } = {}) {
    this.largura = largura; this.altura = altura;
    this.objetos = [null];           /* 1-indexado */
    this.paginas = [];
    this.fontes = new Map();         /* apelido -> {ref, widths, nome} */
    this.imagens = new Map();        /* apelido -> {ref} */
    this.conteudo = null;
  }

  _novo (corpo) { this.objetos.push(corpo); return this.objetos.length - 1; }

  /* ttf: Uint8Array; widths: array de 224 larguras (codigos 32..255) em 1/1000 em */
  registrarFonte (apelido, nomePs, ttf, widths, metricas) {
    const refArq = this._novo({ stream: ttf, dict: { Length1: ttf.length } });
    const refDesc = this._novo({ dict: {
      Type: '/FontDescriptor', FontName: '/' + nomePs, Flags: 32,
      FontBBox: `[${metricas.bbox.join(' ')}]`, ItalicAngle: 0,
      Ascent: metricas.ascent, Descent: metricas.descent,
      CapHeight: metricas.cap, StemV: metricas.stemv || 80,
      FontFile2: refArq + ' 0 R',
    } });
    const ref = this._novo({ dict: {
      Type: '/Font', Subtype: '/TrueType', BaseFont: '/' + nomePs,
      FirstChar: 32, LastChar: 255,
      Widths: '[' + widths.map(w => Math.round(w)).join(' ') + ']',
      Encoding: '/WinAnsiEncoding', FontDescriptor: refDesc + ' 0 R',
    } });
    this.fontes.set(apelido, { ref, widths });
  }

  registrarJpeg (apelido, bytes, larg, alt) {
    const ref = this._novo({ stream: bytes, dict: {
      Type: '/XObject', Subtype: '/Image', Width: larg, Height: alt,
      ColorSpace: '/DeviceRGB', BitsPerComponent: 8, Filter: '/DCTDecode',
    } });
    this.imagens.set(apelido, { ref });
  }

  larguraTexto (apelido, texto, tam) {
    const f = this.fontes.get(apelido);
    let w = 0;
    for (const c of latin1(texto)) w += (c >= 32 ? (f.widths[c - 32] || 0) : 0);
    return w * tam / 1000;
  }

  novaPagina () { this.conteudo = []; this.paginas.push(this.conteudo); return this; }

  cor (hex, traco = false) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255,
          g = parseInt(h.slice(2, 4), 16) / 255,
          b = parseInt(h.slice(4, 6), 16) / 255;
    this.conteudo.push(`${n2(r)} ${n2(g)} ${n2(b)} ${traco ? 'RG' : 'rg'}`);
    return this;
  }

  /* y medido do topo da pagina, como nas medidas das artes */
  _y (y) { return this.altura - y; }

  retangulo (x, y, w, h, modo = 'f', espessura) {
    if (espessura != null) this.conteudo.push(`${n2(espessura)} w`);
    this.conteudo.push(`${n2(x)} ${n2(this._y(y + h))} ${n2(w)} ${n2(h)} re ${modo}`);
    return this;
  }

  caminho (pontos, modo = 'f') {
    pontos.forEach(([x, y], i) => this.conteudo.push(
      `${n2(x)} ${n2(this._y(y))} ${i ? 'l' : 'm'}`));
    this.conteudo.push('h ' + modo);
    return this;
  }

  imagem (apelido, x, y, w, h) {
    const im = this.imagens.get(apelido);
    this.conteudo.push('q', `${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(this._y(y + h))} cm`,
      `/${apelido} Do`, 'Q');
    return this;
  }

  /* alinhamento: 'esq' | 'centro' | 'dir'; y e a linha de base, medida do topo */
  texto (apelido, texto, x, y, tam, { alinhar = 'esq', track = 0 } = {}) {
    const f = this.fontes.get(apelido);
    const w = this.larguraTexto(apelido, texto, tam) + track * (texto.length - 1);
    let px = x;
    if (alinhar === 'centro') px = x - w / 2;
    else if (alinhar === 'dir') px = x - w;
    this.conteudo.push('BT', `/${apelido} ${n2(tam)} Tf`);
    if (track) this.conteudo.push(`${n2(track)} Tc`);
    this.conteudo.push(`1 0 0 1 ${n2(px)} ${n2(this._y(y))} Tm`,
      `(${escapar(latin1(texto))}) Tj`, 'ET');
    if (track) this.conteudo.push('0 Tc');
    return this;
  }

  /* quebra o texto em linhas que cabem em `largura` */
  quebrar (apelido, texto, largura, tam) {
    const palavras = String(texto || '').trim().split(/\s+/).filter(Boolean);
    const linhas = []; let atual = '';
    for (const p of palavras) {
      const teste = atual ? atual + ' ' + p : p;
      if (this.larguraTexto(apelido, teste, tam) <= largura || !atual) atual = teste;
      else { linhas.push(atual); atual = p; }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  gerar () {
    /* objetos de pagina */
    const refPaginas = this._novo({ dict: {} });
    const refsPag = this.paginas.map(ops => {
      const corpo = enc.encode(ops.join('\n') + '\n');
      const refC = this._novo({ stream: corpo, dict: {} });
      const recursos = {
        Font: '<< ' + [...this.fontes].map(([a, f]) => `/${a} ${f.ref} 0 R`).join(' ') + ' >>',
        XObject: '<< ' + [...this.imagens].map(([a, i]) => `/${a} ${i.ref} 0 R`).join(' ') + ' >>',
      };
      return this._novo({ dict: {
        Type: '/Page', Parent: `${refPaginas} 0 R`,
        MediaBox: `[0 0 ${n2(this.largura)} ${n2(this.altura)}]`,
        Resources: '<< ' + Object.entries(recursos).map(([k, v]) => `/${k} ${v}`).join(' ') + ' >>',
        Contents: `${refC} 0 R`,
      } });
    });
    this.objetos[refPaginas] = { dict: {
      Type: '/Pages', Count: refsPag.length,
      Kids: '[' + refsPag.map(r => `${r} 0 R`).join(' ') + ']',
    } };
    const refCat = this._novo({ dict: { Type: '/Catalog', Pages: `${refPaginas} 0 R` } });

    /* serializacao */
    const partes = []; const offsets = [0]; let pos = 0;
    const empurrar = (u8) => { partes.push(u8); pos += u8.length; };
    empurrar(enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    for (let i = 1; i < this.objetos.length; i++) {
      const o = this.objetos[i];
      offsets[i] = pos;
      const d = { ...(o.dict || {}) };
      if (o.stream) d.Length = o.stream.length;
      const dictTxt = '<< ' + Object.entries(d).map(([k, v]) => `/${k} ${v}`).join(' ') + ' >>';
      empurrar(enc.encode(`${i} 0 obj\n${dictTxt}\n`));
      if (o.stream) {
        empurrar(enc.encode('stream\n'));
        empurrar(o.stream instanceof Uint8Array ? o.stream : new Uint8Array(o.stream));
        empurrar(enc.encode('\nendstream\n'));
      }
      empurrar(enc.encode('endobj\n'));
    }
    const inicioXref = pos;
    let xref = `xref\n0 ${this.objetos.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < this.objetos.length; i++) {
      xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    xref += `trailer\n<< /Size ${this.objetos.length} /Root ${refCat} 0 R >>\n` +
            `startxref\n${inicioXref}\n%%EOF\n`;
    empurrar(enc.encode(xref));

    const total = partes.reduce((a, p) => a + p.length, 0);
    const saida = new Uint8Array(total);
    let off = 0;
    for (const p of partes) { saida.set(p, off); off += p.length; }
    return new Blob([saida], { type: 'application/pdf' });
  }
}

/* larguras WinAnsi (codigos 32..255) medidas pelo proprio navegador */
export function largurasDaFonte (familia, peso) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `${peso} 1000px "${familia}"`;
  const w = [];
  for (let c = 32; c <= 255; c++) w.push(ctx.measureText(String.fromCharCode(c)).width);
  return w;
}
