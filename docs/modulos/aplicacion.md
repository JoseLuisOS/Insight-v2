# 1. Aplicación y rutas — v1

- **Descripción:** composición raíz, metadatos y páginas por URL. Usa App Router; los grupos entre paréntesis organizan archivos sin formar parte de la URL.
- **Archivo principal:** `src/app/layout.tsx` y `src/app/page.tsx`.
- **Archivos relacionados:** `src/app/globals.css`; `src/app/(app)/layout.tsx`; `src/app/(app)/loading.tsx`; archivos `page.tsx`, `actions.ts` y `route.ts` bajo `src/app/`.
- **Funciones importantes:** `RootLayout`, `Home`, `AppLayout` y las funciones exportadas por cada `actions.ts`.
- **Padres:** raíz del árbol de rutas de Next.js.
- **Hijos:** rutas públicas/de acceso, rutas del panel `(app)`, rutas públicas de publicación `/p/[token]` y manejadores `/auth/*`.
- **Hermanos/interacciones:** Proxy de sesión (aplica antes de atender las rutas); módulos de acceso y shell.
