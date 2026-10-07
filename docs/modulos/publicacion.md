# 9. Publicación y embeds — v1

- **Descripción:** configuración de publicación, vista externa por token, control opcional por contraseña, contadores y tarjeta social.
- **Archivo principal:** `src/app/p/[token]/page.tsx`.
- **Archivos relacionados:** `src/app/p/[token]/{actions.ts,opengraph-image.tsx}`; `src/app/(app)/charts/publish-actions.ts`; `src/app/(app)/dashboards/publish-actions.ts`; `src/components/{public-render,password-gate,publish-dialog}.tsx`; `src/lib/{dashboards,datasets,maps}.ts`.
- **Funciones/componentes importantes:** `generateMetadata`, `PublicPage`, acciones `publishChart`, `signEmbed`, `publishDashboard` y `getDashboardPublication`; `PublicRender`, `PasswordGate`, `PublishDialog`.
- **Padres:** publicación se inicia desde los módulos Gráficas o Dashboards; vista pública depende del router raíz y el Proxy.
- **Hijos:** render público, gate de contraseña y generación Open Graph.
- **Hermanos/interacciones:** comparte consultas de datos y renderizado con dashboards/gráficas. La ruta `/p/` es explícitamente pública según `updateSession`.
