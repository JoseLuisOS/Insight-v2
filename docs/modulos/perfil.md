# 11. Perfil — v2

- **Descripción:** edición de nombre, avatar y contraseña de la cuenta autenticada.
- **Archivo principal:** `src/app/(app)/profile/page.tsx`.
- **Archivos relacionados:** `src/app/(app)/profile/{actions.ts,name-avatar-form.tsx,password-form.tsx}`; `src/components/avatar-cropper.tsx`; `src/lib/supabase/{server,admin}.ts`; `src/lib/nav.ts`.
- **Funciones/componentes importantes:** acciones de actualización de perfil y contraseña; `NameAvatarForm`, `PasswordForm`, `AvatarCropper`.
- **Padres:** shell autenticado y sesión del usuario.
- **Hijos:** formularios de nombre/avatar y contraseña.
- **Hermanos/interacciones:** Equipo administra membresías/usuarios; Perfil modifica datos de la propia cuenta. La primera versión `../intersel-insight` no contiene esta ruta.
- **Estado de versión:** v2, según indicación del usuario. Revisar sus contratos de persistencia/autenticación frente a organizaciones antes de extenderlos.
