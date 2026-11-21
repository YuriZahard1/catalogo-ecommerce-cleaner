# Ecommerce Catalog Cleaner

**Herramienta de línea de comandos en Node.js** para limpiar, normalizar y validar catálogos CSV antes de utilizarlos en ecommerce.

Genera un catálogo que permite comparar los datos de origen con los normalizados y un informe que indica qué registros necesitan revisión.

---

## Problema

Los catálogos de proveedores pueden traer referencias de producto (SKU) con formatos inconsistentes, categorías equivalentes con nombres distintos y colores escritos de varias formas. Las tallas ambiguas, los campos vacíos y los posibles duplicados también dificultan la preparación del catálogo antes de una importación.

## Qué hace

- Lee un catálogo CSV con la estructura de la muestra.
- Normaliza SKU, marcas, categorías, colores y tallas mediante reglas programadas.
- Detecta campos vacíos y señala posibles duplicados o variantes con criterios conservadores.
- Asigna a cada producto un estado de validación (`OK`, `REVISAR` o `ERROR`) y registra las incidencias detectadas.
- Genera un CSV limpio con los valores originales junto a los normalizados.
- Genera un informe de auditoría con los recuentos y el detalle de los productos pendientes.

## Ejemplo de funcionamiento

```text
CSV del proveedor
        ↓
Procesamiento en Node.js
        ↓
CSV limpio + informe de auditoría
```

## Resultados de la demostración

La demostración utiliza un catálogo ficticio de **15 productos**.

| Indicador                                     | Productos |
| --------------------------------------------- | --------: |
| Analizados                                    |        15 |
| `OK`                                          |         6 |
| `REVISAR`                                     |         8 |
| `ERROR`                                       |         1 |
| Marcados como posibles duplicados o variantes |         3 |
| Con campos vacíos                             |         4 |

Cada producto tiene un único estado. Un mismo producto puede aparecer en varios recuentos de incidencias.

## Archivos principales

| Archivo                                                                                  | Contenido                                                                                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`catalogo_proveedor_original.csv`](catalogo_proveedor_original.csv)                     | Catálogo ficticio que simula el archivo recibido de un proveedor.                                       |
| [`limpiar_catalogo.cjs`](limpiar_catalogo.cjs)                                           | Script que lee, normaliza y valida el catálogo y genera los archivos de salida.                         |
| [`catalogo_limpio_v3.csv`](catalogo_limpio_v3.csv)                                       | Catálogo procesado con los valores originales y normalizados, el estado y las incidencias por producto. |
| [`informe_catalogo_v1.txt`](informe_catalogo_v1.txt)                                     | Informe de auditoría con los recuentos y el detalle de los productos que necesitan atención.            |
| [`portfolio_limpieza_catalogos_ecommerce.md`](portfolio_limpieza_catalogos_ecommerce.md) | Caso completo del proyecto, con ejemplos de antes y después.                                            |
| [`package.json`](package.json)                                                           | Declara la dependencia `csv`, utilizada para leer y escribir los archivos.                              |

## Tecnologías

- JavaScript
- Node.js
- CSV

## Cómo ejecutarlo

Con Node.js y npm instalados, ejecuta estos comandos desde la raíz del repositorio.

### 1. Instalar las dependencias

```bash
npm install
```

### 2. Procesar el catálogo

```bash
node limpiar_catalogo.cjs
```

### Archivos generados

El script lee `catalogo_proveedor_original.csv` y genera o actualiza estos archivos en la misma carpeta.

- `catalogo_limpio_v3.csv`
- `informe_catalogo_v1.txt`

## Filosofía de validación

La prioridad es **`ERROR` > `REVISAR` > `OK`**.

| Estado    | Cuándo se asigna                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `ERROR`   | Falta un dato obligatorio, como el SKU o el nombre del producto.                                                  |
| `REVISAR` | Hay una incidencia pendiente, un valor ambiguo o una coincidencia que podría indicar un duplicado o una variante. |
| `OK`      | El producto ha pasado las comprobaciones del script y no tiene incidencias pendientes.                            |

Los datos ambiguos se conservan y se señalan para revisión manual. Por ejemplo, un rango de tallas como `40-43` se mantiene tal como aparece en el archivo hasta que se confirme su significado.

## Posibles usos

- Limpiar y normalizar archivos de proveedores.
- Preparar datos para una fase posterior de adaptación a Shopify o WooCommerce.
- Validar catálogos antes de una migración de ecommerce.
- Detectar inconsistencias antes de importar productos.

La herramienta trabaja con archivos CSV locales. Actualmente, no tiene integración directa con Shopify ni WooCommerce.

## Portfolio

El [caso de portfolio](portfolio_limpieza_catalogos_ecommerce.md) explica el problema, las decisiones de normalización y los resultados del proyecto. Incluye ejemplos de antes y después basados en los archivos del repositorio.

## Estado del proyecto

Proyecto demostrativo terminado.

## Aviso

Proyecto demostrativo desarrollado con datos ficticios.
