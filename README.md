# Mis Finanzas (React)

Reescritura del `index.html` original (HTML + JS vanilla en un solo archivo, ~3700 líneas) como un
proyecto Vite + React. Mismo backend de Supabase, mismo diseño visual (colores, tipografía, cards,
responsive), arquitectura nueva.

## Qué cambió respecto a la versión vieja

- **Un componente por sección** (`src/components/...`) en vez de un solo archivo con `innerHTML` armado
  a mano y cientos de `onclick="..."` inline. Ingresos, Gastos Personales y Gastos Easy Move ya no son
  tres copias casi idénticas del mismo código: comparten estilo y utilidades.
- **Estado centralizado** en `src/context/FinanzasContext.jsx` (un solo lugar que carga y actualiza
  ingresos, gastos, ahorros, tarjetas, fijos, etc.) en vez de variables globales sueltas. Esto elimina
  los bugs de renderizado duplicado que tenía la versión vieja (funciones como `renderSaldosCuentas()`
  se llamaban dos veces por accidente).
- **Cuentas configurables de verdad**: antes `cuentas` era un array hardcodeado en el JS
  (`let cuentas=['Efectivo','NU','Klar',...]`). Ahora es una tabla de Supabase (`cuentas`) con su propio
  CRUD desde la UI (botón "⚙️ Gestionar cuentas" en Resumen). Hay que correr la migración SQL de abajo.
- **Regla de reparto (30/10/50) configurable por mes**: se agregaron columnas `pct_gastos`, `pct_fijos`,
  `pct_ahorro` a `objetivos_personal` y un editor en la pestaña Resumen que compara lo gastado/ahorrado
  real contra la meta calculada según esos porcentajes sobre el ingreso del mes.
- La lógica financiera sensible (cálculo de en qué resumen mensual cae cada cuota de tarjeta según el
  día de cierre — `calcularPeriodoGasto`) se portó tal cual desde el archivo viejo, sin reescribirla
  de cero, para no introducir errores de cálculo.

## Setup

```bash
npm install
cp .env.example .env   # ya viene con la URL y anon key que usaba la app vieja
npm run dev
```

`npm run build` genera el sitio estático en `dist/` (lo mismo que Vercel va a correr).

### Importante: correr la migración SQL antes de usar cuentas configurables

Andá al SQL editor de tu proyecto Supabase (el mismo que ya usa la app en producción) y corré
`supabase/migrations/002_cuentas_y_regla_reparto.sql`. Mientras no la corras, la app sigue funcionando
con una lista de cuentas por defecto en memoria (no se rompe, pero no vas a poder crear/borrar cuentas
reales ni guardar los porcentajes de reparto).

### Nota de seguridad

La URL y la anon key de Supabase estaban escritas en texto plano dentro del `index.html` viejo (y
por lo tanto committeadas al repo). Ahora viven en `.env` (que está en `.gitignore`). Esto **no es
crítico** — la anon key de Supabase está pensada para ser pública siempre que tengas Row Level
Security (RLS) activado en las tablas — pero es más prolijo no tenerla commiteada, y las políticas RLS
para la tabla nueva `cuentas` ya vienen en la migración.

## Estructura

```
src/
  components/       un componente por sección (Resumen, Ingresos, Tarjetas, GastosFijos, SAT, etc.)
  context/          AuthContext (sesión de Supabase) y FinanzasContext (todo el estado de datos)
  lib/              cliente de Supabase, setup de Chart.js
  utils/            formato de números, constantes (categorías, cuentas por defecto), cálculo de cuotas
supabase/migrations/  SQL para tablas/columnas nuevas
```

## Deploy

Mismo flujo que ya tenías: conectar este repo a Vercel, build command `npm run build`, output
`dist/`. Agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno en Vercel
(Project Settings → Environment Variables) con los mismos valores de `.env.example`.

## TODO / lo que quedó pendiente

- **Categorías configurables**: las categorías de gastos personales/Easy Move siguen siendo listas
  fijas en `src/utils/constants.js` (`CATS_GP`, `CATS_GE`), igual que en la versión vieja. Quedó afuera
  de esta primera vuelta porque las cuentas configurables eran la prioridad. El selector de categoría
  ya está aislado en su propio componente para que sea fácil migrarlo a una tabla Supabase más adelante.
- Antes de dar de baja el `index.html` viejo en Vercel, probar esta versión con datos reales (login con
  tu usuario, revisar que ingresos/gastos/tarjetas/fijos del mes actual coincidan con lo que mostraba
  la app vieja) — esta reescritura se hizo leyendo el código viejo, no corriendo consultas contra tu
  base de datos real, así que vale la pena una verificación manual antes de reemplazarla en producción.
