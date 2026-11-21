# Limpieza y validación de catálogos para tiendas online

## Problema

Una tienda online puede recibir un CSV de proveedor con colores escritos de varias maneras, tallas ambiguas y productos sin referencia. Antes de importar, el equipo necesita saber qué datos puede adaptar con una regla clara y qué conviene confirmar con el proveedor.

## Solución

Desarrollé una herramienta en Node.js que procesa automáticamente un CSV de proveedor. En esta demostración, partí de un archivo desordenado con 15 productos. La herramienta exporta el catálogo normalizado en `catalogo_limpio_v3.csv` y genera `informe_catalogo_v1.txt`, con las incidencias que la tienda debe revisar antes de importar. El CSV coloca lado a lado los valores de origen y los normalizados para que se pueda comprobar cada cambio.

## Qué detecta y corrige

- Normaliza las referencias de producto (SKU), las marcas, las categorías, los colores y las tallas cuando existe una regla clara.
- Detecta campos que siguen vacíos tras la normalización y señala errores como la ausencia de SKU.
- Señala posibles duplicados y variantes de forma conservadora. Cada coincidencia queda registrada para que una persona pueda confirmarla.
- Asigna a cada producto un estado y documenta el motivo cuando hay una incidencia.

## Antes y después

| Producto | Antes en el CSV del proveedor | Después del análisis |
| --- | --- | --- |
| **URBAN FLEX bco** | SKU `73`, marca `NIVEXO`, categoría `zapas`, color `Bco.` y tallas `36 37 38`. | SKU `73`. Marca `Nivexo`, categoría `Zapatillas`, color `Blanco` y tallas `36, 37, 38`. Estado **OK**. |
| **ZAP RUN PULSE H NEG** | SKU `NX-041` con un espacio antes y otro después, categoría `CALZADO RUN` y color `neg.`. | SKU `NX-041`, categoría `Zapatillas running` y color `Negro`. Estado **REVISAR** por la similitud con `nx041` y la posible variante `nx041-B`. |
| **Top Aero tirantes** | SKU vacío y marca `VElKORA`. | Marca `Velkora`. El SKU sigue vacío y el producto queda en **ERROR** por falta de referencia. |

## Validación

**OK** identifica los registros sin incidencias pendientes. **REVISAR** indica que hace falta una comprobación manual. Por ejemplo, la herramienta conserva el rango `40-43` tal como aparece y pide confirmar qué tallas representa. **ERROR** tiene prioridad cuando falta un dato imprescindible, como el SKU.

## Resultado de la auditoría

| Indicador | Productos |
| --- | ---: |
| Total analizado | 15 |
| Estado OK | 6 |
| Estado REVISAR | 8 |
| Estado ERROR | 1 |
| Marcados como posibles duplicados o variantes | 3 |
| Con campos vacíos | 4 |
| Con problemas de tallas | 4 |
| Con problemas de color | 3 |
| Con problemas de SKU | 4 |

En total, **9 productos quedan pendientes**. Ocho requieren revisión manual y uno tiene un error. Los recuentos por tipo de incidencia pueden coincidir en un mismo producto.

## Tecnologías

JavaScript, Node.js, archivos CSV y automatización de datos mediante reglas programadas.

## Alcance de la demostración

La herramienta procesa el formato CSV de esta muestra. El catálogo de salida sirve como base para un mapeo posterior al formato de destino. Los títulos y las descripciones se conservan tal como los entrega el proveedor.

## Cómo reproducir la demostración

Con Node.js instalado, coloca el script, el CSV original y los dos archivos de npm en la misma carpeta. Ejecuta `npm ci` y después `node limpiar_catalogo.cjs`. Si lo abres en Excel, importa el CSV con punto y coma como separador y configura las columnas de SKU como texto.

## Posibles aplicaciones reales

- Limpiar archivos de proveedores antes de incorporarlos al catálogo de una tienda.
- Detectar datos incompletos y referencias que conviene comprobar antes de una importación.
- Preparar los datos para adaptarlos al formato de importación de Shopify o WooCommerce.
- Revisar y normalizar catálogos antes de una migración entre plataformas de ecommerce.

*Proyecto demostrativo desarrollado con datos ficticios.*
