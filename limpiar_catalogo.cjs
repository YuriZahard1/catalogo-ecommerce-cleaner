const fs = require('node:fs');
const path = require('node:path');
const { parse, stringify } = require('csv/sync');

const columnas = ['ref_prov', 'articulo', 'marca', 'familia', 'col', 'talla_disp', 'detalle'];

const camposNormalizados = ['ref_prov', 'marca', 'familia', 'col', 'talla_disp'];

const marcas = new Map([
  ['nivexo', 'Nivexo'],
  ['orvanta', 'Orvanta'],
  ['velkora', 'Velkora'],
]);

const categorias = new Map([
  ['calzado run', 'Zapatillas running'],
  ['zapatillas running', 'Zapatillas running'],
  ['running', 'Zapatillas running'],
  ['trail shoes', 'Zapatillas trail'],
  ['zapas', 'Zapatillas'],
  ['mallas', 'Mallas'],
  ['chaquetas dep.', 'Chaquetas deportivas'],
  ['pantalon corto', 'Pantalones cortos'],
  ['sudadera', 'Sudaderas'],
  ['top deportivo', 'Tops deportivos'],
  ['camisetas', 'Camisetas'],
  ['pantalones', 'Pantalones'],
  ['calzado indoor', 'Calzado de interior'],
]);

const colores = new Map([
  ['neg.', 'Negro'], ['negro', 'Negro'], ['black', 'Negro'],
  ['bco.', 'Blanco'], ['blanco', 'Blanco'],
  ['gris osc.', 'Gris oscuro'], ['gris claro', 'Gris claro'],
  ['az mar.', 'Azul marino'], ['azul marino', 'Azul marino'],
  ['verde oliva', 'Verde oliva'], ['rojo', 'Rojo'],
  ['blanco/negro', 'Blanco/Negro'], ['azul', 'Azul'],
  ['varios', 'Varios'],
]);

function normalizarConDiccionario(valor, diccionario, campo, problemas) {
  const texto = valor.trim();
  if (!texto) return '';

  const normalizado = diccionario.get(texto.toLowerCase());
  if (normalizado === undefined) {
    problemas.push(campo + ' sin equivalencia: ' + texto);
    return texto;
  }
  return normalizado;
}

function normalizarCategoria(familia, articulo, problemas) {
  const categoria = familia.trim().toLowerCase();
  const titulo = articulo.trim().toLowerCase();

  // Solo deducimos la categoría con tipos explícitos y reconocidos.
  if (!categoria || categoria === 'textil sup') {
    if (/^(?:camis\.|camiseta\b)/u.test(titulo)) return 'Camisetas';
    if (/^calc\./u.test(titulo)) return 'Calcetines';
  }

  return normalizarConDiccionario(familia, categorias, 'Categoría', problemas);
}

function normalizarTallas(valor, problemas) {
  const texto = valor.trim();
  if (!texto) return '';

  // Conservamos juntos el prefijo EU y su número, y también los rangos.
  const partes = texto.split(/\s*[,/|]\s*/u).flatMap(parte => {
    if (/^\d+(?:\s+\d+)+$/u.test(parte)) return parte.split(/\s+/u);
    if (/^(?:XS|S|M|L|XL|XXL)(?:[\s-]+(?:XS|S|M|L|XL|XXL))+$/iu.test(parte)) {
      return parte.split(/[\s-]+/u);
    }
    return [parte];
  });

  const tallas = partes.map(parte => {
    const talla = parte.toUpperCase();
    if (talla === 'MEDIANA' || talla === 'GRANDE') {
      problemas.push('Confirmar equivalencia de talla: ' + parte);
      return talla[0] + talla.slice(1).toLowerCase();
    }
    if (/^\d+-\d+$/u.test(talla)) {
      problemas.push('Confirmar significado del rango de tallas: ' + talla);
    } else if (!/^(?:\d+|EU\s+\d+|XS|S|M|L|XL|XXL)$/u.test(talla)) {
      problemas.push('Formato de talla sin reconocer: ' + parte);
      return parte;
    }
    return talla.replace(/\s+/gu, ' ');
  });

  return [...new Set(tallas)].join(', ');
}

function procesarProducto(original) {
  const problemas = [];
  const producto = {
    ...original,
    ...Object.fromEntries(camposNormalizados.map(campo => [campo + '_original', original[campo]])),
    ref_prov: original.ref_prov.trim(),
    marca: normalizarConDiccionario(original.marca, marcas, 'Marca', problemas),
    familia: normalizarCategoria(original.familia, original.articulo, problemas),
    col: normalizarConDiccionario(original.col, colores, 'Color', problemas),
    talla_disp: normalizarTallas(original.talla_disp, problemas),
  };

  if (producto.col === 'Varios' || producto.col === 'Blanco/Negro') {
    problemas.push('Confirmar color: ' + producto.col);
  }

  const camposVacios = columnas.filter(campo => !producto[campo].trim());
  for (const campo of camposVacios) {
    problemas.push('Campo vacío: ' + campo);
  }

  const faltaObligatorio = camposVacios.includes('ref_prov') || camposVacios.includes('articulo');
  return { ...producto, faltaObligatorio, avisos: [...new Set(problemas)] };
}

function claveSku(sku) {
  return sku.toUpperCase().replace(/[-.\s]/gu, '');
}

function tieneSufijoDeVariante(sku, otraClave) {
  // Ejemplos: NX-041-B o NX-041-42. El prefijo debe coincidir con el otro SKU.
  const partes = sku.match(/^(.+)[-.\s]+([a-z0-9]{1,3})$/iu);
  return partes !== null && otraClave.length >= 4 && claveSku(partes[1]) === otraClave;
}

function palabrasDelTitulo(titulo) {
  const genericas = new Set([
    'camis', 'camiseta', 'camisetas', 'zap', 'zapa', 'zapas', 'zapatilla', 'zapatillas',
    'run', 'running', 'pantalon', 'pantalones', 'sud', 'sudadera', 'sudaderas',
    'h', 'hombre', 'mujer', 'unisex', 'de', 'del', 'para', 'con', 'y',
    'mc', 'manga', 'corta', 'corto', 'larga', 'largo',
    'neg', 'negro', 'negra', 'black', 'bco', 'blanco', 'blanca',
    'az', 'azul', 'mar', 'marino', 'gris', 'rojo', 'roja', 'verde',
  ]);
  const palabras = titulo.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(palabras.filter(palabra => !genericas.has(palabra)));
}


function detectarPosiblesDuplicados(productos) {
  const indice = productos.map(producto => ({
    sku: claveSku(producto.ref_prov),
    palabras: palabrasDelTitulo(producto.articulo),
    avisos: [],
  }));

  for (let i = 0; i < productos.length; i++) {
    for (let j = i + 1; j < productos.length; j++) {
      const primero = productos[i];
      const segundo = productos[j];
      const a = indice[i];
      const b = indice[j];

      // +1 porque el primer registro se numera como 1, sin contar la cabecera.
      const referenciaA = primero.ref_prov || 'producto ' + (i + 1);
      const referenciaB = segundo.ref_prov || 'producto ' + (j + 1);

      if (a.sku && a.sku === b.sku) {
        a.avisos.push('SKU muy similar a ' + referenciaB);
        b.avisos.push('SKU muy similar a ' + referenciaA);
        continue;
      }

      if (tieneSufijoDeVariante(primero.ref_prov, b.sku)) {
        a.avisos.push('Posible variante de ' + referenciaB);
        b.avisos.push('Posible variante asociada: ' + referenciaA);
        continue;
      }
      if (tieneSufijoDeVariante(segundo.ref_prov, a.sku)) {
        a.avisos.push('Posible variante asociada: ' + referenciaB);
        b.avisos.push('Posible variante de ' + referenciaA);
        continue;
      }

      // Un título parecido aporta poca evidencia si otros campos discrepan.
      if (['marca', 'familia', 'col'].some(campo =>
        primero[campo] && segundo[campo] && primero[campo] !== segundo[campo],
      )) continue;

      const comunes = [...a.palabras].filter(palabra => b.palabras.has(palabra)).length;
      if (comunes < 2) continue;

      const similitud = (2 * comunes) / (a.palabras.size + b.palabras.size);
      const mismaMarcaYCategoria = primero.marca && primero.familia &&
        primero.marca === segundo.marca && primero.familia === segundo.familia;
      const umbral = mismaMarcaYCategoria ? 0.90 : 0.95;
      if (similitud < umbral) continue;

      a.avisos.push('Nombre muy similar al de ' + referenciaB);
      b.avisos.push('Nombre muy similar al de ' + referenciaA);

    }
  }

  return productos.map((producto, i) => ({
    ...producto,
    posible_duplicado: indice[i].avisos.length ? 'REVISAR' : 'NO',
    avisos: [...producto.avisos, ...indice[i].avisos],
  }));
}


function asignarEstado(producto) {
  let estado = 'OK';
  if (producto.faltaObligatorio) {
    estado = 'ERROR';
  } else if (producto.avisos.length || producto.posible_duplicado === 'REVISAR') {
    estado = 'REVISAR';
  }

  return {
    ...producto,
    estado_validacion: estado,
    problemas_detectados: producto.avisos.join(' | '),
  };
}

function generarInforme(filas) {
  const contarEstado = estado => filas.filter(fila => fila.estado_validacion === estado).length;
  const contarAvisos = patron => filas.filter(fila =>
    fila.avisos.some(aviso => patron.test(aviso)),
  ).length;

  const ok = contarEstado('OK');
  const revisar = contarEstado('REVISAR');
  const errores = contarEstado('ERROR');
  const duplicados = filas.filter(fila => fila.posible_duplicado === 'REVISAR').length;
  const pendientes = filas.filter(fila =>
    fila.estado_validacion === 'REVISAR' || fila.estado_validacion === 'ERROR',
  );

  const lineas = [
    'AUDITORÍA DEL CATÁLOGO',
    '',
    'Número total de productos: ' + filas.length,
    'Productos con estado OK: ' + ok,
    'Productos con estado REVISAR: ' + revisar,
    'Productos con estado ERROR: ' + errores,
    'Productos marcados como posibles duplicados o variantes: ' + duplicados,
    'Productos con campos vacíos: ' + contarAvisos(/^Campo vacío: /u),
    'Productos con problemas de tallas: ' + contarAvisos(/^(?:Campo vacío: talla_disp$|Confirmar equivalencia de talla:|Confirmar significado del rango de tallas:|Formato de talla sin reconocer:)/u),
    'Productos con problemas de color: ' + contarAvisos(/^(?:Campo vacío: col$|Color sin equivalencia:|Confirmar color:)/u),
    'Productos con problemas de SKU: ' + contarAvisos(/^(?:Campo vacío: ref_prov$|SKU muy similar a |Posible variante )/u),
    '',
    'Un producto puede aparecer en varios tipos de incidencia.',
    '',
    'PRODUCTOS QUE REQUIEREN REVISIÓN',
    '',
  ];

  const nombresCampos = {
    ref_prov: 'SKU',
    articulo: 'nombre del producto',
    marca: 'marca',
    familia: 'categoría',
    col: 'color',
    talla_disp: 'tallas',
    detalle: 'descripción',
  };

  for (const fila of pendientes) {
    const problemas = fila.avisos.map(aviso => aviso.replace(
      /^Campo vacío: (\w+)$/u,
      (_, campo) => 'Falta ' + (nombresCampos[campo] ?? campo),
    ));

    lineas.push(
      'SKU: ' + (fila.ref_prov || 'Sin SKU'),
      'Producto: ' + (fila.articulo.trim() || 'Sin nombre'),
      'Estado: ' + fila.estado_validacion,
      'Problemas detectados: ' + (problemas.length ? problemas.join('. ') : 'Ninguno'),
      'Posible duplicado: ' + fila.posible_duplicado,
      '',
    );
  }

  if (pendientes.length === 0) lineas.push('No hay productos pendientes de revisión.', '');

  lineas.push(
    'RESUMEN',
    '',
    'Productos que requieren revisión manual: ' + revisar,
    'Productos con error: ' + errores,
    'Total de productos pendientes: ' + pendientes.length,
  );

  return lineas.join('\n') + '\n';
}


function main() {
  const entrada = path.join(__dirname, 'catalogo_proveedor_original.csv');
  const salida = path.join(__dirname, 'catalogo_limpio_v3.csv');
  const contenido = fs.readFileSync(entrada, 'utf8');

  const productos = parse(contenido, {
    delimiter: ';',
    bom: true,
    skip_empty_lines: true,
    columns: cabeceras => {
      if (new Set(cabeceras).size !== cabeceras.length) {
        throw new Error('El CSV contiene encabezados repetidos. Corrige la primera fila.');
      }
      for (const campo of columnas) {
        if (!cabeceras.includes(campo)) throw new Error('Falta la columna ' + campo);
      }
      return cabeceras;
    },
  });

  if (productos.length === 0) throw new Error('El CSV no contiene filas de productos.');

  const resultados = detectarPosiblesDuplicados(productos.map(procesarProducto)).map(asignarEstado);
  const csv = stringify(resultados, {
    columns: [
      'articulo',
      ...camposNormalizados.flatMap(campo => [campo + '_original', campo]),
      'detalle', 'estado_validacion', 'problemas_detectados', 'posible_duplicado',
    ],
    header: true,
    delimiter: ';',
    bom: true,
  });

  fs.writeFileSync(salida, csv, 'utf8');

  const informe = path.join(__dirname, 'informe_catalogo_v1.txt');
  fs.writeFileSync(informe, generarInforme(resultados), 'utf8');
  console.log('Informe generado: ' + informe);
  console.log(resultados.length + ' productos procesados. Archivo generado: ' + salida);
}

try {
  main();
} catch (error) {
  console.error('No se pudo procesar el catálogo. ' + error.message);
  process.exitCode = 1;
}
