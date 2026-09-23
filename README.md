# Dulce Brujo

Tienda de dulces de cacao (nombres ficticios) para el taller **Cursor × Supabase** (USFQ).

Stack:

```
Storefront Next.js :8000  →  Medusa v2 backend :9000  →  Supabase Postgres
```

Supabase es **solo Postgres**. El storefront habla con Medusa (`@medusajs/js-sdk`), nunca con `supabase-js`, Auth ni RLS. Medusa ya tiene su propio auth, carrito y órdenes; duplicar eso en Supabase rompería el flujo y la rúbrica lo penaliza.

## Región

Ecuador usa **dólar estadounidense**. En Medusa eso es región `Ecuador`, país `ec`, moneda `usd`.

- http://localhost:8000/ec/store → dólares
- http://localhost:8000/dk/store → euros (el seed de Europa sigue vivo)

## Catálogo propio

| Producto | Handle | USD / EUR | Inventario |
| --- | --- | --- | --- |
| Barra Dulzor Eclipse | `barra-eclipse-72` | $6.50 / €6.50 | 20 |
| Nibs Caramelo Relámpago | `nibs-relampago` | $5.00 / €5.00 | 20 |
| Trufas Azúcar Invisible | `trufas-rio-invisible` | $12.00 / €12.00 | 20 |

Envío Standard a Ecuador: **$10 USD**. Pago en checkout: **manual / system** (no Stripe).

## Requisitos

- Node **22** (no 23; este repo usa fnm si está instalado)
- pnpm 10
- Git
- Proyecto **propio** de Supabase

En PowerShell:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 22
node -v   # v22.x
pnpm -v   # 10.x
```

## Conexión a Supabase (tres modos)

| Modo | Host / puerto | ¿Usar? |
| --- | --- | --- |
| Direct | `db.<ref>.supabase.co:5432` | No. Suele ser IPv6 y falla en Wi-Fi. |
| **Session pooler** | `*.pooler.supabase.com:5432` | **Sí.** App + migraciones de Medusa. |
| Transaction pooler | `*.pooler.supabase.com:6543` | No. Rompe las migraciones. |

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Password solo letras y números (guárdala; Supabase no la vuelve a mostrar)
3. **Connect** → **Session pooler** → puerto **5432**
4. Pega la URI en `store/apps/backend/.env` como `DATABASE_URL` y añade `?sslmode=no-verify`

`REDIS_URL` no va en el `.env`: hay que **quitarlo**, no dejarlo vacío.

## Arranque

Copia los ejemplos y rellena secretos reales:

```powershell
copy store\apps\backend\.env.example store\apps\backend\.env
copy store\apps\storefront\.env.example store\apps\storefront\.env.local
```

Desde `store/apps/backend`:

```powershell
pnpm medusa db:migrate
pnpm medusa user -e admin@medusajs.com -p supersecret
pnpm medusa exec ./src/scripts/add-ec-region.ts
pnpm medusa exec ./src/scripts/seed-snacks.ts
pnpm dev
```

En otra terminal, `store/apps/storefront`:

1. Abre http://localhost:9000/app (`admin@medusajs.com` / `supersecret`)
2. Settings → Publishable API Keys → copia `pk_...` a `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` en `.env.local`
3. `pnpm dev`

| Qué | URL |
| --- | --- |
| Admin | http://localhost:9000/app |
| Tienda Ecuador | http://localhost:8000/ec/store |
| Health | http://localhost:9000/health |

Al reiniciar el backend el Admin pide login otra vez: no hay Redis, la sesión vive en memoria.

## Demo en vivo (rúbrica)

1. Table Editor de Supabase: tablas `product`, `region`, `order`
2. Compra **Barra Dulzor Eclipse** (u otro dulce propio) en `/ec`
3. Refresca `order` y señala la fila nueva
4. Relaciónala con Orders del Admin
5. Abre `/dk` y muestra que Europa sigue en euros

## Qué no se usa a propósito

Redis, Stripe, Supabase Auth / RLS / Realtime / Storage, `supabase-js` en el front, deploy (opcional).
