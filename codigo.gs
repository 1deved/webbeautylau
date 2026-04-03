/**
 * ECOMMERCE CON GOOGLE SHEETS - BACKEND API
 * Google Apps Script - API REST
 *
 * Instrucciones de configuración:
 * 1. Abrir Google Sheets y crear las hojas "productos" y "registro_pedidos"
 * 2. Ir a Extensiones > Apps Script
 * 3. Pegar este código completo
 * 4. Desplegar como aplicación web: Implementar > Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copiar la URL del endpoint y configurarla en js/services/api.js
 */

// =============================================
// CONFIGURACIÓN
// =============================================

const NOMBRE_HOJA_PRODUCTOS = "productos";
const NOMBRE_HOJA_PEDIDOS = "registro_pedidos";

// Encabezados de columnas
const COLUMNAS_PRODUCTOS = [
  "id",
  "nombre",
  "descripcion",
  "precio",
  "imagen_url",
  "stock",
  "creado_en",
  "actualizado_en",
];

const COLUMNAS_PEDIDOS = [
  "id_pedido",
  "productos",
  "precio_total",
  "nombre_cliente",
  "ciudad_cliente",
  "nota_cliente",
  "fecha",
];

// =============================================
// PUNTO DE ENTRADA - GET
// =============================================

function doGet(e) {
  try {
    const accion = e.parameter.accion || "";
    const id = e.parameter.id || "";

    Logger.log("GET recibido - accion: " + accion + " id: " + id);

    if (accion === "producto" && id) {
      return obtenerProductoPorId(id);
    }

    return obtenerTodosLosProductos();
  } catch (error) {
    Logger.log("Error en doGet: " + error.toString());
    return respuestaError("Error interno del servidor: " + error.toString());
  }
}

// =============================================
// PUNTO DE ENTRADA - POST
// =============================================

function doPost(e) {
  try {

    const datos = JSON.parse(e.postData.contents || "{}");
    const accion = datos.accion || "";

    Logger.log("POST recibido - accion: " + accion);

    if (accion === "crear-producto") {
      return crearProducto(datos);
    }

    if (accion === "actualizar-producto") {
      return actualizarProducto(datos);
    }

    if (accion === "eliminar-producto") {
      return eliminarProducto(datos.id);
    }

    if (accion === "registro-pedido") {
      return guardarRegistroPedido(datos);
    }

    return respuestaError("Acción no reconocida: " + accion);

  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return respuestaError("Error interno del servidor");
  }
}

// =============================================
// FUNCIONES DE PRODUCTOS
// =============================================

function obtenerTodosLosProductos() {
  try {
    const hoja = obtenerHoja(NOMBRE_HOJA_PRODUCTOS);
    const datos = hoja.getDataRange().getValues();

    if (datos.length <= 1) {
      return respuestaExito("Productos obtenidos correctamente", []);
    }

    const encabezados = datos[0];
    const productos = [];

    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      const producto = {};

      encabezados.forEach((encabezado, indice) => {
        producto[encabezado] = fila[indice];
      });

      // Solo incluir productos con ID válido
      if (producto.id) {
        productos.push(producto);
      }
    }

    Logger.log("Productos encontrados: " + productos.length);
    return respuestaExito("Productos obtenidos correctamente", productos);
  } catch (error) {
    Logger.log("Error al obtener productos: " + error.toString());
    return respuestaError("Error al obtener productos: " + error.toString());
  }
}

function obtenerProductoPorId(id) {
  try {
    const hoja = obtenerHoja(NOMBRE_HOJA_PRODUCTOS);
    const datos = hoja.getDataRange().getValues();

    if (datos.length <= 1) {
      return respuestaError("Producto no encontrado");
    }

    const encabezados = datos[0];
    const indiceId = encabezados.indexOf("id");

    for (let i = 1; i < datos.length; i++) {
      if (datos[i][indiceId].toString() === id.toString()) {
        const producto = {};
        encabezados.forEach((encabezado, indice) => {
          producto[encabezado] = datos[i][indice];
        });
        return respuestaExito("Producto encontrado", producto);
      }
    }

    return respuestaError("Producto no encontrado con ID: " + id);
  } catch (error) {
    Logger.log("Error al obtener producto: " + error.toString());
    return respuestaError("Error al obtener producto: " + error.toString());
  }
}

function crearProducto(datos) {
  try {
    // Validar campos requeridos
    if (!datos.nombre || !datos.precio) {
      return respuestaError("El nombre y el precio son obligatorios");
    }

    // Sanitizar datos
    const nombreLimpio = sanitizarTexto(datos.nombre);
    const descripcionLimpia = sanitizarTexto(datos.descripcion || "");
    const precio = parseFloat(datos.precio);
    const stock = parseInt(datos.stock || 0);
    const imagenUrl = sanitizarUrl(datos.imagen_url || "");

    if (isNaN(precio) || precio < 0) {
      return respuestaError("El precio debe ser un número válido mayor o igual a 0");
    }

    if (isNaN(stock) || stock < 0) {
      return respuestaError("El stock debe ser un número válido mayor o igual a 0");
    }

    const hoja = obtenerHoja(NOMBRE_HOJA_PRODUCTOS);
    const ahora = new Date().toISOString();
    const nuevoId = generarId();

    const nuevaFila = [
      nuevoId,
      nombreLimpio,
      descripcionLimpia,
      precio,
      imagenUrl,
      stock,
      ahora,
      ahora,
    ];

    hoja.appendRow(nuevaFila);

    Logger.log("Producto creado con ID: " + nuevoId);
    return respuestaExito("Producto creado correctamente", {
      id: nuevoId,
      nombre: nombreLimpio,
      descripcion: descripcionLimpia,
      precio: precio,
      imagen_url: imagenUrl,
      stock: stock,
      creado_en: ahora,
      actualizado_en: ahora,
    });
  } catch (error) {
    Logger.log("Error al crear producto: " + error.toString());
    return respuestaError("Error al crear producto: " + error.toString());
  }
}

function actualizarProducto(datos) {
  try {
    if (!datos.id) {
      return respuestaError("El ID del producto es obligatorio");
    }

    const hoja = obtenerHoja(NOMBRE_HOJA_PRODUCTOS);
    const todosLosDatos = hoja.getDataRange().getValues();
    const encabezados = todosLosDatos[0];
    const indiceId = encabezados.indexOf("id");

    let filaEncontrada = -1;

    for (let i = 1; i < todosLosDatos.length; i++) {
      if (todosLosDatos[i][indiceId].toString() === datos.id.toString()) {
        filaEncontrada = i + 1; // +1 por base 1 de Sheets
        break;
      }
    }

    if (filaEncontrada === -1) {
      return respuestaError("Producto no encontrado con ID: " + datos.id);
    }

    const ahora = new Date().toISOString();

    // Actualizar solo los campos proporcionados
    const columnas = {
      nombre: encabezados.indexOf("nombre") + 1,
      descripcion: encabezados.indexOf("descripcion") + 1,
      precio: encabezados.indexOf("precio") + 1,
      imagen_url: encabezados.indexOf("imagen_url") + 1,
      stock: encabezados.indexOf("stock") + 1,
      actualizado_en: encabezados.indexOf("actualizado_en") + 1,
    };

    if (datos.nombre !== undefined) {
      hoja.getRange(filaEncontrada, columnas.nombre).setValue(sanitizarTexto(datos.nombre));
    }
    if (datos.descripcion !== undefined) {
      hoja.getRange(filaEncontrada, columnas.descripcion).setValue(sanitizarTexto(datos.descripcion));
    }
    if (datos.precio !== undefined) {
      const precio = parseFloat(datos.precio);
      if (!isNaN(precio) && precio >= 0) {
        hoja.getRange(filaEncontrada, columnas.precio).setValue(precio);
      }
    }
    if (datos.imagen_url !== undefined) {
      hoja.getRange(filaEncontrada, columnas.imagen_url).setValue(sanitizarUrl(datos.imagen_url));
    }
    if (datos.stock !== undefined) {
      const stock = parseInt(datos.stock);
      if (!isNaN(stock) && stock >= 0) {
        hoja.getRange(filaEncontrada, columnas.stock).setValue(stock);
      }
    }

    hoja.getRange(filaEncontrada, columnas.actualizado_en).setValue(ahora);

    Logger.log("Producto actualizado con ID: " + datos.id);
    return respuestaExito("Producto actualizado correctamente", { id: datos.id });
  } catch (error) {
    Logger.log("Error al actualizar producto: " + error.toString());
    return respuestaError("Error al actualizar producto: " + error.toString());
  }
}

function eliminarProducto(id) {
  try {
    if (!id) {
      return respuestaError("El ID del producto es obligatorio");
    }

    const hoja = obtenerHoja(NOMBRE_HOJA_PRODUCTOS);
    const datos = hoja.getDataRange().getValues();
    const encabezados = datos[0];
    const indiceId = encabezados.indexOf("id");

    let filaEncontrada = -1;

    for (let i = 1; i < datos.length; i++) {
      if (datos[i][indiceId].toString() === id.toString()) {
        filaEncontrada = i + 1;
        break;
      }
    }

    if (filaEncontrada === -1) {
      return respuestaError("Producto no encontrado con ID: " + id);
    }

    hoja.deleteRow(filaEncontrada);

    Logger.log("Producto eliminado con ID: " + id);
    return respuestaExito("Producto eliminado correctamente", { id: id });
  } catch (error) {
    Logger.log("Error al eliminar producto: " + error.toString());
    return respuestaError("Error al eliminar producto: " + error.toString());
  }
}

// =============================================
// FUNCIONES DE PEDIDOS
// =============================================

function guardarRegistroPedido(datos) {
  try {
    if (!datos.productos || !datos.precio_total || !datos.nombre_cliente) {
      return respuestaError("Faltan datos obligatorios del pedido");
    }

    const hoja = obtenerHoja(NOMBRE_HOJA_PEDIDOS);
    const idPedido = "PED-" + Date.now();
    const fecha = new Date().toISOString();

    const nuevaFila = [
      idPedido,
      JSON.stringify(datos.productos),
      parseFloat(datos.precio_total),
      sanitizarTexto(datos.nombre_cliente),
      sanitizarTexto(datos.ciudad_cliente || ""),
      sanitizarTexto(datos.nota_cliente || ""),
      fecha,
    ];

    hoja.appendRow(nuevaFila);

    Logger.log("Pedido registrado con ID: " + idPedido);
    return respuestaExito("Pedido registrado correctamente", { id_pedido: idPedido });
  } catch (error) {
    Logger.log("Error al guardar pedido: " + error.toString());
    return respuestaError("Error al guardar pedido: " + error.toString());
  }
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

function obtenerHoja(nombreHoja) {
  const hojaDeCálculo = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = hojaDeCálculo.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = hojaDeCálculo.insertSheet(nombreHoja);
    // Agregar encabezados según el tipo de hoja
    if (nombreHoja === NOMBRE_HOJA_PRODUCTOS) {
      hoja.appendRow(COLUMNAS_PRODUCTOS);
    } else if (nombreHoja === NOMBRE_HOJA_PEDIDOS) {
      hoja.appendRow(COLUMNAS_PEDIDOS);
    }
  }

  return hoja;
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function sanitizarTexto(texto) {
  if (typeof texto !== "string") return String(texto || "");
  return texto.trim().replace(/<[^>]*>/g, "").substring(0, 1000);
}

function sanitizarUrl(url) {
  if (typeof url !== "string") return "";
  const urlLimpia = url.trim();
  if (urlLimpia && !urlLimpia.startsWith("http")) return "";
  return urlLimpia.substring(0, 2000);
}

function respuestaExito(mensaje, datos) {
  const respuesta = {
    success: true,
    message: mensaje,
    data: datos,
  };
  return ContentService.createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

function respuestaError(mensaje) {
  const respuesta = {
    success: false,
    message: mensaje,
    data: null,
  };
  return ContentService.createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}
