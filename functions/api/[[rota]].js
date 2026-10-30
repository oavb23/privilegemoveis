/* API do CMS da Black Friday — Cloudflare Pages Functions + D1 (+ R2 opcional)
   Vinculos esperados no projeto do Pages:
     D1   -> BD      (banco "privilege-bf")
     R2   -> MIDIA   (opcional; sem ele as imagens ficam no proprio D1)
   Variavel de ambiente:
     CMS_SENHA  -> senha unica de acesso ao painel */

const CATEGORIAS = ['Sala de Estar', 'Sala de Jantar', 'Outros'];
const ESTADOS    = ['Pronta Entrega', 'Sob Encomenda', 'Última Unidade'];
const LIMITE_D1  = 600 * 1024;
const VALIDADE   = 60 * 60 * 24 * 30; /* 30 dias */

const json = (dados, status = 200, extra = {}) => new Response(JSON.stringify(dados), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
});
const erro = (msg, status = 400) => json({ erro: msg }, status);

/* ---------- sessao ---------- */

const texto = new TextEncoder();

async function chave (senha) {
  const base = await crypto.subtle.digest('SHA-256', texto.encode('privilege-bf|' + senha));
  return crypto.subtle.importKey('raw', base, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function assinar (senha, expira) {
  const k = await chave(senha);
  const sig = await crypto.subtle.sign('HMAC', k, texto.encode(String(expira)));
  return `${expira}.${b64url(sig)}`;
}

async function valido (senha, token) {
  if (!token) return false;
  const [expira, sig] = String(token).split('.');
  if (!expira || !sig) return false;
  if (Number(expira) < Math.floor(Date.now() / 1000)) return false;
  const esperado = await assinar(senha, expira);
  return esperado === token;
}

function lerCookie (req, nome) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function autenticado (ctx) {
  const senha = ctx.env.CMS_SENHA;
  if (!senha) return false;
  return valido(senha, lerCookie(ctx.request, 'bf_sessao'));
}

/* ---------- utilidades ---------- */

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const agora = () => new Date().toISOString();

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
};
const txt = (v, max = 400) => String(v ?? '').slice(0, max);

function normalizar (c) {
  return {
    nome: txt(c.nome, 180),
    categoria: txt(c.categoria, 60),
    estado: txt(c.estado, 60),
    preco_de: num(c.preco_de),
    preco_por: num(c.preco_por),
    parcelado: num(c.parcelado),
    medida: txt(c.medida, 120),
    material: txt(c.material, 120),
    descricao: txt(c.descricao, 2000),
    imagem: c.imagem ? txt(c.imagem, 200) : null,
    video: c.video ? txt(c.video, 200) : null,
    ativo: c.ativo === false || c.ativo === 0 || c.ativo === '0' ? 0 : 1,
    ordem: Number(c.ordem) || 0,
  };
}

const COLUNAS = ['nome', 'categoria', 'estado', 'preco_de', 'preco_por', 'parcelado',
  'medida', 'material', 'descricao', 'imagem', 'video', 'ativo', 'ordem'];

const paraFora = (r) => ({ ...r, ativo: !!r.ativo,
  imagemUrl: r.imagem ? '/m/' + r.imagem : null,
  videoUrl: r.video ? '/m/' + r.video : null });

/* ---------- midia ---------- */

async function guardarMidia (env, bytes, tipo) {
  const ext = (tipo.split('/')[1] || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 5);
  const chaveArq = `${id()}.${ext}`;
  if (env.MIDIA) {
    await env.MIDIA.put(chaveArq, bytes, { httpMetadata: { contentType: tipo } });
    return chaveArq;
  }
  if (bytes.length > LIMITE_D1) {
    throw new Error(`arquivo de ${Math.round(bytes.length / 1024)} KB é grande demais sem o R2 ligado (limite ${Math.round(LIMITE_D1 / 1024)} KB)`);
  }
  let bin = '';
  const u8 = new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  await env.BD.prepare('INSERT INTO midia (chave, tipo, bytes, dados, criado_em) VALUES (?,?,?,?,?)')
    .bind(chaveArq, tipo, u8.length, btoa(bin), agora()).run();
  return chaveArq;
}

async function apagarMidia (env, chaveArq) {
  if (!chaveArq) return;
  try {
    if (env.MIDIA) await env.MIDIA.delete(chaveArq);
    else await env.BD.prepare('DELETE FROM midia WHERE chave = ?').bind(chaveArq).run();
  } catch (_) { /* midia ausente nao impede a operacao */ }
}

/* ---------- rotas ---------- */

export async function onRequest (ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const partes = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const rota = partes[0] || '';
  const metodo = request.method.toUpperCase();

  if (!env.BD) return erro('o banco D1 ainda não está vinculado a este projeto (vínculo "BD")', 503);

  try {
    /* ---- publico: usado pela landing page ---- */
    if (rota === 'produtos.json' && metodo === 'GET') {
      const { results } = await env.BD.prepare(
        'SELECT * FROM produtos WHERE ativo = 1 ORDER BY ordem, criado_em').all();
      return json({ produtos: results.map(paraFora) }, 200,
        { 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*' });
    }

    if (rota === 'opcoes' && metodo === 'GET') return json({ categorias: CATEGORIAS, estados: ESTADOS });

    /* ---- sessao ---- */
    if (rota === 'entrar' && metodo === 'POST') {
      if (!env.CMS_SENHA) return erro('defina a variável CMS_SENHA nas configurações do projeto', 503);
      const corpo = await request.json().catch(() => ({}));
      if (String(corpo.senha || '') !== env.CMS_SENHA) return erro('senha incorreta', 401);
      const token = await assinar(env.CMS_SENHA, Math.floor(Date.now() / 1000) + VALIDADE);
      return json({ ok: true }, 200, {
        'set-cookie': `bf_sessao=${encodeURIComponent(token)}; Path=/; Max-Age=${VALIDADE}; HttpOnly; Secure; SameSite=Lax`,
      });
    }
    if (rota === 'sair' && metodo === 'POST') {
      return json({ ok: true }, 200, { 'set-cookie': 'bf_sessao=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' });
    }
    if (rota === 'sessao' && metodo === 'GET') {
      return json({ ok: await autenticado(ctx), temR2: !!env.MIDIA });
    }

    /* ---- daqui para baixo exige sessao ---- */
    if (!(await autenticado(ctx))) return erro('faça login para continuar', 401);

    if (rota === 'produtos') {
      const alvo = partes[1];
      if (metodo === 'GET' && !alvo) {
        const { results } = await env.BD.prepare('SELECT * FROM produtos ORDER BY ordem, criado_em').all();
        return json({ produtos: results.map(paraFora) });
      }
      if (metodo === 'POST' && !alvo) {
        const c = normalizar(await request.json());
        if (!c.nome.trim()) return erro('o nome do produto é obrigatório');
        const novo = id(), t = agora();
        await env.BD.prepare(
          `INSERT INTO produtos (id, ${COLUNAS.join(', ')}, criado_em, atualizado_em)
           VALUES (?, ${COLUNAS.map(() => '?').join(', ')}, ?, ?)`)
          .bind(novo, ...COLUNAS.map(k => c[k]), t, t).run();
        const r = await env.BD.prepare('SELECT * FROM produtos WHERE id = ?').bind(novo).first();
        return json({ produto: paraFora(r) }, 201);
      }
      if (metodo === 'PUT' && alvo) {
        const antigo = await env.BD.prepare('SELECT * FROM produtos WHERE id = ?').bind(alvo).first();
        if (!antigo) return erro('produto não encontrado', 404);
        const c = normalizar(await request.json());
        if (!c.nome.trim()) return erro('o nome do produto é obrigatório');
        await env.BD.prepare(
          `UPDATE produtos SET ${COLUNAS.map(k => k + ' = ?').join(', ')}, atualizado_em = ? WHERE id = ?`)
          .bind(...COLUNAS.map(k => c[k]), agora(), alvo).run();
        if (antigo.imagem && antigo.imagem !== c.imagem) await apagarMidia(env, antigo.imagem);
        if (antigo.video && antigo.video !== c.video) await apagarMidia(env, antigo.video);
        const r = await env.BD.prepare('SELECT * FROM produtos WHERE id = ?').bind(alvo).first();
        return json({ produto: paraFora(r) });
      }
      if (metodo === 'DELETE' && alvo) {
        const antigo = await env.BD.prepare('SELECT * FROM produtos WHERE id = ?').bind(alvo).first();
        if (!antigo) return erro('produto não encontrado', 404);
        await env.BD.prepare('DELETE FROM produtos WHERE id = ?').bind(alvo).run();
        await apagarMidia(env, antigo.imagem);
        await apagarMidia(env, antigo.video);
        return json({ ok: true });
      }
    }

    if (rota === 'midia' && metodo === 'POST') {
      const tipo = request.headers.get('x-tipo') || 'application/octet-stream';
      if (!/^(image|video)\//.test(tipo)) return erro('tipo de arquivo não aceito');
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (!bytes.length) return erro('arquivo vazio');
      const chaveArq = await guardarMidia(env, bytes, tipo);
      return json({ chave: chaveArq, url: '/m/' + chaveArq }, 201);
    }

    return erro('rota desconhecida: ' + url.pathname, 404);
  } catch (e) {
    return erro(e.message || 'erro inesperado', 500);
  }
}
