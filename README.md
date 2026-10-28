# index-editor

Site estatico gerado pela Prancheta de Landing. Sem build e sem dependencia:
CSS e fontes vao dentro do HTML; as imagens ficam em `assets/img` em WebP.

Imagens exportadas: 20

## Paginas

- `index.html` - index-editor

## Publicar no Cloudflare Pages

1. Crie um repositorio no GitHub e suba estes arquivos na raiz.
2. No Cloudflare: Workers & Pages > Create > Pages > Connect to Git.
3. Escolha o repositorio.
4. Build settings: framework preset `None`, build command vazio, output directory `/`.
5. Salve e publique. Cada push na branch principal republica sozinho.

## Dominio proprio

No projeto do Pages, aba Custom domains > Set up a domain.
