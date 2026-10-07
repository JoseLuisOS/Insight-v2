# Patrón local: catálogo Insight de grupos y módulos

Referencia actual: [`catalog-manager.tsx`](../../../../src/components/insight/catalog-manager.tsx) y [`state-gauge.tsx`](../../../../src/components/insight/state-gauge.tsx).

- Usa los nombres **grupos** y **módulos**. La vista presenta un selector de grupos y un detalle «Interior del grupo». En las cabeceras del detalle, ícono, información y acciones ocupan tres columnas visuales sin separadores verticales. El modal ordena el formulario Nombre → ID autogenerado de solo lectura; normaliza acentos, comprime espacios en un guion bajo y descarta caracteres no admitidos. Los íconos se eligen en cuadrícula visual; «Otro» valida localmente el nombre contra `iconNames` de Lucide antes de guardar y muestra el resultado.
- El selector de grupos muestra la cantidad de módulos. Las cabeceras de los pasos 01 y 02 tienen una línea de separación sutil. El lápiz de edición aparece en hover y foco de teclado.
- Solo en «Interior del grupo», el estado aparece después del nombre del grupo o módulo como una píldora con un punto de color, sin texto visible. Conserva el nombre accesible del estado. No añadas esa píldora a la lista de grupos.
- El estado se edita como select dentro del modal. `StateGauge` solo se usa en la vista principal del catálogo, en la cabecera del grupo y en las tarjetas de módulos.
- El manómetro del grupo queda al pie derecho de su cabecera. En cada módulo se alinea a la derecha de la tarjeta. Los estados del resumen inferior se muestran como texto con punto de color, sin píldoras.
- Roles y Permisos aparecen como módulos del grupo Administración y pueden cambiar de estado desde Componentes. Un módulo nuevo aparece en la navegación y abre una tarjeta provisional con su nombre, descripción y aviso de construcción hasta tener una pantalla implementada.
