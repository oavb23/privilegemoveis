/* Motor de artes — Black Friday Privilege Móveis
   Reproduz as tres pecas a partir dos dados do produto:
     1080x1350 (JPEG)  1080x1920 (JPEG)  A4 retrato (PDF vetorial)
   Medidas extraidas dos modelos originais da campanha. */

export const BASE = '/assets/bf';

const AMARELO = '#FFC300';
const BRANCO  = '#FFFFFF';
const PRETO   = '#000000';
const CINZA   = '#666666';

/* ---------- fontes ---------- */

const FAMILIAS = [
  ['AlexandriaBF',  '400', 'alexandria-400.ttf'],
  ['AlexandriaBF',  '700', 'alexandria-700.ttf'],
  ['BricolageBF',   '500', 'bricolage-cond-500.ttf'],
  ['BricolageBF',   '600', 'bricolage-cond-600.ttf'],
  ['BricolageBF',   '700', 'bricolage-cond-700.ttf'],
  ['MontserratBF',  '400', 'montserrat-400.ttf'],
  ['MontserratBF',  '600', 'montserrat-600.ttf'],
  ['MontserratBF',  '700', 'montserrat-700.ttf'],
  ['MontserratBF',  '800', 'montserrat-800.ttf'],
];

let fontesProntas = null;
export function carregarFontes () {
  if (fontesProntas) return fontesProntas;
  fontesProntas = Promise.all(FAMILIAS.map(([fam, peso, arq]) => {
    const ff = new FontFace(fam, `url(${BASE}/fonts/${arq})`, { weight: peso, style: 'normal' });
    return ff.load().then(f => { document.fonts.add(f); return f; });
  }));
  return fontesProntas;
}

const cacheImg = new Map();
export function carregarImagem (src) {
  if (cacheImg.has(src)) return cacheImg.get(src);
  const p = new Promise((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error('nao carregou: ' + src));
    im.src = src;
  });
  cacheImg.set(src, p);
  return p;
}

/* ---------- texto com tracking ---------- */

function avanco (ctx, texto, track) {
  let w = 0;
  for (const ch of texto) w += ctx.measureText(ch).width + track;
  return texto.length ? w - track : 0;
}

function escrever (ctx, texto, x, base, track) {
  let cx = x;
  for (const ch of texto) {
    ctx.fillText(ch, cx, base);
    cx += ctx.measureText(ch).width + track;
  }
  return cx;
}

function fonte (ctx, peso, tam, fam) {
  ctx.font = `${peso} ${tam}px "${fam}"`;
}

/* quebra o texto em ate `max` linhas dentro de `largura` */
function quebrar (ctx, texto, largura, max, track) {
  const palavras = String(texto || '').trim().split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p;
    if (avanco(ctx, teste, track) <= largura || !atual) atual = teste;
    else { linhas.push(atual); atual = p; if (linhas.length === max) break; }
  }
  if (atual && linhas.length < max) linhas.push(atual);
  return linhas;
}

/* ---------- formatacao de valores ---------- */

export function moeda (v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/* nas pecas digitais o preco aparece sem centavos quando sao zero */
export function moedaCurta (v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '';
  const cents = Math.round(n * 100) % 100;
  return cents === 0
    ? Math.round(n).toLocaleString('pt-BR')
    : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- pecas digitais ---------- */

const D = {
  larg: 1080,
  formatos: {
    '1350': { alt: 1350, dy: 0,   moldura: 'moldura-1350.png', rotulo: '1080x1350' },
    '1920': { alt: 1920, dy: 318, moldura: 'moldura-1920.png', rotulo: '1080x1920' },
  },
  nome:   { x: 110, base: 1039, pitch: 65, tam: 68, largMax: 468 },
  desc:   { x: 110, base: 1162, pitch: 32, tam: 29, peso: 500, track: 0.72, largMax: 460, linhas: 3 },
  rotulo: { x: 614, base: 1053, pitch: 30, tam: 29, peso: 500, track: -1.5 },
  regua:  { x: 614, y: 988, w: 358, h: 2 },
  vista:  { dir: 972, baseNum: 1089, tamNum: 95, trackNum: -3.22,
            baseRs: 1070, tamRs: 39, trackRs: 3.02, peso: 600, gap: 2 },
  pilula: { x: 614, y: 1133, w: 358, h: 102, r: 14,
            x12: 635, base12: 1209, tam12: 85, track12: -3.36,
            dir: 946, baseNum: 1209, tamNum: 85, trackNum: -3.79,
            baseRs: 1195, tamRs: 36, trackRs: 2.52, peso: 600, gap: 4 },
};

function desenharFoto (ctx, img, larg, alt) {
  ctx.fillStyle = '#E9E6E1';
  ctx.fillRect(0, 0, larg, alt);
  if (!img) return;
  const ei = img.width / img.height, ec = larg / alt;
  let w, h, x, y;
  if (ei > ec) { h = alt; w = alt * ei; x = (larg - w) / 2; y = 0; }
  else         { w = larg; h = larg / ei; x = 0; y = (alt - h) / 2; }
  ctx.drawImage(img, x, y, w, h);
}

function pilula (ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
  ctx.fill();
}

/* grupo "R$" + numero, alinhado a direita */
function grupoPreco (ctx, numero, cfg, dy, cor) {
  ctx.fillStyle = cor;
  fonte(ctx, cfg.peso, cfg.tamRs, 'BricolageBF');
  const wRs = avanco(ctx, 'R$', cfg.trackRs);
  fonte(ctx, cfg.peso, cfg.tamNum, 'BricolageBF');
  const wNum = avanco(ctx, numero, cfg.trackNum);
  const x0 = cfg.dir - (wRs + cfg.gap + wNum);
  fonte(ctx, cfg.peso, cfg.tamRs, 'BricolageBF');
  escrever(ctx, 'R$', x0, cfg.baseRs + dy, cfg.trackRs);
  fonte(ctx, cfg.peso, cfg.tamNum, 'BricolageBF');
  escrever(ctx, numero, x0 + wRs + cfg.gap, cfg.baseNum + dy, cfg.trackNum);
}

const semBarra = (s) => String(s || '').replace(/\s*\|\s*/g, ' ');

function linhasDoNome (ctx, nome) {
  const bruto = String(nome || '').replace(/\s*\|\s*/g, '\n');
  if (bruto.includes('\n')) {
    const partes = bruto.split('\n').map(s => s.trim()).filter(Boolean);
    return [partes[0] || '', partes.slice(1).join(' ')].filter(Boolean);
  }
  fonte(ctx, 400, D.nome.tam, 'AlexandriaBF');
  return quebrar(ctx, bruto, D.nome.largMax, 2, 0);
}

export async function renderDigital (produto, formato, opcoes = {}) {
  const f = D.formatos[formato];
  if (!f) throw new Error('formato desconhecido: ' + formato);
  await carregarFontes();
  const [moldura, foto] = await Promise.all([
    carregarImagem(`${BASE}/arte/${f.moldura}`),
    produto.imagemUrl ? carregarImagem(produto.imagemUrl).catch(() => null) : Promise.resolve(null),
  ]);

  const cv = opcoes.canvas || document.createElement('canvas');
  cv.width = D.larg; cv.height = f.alt;
  const ctx = cv.getContext('2d');
  const dy = f.dy;

  desenharFoto(ctx, foto, D.larg, f.alt);
  ctx.drawImage(moldura, 0, 0, D.larg, f.alt);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  /* nome: 1a linha regular, 2a linha bold */
  const linhas = linhasDoNome(ctx, produto.nome);
  let tamNome = D.nome.tam;
  const cabe = (t) => linhas.every((ln, i) => {
    fonte(ctx, i === linhas.length - 1 ? 700 : 400, t, 'AlexandriaBF');
    return avanco(ctx, ln, 0) <= D.nome.largMax;
  });
  while (tamNome > 44 && !cabe(tamNome)) tamNome -= 1;
  ctx.fillStyle = BRANCO;
  linhas.forEach((ln, i) => {
    fonte(ctx, i === linhas.length - 1 ? 700 : 400, tamNome, 'AlexandriaBF');
    escrever(ctx, ln, D.nome.x, D.nome.base + dy + i * D.nome.pitch, 0);
  });

  /* descricao */
  const d = D.desc;
  let tamDesc = d.tam;
  let ld;
  for (;;) {
    fonte(ctx, d.peso, tamDesc, 'BricolageBF');
    ld = quebrar(ctx, produto.descricao, d.largMax, d.linhas, d.track);
    const total = quebrar(ctx, produto.descricao, d.largMax, 99, d.track);
    if (total.length <= d.linhas || tamDesc <= 23) break;
    tamDesc -= 1;
  }
  ctx.fillStyle = AMARELO;
  fonte(ctx, d.peso, tamDesc, 'BricolageBF');
  const passo = Math.round(d.pitch * tamDesc / d.tam);
  ld.forEach((ln, i) => escrever(ctx, ln, d.x, d.base + dy + i * passo, d.track));

  /* regua branca acima do preco */
  ctx.fillStyle = BRANCO;
  ctx.fillRect(D.regua.x, D.regua.y + dy, D.regua.w, D.regua.h);

  /* rotulo A VISTA / NO PIX: */
  fonte(ctx, D.rotulo.peso, D.rotulo.tam, 'BricolageBF');
  escrever(ctx, 'À VISTA', D.rotulo.x, D.rotulo.base + dy, D.rotulo.track);
  escrever(ctx, 'NO PIX:', D.rotulo.x, D.rotulo.base + D.rotulo.pitch + dy, D.rotulo.track);

  /* preco a vista */
  const porNum = moedaCurta(produto.preco_por);
  if (porNum) grupoPreco(ctx, porNum, D.vista, dy, BRANCO);

  /* pilula do parcelado */
  const parc = moedaCurta(produto.parcelado);
  const p = D.pilula;
  if (parc) {
    ctx.fillStyle = AMARELO;
    pilula(ctx, p.x, p.y + dy, p.w, p.h, p.r);
    ctx.fillStyle = PRETO;
    fonte(ctx, p.peso, p.tam12, 'BricolageBF');
    escrever(ctx, (produto.parcelas || 12) + 'x', p.x12, p.base12 + dy, p.track12);
    grupoPreco(ctx, parc, p, dy, PRETO);
  }
  return cv;
}

export function canvasParaBlob (cv, qualidade = 0.94) {
  return new Promise(ok => cv.toBlob(ok, 'image/jpeg', qualidade));
}

/* ---------- peca A4 (PDF vetorial, sem dependencia) ---------- */

const A4 = {
  w: 595.276, h: 841.89,
  margem: 72, largura: 451.28, centro: 297.638,
  topo:   { y: 37.4, h: 77.0 },
  rodape: { y: 690.9, h: 77.0 },
  estrelas: { base: 169.9, tam: 18, pitch: 23.33, n: 5 },
  titulo: { centro: 251.7, pitch: 46, tam: 38, largMax: 440, linhas: 2 },
  caixa1: { x: 71.0, y: 310.9, w: 452.4, h: 59.0, base: 356.1, tam: 38 },
  caixa2: { x: 71.0, y: 369.9, w: 452.4, h: 61.4, base: 414.8, tam: 38 },
  colEsq: 72, colDir: 297.33, largEsq: 205, largDir: 226,
  rotulo: { tam: 10, base1: 495.7, baseMat: 543.0 },
  corpo:  { tam: 16, base1: 520.2, baseMat: 567.5, pitch: 19.33, linhas: 6 },
  legal:  { tam: 9.33, base: 790.3, pitch: 12 },
};

const LEGAL = [
  'Consulte as nossas condições de parcelamento no cartão de crédito, boleto e o uso do saldo FGTS',
  'com nossos consultores. Ofertas válidas até 30/11/2026 ou enquanto durar nossos estoques.',
];

const METRICAS_M = { bbox: [-451, -498, 1715, 1089], ascent: 968, descent: -251, cap: 700, stemv: 90 };

const PESOS_A4 = [['reg', 400, 'montserrat-400.ttf', 'Montserrat-Regular'],
                  ['sem', 600, 'montserrat-600.ttf', 'Montserrat-SemiBold'],
                  ['bol', 700, 'montserrat-700.ttf', 'Montserrat-Bold'],
                  ['ext', 800, 'montserrat-800.ttf', 'Montserrat-ExtraBold']];

async function bytes (url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('falha ao buscar ' + url);
  return new Uint8Array(await r.arrayBuffer());
}

function estrela (pdf, cx, cy, raio) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? raio * 0.40 : raio;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a) * -1]);
  }
  pdf.caminho(pts, 'f');
}

function paginaA4 (pdf, produto) {
  pdf.novaPagina();
  pdf.imagem('Itopo',   A4.margem, A4.topo.y,   A4.largura, A4.topo.h);
  pdf.imagem('Irodape', A4.margem, A4.rodape.y, A4.largura, A4.rodape.h);

  /* estrelas */
  pdf.cor(AMARELO);
  const e = A4.estrelas, total = (e.n - 1) * e.pitch;
  for (let i = 0; i < e.n; i++) estrela(pdf, A4.centro - total / 2 + i * e.pitch, e.base, e.tam / 2);

  /* titulo: ate 2 linhas, encolhe se precisar */
  pdf.cor(PRETO);
  const t = A4.titulo;
  const titulo = semBarra(produto.nome);
  let tamT = t.tam, lt = pdf.quebrar('bol', titulo, t.largMax, tamT);
  while (lt.length > t.linhas && tamT > 20) { tamT -= 1; lt = pdf.quebrar('bol', titulo, t.largMax, tamT); }
  lt = lt.slice(0, t.linhas);
  const pitchT = t.pitch * tamT / t.tam;
  const baseT = t.centro - (lt.length - 1) * pitchT / 2;
  lt.forEach((l, i) => pdf.texto('bol', l, A4.centro, baseT + i * pitchT, tamT, { alinhar: 'centro' }));

  /* caixas de preco */
  const c1 = A4.caixa1, c2 = A4.caixa2;
  pdf.cor(BRANCO); pdf.cor(AMARELO, true);
  pdf.retangulo(c1.x, c1.y, c1.w, c1.h, 'B', 1.5);
  pdf.cor(AMARELO);
  pdf.retangulo(c2.x, c2.y, c2.w, c2.h, 'f');

  const encolhe = (apelido, txt, largura, tamBase) => {
    let tam = tamBase;
    while (tam > 14 && pdf.larguraTexto(apelido, txt, tam) > largura) tam -= 0.5;
    return tam;
  };
  const parcelas = produto.parcelas || 12;
  const porTxt  = moeda(produto.preco_por) ? `R$${moeda(produto.preco_por)} à vista` : '';
  const parcTxt = moeda(produto.parcelado) ? `ou ${parcelas}x R$${moeda(produto.parcelado)}` : '';
  pdf.cor(PRETO);
  if (porTxt)  pdf.texto('sem', porTxt,  A4.centro, c1.base, encolhe('sem', porTxt,  c1.w - 24, c1.tam), { alinhar: 'centro' });
  if (parcTxt) pdf.texto('ext', parcTxt, A4.centro, c2.base, encolhe('ext', parcTxt, c2.w - 24, c2.tam), { alinhar: 'centro' });

  /* colunas de dados */
  pdf.cor(PRETO);
  pdf.texto('bol', 'DESCRIÇÃO:', A4.colEsq, A4.rotulo.base1, A4.rotulo.tam);
  if (produto.medida)   pdf.texto('bol', 'MEDIDA:',   A4.colDir, A4.rotulo.base1,   A4.rotulo.tam);
  if (produto.material) pdf.texto('bol', 'MATERIAL:', A4.colDir, A4.rotulo.baseMat, A4.rotulo.tam);

  pdf.quebrar('reg', produto.descricao, A4.largEsq, A4.corpo.tam).slice(0, A4.corpo.linhas)
     .forEach((l, i) => pdf.texto('reg', l, A4.colEsq, A4.corpo.base1 + i * A4.corpo.pitch, A4.corpo.tam));
  if (produto.medida) {
    pdf.quebrar('reg', produto.medida, A4.largDir, A4.corpo.tam).slice(0, 1)
       .forEach(l => pdf.texto('reg', l, A4.colDir, A4.corpo.base1, A4.corpo.tam));
  }
  if (produto.material) {
    pdf.quebrar('reg', produto.material, A4.largDir, A4.corpo.tam).slice(0, 2)
       .forEach((l, i) => pdf.texto('reg', l, A4.colDir, A4.corpo.baseMat + i * A4.corpo.pitch, A4.corpo.tam));
  }

  /* texto legal */
  pdf.cor(CINZA);
  LEGAL.forEach((l, i) => pdf.texto('reg', l, A4.centro, A4.legal.base + i * A4.legal.pitch, A4.legal.tam, { alinhar: 'centro' }));
}

/* um unico PDF com uma pagina por produto */
export async function renderA4 (produtos, aoAvancar) {
  const { Pdf, largurasDaFonte } = await import(`${BASE}/pdf.js`);
  await carregarFontes();
  await document.fonts.ready;
  const pdf = new Pdf({ largura: A4.w, altura: A4.h });
  const arquivos = await Promise.all(PESOS_A4.map(([, , arq]) => bytes(`${BASE}/fonts/${arq}`)));
  PESOS_A4.forEach(([apelido, peso, , nomePs], i) => {
    pdf.registrarFonte(apelido, nomePs, arquivos[i], largurasDaFonte('MontserratBF', peso), METRICAS_M);
  });
  const [jTopo, jRodape] = await Promise.all([
    bytes(`${BASE}/arte/a4-topo.jpg`), bytes(`${BASE}/arte/a4-rodape.jpg`),
  ]);
  pdf.registrarJpeg('Itopo', jTopo, 1640, 280);
  pdf.registrarJpeg('Irodape', jRodape, 1640, 280);

  produtos.forEach((p, i) => { paginaA4(pdf, p); aoAvancar?.(i + 1, produtos.length); });
  return pdf.gerar();
}

export const FORMATOS = D.formatos;
