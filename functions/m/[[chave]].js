/* Entrega das imagens e videos do CMS: /m/<chave> */
export async function onRequestGet (ctx) {
  const { env, request } = ctx;
  const chave = new URL(request.url).pathname.replace(/^\/m\/?/, '');
  if (!chave || chave.includes('/')) return new Response('não encontrado', { status: 404 });

  if (env.MIDIA) {
    const obj = await env.MIDIA.get(chave);
    if (!obj) return new Response('não encontrado', { status: 404 });
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('etag', obj.httpEtag);
    h.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(obj.body, { headers: h });
  }

  if (!env.BD) return new Response('banco não vinculado', { status: 503 });
  const r = await env.BD.prepare('SELECT tipo, dados FROM midia WHERE chave = ?').bind(chave).first();
  if (!r) return new Response('não encontrado', { status: 404 });
  const bin = atob(r.dados);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Response(u8, { headers: {
    'content-type': r.tipo || 'application/octet-stream',
    'cache-control': 'public, max-age=31536000, immutable',
  } });
}
