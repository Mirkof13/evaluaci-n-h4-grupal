import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDatabase, query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

// Ruta principal → cargar la interfaz de FARMABOL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'FARMABOL.html'));
});

// Inicializar la base de datos
try {
  await initDatabase();
  console.log('Base de datos inicializada correctamente.');
} catch (error) {
  console.error('No se pudo inicializar la base de datos:', error.message);
}

// ----------------------------------------------------------------
// 1. Autenticación (Login)
// ----------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { usuario, pass } = req.body;
  try {
    const result = await query(
      'SELECT id, usuario, nombre, rol, sucursal FROM usuarios WHERE usuario = $1 AND pass = $2',
      [usuario, pass]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor al intentar autenticar.', error: err.message });
  }
});

// ----------------------------------------------------------------
// 2. Obtener el estado completo (usuarios, productos, ventas)
// ----------------------------------------------------------------
app.get('/api/state', async (req, res) => {
  try {
    const usuariosRes = await query('SELECT id, usuario, nombre, rol, sucursal FROM usuarios');
    const productosRes = await query('SELECT id, codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal FROM productos ORDER BY id ASC');
    
    // Obtener ventas
    const ventasRes = await query('SELECT id, fecha, vendedor, total FROM ventas ORDER BY id DESC');
    const ventas = ventasRes.rows;

    // Para cada venta, obtener sus detalles de venta
    for (let i = 0; i < ventas.length; i++) {
      const v = ventas[i];
      const itemsRes = await query(
        'SELECT codigo, nombre, cantidad, precio FROM detalle_ventas WHERE venta_id = $1',
        [v.id]
      );
      v.items = itemsRes.rows.map(item => ({
        ...item,
        precio: parseFloat(item.precio),
        cantidad: parseInt(item.cantidad)
      }));
      v.total = parseFloat(v.total);
      
      // Formatear la fecha a YYYY-MM-DD HH:MM para coincidir con la UI
      const dt = new Date(v.fecha);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      v.fecha = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }

    // Convertir tipos numéricos en productos y formatear fecha de vencimiento
    const productos = productosRes.rows.map(p => {
      const dt = new Date(p.fecha_vencimiento);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return {
        ...p,
        precio: parseFloat(p.precio),
        stock: parseInt(p.stock),
        fecha_vencimiento: `${yyyy}-${mm}-${dd}`
      };
    });

    // Obtener transferencias
    const transferenciasRes = await query('SELECT id, fecha, codigo, nombre, cantidad, origen, destino, estado, mensaje FROM transferencias ORDER BY id DESC');
    const transferencias = transferenciasRes.rows.map(t => {
      const dt = new Date(t.fecha);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      return {
        ...t,
        fecha: `${yyyy}-${mm}-${dd} ${hh}:${min}`,
        cantidad: parseInt(t.cantidad)
      };
    });

    res.json({
      usuarios: usuariosRes.rows,
      productos,
      ventas,
      transferencias
    });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el estado.', error: err.message });
  }
});

// ----------------------------------------------------------------
// 3. Productos CRUD (ADMIN)
// ----------------------------------------------------------------
app.post('/api/productos', async (req, res) => {
  const { codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal } = req.body;
  try {
    const checkRes = await query('SELECT 1 FROM productos WHERE codigo = $1 AND sucursal = $2', [codigo, sucursal]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: `El código de producto '${codigo}' ya existe en la sucursal '${sucursal}'.` });
    }

    const insertRes = await query(
      'INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [codigo.toUpperCase(), nombre, parseFloat(precio), parseInt(stock), laboratorio, categoria, fecha_vencimiento, sucursal]
    );

    const prod = insertRes.rows[0];
    prod.precio = parseFloat(prod.precio);
    prod.stock = parseInt(prod.stock);

    res.status(201).json(prod);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear el producto.', error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal } = req.body;
  try {
    const updateRes = await query(
      'UPDATE productos SET codigo = $1, nombre = $2, precio = $3, stock = $4, laboratorio = $5, categoria = $6, fecha_vencimiento = $7, sucursal = $8 WHERE id = $9 RETURNING *',
      [codigo.toUpperCase(), nombre, parseFloat(precio), parseInt(stock), laboratorio, categoria, fecha_vencimiento, sucursal, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const prod = updateRes.rows[0];
    prod.precio = parseFloat(prod.precio);
    prod.stock = parseInt(prod.stock);

    res.json(prod);
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar el producto.', error: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteRes = await query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    res.json({ message: 'Producto eliminado con éxito.', producto: deleteRes.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el producto.', error: err.message });
  }
});

// ----------------------------------------------------------------
// 4. Registro de Ventas (Código Refactorizado / DESPUÉS de Refactorizar)
// ----------------------------------------------------------------
app.post('/api/ventas', async (req, res) => {
  const { items, vendedor } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'La venta debe contener al menos un producto.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtener la sucursal del vendedor para descontar stock localmente
    const userRes = await client.query('SELECT sucursal FROM usuarios WHERE nombre = $1', [vendedor]);
    const sucursal = userRes.rows.length > 0 ? userRes.rows[0].sucursal : 'Central La Paz';

    let totalVenta = 0;
    const itemsProcesados = [];

    // 1. Validar stock y bloquear filas en la sucursal específica
    for (const it of items) {
      const prodRes = await client.query(
        'SELECT id, stock, nombre, precio FROM productos WHERE codigo = $1 AND sucursal = $2 FOR UPDATE',
        [it.codigo, sucursal]
      );
      
      if (prodRes.rows.length === 0) {
        throw new Error(`El producto con código ${it.codigo} no existe en la sucursal ${sucursal}.`);
      }

      const prod = prodRes.rows[0];

      if (parseInt(prod.stock) < it.cantidad) {
        throw new Error(`Stock insuficiente para ${prod.nombre} en ${sucursal}. Disponible: ${prod.stock}, Solicitado: ${it.cantidad}`);
      }

      const precioReal = parseFloat(prod.precio);
      totalVenta += it.cantidad * precioReal;

      itemsProcesados.push({
        id: prod.id,
        codigo: it.codigo,
        nombre: prod.nombre,
        cantidad: it.cantidad,
        precio: precioReal
      });
    }

    // 2. Insertar la cabecera de la venta
    const ventaRes = await client.query(
      'INSERT INTO ventas (vendedor, total) VALUES ($1, $2) RETURNING id',
      [vendedor, totalVenta]
    );
    const ventaId = ventaRes.rows[0].id;

    // 3. Descontar stock e insertar detalles
    for (const it of itemsProcesados) {
      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [it.cantidad, it.id]
      );

      await client.query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio) VALUES ($1, $2, $3, $4, $5, $6)',
        [ventaId, it.id, it.codigo, it.nombre, it.cantidad, it.precio]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: ventaId, total: totalVenta });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------
// Queue / Middleware de transferencias asíncronas
// ----------------------------------------------------------------
class MessageQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
  }

  push(job) {
    this.jobs.push(job);
    this.processNext();
  }

  async processNext() {
    if (this.processing) return;
    if (this.jobs.length === 0) return;

    this.processing = true;
    const job = this.jobs.shift();

    console.log(`[MQ] Procesando transferencia #${job.id} de ${job.codigo} de ${job.origen} a ${job.destino}`);
    
    // Simular retardo de procesamiento en segundo plano (3 segundos)
    setTimeout(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Buscar producto de origen y bloquear la fila
        const originRes = await client.query(
          'SELECT id, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento FROM productos WHERE codigo = $1 AND sucursal = $2 FOR UPDATE',
          [job.codigo, job.origen]
        );

        if (originRes.rows.length === 0) {
          throw new Error(`El producto con código ${job.codigo} no existe en la sucursal de origen (${job.origen}).`);
        }

        const originProd = originRes.rows[0];
        if (parseInt(originProd.stock) < job.cantidad) {
          throw new Error(`Stock insuficiente en ${job.origen} para ${originProd.nombre}. Disp: ${originProd.stock}, Solicitado: ${job.cantidad}`);
        }

        // Descontar stock del origen
        await client.query(
          'UPDATE productos SET stock = stock - $1 WHERE id = $2',
          [job.cantidad, originProd.id]
        );

        // Buscar producto en sucursal destino y bloquear la fila
        const destRes = await client.query(
          'SELECT id FROM productos WHERE codigo = $1 AND sucursal = $2 FOR UPDATE',
          [job.codigo, job.destino]
        );

        if (destRes.rows.length > 0) {
          // Aumentar stock si ya existe
          await client.query(
            'UPDATE productos SET stock = stock + $1 WHERE id = $2',
            [job.cantidad, destRes.rows[0].id]
          );
        } else {
          // Si no existe en destino, crear un nuevo registro copiando las características
          await client.query(
            `INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              job.codigo, 
              originProd.nombre, 
              parseFloat(originProd.precio), 
              job.cantidad, 
              originProd.laboratorio, 
              originProd.categoria, 
              originProd.fecha_vencimiento, 
              job.destino
            ]
          );
        }

        // Marcar la transferencia como COMPLETADA
        await client.query(
          "UPDATE transferencias SET estado = 'COMPLETADO', mensaje = 'Transferencia completada con éxito' WHERE id = $1",
          [job.id]
        );

        await client.query('COMMIT');
        console.log(`[MQ] Transferencia #${job.id} finalizada con éxito.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[MQ] Fallo en transferencia #${job.id}:`, err.message);
        await query(
          "UPDATE transferencias SET estado = 'ERROR', mensaje = $1 WHERE id = $2",
          [err.message, job.id]
        );
      } finally {
        client.release();
        this.processing = false;
        this.processNext();
      }
    }, 3000);
  }
}

const transferQueue = new MessageQueue();

// Endpoint para solicitar transferencia (encolar asíncronamente)
app.post('/api/transferencias', async (req, res) => {
  const { codigo, cantidad, origen, destino } = req.body;
  
  if (!codigo || !cantidad || !origen || !destino) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (origen === destino) {
    return res.status(400).json({ message: 'Origen y destino deben ser diferentes.' });
  }

  try {
    // Buscar nombre del producto
    const prodRes = await query('SELECT nombre FROM productos WHERE codigo = $1 LIMIT 1', [codigo]);
    if (prodRes.rows.length === 0) {
      return res.status(400).json({ message: `El código de producto ${codigo} no existe.` });
    }
    const nombre = prodRes.rows[0].nombre;

    // Crear log en cola con estado PENDIENTE
    const insertRes = await query(
      "INSERT INTO transferencias (codigo, nombre, cantidad, origen, destino, estado, mensaje) VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', 'Esperando procesamiento en cola asíncrona...') RETURNING id, estado",
      [codigo, nombre, parseInt(cantidad), origen, destino]
    );

    const transferId = insertRes.rows[0].id;

    // Enviar a la cola
    transferQueue.push({
      id: transferId,
      codigo,
      cantidad: parseInt(cantidad),
      origen,
      destino
    });

    // Responder 202 Accepted
    res.status(202).json({ id: transferId, estado: 'PENDIENTE', message: 'Solicitud de transferencia encolada con éxito.' });
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar la transferencia.', error: err.message });
  }
});

// Endpoint para consultar estado de una transferencia en particular
app.get('/api/transferencias/status/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const statusRes = await query('SELECT id, estado, mensaje FROM transferencias WHERE id = $1', [id]);
    if (statusRes.rows.length === 0) {
      return res.status(404).json({ message: 'Transferencia no encontrada.' });
    }
    res.json(statusRes.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estado.', error: err.message });
  }
});

// ----------------------------------------------------------------
// 5. Restablecer Base de Datos (Tweaks Reset)
// ----------------------------------------------------------------
app.post('/api/reset', async (req, res) => {
  try {
    // Eliminar las tablas existentes para forzar su recreación
    await query('DROP TABLE IF EXISTS detalle_ventas CASCADE');
    await query('DROP TABLE IF EXISTS transferencias CASCADE');
    await query('DROP TABLE IF EXISTS ventas CASCADE');
    await query('DROP TABLE IF EXISTS productos CASCADE');
    await query('DROP TABLE IF EXISTS usuarios CASCADE');
    
    // Inicializar nuevamente
    await initDatabase();
    
    res.json({ message: 'Base de datos restablecida con éxito a los datos semilla.' });
  } catch (err) {
    res.status(500).json({ message: 'Error al restablecer la base de datos.', error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de FARMABOL corriendo en http://localhost:${PORT}`);
});
