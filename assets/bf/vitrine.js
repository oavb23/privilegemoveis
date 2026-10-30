/* Vitrine — liga os cards da landing page ao CMS.
   Usa o primeiro card do carrossel como modelo, lê /api/produtos.json
   e repete o modelo uma vez por produto ativo.

   Como marcar na página (opcional — sem nada disso ele assume #crs-todos):
     data-bf="produtos"              no container do carrossel
     data-bf-categoria="Sala de Estar"   filtra por categoria
     data-bf-estado="Pronta Entrega"     filtra por estado
     data-bf-limite="12"                 limita a quantidade

   Se o editor mudar a estrutura do card, ajuste SELETORES abaixo. */

const SELETORES = {
  containerPadrao: '#crs-todos',
  card: '#item-list-1, [data-bf-item]',
  nome: 'h4, [data-bf="nome"]',
  imagens: 'img',
  whatsapp: 'a[href*="wa.me"], a[onclick*="crm"], .data-crm-open',
};

const ESTADOS = ['pronta entrega', 'sob encomenda', 'última unidade', 'ultima unidade'];
const WHATSAPP = '5515996509030';

const moeda = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ehValor = (t) => /^\s*\d{1,3}(\.\d{3})*,\d{2}\s*$/.test(t) || /^\s*\d+,\d{2}\s*$/.test(t);
const semBarra = (s) => String(s || '').replace(/\s*\|\s*/g, ' ');

/* devolve todos os <p>/<span> de texto dentro do card, na ordem do documento */
function textos (card) {
  return [...card.querySelectorAll('p, span, h4, h5, div')]
    .filter(el => el.children.length === 0 && el.textContent.trim());
}

function mostrarTudo (card) {
  card.removeAttribute('aria-hidden');
  card.querySelectorAll('[aria-hidden="true"]').forEach(el => el.removeAttribute('aria-hidden'));
  [card, ...card.querySelectorAll('*')].forEach(el => {
    if (el.style && el.style.display === 'none') el.style.removeProperty('display');
  });
}

function preencher (card, p) {
  card.dataset.bfId = p.id;
  card.dataset.bfCategoria = p.categoria || '';
  card.dataset.bfEstado = p.estado || '';

  const nome = card.querySelector(SELETORES.nome);
  if (nome) nome.textContent = semBarra(p.nome);

  const VAZIA = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="#ece9e4"/></svg>');
  const imgs = [...card.querySelectorAll(SELETORES.imagens)];
  const trocar = (im, src, alt) => {
    if (!im) return;
    im.removeAttribute('srcset'); im.removeAttribute('loading');
    im.src = src || VAZIA; im.alt = alt;
  };
  trocar(imgs[0], p.imagemUrl, semBarra(p.nome));
  trocar(imgs[1], p.videoUrl || p.imagemUrl, '');

  const campos = textos(card);

  /* valores monetarios na ordem: de, por, parcelado */
  const valores = campos.filter(el => ehValor(el.textContent));
  const serie = [p.preco_de, p.preco_por, p.parcelado];
  valores.forEach((el, i) => {
    const v = serie[i], grupo = el.parentElement;
    if (v) {
      el.textContent = moeda(v);
      el.style.removeProperty('display');
      grupo?.style.removeProperty('display');
      return;
    }
    /* sem valor: some com o numero e com o "R$" que o acompanha, sem mexer no grupo vizinho */
    el.style.setProperty('display', 'none', 'important');
    const sobrou = grupo
      ? [...grupo.querySelectorAll('p, span')].some(x => x !== el && ehValor(x.textContent))
      : false;
    if (grupo && !sobrou) {
      grupo.style.setProperty('display', 'none', 'important');
      [...grupo.children].forEach(c => {
        if (/^\s*(R\$|\d{1,2}x de R\$)\s*$/.test(c.textContent)) c.style.setProperty('display', 'none', 'important');
      });
    }
  });

  /* rotulo de parcelas */
  campos.filter(el => /^\s*\d{1,2}x de R\$\s*$/.test(el.textContent))
    .forEach(el => { el.textContent = `${p.parcelas || 12}x de R$`; });

  /* estado (pronta entrega, sob encomenda...) */
  campos.filter(el => ESTADOS.includes(el.textContent.trim().toLowerCase()))
    .forEach(el => { el.textContent = (p.estado || '').toUpperCase(); p.estado ? el.style.removeProperty('display') : el.style.setProperty('display', 'none', 'important'); });

  /* selo de desconto */
  const desconto = p.preco_de && p.preco_por && p.preco_de > p.preco_por
    ? Math.round(100 * (1 - p.preco_por / p.preco_de)) : 0;
  campos.filter(el => /^\s*\d{1,2}%OFF\s*$/i.test(el.textContent))
    .forEach((el, i) => {
      if (desconto && i === 0) { el.textContent = `${desconto}%OFF`; el.style.removeProperty('display'); }
      else { el.textContent = ''; el.style.setProperty('display', 'none', 'important'); }
    });

  /* whatsapp */
  const ligacao = card.querySelector(SELETORES.whatsapp);
  if (ligacao) {
    const msg = encodeURIComponent(`Olá! Tenho interesse no ${semBarra(p.nome)} da Black Friday.`);
    ligacao.setAttribute('href', `https://wa.me/${WHATSAPP}?text=${msg}`);
    ligacao.setAttribute('target', '_blank');
    ligacao.setAttribute('rel', 'noopener');
    ligacao.removeAttribute('onclick');
  }
}

function ligar (container, produtos) {
  const cards = [...container.querySelectorAll(SELETORES.card)];
  if (!cards.length) return;
  /* usa como modelo o card mais completo: o que tem menos coisa escondida */
  const visiveis = (c) => [...c.querySelectorAll('*')].filter(e => e.style?.display !== 'none').length;
  const base = cards.reduce((a, c) => (visiveis(c) > visiveis(a) ? c : a), cards[0]);
  if (base === cards[0]) mostrarTudo(base);
  const modelo = base.cloneNode(true);

  let lista = produtos;
  const cat = container.dataset.bfCategoria;
  const est = container.dataset.bfEstado;
  const lim = Number(container.dataset.bfLimite) || 0;
  if (cat) lista = lista.filter(p => p.categoria === cat);
  if (est) lista = lista.filter(p => p.estado === est);
  if (lim) lista = lista.slice(0, lim);

  if (!lista.length) { container.dataset.bfVazio = '1'; return; }

  const novos = lista.map(p => {
    const c = modelo.cloneNode(true);
    preencher(c, p);
    return c;
  });
  cards.slice(1).forEach(c => c.remove());
  cards[0].replaceWith(...novos);
  container.dataset.bfTotal = String(novos.length);
  container.dispatchEvent(new CustomEvent('bf:vitrine', { bubbles: true, detail: { total: novos.length } }));
}

export async function montarVitrine () {
  let dados;
  try {
    const r = await fetch('/api/produtos.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('falha ' + r.status);
    dados = await r.json();
  } catch (e) {
    console.warn('[vitrine] mantendo os cards do editor:', e.message);
    return;
  }
  const produtos = (dados.produtos || []).filter(p => p.ativo !== false);
  if (!produtos.length) { console.warn('[vitrine] nenhum produto ativo; mantendo os cards do editor'); return; }

  const alvos = document.querySelectorAll('[data-bf="produtos"]');
  if (alvos.length) alvos.forEach(c => ligar(c, produtos));
  else {
    const padrao = document.querySelector(SELETORES.containerPadrao);
    if (padrao) ligar(padrao, produtos);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarVitrine);
else montarVitrine();
