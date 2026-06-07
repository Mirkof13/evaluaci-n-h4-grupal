import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool, Client } = pg;

// Variables de entorno de conexión
const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'farmabol'
};

// Crear base de datos si no existe
async function ensureDatabaseExists() {
  const testClient = new Client({
    user: dbConfig.user,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    database: 'postgres' // Conectar a base de datos de administración por defecto
  });

  try {
    await testClient.connect();
    const res = await testClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbConfig.database]
    );

    if (res.rowCount === 0) {
      console.log(`Base de datos '${dbConfig.database}' no existe. Creándola...`);
      // CREATE DATABASE no se puede ejecutar en bloques transaccionales o parametrizados
      await testClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`Base de datos '${dbConfig.database}' creada con éxito.`);
    }
  } catch (err) {
    console.error('Error al verificar/crear la base de datos. Verifique la conexión a PostgreSQL.');
    console.error('Detalles técnicos:', err.message.replace(/password[^a-z]*/gi, '*** '));
  } finally {
    await testClient.end();
  }
}

// Inicializar el Pool
await ensureDatabaseExists();
const pool = new Pool(dbConfig);

export const query = (text, params) => pool.query(text, params);

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si la tabla productos existe y tiene la columna fecha_vencimiento
    const tableCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'productos' AND column_name = 'fecha_vencimiento'
    `);
    
    if (tableCheck.rowCount === 0) {
      console.log('Estructura antigua detectada. Recreando tablas para Hito 3 y 4...');
      await client.query('DROP TABLE IF EXISTS detalle_ventas CASCADE');
      await client.query('DROP TABLE IF EXISTS ventas CASCADE');
      await client.query('DROP TABLE IF EXISTS productos CASCADE');
      await client.query('DROP TABLE IF EXISTS comprobantes CASCADE');
      await client.query('DROP TABLE IF EXISTS transferencias CASCADE');
      await client.query('DROP TABLE IF EXISTS usuarios CASCADE');
    }

    // 1. Crear tabla usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        pass VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        sucursal VARCHAR(100) NOT NULL
      )
    `);

    // 2. Crear tabla productos (Multi-sucursal y vencimientos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        precio NUMERIC(10, 2) NOT NULL,
        stock INT NOT NULL CHECK (stock >= 0),
        laboratorio VARCHAR(100) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        sucursal VARCHAR(100) NOT NULL,
        UNIQUE (codigo, sucursal)
      )
    `);

    // 3. Crear tabla ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vendedor VARCHAR(100) NOT NULL,
        total NUMERIC(10, 2) NOT NULL
      )
    `);

    // 4. Crear tabla detalle_ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id SERIAL PRIMARY KEY,
        venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        cantidad INT NOT NULL CHECK (cantidad > 0),
        precio NUMERIC(10, 2) NOT NULL
      )
    `);

    // 5. Crear tabla transferencias (Middleware Queue)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transferencias (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        cantidad INT NOT NULL CHECK (cantidad > 0),
        origen VARCHAR(100) NOT NULL,
        destino VARCHAR(100) NOT NULL,
        estado VARCHAR(20) NOT NULL, -- 'PENDIENTE', 'COMPLETADO', 'ERROR'
        mensaje VARCHAR(255)
      )
    `);

    // 6. Crear tabla comprobantes (Cloud Storage)
    await client.query(`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id SERIAL PRIMARY KEY,
        venta_id INT REFERENCES ventas(id) ON DELETE SET NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verificar si hay usuarios para sembrar los datos
    const userCheck = await client.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('Sembrando datos iniciales en las tablas...');

      // Sembrar usuarios (con contraseñas hasheadas)
      const adminHash = await bcrypt.hash('admin123', 10);
      const vendHash = await bcrypt.hash('venta123', 10);
      await client.query(`
        INSERT INTO usuarios (usuario, pass, nombre, rol, sucursal) VALUES
        ('admin', $1, 'Carlos Mendoza', 'ADMIN', 'Central La Paz'),
        ('vendedor', $2, 'Ana Quispe', 'VENDEDOR', 'Sucursal Miraflores')
      `, [adminHash, vendHash]);

      // Sembrar productos con fecha_vencimiento y sucursal
      await client.query(`
        INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal) VALUES
        ('PARA-500', 'Paracetamol 500mg x10', 8.50, 142, 'Inti', 'Analgésico', '2026-09-15', 'Central La Paz'),
        ('PARA-500', 'Paracetamol 500mg x10', 8.50, 25, 'Inti', 'Analgésico', '2026-09-15', 'Sucursal Miraflores'),
        ('IBUP-400', 'Ibuprofeno 400mg x10', 12.00, 88, 'Bagó', 'Antiinflamatorio', '2026-10-20', 'Central La Paz'),
        ('IBUP-400', 'Ibuprofeno 400mg x10', 12.00, 12, 'Bagó', 'Antiinflamatorio', '2026-06-12', 'Sucursal Miraflores'),
        ('AMOX-500', 'Amoxicilina 500mg x12', 35.00, 4, 'Vita', 'Antibiótico', '2026-06-25', 'Central La Paz'),
        ('AMOX-500', 'Amoxicilina 500mg x12', 35.00, 20, 'Vita', 'Antibiótico', '2026-08-01', 'Sucursal Miraflores'),
        ('OMEP-20', 'Omeprazol 20mg x14', 28.50, 56, 'Inti', 'Gastrointestinal', '2026-11-30', 'Central La Paz'),
        ('LORA-10', 'Loratadina 10mg x10', 15.00, 3, 'Bagó', 'Antialérgico', '2026-06-18', 'Central La Paz'),
        ('METF-850', 'Metformina 850mg x30', 42.00, 67, 'Vita', 'Antidiabético', '2026-12-15', 'Central La Paz'),
        ('ENAL-10', 'Enalapril 10mg x20', 24.00, 39, 'Inti', 'Antihipertensivo', '2026-09-01', 'Central La Paz'),
        ('SALB-INH', 'Salbutamol inhalador', 58.00, 22, 'Bayer', 'Respiratorio', '2026-07-02', 'Central La Paz'),
        ('AMOX-SUS', 'Amoxicilina susp. 250mg', 32.50, 2, 'Vita', 'Antibiótico', '2026-06-15', 'Central La Paz'),
        ('DICL-50', 'Diclofenaco 50mg x20', 18.00, 95, 'Bagó', 'Antiinflamatorio', '2026-10-10', 'Central La Paz'),
        ('VITC-1G', 'Vitamina C 1g efervesc.', 22.00, 110, 'Bayer', 'Suplemento', '2027-02-15', 'Central La Paz'),
        ('AZIT-500', 'Azitromicina 500mg x3', 45.00, 1, 'Inti', 'Antibiótico', '2026-06-28', 'Central La Paz'),
        ('AZIT-500', 'Azitromicina 500mg x3', 45.00, 0, 'Inti', 'Antibiótico', '2026-07-30', 'Sucursal Miraflores'),
        ('RANI-150', 'Ranitidina 150mg x20', 16.50, 48, 'Vita', 'Gastrointestinal', '2026-08-20', 'Central La Paz'),
        ('PARA-JBE', 'Paracetamol jarabe niños', 19.00, 73, 'Inti', 'Analgésico', '2026-09-05', 'Central La Paz'),
        ('LOSA-50', 'Losartán 50mg x30', 38.00, 31, 'Bagó', 'Antihipertensivo', '2026-10-05', 'Central La Paz')
      `);

      // Consultar ids de productos sembrados para insertar en detalle de forma consistente
      const prodsMap = {};
      const prodsRes = await client.query('SELECT id, codigo, sucursal FROM productos');
      prodsRes.rows.forEach(p => {
        prodsMap[`${p.codigo}_${p.sucursal}`] = p.id;
      });

      const getProdId = (code, suc) => prodsMap[`${code}_${suc}`] || prodsMap[`${code}_Central La Paz`] || null;

      // Sembrar ventas e insertar detalles seguros
      // Venta 1: Paracetamol x3, Vitamina C x1
      const v1 = await client.query(`
        INSERT INTO ventas (fecha, vendedor, total)
        VALUES ('2026-06-05 08:42:00', 'Ana Quispe', 47.50) RETURNING id
      `);
      const v1Id = v1.rows[0].id;
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio)
        VALUES 
        (${v1Id}, ${getProdId('PARA-500', 'Sucursal Miraflores')}, 'PARA-500', 'Paracetamol 500mg x10', 3, 8.50),
        (${v1Id}, ${getProdId('VITC-1G', 'Central La Paz')}, 'VITC-1G', 'Vitamina C 1g efervesc.', 1, 22.00)
      `);

      // Venta 2: Ibuprofeno x2
      const v2 = await client.query(`
        INSERT INTO ventas (fecha, vendedor, total)
        VALUES ('2026-06-05 09:15:00', 'Ana Quispe', 24.00) RETURNING id
      `);
      const v2Id = v2.rows[0].id;
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio)
        VALUES (${v2Id}, ${getProdId('IBUP-400', 'Sucursal Miraflores')}, 'IBUP-400', 'Ibuprofeno 400mg x10', 2, 12.00)
      `);

      // Venta 3: Omeprazol x1, Diclofenaco x1
      const v3 = await client.query(`
        INSERT INTO ventas (fecha, vendedor, total)
        VALUES ('2026-06-05 10:03:00', 'Carlos Mendoza', 46.50) RETURNING id
      `);
      const v3Id = v3.rows[0].id;
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio)
        VALUES 
        (${v3Id}, ${getProdId('OMEP-20', 'Central La Paz')}, 'OMEP-20', 'Omeprazol 20mg x14', 1, 28.50),
        (${v3Id}, ${getProdId('DICL-50', 'Central La Paz')}, 'DICL-50', 'Diclofenaco 50mg x20', 1, 18.00)
      `);

      // Venta 4: Metformina x2
      const v4 = await client.query(`
        INSERT INTO ventas (fecha, vendedor, total)
        VALUES ('2026-06-05 11:28:00', 'Ana Quispe', 84.00) RETURNING id
      `);
      const v4Id = v4.rows[0].id;
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio)
        VALUES (${v4Id}, ${getProdId('METF-850', 'Central La Paz')}, 'METF-850', 'Metformina 850mg x30', 2, 42.00)
      `);

      // Venta 5: Salbutamol x1 (Día anterior)
      const v5 = await client.query(`
        INSERT INTO ventas (fecha, vendedor, total)
        VALUES ('2026-06-04 16:50:00', 'Ana Quispe', 58.00) RETURNING id
      `);
      const v5Id = v5.rows[0].id;
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre, cantidad, precio)
        VALUES (${v5Id}, ${getProdId('SALB-INH', 'Central La Paz')}, 'SALB-INH', 'Salbutamol inhalador', 1, 58.00)
      `);

      console.log('Siembra de datos completada.');
    }

    // 7. Crear tabla de version de esquema
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        version INT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description VARCHAR(255)
      )
    `);

    // 8. Indices en columnas FK para mejorar performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta_id ON detalle_ventas(venta_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto_id ON detalle_ventas(producto_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comprobantes_venta_id ON comprobantes(venta_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias(estado)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_productos_sucursal ON productos(sucursal)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario)');

    // Registrar version de esquema
    await client.query(`
      INSERT INTO _schema_version (version, description)
      VALUES (2, 'Hito 4: 6 tablas + mensajes.hasheados + indices FK')
      ON CONFLICT (version) DO NOTHING
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al inicializar la base de datos:', err.message.replace(/password[^a-z]*/gi, '*** '));
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
