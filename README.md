# Oferta y demanda de estacionamiento

Aplicación web en español para configurar y resolver ejercicios de oferta y
demanda de estacionamiento: una tabla por cuadra, con cajones (filas) y
recorridos (columnas) que se agregan o eliminan de forma independiente por
cuadra, captura por color + número de vehículo, y cálculos automáticos en el
pie de cada tabla.

Los datos se guardan únicamente en el navegador (localStorage) de este
dispositivo. No se requiere cuenta ni conexión a un servidor.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`).

## Otros comandos

```bash
npm run build     # compila TypeScript y genera el build de producción en dist/
npm run preview   # sirve el build de producción localmente
npm test          # ejecuta las pruebas (vitest) en modo watch
npx vitest run     # ejecuta las pruebas una sola vez
npm run lint       # oxlint
```

## Guía de uso

1. Arriba, indica el **Número de cuadras** y las **Horas** del estudio (se
   aplican a todas las cuadras) y pulsa **Aplicar** (o Enter) para generar o
   actualizar las tablas; escribir en esos campos no aplica nada por sí solo.
2. Cada tabla se llama "Cuadra N" por defecto; haz click en el nombre para
   renombrarla (Enter confirma, Escape cancela; dejarlo vacío vuelve al
   nombre automático). Usa **+ Agregar cajón** (debajo de la tabla) para
   añadir filas y **+ Recorrido** (arriba a la derecha) para añadir
   columnas. Click derecho sobre el número de un cajón o sobre el
   encabezado de un recorrido abre un menú para eliminarlo. **Eliminar
   cuadra** (junto al nombre) borra esa tabla completa, y **Eliminar todas
   las cuadras** (arriba) borra todas de una vez; ambas piden confirmación
   porque no se pueden deshacer.
3. En cada celda escribe el identificador del vehículo (letras y/o números,
   como una placa; vacío = cajón vacío). El color se calcula solo: rojo si
   está vacía, verde si ocupa el cajón, y amarillo automáticamente cuando el
   vehículo de ese recorrido es distinto al del recorrido inmediatamente
   anterior en el mismo cajón (si es el mismo vehículo que continúa, sigue
   en verde).
4. El pie de cada tabla muestra Oferta, Demanda, Cajones vacíos promedio,
   Índice de rotación (Ir), Duración del ejemplo (De) y Utilización de
   capacidad (Uc), con la fórmula y los valores sustituidos.
5. Cada tabla tiene botones para **descargar la imagen** (PNG) o el
   **Excel** (.xlsx) de esa cuadra. Arriba hay un botón para descargar un
   único Excel con todas las cuadras (una hoja por cuadra).
6. **Importar Excel** (arriba) carga un .xlsx con el formato de estudio de
   estacionamientos: una celda "Número de cajones" seguida de "Recorridos",
   una fila con las horas/recorridos, y debajo una fila por cajón con la
   placa (o `0` para vacío). Crea una cuadra nueva al final de la lista por
   cada tabla que encuentre en el archivo (en cualquier hoja), usando el
   valor junto a "Nivel:" como nombre si lo encuentra. No modifica las
   cuadras existentes.

## Fórmulas

Para cada cuadra: `C` = cajones (oferta), `R` = recorridos, `T` = horas,
`O` = celdas con vehículo, `V` = celdas vacías.

- Demanda (`N`) = `O` menos las "continuaciones": una celda es una
  continuación cuando tiene el mismo vehículo que el recorrido
  *inmediatamente anterior*, **en el mismo cajón**. Un mismo vehículo que
  permanece en su cajón cuenta una sola vez; si cambia de cajón, o si el
  cajón cambia de vehículo, cada ocupación cuenta por separado — no se
  deduplica entre cajones distintos, porque dos cajones ocupados a la vez
  son dos espacios usados, aunque compartan placa por coincidencia (pasa
  con códigos cortos en estudios reales). Verificado exacto contra el
  ejercicio original (12/9/15/7) y contra un estudio real de estacionamiento
  (ver `src/import/importExcel.test.ts`).
- Cajones vacíos promedio = `V / R`
- Ir = `N / (C × T)`
- De = `1 / Ir` (horas); en minutos, × 60
- Uc = `O / (C × R)` = `(C − V/R) / C`

## Estructura del proyecto

```
src/
  domain/      Tipos, motor de cálculo puro, operaciones sobre el estado
               (agregar/eliminar cajón/recorrido/cuadra) y persistencia —
               sin React. Cubiertos por pruebas (*.test.ts).
  export/      Exportación a imagen (html2canvas) y a Excel (write-excel-file).
  import/      Importación de .xlsx (read-excel-file): detecta tablas
               "Número de cajones" en cualquier hoja. Probado contra un
               archivo real de estudio de estacionamientos en __fixtures__.
  components/  CuadraTable, ContextMenu, Legend.
  App.tsx      Página única: barra superior + lista de tablas por cuadra.
```
