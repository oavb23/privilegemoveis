import { renderDigital, renderA4, canvasParaBlob, moeda } from '/assets/bf/arte.js';
import { zipar, baixar } from '/assets/bf/zip.js';

/* ---------------- estado ---------------- */

const estado = {
  produtos: [],
  busca: '',
  filtro: { ativo: 'todos', categoria: '', estado: '' },
  visao: localStorage.getItem('bf_visao') || 'grade',
  temR2: false,
  categorias: ['Sala de Estar', 'Sala de Jantar', 'Outros'],
  estados: ['Pronta Entrega', 'Sob Encomenda', 'Última Unidade'],
};

const app = document.getElementById('app');
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const semBarra = (s) => String(s ?? '').replace(/\s*\|\s*/g, ' ');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICO = {
  mais:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  busca:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5" stroke-linecap="round"/></svg>',
  x:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  baixar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
  grade:  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>',
  lista:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  volta:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>',
  foto:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.8"/><path d="M21 16l-5-5-6.5 8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  video:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-2.5v8l-5-2.5z" stroke-linejoin="round"/></svg>',
  lixo:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 002 2h8a2 2 0 002-2l1-13M9 7V4h6v3"/></svg>',
  certo:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
  sair:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h5"/></svg>',
  roda:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 109 9" opacity=".9"/></svg>',
};

/* ---------------- avisos ---------------- */

let avisoAtual = null;
function avisar (texto, ruim = false) {
  avisoAtual?.remove();
  const el = h(`<div class="recado${ruim ? ' ruim' : ''}">${esc(texto)}</div>`);
  document.body.appendChild(el);
  avisoAtual = el;
  setTimeout(() => { if (el === avisoAtual) { el.remove(); avisoAtual = null; } }, ruim ? 5200 : 2800);
}

/* ---------------- api ---------------- */

async function api (caminho, opcoes = {}) {
  const r = await fetch('/api/' + caminho, {
    headers: opcoes.corpo ? { 'content-type': 'application/json' } : undefined,
    method: opcoes.metodo || 'GET',
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : opcoes.bruto,
    ...opcoes.extra,
  });
  let dados = {};
  try { dados = await r.json(); } catch (_) { /* resposta sem corpo */ }
  if (!r.ok) throw new Error(dados.erro || `falha na requisição (${r.status})`);
  return dados;
}

/* ---------------- valores ---------------- */

const paraNumero = (txt) => {
  const limpo = String(txt ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isFinite(n) ? n : null;
};
const paraCampo = (v) => (v === null || v === undefined || v === '' ? '' : moeda(v));

/* ---------------- login ---------------- */

function telaEntrada (recado) {
  app.replaceChildren(h(`
    <div class="entrada">
      <form>
        <h1>Produtos da Black Friday</h1>
        <p>Privilege Móveis e Decorações</p>
        ${recado ? `<div class="nota">${esc(recado)}</div>` : ''}
        <div class="campo">
          <label for="senha">Senha de acesso</label>
          <input id="senha" type="password" autocomplete="current-password" required>
        </div>
        <button class="bt destaque" style="width:100%;height:46px" type="submit">Entrar</button>
      </form>
    </div>`));
  const form = app.querySelector('form');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const bt = form.querySelector('button');
    bt.disabled = true; bt.textContent = 'Entrando…';
    try {
      await api('entrar', { metodo: 'POST', corpo: { senha: form.senha.value } });
      await iniciar();
    } catch (e) {
      avisar(e.message, true);
      bt.disabled = false; bt.textContent = 'Entrar';
      form.senha.select();
    }
  });
  form.senha.focus();
}

/* ---------------- tela principal ---------------- */

function filtrar () {
  const q = estado.busca.trim().toLowerCase();
  return estado.produtos.filter(p => {
    if (q && !p.nome.toLowerCase().includes(q)) return false;
    if (estado.filtro.ativo === 'ativos' && !p.ativo) return false;
    if (estado.filtro.ativo === 'inativos' && p.ativo) return false;
    if (estado.filtro.categoria && p.categoria !== estado.filtro.categoria) return false;
    if (estado.filtro.estado && p.estado !== estado.filtro.estado) return false;
    return true;
  });
}

function cartao (p) {
  const foto = p.imagemUrl
    ? `<img src="${esc(p.imagemUrl)}" alt="" loading="lazy">`
    : `<div class="vazio-foto">${ICO.foto}</div>`;
  const precos = p.preco_por
    ? `<div class="preco">${p.preco_de ? `<s>R$${esc(moeda(p.preco_de))}</s>` : ''}R$${esc(moeda(p.preco_por))}</div>`
    : '<div class="preco" style="color:var(--fraco)">sem preço</div>';
  const etiquetas = [
    `<span class="etiqueta ${p.ativo ? 'on' : 'off'}">${p.ativo ? 'ativo' : 'desativado'}</span>`,
    p.categoria ? `<span class="etiqueta">${esc(p.categoria)}</span>` : '',
    p.estado ? `<span class="etiqueta">${esc(p.estado)}</span>` : '',
  ].join('');
  return h(`<button class="cartao" data-id="${esc(p.id)}">
      <div class="foto">${foto}</div>
      <div class="corpo">
        <h3 class="titulo-cartao">${esc(semBarra(p.nome))}</h3>
        ${precos}
        <div class="etiquetas">${etiquetas}</div>
      </div>
    </button>`);
}

function desenhar () {
  const itens = filtrar();
  const tela = h(`
    <div>
      <header class="cabecalho">
        <div class="envolve">
          <div class="marca"><i></i>Produtos <small>· Black Friday</small></div>
          <div class="espaco"></div>
          <button class="bt so-icone vazio" id="bt-visao" title="Alternar lista e grade">
            ${estado.visao === 'grade' ? ICO.lista : ICO.grade}</button>
          <button class="bt so-icone vazio" id="bt-sair" title="Sair">${ICO.sair}</button>
        </div>
      </header>
      <div class="envolve">
        ${estado.temR2 ? '' : `<div class="nota" id="nota-r2">O R2 ainda não está ligado: imagens até 600 KB são guardadas no próprio banco e vídeos maiores não sobem. Dá para usar assim mesmo.</div>`}
        <div class="acoes">
          <button class="bt destaque" id="bt-novo">${ICO.mais} Adicionar produto</button>
          <div class="busca">
            ${ICO.busca}
            <input id="campo-busca" type="text" placeholder="Pesquisar pelo nome" value="${esc(estado.busca)}" autocomplete="off">
            ${estado.busca ? `<button class="bt so-icone limpa" id="bt-limpa">${ICO.x}</button>` : ''}
          </div>
          <button class="bt vazio" id="bt-baixar">${ICO.baixar} Baixar arquivos</button>
        </div>
        <div class="filtros">
          ${['todos', 'ativos', 'inativos'].map(v =>
            `<button class="marca-filtro" data-tipo="ativo" data-valor="${v}" aria-pressed="${estado.filtro.ativo === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
          <span style="width:1px;background:var(--linha);flex:none;margin:0 3px"></span>
          ${estado.categorias.map(c =>
            `<button class="marca-filtro" data-tipo="categoria" data-valor="${esc(c)}" aria-pressed="${estado.filtro.categoria === c}">${esc(c)}</button>`).join('')}
          <span style="width:1px;background:var(--linha);flex:none;margin:0 3px"></span>
          ${estado.estados.map(s =>
            `<button class="marca-filtro" data-tipo="estado" data-valor="${esc(s)}" aria-pressed="${estado.filtro.estado === s}">${esc(s)}</button>`).join('')}
        </div>
        <div class="${estado.visao}" id="colecao"></div>
      </div>
    </div>`);

  const colecao = tela.querySelector('#colecao');
  if (!itens.length) {
    colecao.className = '';
    colecao.appendChild(h(`<div class="nada">
      <b>${estado.produtos.length ? 'Nenhum produto com esse filtro' : 'Nenhum produto cadastrado'}</b>
      ${estado.produtos.length ? 'Tente outro termo ou limpe os filtros.' : 'Toque em “Adicionar produto” para começar.'}
    </div>`));
  } else {
    itens.forEach(p => colecao.appendChild(cartao(p)));
  }

  app.replaceChildren(tela);

  tela.querySelector('#bt-novo').onclick = () => painelProduto(null);
  tela.querySelector('#bt-baixar').onclick = () => modalBaixar();
  tela.querySelector('#bt-visao').onclick = () => {
    estado.visao = estado.visao === 'grade' ? 'lista' : 'grade';
    localStorage.setItem('bf_visao', estado.visao);
    desenhar();
  };
  tela.querySelector('#bt-sair').onclick = async () => {
    await api('sair', { metodo: 'POST' }).catch(() => {});
    telaEntrada();
  };
  tela.querySelector('#bt-limpa')?.addEventListener('click', () => { estado.busca = ''; desenhar(); });

  const campo = tela.querySelector('#campo-busca');
  let atraso;
  campo.addEventListener('input', () => {
    clearTimeout(atraso);
    atraso = setTimeout(() => {
      estado.busca = campo.value;
      const pos = campo.selectionStart;
      desenhar();
      const novo = document.getElementById('campo-busca');
      novo.focus(); novo.setSelectionRange(pos, pos);
    }, 200);
  });

  tela.querySelectorAll('.marca-filtro').forEach(b => {
    b.onclick = () => {
      const { tipo, valor } = b.dataset;
      if (tipo === 'ativo') estado.filtro.ativo = valor;
      else estado.filtro[tipo] = estado.filtro[tipo] === valor ? '' : valor;
      desenhar();
    };
  });

  colecao.querySelectorAll('.cartao').forEach(c => {
    c.onclick = () => painelProduto(c.dataset.id);
  });
}

/* ---------------- envio de midia ---------------- */

const MAX_LADO = 1600;

async function prepararImagem (arquivo) {
  if (arquivo.type === 'image/gif' || !arquivo.type.startsWith('image/')) return arquivo;
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  if (escala === 1 && arquivo.size < 500 * 1024) return arquivo;
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * escala);
  cv.height = Math.round(bmp.height * escala);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.86));
  return blob.size < arquivo.size ? blob : arquivo;
}

async function enviarMidia (arquivo) {
  const pronto = arquivo.type.startsWith('image/') ? await prepararImagem(arquivo) : arquivo;
  const dados = await api('midia', {
    metodo: 'POST', bruto: pronto,
    extra: { headers: { 'x-tipo': pronto.type || arquivo.type } },
  });
  return dados.chave;
}

/* ---------------- painel do produto ---------------- */

function painelProduto (id) {
  const novo = !id;
  const p = novo
    ? { nome: '', categoria: '', estado: '', preco_de: null, preco_por: null, parcelado: null,
        medida: '', material: '', descricao: '', imagem: null, video: null,
        imagemUrl: null, videoUrl: null, ativo: true }
    : { ...estado.produtos.find(x => x.id === id) };

  const opcoes = (lista, atual) => ['<option value=""></option>']
    .concat(lista.map(v => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(v)}</option>`))
    .join('');

  const painel = h(`
    <div class="painel">
      <div class="painel-topo">
        <button class="bt so-icone vazio" id="bt-volta">${ICO.volta}</button>
        <h2>${novo ? 'Novo produto' : esc(semBarra(p.nome) || 'Produto')}</h2>
        ${novo ? '' : `<button class="bt so-icone perigo" id="bt-apagar" title="Apagar produto">${ICO.lixo}</button>`}
      </div>
      <div class="painel-corpo"><div class="envolve"><form id="form">

        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" type="text" value="${esc(p.nome)}" required placeholder="Conjunto com 10 Cadeiras">
          <div class="dica">Use <b>|</b> para separar as duas linhas da arte. Ex.: Conjunto com | 10 Cadeiras</div>
        </div>

        <div class="dupla">
          <div class="campo">
            <label for="categoria">Categoria</label>
            <select id="categoria">${opcoes(estado.categorias, p.categoria)}</select>
          </div>
          <div class="campo">
            <label for="estado">Estado</label>
            <select id="estado">${opcoes(estado.estados, p.estado)}</select>
          </div>
        </div>

        <div class="secao">Preços</div>
        <div class="tripla">
          <div class="campo"><label for="preco_de">De</label>
            <input id="preco_de" type="text" inputmode="decimal" value="${esc(paraCampo(p.preco_de))}" placeholder="37.485,00"></div>
          <div class="campo"><label for="preco_por">Por</label>
            <input id="preco_por" type="text" inputmode="decimal" value="${esc(paraCampo(p.preco_por))}" placeholder="24.990,00"></div>
          <div class="campo"><label for="parcelado">Parcelado (12x)</label>
            <input id="parcelado" type="text" inputmode="decimal" value="${esc(paraCampo(p.parcelado))}" placeholder="2.499,00"></div>
        </div>

        <div class="secao">Ficha</div>
        <div class="dupla">
          <div class="campo"><label for="medida">Medida</label>
            <input id="medida" type="text" value="${esc(p.medida)}" placeholder="2,70 x 1,20 m"></div>
          <div class="campo"><label for="material">Material</label>
            <input id="material" type="text" value="${esc(p.material)}" placeholder="Madeira maciça"></div>
        </div>
        <div class="campo">
          <label for="descricao">Descrição</label>
          <textarea id="descricao" placeholder="Tampo c/ 2,70x1,20m · Acabamento TS Calacata · Cadeiras em madeira maciça com trava na estrutura">${esc(p.descricao)}</textarea>
        </div>

        <div class="secao">Mídia</div>
        <div class="campo">
          <label>Imagem</label>
          <div class="midia">
            <div class="midia-previa" id="previa-imagem">
              ${p.imagemUrl ? `<img src="${esc(p.imagemUrl)}" alt="">` : ICO.foto}
            </div>
            <div class="midia-botoes">
              <button type="button" class="bt vazio" id="bt-imagem">${ICO.foto} ${p.imagem ? 'Trocar imagem' : 'Escolher imagem'}</button>
              ${p.imagem ? '<button type="button" class="bt perigo" id="bt-tira-imagem">Remover imagem</button>' : ''}
            </div>
          </div>
          <input type="file" id="arq-imagem" accept="image/*" class="oculto">
        </div>
        <div class="campo">
          <label>Vídeo ou GIF</label>
          <div class="midia">
            <div class="midia-previa" id="previa-video">
              ${p.videoUrl
                ? (String(p.video).endsWith('.gif') ? `<img src="${esc(p.videoUrl)}" alt="">` : `<video src="${esc(p.videoUrl)}" muted playsinline></video>`)
                : ICO.video}
            </div>
            <div class="midia-botoes">
              <button type="button" class="bt vazio" id="bt-video">${ICO.video} ${p.video ? 'Trocar vídeo' : 'Escolher vídeo'}</button>
              ${p.video ? '<button type="button" class="bt perigo" id="bt-tira-video">Remover vídeo</button>' : ''}
            </div>
          </div>
          <input type="file" id="arq-video" accept="video/*,image/gif" class="oculto">
        </div>

        <div class="secao">Publicação</div>
        <label class="chave">
          <input type="checkbox" id="ativo" ${p.ativo ? 'checked' : ''}>
          <span>Ativo no site<em>Produtos desativados somem da landing page</em></span>
        </label>

        <div class="secao">Prévia da arte</div>
        <canvas class="previa-arte" id="previa-arte" width="1080" height="1350"></canvas>
        <div class="dica" style="margin-top:8px">Formato 1080x1350. Atualiza conforme você edita.</div>

      </form></div></div>
      <div class="painel-base">
        <button class="bt vazio" id="bt-cancela">Cancelar</button>
        <button class="bt destaque" id="bt-salva">Salvar</button>
      </div>
    </div>`);

  document.body.appendChild(painel);
  const form = painel.querySelector('#form');
  const fechar = () => painel.remove();
  painel.querySelector('#bt-volta').onclick = fechar;
  painel.querySelector('#bt-cancela').onclick = fechar;

  const coletar = () => ({
    nome: form.nome.value.trim(),
    categoria: form.categoria.value,
    estado: form.estado.value,
    preco_de: paraNumero(form.preco_de.value),
    preco_por: paraNumero(form.preco_por.value),
    parcelado: paraNumero(form.parcelado.value),
    medida: form.medida.value.trim(),
    material: form.material.value.trim(),
    descricao: form.descricao.value.trim(),
    imagem: p.imagem, video: p.video,
    ativo: form.ativo.checked,
  });

  /* previa ao vivo */
  const tela = painel.querySelector('#previa-arte');
  let pendente;
  const atualizarPrevia = () => {
    clearTimeout(pendente);
    pendente = setTimeout(async () => {
      try {
        await renderDigital({ ...coletar(), imagemUrl: p.imagemUrl }, '1350', { canvas: tela });
      } catch (_) { /* previa e opcional */ }
    }, 260);
  };
  form.addEventListener('input', atualizarPrevia);
  atualizarPrevia();

  /* formatacao de moeda ao sair do campo */
  ['preco_de', 'preco_por', 'parcelado'].forEach(k => {
    form[k].addEventListener('blur', () => {
      const n = paraNumero(form[k].value);
      form[k].value = n === null ? '' : moeda(n);
      atualizarPrevia();
    });
  });

  /* midia */
  const ligarMidia = (campo, arq, previa, tirar) => {
    painel.querySelector('#bt-' + campo).onclick = () => painel.querySelector('#arq-' + campo).click();
    painel.querySelector('#arq-' + campo).onchange = async (ev) => {
      const arquivo = ev.target.files[0];
      if (!arquivo) return;
      const alvo = painel.querySelector('#previa-' + campo);
      alvo.innerHTML = `<span class="girando" style="color:var(--amarelo);display:block;width:22px;height:22px">${ICO.roda}</span>`;
      try {
        const chave = await enviarMidia(arquivo);
        p[arq] = chave;
        p[campo === 'imagem' ? 'imagemUrl' : 'videoUrl'] = '/m/' + chave;
        alvo.innerHTML = campo === 'imagem' || chave.endsWith('.gif')
          ? `<img src="/m/${chave}" alt="">`
          : `<video src="/m/${chave}" muted playsinline></video>`;
        atualizarPrevia();
        avisar('Arquivo enviado');
      } catch (e) {
        alvo.innerHTML = campo === 'imagem' ? ICO.foto : ICO.video;
        avisar(e.message, true);
      }
      ev.target.value = '';
    };
    painel.querySelector(tirar)?.addEventListener('click', () => {
      p[arq] = null;
      p[campo === 'imagem' ? 'imagemUrl' : 'videoUrl'] = null;
      painel.querySelector('#previa-' + campo).innerHTML = campo === 'imagem' ? ICO.foto : ICO.video;
      painel.querySelector(tirar).remove();
      atualizarPrevia();
    });
  };
  ligarMidia('imagem', 'imagem', 'previa-imagem', '#bt-tira-imagem');
  ligarMidia('video', 'video', 'previa-video', '#bt-tira-video');

  /* salvar */
  painel.querySelector('#bt-salva').onclick = async () => {
    const dados = coletar();
    if (!dados.nome) { avisar('O nome do produto é obrigatório', true); form.nome.focus(); return; }
    const bt = painel.querySelector('#bt-salva');
    bt.disabled = true; bt.textContent = 'Salvando…';
    try {
      const r = novo
        ? await api('produtos', { metodo: 'POST', corpo: dados })
        : await api('produtos/' + id, { metodo: 'PUT', corpo: dados });
      if (novo) estado.produtos.push(r.produto);
      else estado.produtos = estado.produtos.map(x => (x.id === id ? r.produto : x));
      fechar(); desenhar();
      avisar(novo ? 'Produto adicionado' : 'Alterações salvas');
    } catch (e) {
      avisar(e.message, true);
      bt.disabled = false; bt.textContent = 'Salvar';
    }
  };

  /* apagar */
  painel.querySelector('#bt-apagar')?.addEventListener('click', () => {
    confirmar({
      titulo: 'Apagar produto',
      texto: `“${semBarra(p.nome) || 'Este produto'}” será apagado de vez, junto com a imagem e o vídeo. Não dá para desfazer.`,
      acao: 'Apagar',
      perigo: true,
      aoConfirmar: async () => {
        await api('produtos/' + id, { metodo: 'DELETE' });
        estado.produtos = estado.produtos.filter(x => x.id !== id);
        fechar(); desenhar();
        avisar('Produto apagado');
      },
    });
  });
}

/* ---------------- confirmacao ---------------- */

function confirmar ({ titulo, texto, acao, perigo, aoConfirmar }) {
  const fundo = h(`<div class="fundo"><div class="modal">
      <div class="modal-topo"><h3>${esc(titulo)}</h3></div>
      <div class="modal-corpo"><p style="margin:0;color:var(--fraco);line-height:1.6">${esc(texto)}</p></div>
      <div class="modal-base">
        <button class="bt vazio" id="nao">Cancelar</button>
        <button class="bt ${perigo ? 'perigo' : 'destaque'}" id="sim">${esc(acao)}</button>
      </div></div></div>`);
  document.body.appendChild(fundo);
  const fechar = () => fundo.remove();
  fundo.querySelector('#nao').onclick = fechar;
  fundo.onclick = (e) => { if (e.target === fundo) fechar(); };
  fundo.querySelector('#sim').onclick = async () => {
    const bt = fundo.querySelector('#sim');
    bt.disabled = true; bt.textContent = 'Aguarde…';
    try { await aoConfirmar(); fechar(); }
    catch (e) { avisar(e.message, true); bt.disabled = false; bt.textContent = acao; }
  };
}

/* ---------------- baixar arquivos ---------------- */

const FORMATOS = [
  { id: '1350', nome: '1080 x 1350', desc: 'Vertical para o feed · JPEG' },
  { id: '1920', nome: '1080 x 1920', desc: 'Vertical para stories · JPEG' },
  { id: 'a4',   nome: 'A4 retrato',  desc: 'Todos os produtos num PDF · uma página cada' },
];

const limpar = (s) => String(s || 'produto').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'produto';

function modalBaixar () {
  if (!estado.produtos.length) { avisar('Cadastre um produto primeiro', true); return; }
  const escolha = { formatos: new Set(['1350']), produtos: new Set() };
  const fundo = h('<div class="fundo"><div class="modal"></div></div>');
  const modal = fundo.querySelector('.modal');
  document.body.appendChild(fundo);
  const fechar = () => fundo.remove();
  fundo.onclick = (e) => { if (e.target === fundo) fechar(); };

  const linha = (marcado, principal, secundario, extra = '') => `
    <div class="opcao" data-marcado="${marcado ? 1 : 0}">
      <span class="caixa">${ICO.certo}</span>
      ${extra}
      <span class="txt"><b>${principal}</b><em>${secundario}</em></span>
    </div>`;

  const passo1 = () => {
    modal.replaceChildren(h(`<div style="display:contents">
      <div class="modal-topo"><h3>Quais formatos?</h3>
        <button class="bt so-icone vazio" id="fecha">${ICO.x}</button></div>
      <div class="modal-corpo">${FORMATOS.map(f =>
        `<div data-fmt="${f.id}">${linha(escolha.formatos.has(f.id), esc(f.nome), esc(f.desc))}</div>`).join('')}</div>
      <div class="modal-base"><button class="bt destaque" id="avanca">Escolher produtos</button></div>
    </div>`));
    modal.querySelector('#fecha').onclick = fechar;
    modal.querySelectorAll('[data-fmt]').forEach(el => {
      el.onclick = () => {
        const f = el.dataset.fmt;
        escolha.formatos.has(f) ? escolha.formatos.delete(f) : escolha.formatos.add(f);
        el.querySelector('.opcao').dataset.marcado = escolha.formatos.has(f) ? 1 : 0;
      };
    });
    modal.querySelector('#avanca').onclick = () => {
      if (!escolha.formatos.size) { avisar('Escolha pelo menos um formato', true); return; }
      passo2();
    };
  };

  const passo2 = () => {
    const lista = estado.produtos;
    modal.replaceChildren(h(`<div style="display:contents">
      <div class="modal-topo">
        <button class="bt so-icone vazio" id="volta">${ICO.volta}</button>
        <h3>Quais produtos?</h3>
        <button class="bt vazio" id="todos" style="height:34px;font-size:13px">Todos</button>
      </div>
      <div class="modal-corpo">${lista.map(p => `<div data-pid="${esc(p.id)}">${linha(
        escolha.produtos.has(p.id), esc(semBarra(p.nome)),
        [p.categoria, p.estado].filter(Boolean).join(' · ') || 'sem categoria',
        p.imagemUrl ? `<img class="mini" src="${esc(p.imagemUrl)}" alt="">` : '')}</div>`).join('')}</div>
      <div class="modal-base"><button class="bt destaque" id="gera">Gerar e baixar</button></div>
      <div style="padding:0 18px 14px" class="oculto" id="andamento">
        <div style="font-size:13px;color:var(--fraco)" id="andamento-txt"></div>
        <div class="progresso"><i id="barra"></i></div>
      </div>
    </div>`));
    modal.querySelector('#volta').onclick = passo1;
    const marcar = (el, pid) => { el.querySelector('.opcao').dataset.marcado = escolha.produtos.has(pid) ? 1 : 0; };
    modal.querySelectorAll('[data-pid]').forEach(el => {
      el.onclick = () => {
        const pid = el.dataset.pid;
        escolha.produtos.has(pid) ? escolha.produtos.delete(pid) : escolha.produtos.add(pid);
        marcar(el, pid);
      };
    });
    modal.querySelector('#todos').onclick = () => {
      const todos = escolha.produtos.size === lista.length;
      escolha.produtos = new Set(todos ? [] : lista.map(p => p.id));
      modal.querySelectorAll('[data-pid]').forEach(el => marcar(el, el.dataset.pid));
    };
    modal.querySelector('#gera').onclick = () => gerar(modal, escolha, fechar);
  };

  passo1();
}

async function gerar (modal, escolha, fechar) {
  const alvos = estado.produtos.filter(p => escolha.produtos.has(p.id));
  if (!alvos.length) { avisar('Escolha pelo menos um produto', true); return; }

  const bt = modal.querySelector('#gera');
  const andamento = modal.querySelector('#andamento');
  const txt = modal.querySelector('#andamento-txt');
  const barra = modal.querySelector('#barra');
  bt.disabled = true; bt.textContent = 'Gerando…';
  andamento.classList.remove('oculto');

  const digitais = [...escolha.formatos].filter(f => f !== 'a4');
  const totalPassos = alvos.length * digitais.length + (escolha.formatos.has('a4') ? alvos.length : 0);
  let feito = 0;
  const avanca = (rotulo) => {
    feito++;
    txt.textContent = `${rotulo} (${feito} de ${totalPassos})`;
    barra.style.width = Math.round(100 * feito / totalPassos) + '%';
  };

  try {
    const arquivos = [];
    for (const fmt of digitais) {
      for (const p of alvos) {
        const cv = await renderDigital(p, fmt);
        const blob = await canvasParaBlob(cv, 0.94);
        arquivos.push({ nome: `${fmt === '1350' ? '1080x1350' : '1080x1920'}/${limpar(semBarra(p.nome))}.jpg`,
                        dados: new Uint8Array(await blob.arrayBuffer()) });
        avanca('Gerando artes');
        await new Promise(r => setTimeout(r)); /* deixa a tela respirar */
      }
    }
    if (escolha.formatos.has('a4')) {
      const pdf = await renderA4(alvos, () => avanca('Montando o PDF A4'));
      arquivos.push({ nome: 'A4/pecas-a4.pdf', dados: new Uint8Array(await pdf.arrayBuffer()) });
    }
    txt.textContent = 'Compactando…';
    const zip = await zipar(arquivos);
    const dia = new Date().toISOString().slice(0, 10);
    baixar(zip, `black-friday-privilege-${dia}.zip`);
    fechar();
    avisar(`${arquivos.length} arquivo(s) no ZIP`);
  } catch (e) {
    avisar(e.message, true);
    bt.disabled = false; bt.textContent = 'Gerar e baixar';
  }
}

/* ---------------- arranque ---------------- */

async function iniciar () {
  try {
    const s = await api('sessao');
    if (!s.ok) { telaEntrada(); return; }
    estado.temR2 = !!s.temR2;
    const [{ produtos }, opcoes] = await Promise.all([api('produtos'), api('opcoes').catch(() => null)]);
    estado.produtos = produtos;
    if (opcoes) { estado.categorias = opcoes.categorias; estado.estados = opcoes.estados; }
    desenhar();
  } catch (e) {
    telaEntrada(e.message);
  }
}

iniciar();
