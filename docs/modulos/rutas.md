# Rutas identificadas

El grupo `(app)` no forma parte de las URLs públicas.

| URL | Archivo de entrada | Módulo | Versión |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Entrada/redirección | v1 |
| `/login` | `src/app/login/page.tsx` | Acceso | v1 |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | Confirmación | v1 |
| `/auth/signout` | `src/app/auth/signout/route.ts` | Sesión | v1 |
| `/onboarding` | `src/app/onboarding/page.tsx` | Organización inicial | v1 |
| `/join/[token]` | `src/app/join/[token]/page.tsx` | Invitaciones | v1 |
| `/change-password` | `src/app/change-password/page.tsx` | Seguridad de cuenta | v1 |
| `/solicitar-acceso` | `src/app/solicitar-acceso/page.tsx` | Solicitud de acceso | v1 |
| `/p/[token]` | `src/app/p/[token]/page.tsx` | Publicación pública | v1 |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Inicio del panel | v1 |
| `/insight/modules` | `src/app/(app)/insight/modules/page.tsx` | Catálogo de grupos y módulos; solo sysadmin | v2 |
| `/insight/organizations` | `src/app/(app)/insight/organizations/page.tsx` | Organizaciones; solo sysadmin | v2 |
| `/roles` | `src/app/(app)/roles/page.tsx` | Roles por organización; solo sysadmin | v2 |
| `/permissions` | `src/app/(app)/permissions/page.tsx` | Permisos del catálogo; solo sysadmin | v2 |
| `/surveys` | `src/app/(app)/surveys/page.tsx` | Catálogo de encuestas por organización | v2 |
| `/surveys/[id]` | `src/app/(app)/surveys/[id]/page.tsx` | Cuestionario y versiones de un instrumento | v2 |
| `/surveys/[id]/responses` | `src/app/(app)/surveys/[id]/responses/page.tsx` | Redirección de URL heredadas hacia el cuestionario; ya no renderiza la vista de respuestas | v2 |
| `/surveys/imports` | `src/app/(app)/surveys/imports/page.tsx` | Validación, mapeo, confirmación y seguimiento de cargas en seis formatos | v2 |
| `/api/surveys/imports` | `src/app/api/surveys/imports/route.ts` | Autorizar subida privada, validar archivo e iniciar Workflow | v2 |
| `/api/surveys/[id]/versions` | `src/app/api/surveys/[id]/versions/route.ts` | Eliminar versiones del instrumento con permiso `survey.delete` | v2 |
| `/api/surveys/[id]/questions/[questionId]/responses` | `src/app/api/surveys/[id]/questions/[questionId]/responses/route.ts` | Consultar respuestas paginadas de una pregunta en el panel de análisis | v2 |
| `/api/surveys/[id]/table` | `src/app/api/surveys/[id]/table/route.ts` | Consultar una página de la matriz o localizar la página de un registro | v2 |
| `/workspace/[code]` | `src/app/(app)/workspace/[code]/page.tsx` | Módulos nuevos en construcción | v2 |
| `/sources` | `src/app/(app)/sources/page.tsx` | Fuentes | v1 |
| `/datasets`, `/datasets/new`, `/datasets/[id]` | `src/app/(app)/datasets/` | Datasets | v1 |
| `/sql` | `src/app/(app)/sql/page.tsx` | SQL Lab | v1 |
| `/query/new` | `src/app/(app)/query/new/page.tsx` | Constructor de consultas | v1 |
| `/metrics` | `src/app/(app)/metrics/page.tsx` | Métricas | v1 |
| `/charts` | `src/app/(app)/charts/page.tsx` | Galería de Gráficas (propias y compartidas) | v2 |
| `/charts/view/[id]` | `src/app/(app)/charts/view/[id]/page.tsx` | Gráfica compartida de solo lectura | v2 |
| `/charts/new` | `src/app/(app)/charts/new/page.tsx` | Editor único: nueva gráfica con fuente por defecto | v2 |
| `/charts/survey/[id]` | `src/app/(app)/charts/survey/[id]/page.tsx` | Editor único: editar gráfica | v2 |
| `/charts/dataset/[id]` | `src/app/(app)/charts/dataset/[id]/page.tsx` | Editor único: editar gráfica | v2 |
| `/charts/[id]`, `/charts/[id]/edit` | `src/app/(app)/charts/` | Gráficas heredadas | v1 |
| `/dashboards`, `/dashboards/[id]`, `/dashboards/[id]/edit` | `src/app/(app)/dashboards/` | Dashboards | v1 |
| `/maps` | `src/app/(app)/maps/page.tsx` | Mapas | v1 |
| `/themes` | `src/app/(app)/themes/page.tsx` | Temas | v1 |
| `/team` | `src/app/(app)/team/page.tsx` | Usuarios por organización | v2 |
| `/profile` | `src/app/(app)/profile/page.tsx` | Perfil | v2 |
