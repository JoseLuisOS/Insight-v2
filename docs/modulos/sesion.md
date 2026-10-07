# 2. Sesión, autenticación y acceso — v1

- **Descripción:** refresca la sesión, limita navegación sin usuario, gestiona login/logout, confirmación, invitaciones y contraseña temporal.
- **Archivo principal:** `src/proxy.ts` → `src/lib/supabase/proxy.ts` (`updateSession`).
- **Archivos relacionados:** `src/app/login/{page,actions}.tsx`; `src/app/auth/{confirm,signout}/route.ts`; `src/app/join/[token]/{page,actions}.tsx`; `src/app/onboarding/{page,actions}.tsx`; `src/app/change-password/{page,actions}.tsx`; `src/app/solicitar-acceso/page.tsx`; `src/lib/auth.ts`; `src/lib/supabase/{server,admin}.ts`.
- **Funciones importantes:** `updateSession`, `getProfileContext`, `login`, `acceptInvite`, `createFirstOrganization`, `changePassword`; manejadores `GET` y `POST` en rutas de autenticación.
- **Padres:** Proxy raíz y router de la aplicación.
- **Hijos:** páginas de login, onboarding, invitación, contraseña, perfil y las rutas protegidas.
- **Hermanos/interacciones:** shell autenticado consume `getProfileContext`; perfil y administración de usuarios realizan cambios mediante Server Actions y Supabase.
- **Estado actual / dependencia sensible:** `src/lib/auth.ts` consulta `profiles` y `tenants`, devuelve roles `admin | editor | viewer` y `can_publish`. Es un contrato de implementación basado en tenant; el objetivo es usuario global + memberships por organización + roles/permisos. Confirmar contratos concretos antes de tocar autorización.
