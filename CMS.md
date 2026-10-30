# CMS da Black Friday — Privilege Móveis

Cadastro de produtos que alimenta a landing page e gera as três artes da campanha.
Roda no mesmo repositório + Cloudflare Pages, sem build e sem dependência externa.

- Painel: `https://privilegemoveis.pages.dev/admin/`
- Produtos ativos em JSON: `/api/produtos.json`

---

## 1. Ligar o banco ao projeto (obrigatório)

O banco **privilege-bf** já está criado na sua conta Cloudflare, com as tabelas prontas.
Falta dizer ao site que ele existe.

1. Abra `https://dash.cloudflare.com` e entre na sua conta.
2. No menu da **esquerda**, clique em **Compute (Workers)** → **Workers & Pages**.
   (atalho direto: `https://dash.cloudflare.com/?to=/:account/workers-and-pages`)
3. Na lista, clique no projeto **privilegemoveis**.
4. Nas abas do **topo da página**, clique em **Settings**.
5. Role até o bloco **Bindings** e clique no botão **Add** (lado direito do bloco).
6. Na lista que abre, escolha **D1 database**.
7. Em **Variable name** digite exatamente: `BD`
8. Em **D1 database**, escolha **privilege-bf** no menu suspenso.
9. Clique em **Add binding** / **Save**.

## 2. Definir a senha de acesso (obrigatório)

Mesma tela de **Settings** do projeto:

1. Role até o bloco **Variables and Secrets** (em algumas contas aparece como
   **Environment variables**) e clique em **Add**.
2. Em **Variable name** digite: `CMS_SENHA`
3. Em **Value** digite a senha que você e o gerente vão usar.
4. No seletor de **Type**, escolha **Secret** (assim ela fica oculta no painel).
5. Clique em **Save**.

## 3. Republicar

Os vínculos só passam a valer no próximo deploy.

1. Ainda no projeto, aba **Deployments** (topo da página).
2. No deploy mais recente da lista, clique nos **três pontinhos** à direita → **Retry deployment**.

Pronto. Abra `/admin/`, entre com a senha e cadastre o primeiro produto.

## 4. R2 para as mídias (opcional, recomendado)

Sem R2 o sistema funciona: as imagens ficam no próprio banco, com limite de **600 KB por
arquivo** (o painel já reduz as fotos antes de enviar, então fotos normais passam).
Vídeos maiores não sobem. Com R2 ligado some o limite e as mídias ficam mais rápidas.

1. No menu da **esquerda**, clique em **R2 Object Storage**.
2. Na primeira vez a Cloudflare pede para aceitar os termos e confirmar o plano
   (o nível gratuito vai até 10 GB) — clique em **Purchase R2 Plan** / **Continue**.
3. Clique em **Create bucket**, nomeie `privilege-bf-midia` e confirme em **Create bucket**.
4. Volte em **Workers & Pages** → **privilegemoveis** → **Settings** → bloco **Bindings** → **Add**.
5. Escolha **R2 bucket**.
6. Em **Variable name** digite exatamente: `MIDIA`
7. Em **R2 bucket**, escolha `privilege-bf-midia`.
8. Salve e republique como no passo 3.

> As imagens enviadas antes de ligar o R2 continuam funcionando — ficam no banco.

---

## Como se usa

**Adicionar produto** abre o formulário com todos os campos. A prévia no rodapé do
formulário mostra a arte 1080x1350 se montando enquanto você digita.

No campo **Nome**, use `|` para separar as duas linhas da arte:
`Conjunto com | 10 Cadeiras` vira

```
Conjunto com      (regular)
10 Cadeiras       (negrito)
```

Na lista, o `|` não aparece.

**Baixar arquivos** abre em dois passos: primeiro os formatos (pode marcar mais de um),
depois os produtos. O ZIP sai assim:

```
1080x1350/nome-do-produto.jpg     JPEG qualidade alta
1080x1920/nome-do-produto.jpg     JPEG qualidade alta
A4/pecas-a4.pdf                   um PDF, uma página por produto
```

**Apagar** fica dentro da página do produto, no ícone de lixeira do canto superior
direito, e pede confirmação.

## Categorias e estados

O botão de etiqueta no cabeçalho do painel (ao lado da troca de visualização e do sair)
abre **Categorias e estados**. Cada item tem dois campos:

- **Nome exibido** — o que aparece no site e nas etiquetas. Pode mudar à vontade.
- **Código** — o que o repetidor do editor usa (`sala-de-jantar`). Sai automático do nome
  quando você cria o item. Mudar depois exige acertar o editor.

O produto guarda o **código**, não o nome. Por isso renomear "Sala de Jantar" para
"Jantar" não quebra nada, e se você mudar o código os produtos acompanham sozinhos.
Remover um item em uso é bloqueado: a mensagem diz em quantos produtos ele está.

## O que alimenta o site

`assets/bf/vitrine.js` já está incluído no `index.html`. Ele lê `/api/produtos.json`,
pega o primeiro card do carrossel como modelo e o repete uma vez por produto ativo,
preenchendo nome, foto, preços, estado e o selo de desconto (calculado do De/Por).

### Contrato do repetidor (o que o editor precisa emitir)

```html
<div data-bf="produtos"
     data-bf-categoria="sala-de-jantar"
     data-bf-estado="pronta-entrega"
     data-bf-limite="12">
  <!-- o primeiro filho é o card modelo; os demais são descartados -->
</div>
```

Todos os atributos de filtro são opcionais e podem se combinar. Os valores são os
**códigos** das taxonomias (o nome exibido também é aceito, mas prefira o código).
Sem nenhum elemento com `data-bf="produtos"` na página, o script usa `#crs-todos`
e mostra todos os ativos.

Para o editor montar um seletor em vez de campo livre, os códigos estão em
`/api/taxonomias.json` (público, sem senha):

```json
{ "categorias": [{ "id": "...", "codigo": "sala-de-jantar", "nome": "Sala de Jantar", "ordem": 2 }],
  "estados":    [{ "id": "...", "codigo": "pronta-entrega", "nome": "Pronta Entrega", "ordem": 1 }] }
```

O botão de contato do card **não** é mexido por padrão: continua fazendo o que o editor
definiu. Só vira link direto de WhatsApp se o container declarar
`data-bf-whatsapp="5515999999999"`.

> **Atenção ao reexportar pela Prancheta de Landing:** o export sobrescreve o
> `index.html` e leva junto a linha abaixo. Reponha-a antes de `</body>`:
>
> ```html
> <script type="module" src="/assets/bf/vitrine.js"></script>
> ```

## Onde fica cada coisa

```
admin/index.html            painel (interface e estilos)
admin/app.js                painel (lógica)
assets/bf/arte.js           motor das três artes, com as medidas dos modelos
assets/bf/pdf.js            gerador de PDF próprio (fontes Montserrat embutidas)
assets/bf/zip.js            compactador ZIP
assets/bf/vitrine.js        liga os cards da landing page ao CMS
assets/bf/fonts/            Alexandria, Bricolage Grotesque Condensed e Montserrat
assets/bf/arte/             molduras das artes digitais e faixas da A4
functions/api/[[rota]].js   API: sessão, produtos, mídia, produtos.json
functions/m/[[chave]].js    entrega de imagens e vídeos
```

## As artes

Reconstruídas a partir dos modelos que você mandou, conferidas pixel a pixel:

| Peça | Fontes | Observação |
|---|---|---|
| 1080x1350 e 1080x1920 | Alexandria (nome) e Bricolage Grotesque Condensed (descrição e preços) | A moldura, o selo e o rodapé legal vêm do PNG original; só o texto é desenhado |
| A4 em PDF | Montserrat Regular / SemiBold / Bold / ExtraBold | Vetorial: o texto sai nítido em qualquer impressão |

A data "30/11/2026" e o texto legal são fixos: estão na moldura PNG (digital) e em
`LEGAL`, no topo do bloco A4 de `assets/bf/arte.js`.
