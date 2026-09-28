# Continuar en otra computadora

Copia `DulceBrujo-para-continuar.zip` (está en el Escritorio) y descomprímelo.

## Qué ya va dentro

- Código de Dulce Brujo (Medusa + storefront)
- Presentación: `presentacion/index.html`
- Historial git (3 commits)
- Tus `.env` locales, para no volver a pegar la URI de Supabase

`node_modules` no va: se reinstala.

## Arranque

Necesitas Node 22 y pnpm 10.

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 22
cd store
pnpm install
```

Terminal 1, `store/apps/backend`:

```powershell
pnpm dev
```

Terminal 2, `store/apps/storefront`:

```powershell
pnpm dev
```

- Tienda: http://localhost:8000/ec
- Carrito: http://localhost:8000/ec/cart
- Medusa: http://localhost:9000/app
- Inicio de sesión de Medusa (ejemplo ya creado): `admin@test.com` / `supersecret`
- Presentación: abre `presentacion/index.html` (flechas para pasar, F pantalla completa)

## Después: GitHub

En esa computadora, con sesión de GitHub:

```powershell
gh auth login
gh repo create dulce-brujo --public --source=. --remote=origin --push
```

No subas el zip a GitHub: lleva las contraseñas del `.env`.
