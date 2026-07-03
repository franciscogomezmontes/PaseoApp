# Catálogo Completo de Leyes de UX

Fuentes: lawsofux.com (Jon Yablonski) · userinterface.wiki (Raphael Salaja)

---

## Índice
1. Aesthetic-Usability Effect
2. Choice Overload
3. Chunking
4. Cognitive Bias
5. Cognitive Load
6. Doherty Threshold
7. Fitts's Law
8. Flow
9. Goal-Gradient Effect
10. Hick's Law
11. Jakob's Law
12. Law of Common Region
13. Law of Proximity
14. Law of Prägnanz
15. Law of Similarity
16. Law of Uniform Connectedness
17. Mental Model
18. Miller's Law
19. Occam's Razor
20. Paradox of the Active User
21. Pareto Principle
22. Parkinson's Law
23. Peak-End Rule
24. Postel's Law
25. Selective Attention
26. Serial Position Effect
27. Tesler's Law
28. Von Restorff Effect
29. Working Memory
30. Zeigarnik Effect

---

## 1. Aesthetic-Usability Effect
**Principio:** Los usuarios perciben el diseño estéticamente agradable como más fácil de usar.

**Implicaciones:**
- Un diseño bello genera más tolerancia ante problemas de usabilidad
- La primera impresión visual establece la confianza antes de cualquier interacción
- El cuidado visual señala cuidado del producto en general

**En móvil:** Usa tipografía consistente, espaciado generoso y una paleta de color coherente desde la pantalla de splash.
**En web:** El hero y el header son críticos — si lucen bien, el usuario asume que el resto también funciona bien.
**Antipatrón:** Confiar en la estética para ocultar problemas reales de usabilidad. La belleza compra tiempo, no lo reemplaza.

---

## 2. Choice Overload
**Principio:** Las personas se paralizan cuando enfrentan demasiadas opciones (Paradoja de la elección).

**Implicaciones:**
- Más opciones = más tiempo de decisión y más arrepentimiento post-decisión
- La curaduría es un servicio: elegir por el usuario en ciertos contextos es útil
- Los catálogos grandes deben filtrarse inteligentemente antes de mostrarse

**En móvil:** Muestra máximo 3-5 opciones destacadas. El resto bajo "Ver más" o filtros.
**En web:** Usa comparadores, "Más popular", "Recomendado para ti" para reducir la carga.
**Antipatrón:** Mostrar todos los resultados sin orden ni jerarquía.

---

## 3. Chunking
**Principio:** El cerebro agrupa información en unidades significativas para procesarla mejor.

**Implicaciones:**
- Los números, fechas y datos técnicos se leen mejor formateados
- Los formularios largos se toleran mejor divididos en pasos
- Las listas de contenido se escanean mejor en grupos con encabezados

**En móvil:** Divide formularios en 1-3 campos por pantalla. Usa tarjetas para agrupar contenido relacionado.
**En web:** Usa encabezados de sección, separadores visuales y whitespace para crear chunks claros.
**Ejemplos de chunking:** 4532 0151 1283 0366 (número de tarjeta) · 123-45-6789 (número social) · $1,234,567.00
**Antipatrón:** Formularios de una sola página con 15+ campos sin agrupación visual.

---

## 4. Cognitive Bias
**Principio:** Errores sistemáticos de pensamiento que afectan percepción y decisiones.

**Sesgos más relevantes en UI:**
- **Anclaje:** El primer número que el usuario ve afecta cómo evalúa los siguientes (ej: precio tachado)
- **Efecto halo:** Una buena primera impresión mejora la percepción de todo lo demás
- **Sesgo de confirmación:** Los usuarios buscan información que confirma sus creencias
- **Sesgo de statu quo:** Preferimos lo conocido aunque haya mejores opciones

**En móvil/web:** Usa anclaje en pricing (muestra primero el precio premium para que el medio parezca razonable). Diseña el onboarding para generar un efecto halo positivo.
**Antipatrón:** Usar sesgos para manipular en contra del interés del usuario (dark patterns).

---

## 5. Cognitive Load
**Principio:** La cantidad de recursos mentales necesarios para entender e interactuar con una interfaz.

**Tipos:**
- **Intrínseco:** Complejidad inherente al contenido
- **Extrínseco:** Complejidad añadida por mal diseño
- **Germano:** Esfuerzo para aprender y crear esquemas mentales

**Implicaciones:** El diseño debe eliminar carga extrínseca. No se puede eliminar la intrínseca, pero sí organizarla.

**En móvil:** Una acción principal por pantalla. Iconos con etiquetas. Sin animaciones superfluas que distraigan.
**En web:** Progressive disclosure. Ayuda contextual en vez de manuales. Defaults inteligentes que reducen decisiones.
**Antipatrón:** Mostrar todas las funciones disponibles al mismo tiempo.

---

## 6. Doherty Threshold
**Principio:** La productividad aumenta cuando el sistema responde en menos de 400ms.

**Rangos:**
- < 100ms: Instantáneo, se siente como extensión del cuerpo
- 100-400ms: Perceptible pero aceptable
- 400ms-1s: El usuario nota la espera
- > 1s: El usuario pierde el hilo de pensamiento
- > 10s: Necesita indicador de progreso explícito

**En móvil:** Optimistic UI (actualiza la UI antes de confirmar con el servidor). Skeleton screens en lugar de spinners.
**En web:** Prefetch de rutas probables. Lazy loading de imágenes. Indicadores de progreso para acciones > 400ms.
**Antipatrón:** Un spinner genérico sin indicación de progreso para operaciones largas.

---

## 7. Fitts's Law
**Principio:** El tiempo para alcanzar un objetivo es función de su tamaño y distancia.

**Fórmula conceptual:** A mayor tamaño + menor distancia = más fácil de tocar/clic.

**En móvil (crítico):**
- Área mínima de toque: 44×44 pt (iOS) / 48×48 dp (Android)
- Botones primarios: 56dp+ de altura
- Zona del pulgar: parte inferior de la pantalla para acciones frecuentes
- Expande el hit area con padding invisible (::before en CSS, padding extra en React Native)
- Evita acciones importantes en las esquinas superiores (difíciles de alcanzar con una mano)

**En web:**
- Botones grandes para acciones primarias
- Navegación principal accesible sin desplazar el mouse lejos
- Las esquinas y bordes de pantalla son zonas Fitts "infinitas" (el mouse no puede pasarlas)

**Antipatrón:** Iconos pequeños sin área de toque expandida. Acciones críticas en zonas de difícil acceso.

---

## 8. Flow
**Principio:** Estado mental de inmersión total donde el usuario está completamente concentrado y disfruta la actividad.

**Condiciones para el flow:**
- La tarea tiene objetivos claros
- El nivel de dificultad iguala el nivel de habilidad del usuario
- Hay feedback inmediato sobre el progreso

**En móvil:** Minimiza interrupciones (notificaciones, popups). Diseña flujos sin dead ends. Animaciones fluidas que no rompen el ritmo.
**En web:** Formularios de checkout sin distracciones. Editores en modo foco. Juegos y onboardings gamificados.
**Antipatrón:** Interrumpir con modales de valoración en medio de una tarea importante.

---

## 9. Goal-Gradient Effect
**Principio:** La motivación para completar una tarea aumenta conforme uno se acerca a la meta.

**Implicaciones:**
- Mostrar progreso acelera la completación
- El "head start" artificial (puntos de inicio regalados) reduce el abandono
- Los estados casi-completados generan más urgencia que los vacíos

**En móvil:** Barras de progreso en onboarding y perfiles. "Solo te falta 1 paso" es más motivador que "Paso 4 de 5".
**En web:** Progress bars en formularios multi-paso. Loyalty programs que muestran cuánto falta para el siguiente nivel.
**Antipatrón:** Iniciar una barra de progreso en 0% — mejor empezarla con un pequeño avance para dar "head start".

---

## 10. Hick's Law
**Principio:** El tiempo de decisión aumenta logarítmicamente con el número y complejidad de opciones.

**Implicaciones:**
- Duplicar las opciones no duplica el tiempo — lo incrementa logarítmicamente
- La simplificación del menú reduce el tiempo de decisión dramáticamente
- Progressive disclosure: mostrar lo esencial ahora, revelar complejidad cuando se necesite

**En móvil:** Máximo 5 ítems en navegación tab bar. Menús contextuales en lugar de barras de herramientas sobrecargadas.
**En web:** Mega-menús bien organizados por categoría. Filtros colapsados por defecto con los más usados visibles.
**Antipatrón:** Mostrar 20 opciones de filtro todas expandidas al mismo tiempo.

---

## 11. Jakob's Law
**Principio:** Los usuarios pasan la mayor parte del tiempo en otros productos. Prefieren que tu interfaz funcione como las que ya conocen.

**Implicaciones:**
- Los patrones establecidos (hamburguesa para menú, corazón para favoritos) reducen la curva de aprendizaje
- Las innovaciones de UI tienen un costo cognitivo — deben justificarse
- Romper convenciones requiere educación explícita del usuario

**En móvil iOS:** Tab bar abajo, back button arriba izquierda, pull-to-refresh, swipe para navegar.
**En móvil Android:** Navigation rail, bottom nav, swipe desde el borde.
**En web:** Logo arriba izquierda lleva al home, carrito arriba derecha, búsqueda prominente si es e-commerce.
**Antipatrón:** Reinventar la navegación sin razón. Usar iconos ambiguos inventados en lugar de los estándar.

---

## 12. Law of Common Region
**Principio:** Los elementos dentro de un área con borde definido se perciben como un grupo.

**Implicaciones:**
- Las tarjetas (cards) son el patrón de agrupación más poderoso en UI móvil
- Los bordes, fondos y contenedores crean relaciones visuales implícitas
- La separación espacial no siempre es suficiente — a veces se necesita un contenedor explícito

**En móvil:** Cards para items de lista. Secciones con fondo diferente para agrupar opciones relacionadas.
**En web:** Paneles, sidebar, modales, tooltips — todos son ejemplos de common region.
**Antipatrón:** Agrupar visualmente elementos que no están relacionados (crea confusión semántica).

---

## 13. Law of Proximity
**Principio:** Los objetos cercanos entre sí se perciben como relacionados.

**Implicaciones:**
- El espaciado comunica relaciones sin necesidad de líneas divisorias
- Un label más cerca de su campo que del campo anterior reduce errores de formulario
- El whitespace estratégico separa conceptos distintos

**En móvil:** Etiqueta de campo a 4-8dp del input, 16-24dp entre grupos diferentes.
**En web:** Alinear label sobre su campo, no entre dos campos.
**Antipatrón:** Espacio igual entre todos los elementos — elimina toda jerarquía visual por proximidad.

---

## 14. Law of Prägnanz
**Principio:** El cerebro interpreta formas ambiguas como la figura más simple posible.

**Implicaciones:**
- Los íconos deben ser formas simples y reconocibles
- Los estados vacíos y de error deben ilustrarse con formas claras, no con abstracciones
- La UI debe guiar hacia la interpretación correcta, no dejarla al azar

**En móvil/web:** Prefiere iconos lineales o sólidos simples. Ilustraciones en estados vacíos deben ser legibles en pequeño.
**Antipatrón:** Iconos personalizado tan elaborados que requieren un tooltip para entenderse.

---

## 15. Law of Similarity
**Principio:** Los elementos visualmente similares se perciben como parte del mismo grupo o función.

**Implicaciones:**
- La consistencia visual de botones del mismo tipo es obligatoria
- Los links deben verse iguales entre sí. Los CTAs también.
- Cambiar el estilo de un elemento implica cambiar su significado percibido

**En móvil/web:** Botones primarios siempre del mismo color/tamaño. Textos clickeables siempre del mismo color (o subrayados).
**Antipatrón:** Botones con el mismo propósito pero estilos distintos en diferentes pantallas.

---

## 16. Law of Uniform Connectedness
**Principio:** Los elementos conectados visualmente (líneas, colores, bordes) se perciben como más relacionados que elementos sin conexión.

**Implicaciones:**
- Las líneas de conexión en onboarding comunican secuencia
- Los indicadores de paso (step indicators) con líneas conectoras son más claros que puntos solos
- Los breadcrumbs con separadores comunican jerarquía

**En móvil:** Step indicators con líneas. Tarjetas expandibles con indicador visual de conexión padre-hijo.
**En web:** Breadcrumbs, wizards multi-paso, árboles de categoría.
**Antipatrón:** Usar líneas decorativas que no comunican relación real entre elementos.

---

## 17. Mental Model
**Principio:** Los usuarios operan con un modelo mental de cómo creen que funciona el sistema.

**Implicaciones:**
- Si la UI no coincide con el modelo mental del usuario, habrá errores y frustración
- Investiga los modelos mentales antes de diseñar (user research)
- Los metáforas visuales (carpetas, papelera, carrito) aprovechan modelos mentales existentes

**En móvil:** El swipe a la derecha para "aceptar/aprobar" y a la izquierda para "rechazar/eliminar" es un modelo mental establecido.
**En web:** El proceso de checkout debe parecerse a una fila de tienda: seleccionar → revisar → pagar → confirmación.
**Antipatrón:** Diseñar sin hacer user research y asumir que el modelo mental del diseñador = el del usuario.

---

## 18. Miller's Law
**Principio:** Una persona puede mantener aproximadamente 7 (± 2) ítems en su memoria de trabajo.

**Implicaciones:**
- Las listas de más de 9 ítems deben organizarse en subcategorías
- Los menús de navegación no deben superar 7 ítems
- Los pasos de un proceso deben ser ≤ 7 (idealmente 3-5)

**En móvil:** Tab bar: máximo 5 ítems. Listas de settings: agrupa en secciones de máximo 7 ítems.
**En web:** Menú de navegación: máximo 7 ítems de primer nivel. Formularios: máximo 7 campos por sección.
**Antipatrón:** Un dropdown con 50 países sin buscador o agrupación.

---

## 19. Occam's Razor
**Principio:** Entre soluciones equivalentes, la más simple es la preferible.

**Implicaciones:**
- Cada elemento de UI debe justificar su existencia
- Las features que no resuelven un problema real añaden complejidad sin valor
- La primera solución que se te ocurre raramente es la más simple

**En móvil/web:** Empieza con la versión más simple posible y añade complejidad solo cuando los usuarios lo pidan.
**Antipatrón:** Añadir opciones de configuración "por si acaso" sin datos de que alguien las necesita.

---

## 20. Paradox of the Active User
**Principio:** Los usuarios nunca leen los manuales — empiezan a usar el software de inmediato.

**Implicaciones:**
- El onboarding debe ser interactivo, no instructivo
- Las tooltips contextuales son más efectivas que tutoriales previos
- El diseño debe ser autoexplicativo; si necesita un manual, hay un problema de diseño

**En móvil:** Onboarding de máximo 3 pantallas. Prefiere el "coach mark" contextual sobre el tutorial previo.
**En web:** Tooltips en hover para features avanzadas. Empty states que explican cómo empezar.
**Antipatrón:** Un PDF de 20 páginas como documentación de usuario. Un tutorial obligatorio de 10 pasos antes de usar la app.

---

## 21. Pareto Principle
**Principio:** El 80% de los efectos proviene del 20% de las causas.

**Implicaciones:**
- El 80% de los usuarios usará el 20% de las funciones — identifica cuáles y priorízalas
- El 80% de los problemas de UX provienen del 20% de los flujos — audita los más críticos primero
- Destina el 80% del esfuerzo de diseño al 20% de flows más usados

**En móvil/web:** Análisis de uso para identificar las funciones top 20% y optimizarlas primero.
**Antipatrón:** Dar igual prominencia visual a todas las funciones sin importar su frecuencia de uso.

---

## 22. Parkinson's Law
**Principio:** Cualquier tarea se expande para ocupar todo el tiempo disponible.

**Implicaciones en UI:**
- Los formularios sin límite de tiempo se completan lentamente
- Los campos de texto sin límite de caracteres generan respuestas innecesariamente largas
- Las fechas límite y contadores de tiempo crean urgencia real

**En móvil/web:** Contadores de tiempo para reservas. Límites de caracteres visibles en campos de texto. Deadlines claros para ofertas.
**Antipatrón:** Una pantalla de configuración sin guía de qué es opcional vs. requerido.

---

## 23. Peak-End Rule
**Principio:** Las personas evalúan una experiencia basándose en el momento de mayor intensidad (pico) y en cómo terminó, no en el promedio.

**Implicaciones:**
- El final de un flujo importa desproporcionadamente — debe ser satisfactorio
- Un momento de deleite en el punto correcto puede redimir una experiencia mediocre
- Los errores al final son devastadores; los errores al inicio son más perdonables

**En móvil:** Pantalla de confirmación con animación celebratoria después de completar una compra. Mensaje empático en caso de error al pagar.
**En web:** Página de thank-you page optimizada. Email de confirmación bien diseñado como cierre positivo.
**Antipatrón:** Una página de confirmación genérica y fría después de una compra exitosa.

---

## 24. Postel's Law
**Principio:** Sé liberal en lo que aceptas, conservador en lo que envías.

**Implicaciones:**
- Los inputs deben aceptar múltiples formatos y normalizarlos internamente
- La validación debe ser generosa en formatos y estricta solo en semántica
- No obligues al usuario a pensar en el formato que quiere el sistema

**En móvil:** Inputs de teléfono que aceptan con/sin guiones, con/sin código de país. Fechas en formato natural.
**En web:** Campos de tarjeta de crédito que aceptan con o sin espacios. Búsquedas que corrigen typos.
**Antipatrón:** Rechazar "01/2025" cuando el sistema quería "01/25" sin explicar el formato esperado.

---

## 25. Selective Attention
**Principio:** El cerebro filtra la mayoría de estímulos y enfoca la atención en lo que es relevante para el objetivo actual.

**Implicaciones:**
- Los usuarios en modo tarea ignorarán elementos que no perciban como relevantes
- El "banner blindness" es real: el contenido que parece publicidad se ignora
- La jerarquía visual debe guiar la atención hacia lo que importa

**En móvil:** El botón de acción principal debe destacar claramente del resto. Usa contraste y tamaño, no color solo.
**En web:** Los anuncios deben diferenciarse de contenido real. Las notificaciones deben aparecer donde el usuario está mirando.
**Antipatrón:** Información crítica de seguridad en un banner que parece aviso publicitario.

---

## 26. Serial Position Effect
**Principio:** Los usuarios recuerdan mejor los primeros y últimos ítems de una lista (primacía y recencia).

**Implicaciones:**
- El ítem más importante va primero o último, nunca en el medio
- Las opciones de navegación más usadas deben estar al principio o al final del tab bar
- En listas largas, los ítems del medio son los más olvidados

**En móvil:** Tab bar: acción más frecuente en posición 1 ó 5. En menús: la opción peligrosa (Eliminar) va al final.
**En web:** CTAs importantes en el primer fold o en el footer. En formularios, el submit al final (recencia).
**Antipatrón:** Poner el botón de acción principal en el centro de 5 opciones de navegación.

---

## 27. Tesler's Law (Ley de Conservación de la Complejidad)
**Principio:** Todo sistema tiene una complejidad inherente que no puede eliminarse — solo transferirse.

**Implicaciones:**
- Si simplificas la UI, la complejidad se traslada al backend o al equipo
- Hay un punto mínimo de complejidad por debajo del cual no puedes bajar sin perder funcionalidad
- El diseñador debe decidir conscientemente quién carga con la complejidad: el usuario o el sistema

**En móvil/web:** Los defaults inteligentes transfieren la complejidad del usuario al sistema. Los wizards transfieren complejidad temporal a pasos secuenciales.
**Antipatrón:** Simplificar la UI de configuración al punto de que el usuario no pueda hacer lo que necesita.

---

## 28. Von Restorff Effect (Isolation Effect)
**Principio:** Cuando hay múltiples objetos similares, el que difiere del resto es el más recordado.

**Implicaciones:**
- El CTA principal debe diferenciarse visualmente de todo lo demás
- Los badges, pills y highlights llaman la atención — úsalos con intención
- El abuso de este efecto lo anula: si todo destaca, nada destaca

**En móvil:** Botón primary en color de marca contrastante. Badge rojo de notificación. Plan "Recomendado" con borde o fondo diferente.
**En web:** Pricing plan destacado. Producto "Más vendido". Oferta con fondo de color diferente.
**Antipatrón:** Tres botones de tres colores distintos en la misma pantalla — ninguno destaca.

---

## 29. Working Memory
**Principio:** Sistema cognitivo que mantiene y manipula temporalmente información necesaria para completar tareas.

**Implicaciones:**
- La memoria de trabajo tiene capacidad muy limitada (relacionado con Miller's Law)
- Hacer al usuario recordar información entre pantallas crea fricción
- La UI debe "recordar" por el usuario cuando sea posible

**En móvil:** No obligues al usuario a recordar su número de confirmación — muéstralo siempre. Pre-llena formularios con datos ya provistos.
**En web:** Persiste el estado del carrito. Muestra el precio total visible durante todo el checkout.
**Antipatrón:** Pedirle al usuario que anote un código de confirmación para usarlo en la siguiente pantalla.

---

## 30. Zeigarnik Effect
**Principio:** Las personas recuerdan mejor las tareas incompletas o interrumpidas que las completadas.

**Implicaciones:**
- Las tareas incompletas crean una "tensión cognitiva" que motiva a completarlas
- Los perfiles incompletos, carritos abandonados y procesos a medias generan recall
- Este efecto puede usarse éticamente para motivar la completación, o manipuladoramente para crear ansiedad

**En móvil:** "Continúa donde lo dejaste" en el home. Badge en perfil incompleto. Push notification de carrito abandonado.
**En web:** Email de carrito abandonado. Barra de progreso de perfil. "Tienes 3 artículos en tu carrito".
**Antipatrón:** Usar notificaciones agresivas de "tarea incompleta" que generan ansiedad en lugar de motivación.
