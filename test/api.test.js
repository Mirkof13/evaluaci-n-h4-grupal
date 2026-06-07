import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import pool from '../db.js';

const BASE = 'http://localhost:3000';

describe('API Endpoints', () => {
  before(async () => {
    const res = await fetch(`${BASE}/api/reset`, { method: 'POST' });
    assert.ok(res.ok);
  });

  after(async () => {
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('should login admin successfully', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', pass: 'admin123' })
      });
      assert.strictEqual(res.status, 200);
      const user = await res.json();
      assert.strictEqual(user.rol, 'ADMIN');
      assert.strictEqual(user.usuario, 'admin');
      assert.ok(user.nombre);
      assert.ok(user.sucursal);
    });

    it('should login vendedor successfully', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'vendedor', pass: 'venta123' })
      });
      assert.strictEqual(res.status, 200);
      const user = await res.json();
      assert.strictEqual(user.rol, 'VENDEDOR');
    });

    it('should reject wrong password', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', pass: 'wrongpass' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should reject non-existent user', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'nonexistent', pass: 'anypass' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should reject empty credentials', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: '', pass: '' })
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('GET /api/state', () => {
    it('should return full system state', async () => {
      const res = await fetch(`${BASE}/api/state`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.usuarios));
      assert.ok(Array.isArray(data.productos));
      assert.ok(Array.isArray(data.ventas));
      assert.ok(Array.isArray(data.transferencias));
      assert.ok(Array.isArray(data.comprobantes));
      assert.ok(data.usuarios.length >= 2);
      assert.ok(data.productos.length >= 15);
      assert.ok(data.ventas.length >= 5);
    });
  });

  describe('CRUD /api/productos', () => {
    const newProduct = {
      codigo: 'TEST-X1',
      nombre: 'Producto Test',
      precio: 99.99,
      stock: 50,
      laboratorio: 'TestLab',
      categoria: 'Test',
      fecha_vencimiento: '2026-12-31',
      sucursal: 'Central La Paz'
    };
    let createdId;

    it('should create a new product', async () => {
      const res = await fetch(`${BASE}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      assert.strictEqual(res.status, 201);
      const prod = await res.json();
      assert.strictEqual(prod.codigo, 'TEST-X1');
      assert.strictEqual(parseFloat(prod.precio), 99.99);
      createdId = prod.id;
    });

    it('should reject duplicate product in same sucursal', async () => {
      const res = await fetch(`${BASE}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      assert.strictEqual(res.status, 400);
    });

    it('should read created product via state', async () => {
      const res = await fetch(`${BASE}/api/state`);
      const data = await res.json();
      const found = data.productos.find(p => p.id === createdId);
      assert.ok(found);
      assert.strictEqual(found.codigo, 'TEST-X1');
    });

    it('should update the product', async () => {
      const res = await fetch(`${BASE}/api/productos/${createdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, nombre: 'Producto Modificado', precio: 75.50 })
      });
      assert.strictEqual(res.status, 200);
      const prod = await res.json();
      assert.strictEqual(prod.nombre, 'Producto Modificado');
      assert.strictEqual(parseFloat(prod.precio), 75.50);
    });

    it('should delete the product', async () => {
      const res = await fetch(`${BASE}/api/productos/${createdId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 404 for deleted product update', async () => {
      const res = await fetch(`${BASE}/api/productos/${createdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      assert.strictEqual(res.status, 404);
    });

    it('should reject invalid product data (empty codigo)', async () => {
      const res = await fetch(`${BASE}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, codigo: '' })
      });
      assert.strictEqual(res.status, 400);
    });

    it('should reject negative stock', async () => {
      const res = await fetch(`${BASE}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, codigo: 'TEST-X2', stock: -1 })
      });
      assert.strictEqual(res.status, 400);
    });

    it('should reject negative price', async () => {
      const res = await fetch(`${BASE}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, codigo: 'TEST-X3', precio: -10 })
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/ventas', () => {
    it('should register a sale successfully', async () => {
      const res = await fetch(`${BASE}/api/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ codigo: 'PARA-500', cantidad: 2 }],
          vendedor: 'Ana Quispe'
        })
      });
      assert.strictEqual(res.status, 200);
      const venta = await res.json();
      assert.ok(venta.id);
      assert.ok(venta.total > 0);
    });

    it('should reject sale with insufficient stock', async () => {
      const res = await fetch(`${BASE}/api/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ codigo: 'PARA-500', cantidad: 9999 }],
          vendedor: 'Ana Quispe'
        })
      });
      assert.strictEqual(res.status, 400);
    });

    it('should reject empty items', async () => {
      const res = await fetch(`${BASE}/api/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], vendedor: 'Ana Quispe' })
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/transferencias', () => {
    it('should enqueue a transfer and return 202', async () => {
      const res = await fetch(`${BASE}/api/transferencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'PARA-500',
          cantidad: 5,
          origen: 'Central La Paz',
          destino: 'Sucursal Miraflores'
        })
      });
      assert.strictEqual(res.status, 202);
      const data = await res.json();
      assert.ok(data.id);
      assert.strictEqual(data.estado, 'PENDIENTE');
    });

    it('should reject transfer with same origin/destino', async () => {
      const res = await fetch(`${BASE}/api/transferencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'PARA-500',
          cantidad: 1,
          origen: 'Central La Paz',
          destino: 'Central La Paz'
        })
      });
      assert.strictEqual(res.status, 400);
    });

    it('should return transfer status', async () => {
      const createRes = await fetch(`${BASE}/api/transferencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'PARA-500',
          cantidad: 1,
          origen: 'Central La Paz',
          destino: 'Sucursal Zona Sur'
        })
      });
      const { id, estado } = await createRes.json();
      assert.strictEqual(estado, 'PENDIENTE');

      const statusRes = await fetch(`${BASE}/api/transferencias/status/${id}`);
      assert.strictEqual(statusRes.status, 200);
      const status = await statusRes.json();
      assert.ok(['PENDIENTE', 'COMPLETADO', 'ERROR'].includes(status.estado));
    });
  });

  describe('POST /api/comprobantes/upload', () => {
    it('should reject upload without file', async () => {
      const res = await fetch(`${BASE}/api/comprobantes/upload`, { method: 'POST' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('GET /api', () => {
    it('should serve the main page', async () => {
      const res = await fetch(BASE);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('FARMABOL') || text.includes('farmabol'));
    });
  });
});
