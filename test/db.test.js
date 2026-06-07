import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import pool, { initDatabase, query } from '../db.js';

describe('Database', () => {
  before(async () => {
    await initDatabase();
  });

  after(async () => {
    await pool.end();
  });

  it('should have 6 tables', async () => {
    const res = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = res.rows.map(r => r.table_name).sort();
    assert.deepStrictEqual(tables, [
      'comprobantes', 'detalle_ventas', 'productos',
      'transferencias', 'usuarios', 'ventas'
    ]);
  });

  it('should have seeded 2 users', async () => {
    const res = await query('SELECT COUNT(*) FROM usuarios');
    assert.strictEqual(parseInt(res.rows[0].count), 2);
  });

  it('should have seeded products', async () => {
    const res = await query('SELECT COUNT(*) FROM productos');
    assert.ok(parseInt(res.rows[0].count) > 0);
  });

  it('should have seeded 5 ventas', async () => {
    const res = await query('SELECT COUNT(*) FROM ventas');
    assert.strictEqual(parseInt(res.rows[0].count), 5);
  });

  it('should enforce UNIQUE(codigo, sucursal) on productos', async () => {
    try {
      await query(
        `INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal)
         VALUES ('TEST-000', 'Test Product', 10, 100, 'TestLab', 'Test', '2026-12-31', 'Central La Paz')`
      );
      await query(
        `INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal)
         VALUES ('TEST-000', 'Test Product Dup', 10, 100, 'TestLab', 'Test', '2026-12-31', 'Central La Paz')`
      );
      assert.fail('Should have thrown duplicate key error');
    } catch (err) {
      assert.ok(err.message.includes('duplicate') || err.message.includes('unique') || err.message.includes('llave duplicada'));
    }
  });

  it('should have CHECK stock >= 0 on productos', async () => {
    try {
      await query(
        `INSERT INTO productos (codigo, nombre, precio, stock, laboratorio, categoria, fecha_vencimiento, sucursal)
         VALUES ('TEST-NEG', 'Test Negativo', 10, -5, 'TestLab', 'Test', '2026-12-31', 'Central La Paz')`
      );
      assert.fail('Should have thrown check constraint error');
    } catch (err) {
      assert.ok(err.message.includes('check') || err.message.includes('violates'));
    }
  });

  it('should reset via API and restore seed data', async () => {
    const res = await fetch('http://localhost:3000/api/reset', { method: 'POST' });
    assert.strictEqual(res.status, 200);

    const stateRes = await fetch('http://localhost:3000/api/state');
    const state = await stateRes.json();
    assert.strictEqual(state.usuarios.length, 2);
    assert.ok(state.productos.length > 0);
    assert.strictEqual(state.ventas.length, 5);
  });
});
