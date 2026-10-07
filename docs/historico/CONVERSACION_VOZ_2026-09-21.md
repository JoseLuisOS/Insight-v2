# Conversación por voz — Intersel Insight / HCV

**Fecha aproximada de la conversación:** 21 de septiembre de 2026  
**Contexto:** lluvia de ideas sobre la arquitectura multi-organización, roles, permisos y evolución futura de Intersel Insight.

> Nota: esta transcripción se reconstruye a partir del contenido registrado en el chat de voz. Se conserva el sentido de la conversación y los puntos sustantivos; se omiten algunas muletillas e interjecciones repetitivas para hacerla legible.

---

**Usuario:** ¿Me escuchas?

**Asistente:** Sí, aquí estoy, clarito.

**Usuario:** Ok, vamos a tener una pequeña lluvia de ideas, ¿ok?

**Asistente:** Dale, dispara. ¿Sobre qué tema quieres?

**Usuario:** Estamos desarrollando la aplicación de Intersel Insight, que es una aplicación para datos estadísticos del equipo de Hermosillo ¿Cómo Vamos?, por ejemplo para procesar encuestas, trazar gráficos, etcétera.

**Asistente:** Entendido. ¿Qué necesitas resolver ahora mismo?

**Usuario:** La aplicación se llama Intersel Insight. La empresa es Intersel, pero el software se le va a entregar primero a Hermosillo ¿Cómo Vamos?, que es una organización no gubernamental y no pertenece a Intersel. Es un cliente de Temikia, pero no está bajo Temikia App ni Temikia BAIOS.

**Asistente:** Entonces es un producto a medida para un cliente específico.

**Usuario:** Exactamente, es software a medida.

**Asistente:** Perfecto. ¿Cuál es la duda?

**Usuario:** Me contrataron para desarrollárselo a Hermosillo ¿Cómo Vamos?, pero me gustaría que eventualmente esta aplicación también pudiera ser utilizada por otras empresas que trabajen con encuestas o datos estadísticos. También quiero que se alimente de bases externas, encuestas externas, datos externos, una biblioteca de indicadores públicos como INEGI y otras entidades gubernamentales.

**Asistente:** Entiendo.

**Usuario:** La duda es si construirla multitenant, por roles, por perfiles o cómo hacerlo. De entrada será exclusivamente para Hermosillo ¿Cómo Vamos?, pero quiero que Intersel pueda usarla después sin demasiada complicación.

**Asistente:** No lo plantearía como “multitenant o roles” porque son dos ejes distintos. Los roles determinan qué puede hacer cada usuario; el multitenancy determina a qué organización pertenecen los datos. Diseñaría Intersel Insight como multi-organización desde el modelo, pero empezaría operacionalmente con un solo tenant. Es decir, tenant-aware desde hoy, sin montar todavía toda la complejidad de un SaaS completo.

Los datos externos tipo INEGI no deberían atarse a un tenant ni forzarse dentro de `survey_*`. Conviene pensar más adelante en dominios separados, como datasets o indicadores. También podría existir en el futuro un concepto de proyecto o estudio como contenedor, pero no es necesario implementarlo todavía.

**Usuario:** Ya tenemos las tablas de encuestas con prefijo `survey_*` y están listas para empezar a alimentar las primeras encuestas. Tenemos que empezar a trabajar la capa de estructura de arriba.

**Asistente:** Sí.

**Usuario:** Necesito una propuesta de organización o estructura a nivel base de datos para poder realizar todo esto. Pero antes de pasar al chat y hacer el spec: ¿tienes alguna otra duda o algo más que convenga explorar por voz?

**Asistente:** Sí. Hay algunas decisiones de alto nivel que conviene cerrar antes de escribir el spec: si habrá una sola instalación con varias organizaciones o instalaciones separadas por cliente; si un usuario puede pertenecer a varias organizaciones; cómo se tratarán los datos públicos; y si el concepto de proyecto o estudio será un contenedor obligatorio desde ahora.

**Usuario:** Una persona sí puede pertenecer a más de una organización, pero debe existir separación entre ellas. Lo de los datos públicos quizá lo estamos adelantando demasiado.

**Asistente:** Entonces cerremos lo mínimo: un usuario puede pertenecer a varias organizaciones, pero todo queda aislado por organización. La pregunta principal es si será una sola plataforma central con varias organizaciones o instalaciones completamente separadas.

**Usuario:** Podemos tener una sola instalación multi-organización. Inicialmente estará Hermosillo ¿Cómo Vamos? y después podría entrar Intersel. Si el producto genera mucho valor, Intersel podría instalarlo después en su propia infraestructura. Aun así, esa instalación podría conservar la capacidad multi-organización aunque al inicio tenga una sola.

**Asistente:** Perfecto. Entonces la arquitectura base es una sola codebase y múltiples instalaciones posibles. Cada instalación puede contener una o varias organizaciones. No hace falta un `installation_id` en las tablas: la instalación es el propio deployment. Dentro de cada instalación, `organization_id` es la frontera de aislamiento.

La siguiente decisión es distinguir entre administradores de plataforma y administradores de organización.

**Usuario:** Sí. Tiene que existir un sysadmin, mi usuario, con god mode. También un usuario administrador que pueda administrar una o más organizaciones. Después un responsable de organización con acceso full dentro de su organización, y de ahí hacia abajo en cascada.

**Asistente:** Eso no conviene modelarlo como una jerarquía rígida, sino como roles con alcance. El sysadmin debe existir a nivel instalación. Después `users` es global, `organizations` es global y una tabla de memberships une usuario + organización + rol. El rol no debe guardarse directamente en `users`, porque una persona puede ser administradora en una organización y viewer en otra.

**Usuario:** Además tiene que haber accesos a plataforma, módulos y perfilado por rol, pero también accesos por usuario. Por ejemplo, alguien de contaduría puede tener acceso al módulo de finanzas, pero Juanito no puede exportar datos y Catalina sí.

**Asistente:** Entonces necesitamos roles más excepciones individuales. Los roles funcionan como plantillas de permisos y, encima, existen overrides por usuario. Por ejemplo: el rol Contabilidad permite `finance.export`, pero Juan tiene un override `deny`. Catalina hereda el permiso del rol.

La resolución debería ser determinista: el override de usuario gana sobre el rol. Los overrides deben mantenerse como excepción, no como la forma normal de configurar permisos.

**Usuario:** También necesito permisos a nivel recurso: que un usuario pueda ver unas encuestas pero no otras dentro de la misma organización.

**Asistente:** Eso introduce una tercera capa: plataforma, organización y recurso. Puede resolverse con una tabla de recursos genérica y asignaciones de permisos sobre esos recursos. Por ejemplo: `resource_type`, `resource_id`, `principal_type`, `principal_id`, `permission`, `effect`.

Sin embargo, para evitar demasiada microgestión, en el futuro podría introducirse una agrupación intermedia como proyecto o estudio para heredar permisos hacia encuestas, dashboards y otros recursos.

**Usuario:** Dejémoslo simple, pero con la posibilidad de mayor alcance. Documenta también un disclaimer para revisitarlo en el futuro si hace falta.

**Asistente:** De acuerdo. El spec debe dejar explícito que por ahora no se implementan grupos tipo proyecto ni herencia jerárquica, pero el modelo debe permitir incorporar más adelante una capa de `project`, `study` o `workspace` sin romper la arquitectura actual.

Con esto ya tenemos suficiente para pasar al chat y formalizar la estructura de base de datos: organizaciones, usuarios, memberships, roles, permisos, overrides y acceso por recurso, todo conectado con `survey_*`.

**Usuario:** Okey, perfecto. Entonces listo, cerremos.

**Asistente:** Cerrado.
