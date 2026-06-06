// FARMABOL — Screens: Dashboard, Productos (CRUD), POS, Ventas, Arquitectura

const FI = window.Icons;
const FShell = window.Shell;
const { useState: gS, useMemo: gM } = React;

// ============================================================
// Dashboard
// ============================================================
const DashboardScreen = ({ user, onNav }) => {
  const store = window.useStore();
  const s = store.get();
  const Bs = window.Bs;

  const ventasHoy = store.ventasHoy();
  const totalHoy = store.totalVentasHoy();
  const stockBajo = store.stockBajo(5, user.sucursal);
  const proximosVencer = store.productosProximosVencer(30, user.sucursal);
  const unidadesHoy = store.unidadesVendidasHoy();

  const kpis = [
    { label: "Ventas del día (Global)", value: Bs(totalHoy), delta: `${ventasHoy.length} transacciones`, icon: "TrendingUp", trend: "up" },
    { label: "Unidades vendidas hoy", value: unidadesHoy, delta: "Actualizado en tiempo real", icon: "Activity" },
    { label: "Stock bajo en sucursal", value: stockBajo.length, delta: "< 5 unidades", icon: "AlertTriangle", danger: stockBajo.length > 0 },
    { label: "Próximos a vencer (30 días)", value: proximosVencer.length, delta: `En ${user.sucursal}`, icon: "Clock", danger: proximosVencer.length > 0 },
  ];

  return (
    <>
      <FShell.PageHeader
        title={`Hola, ${user.nombre.split(' ')[0]}`}
        sub={<span>{user.sucursal} · <span className="mono">{window.FARMABOL_TODAY}</span> · Resumen operativo local y global</span>}
        actions={<button className="btn primary" onClick={() => onNav('pos')}><FI.Plus size={14} /> Registrar venta</button>}
      />

      <div className="grid-4" style={{ marginBottom: 18 }}>
        {kpis.map((k) => {
          const Ico = FI[k.icon];
          return (
            <div key={k.label} className="kpi">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="label">{k.label}</div>
                <Ico size={15} style={{ color: k.danger ? 'var(--danger)' : 'var(--text-3)' }} />
              </div>
              <div className="value" style={k.danger ? { color: 'var(--danger)' } : {}}>{k.value}</div>
              <div className={"delta " + (k.trend === 'up' ? 'up' : '')}>{k.delta}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Stock bajo — alert */}
        <FShell.Card
          title="Alerta de stock bajo"
          sub={`Productos con menos de 5 unidades en ${user.sucursal}`}
          actions={<button className="btn ghost sm" onClick={() => onNav('productos')}>Ver inventario <FI.ChevronRight size={12} /></button>}
        >
          {stockBajo.length === 0 ? (
            <div className="empty"><div className="ico"><FI.Check size={22} /></div>Sin stock crítico local</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stockBajo.map((p) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                  padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid var(--${p.stock === 0 ? 'danger' : 'warn'})`,
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                    <div className="muted-2" style={{ fontSize: 11.5 }}><span className="mono">{p.codigo}</span> · {p.laboratorio}</div>
                  </div>
                  <span className={"stock-pill " + window.stockClass(p.stock)}>
                    {p.stock === 0 ? "AGOTADO" : `${p.stock} u.`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </FShell.Card>

        {/* Vencimientos — alert */}
        <FShell.Card
          title="Alerta de vencimientos"
          sub={`Productos próximos a vencer (< 30 días) en ${user.sucursal}`}
          actions={<button className="btn ghost sm" onClick={() => onNav('productos')}>Ver inventario <FI.ChevronRight size={12} /></button>}
        >
          {proximosVencer.length === 0 ? (
            <div className="empty"><div className="ico"><FI.Check size={22} /></div>Sin medicamentos por vencer</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proximosVencer.map((p) => {
                const today = new Date(window.FARMABOL_TODAY);
                const exp = new Date(p.fecha_vencimiento);
                const diffTime = exp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                    padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--danger)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      <div className="muted-2" style={{ fontSize: 11.5 }}>
                        <span className="mono">{p.codigo}</span> · Vence el <strong style={{ color: 'var(--danger)' }}>{p.fecha_vencimiento}</strong>
                      </div>
                    </div>
                    <span className="stock-pill out" style={{ fontSize: 11 }}>
                      {diffDays <= 0 ? 'VENCIDO' : `En ${diffDays} días`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </FShell.Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Ventas recientes */}
        <FShell.Card
          title="Ventas recientes"
          sub={`${ventasHoy.length} hoy (Todas las sucursales)`}
          actions={<button className="btn ghost sm" onClick={() => onNav('ventas')}>Historial <FI.ChevronRight size={12} /></button>}
        >
          <table className="table">
            <thead><tr><th>Folio</th><th>Hora</th><th>Vendedor</th><th>Ítems</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {s.ventas.slice(0, 6).map((v) => (
                <tr key={v.id}>
                  <td className="mono">#{v.id}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{v.fecha.split(' ')[1]}</td>
                  <td>{v.vendedor}</td>
                  <td className="muted">{v.items.reduce((a, it) => a + it.cantidad, 0)} u. · {v.items.length} prod.</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--text)' }}>{Bs(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FShell.Card>

        {/* Ventas últimos 7 días */}
        <FShell.Card title="Ventas últimos 7 días" sub="Bs por día">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '6px 0' }}>
            {[
              { d: "Vie", v: 620 }, { d: "Sáb", v: 880 }, { d: "Dom", v: 340 },
              { d: "Lun", v: 720 }, { d: "Mar", v: 910 }, { d: "Mié", v: 580 },
              { d: "Hoy", v: Math.max(totalHoy, 30) },
            ].map((b, i, arr) => {
              const max = Math.max(...arr.map((x) => x.v));
              return (
                <div key={b.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: '100%', height: (b.v / max) * 84 + 'px', background: b.d === 'Hoy' ? 'var(--accent)' : 'var(--accent-soft-2)', borderRadius: '3px 3px 0 0' }} />
                  <span className="muted-2" style={{ fontSize: 10 }}>{b.d}</span>
                </div>
              );
            })}
          </div>
        </FShell.Card>
      </div>

      {/* Ventas por categoría / mini chart */}
      <div className="grid-2">
        <FShell.Card title="Inventario por laboratorio">
          {["Inti", "Bagó", "Vita", "Bayer"].map((lab) => {
            const items = s.productos.filter((p) => p.laboratorio === lab);
            const u = items.reduce((a, p) => a + p.stock, 0);
            const total = s.productos.reduce((a, p) => a + p.stock, 0);
            const pct = total > 0 ? Math.round((u / total) * 100) : 0;
            return (
              <div key={lab} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>{lab}</span><span className="mono muted">{u} u. · {pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
            );
          })}
        </FShell.Card>

        <FShell.Card title="Top productos vendidos hoy">
          {(() => {
            const counts = {};
            store.ventasHoy().forEach((v) => v.items.forEach((it) => {
              counts[it.nombre] = (counts[it.nombre] || 0) + it.cantidad;
            }));
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (!top.length) return <div className="empty" style={{ padding: 24 }}>Aún sin ventas hoy</div>;
            return top.map(([n, c], i) => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, padding: '7px 0', borderBottom: '1px dashed var(--border)', alignItems: 'center' }}>
                <span className="mono muted-2" style={{ fontSize: 11 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5 }}>{n}</span>
                <span className="mono chip accent" style={{ fontSize: 11 }}>{c} u.</span>
              </div>
            ));
          })()}
        </FShell.Card>
      </div>
    </>
  );
};

// ============================================================
// Productos — CRUD
// ============================================================
const ProductosScreen = ({ user }) => {
  const store = window.useStore();
  const s = store.get();
  const Bs = window.Bs;
  const toast = window.useToast();
  const isAdmin = user.rol === 'ADMIN';

  const [q, setQ] = gS('');
  const [cat, setCat] = gS('todas');
  const [sucFilter, setSucFilter] = gS(user.sucursal); // Default to user's sucursal!
  const [editing, setEditing] = gS(null);     // producto object or 'new'
  const [confirmDel, setConfirmDel] = gS(null);

  const cats = ['todas', ...Array.from(new Set(s.productos.map((p) => p.categoria)))];
  const sucursales = ['todas', ...Array.from(new Set(s.productos.map((p) => p.sucursal)))];
  
  const list = s.productos.filter((p) =>
    (cat === 'todas' || p.categoria === cat) &&
    (sucFilter === 'todas' || p.sucursal === sucFilter) &&
    (q === '' || p.nombre.toLowerCase().includes(q.toLowerCase()) || p.codigo.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <FShell.PageHeader
        title="Gestión de productos"
        sub={`${s.productos.length} productos en catálogo · ${store.stockBajo(5, user.sucursal).length} con stock bajo en tu sucursal`}
        actions={
          isAdmin ? (
            <button className="btn primary" onClick={() => setEditing('new')}><FI.Plus size={14} /> Nuevo producto</button>
          ) : (
            <span className="chip"><FI.Eye size={12} /> Solo lectura (Vendedor)</span>
          )
        }
      />

      <FShell.Card>
        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="search" style={{ margin: 0, width: 260 }}>
            <FI.Search size={14} />
            <input placeholder="Buscar por nombre o código…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 170 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <option key={c} value={c}>{c === 'todas' ? 'Todas las categorías' : c}</option>)}
          </select>
          <select className="select" style={{ width: 170 }} value={sucFilter} onChange={(e) => setSucFilter(e.target.value)}>
            {sucursales.map((s) => <option key={s} value={s}>{s === 'todas' ? 'Todas las sucursales' : s}</option>)}
          </select>
          <div className="spacer" />
          <span className="muted-2" style={{ fontSize: 12 }}>{list.length} resultados</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Código</th><th>Producto</th><th>Laboratorio</th><th>Categoría</th>
              <th>Vencimiento</th><th>Sucursal</th>
              <th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'center' }}>Stock</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const today = new Date(window.FARMABOL_TODAY);
              const exp = new Date(p.fecha_vencimiento);
              const diffTime = exp - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isNear = diffDays <= 30;
              return (
                <tr key={p.id}>
                  <td className="mono" style={{ color: 'var(--accent)' }}>{p.codigo}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text)' }}>{p.nombre}</td>
                  <td className="muted">{p.laboratorio}</td>
                  <td><span className="chip" style={{ fontSize: 11 }}>{p.categoria}</span></td>
                  <td>
                    <span className="mono" style={isNear ? { color: 'var(--danger)', fontWeight: 'bold' } : {}}>
                      {p.fecha_vencimiento} 
                      {isNear && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({diffDays <= 0 ? 'Vencido' : `${diffDays}d`})</span>}
                    </span>
                  </td>
                  <td><span className="chip" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 11 }}>{p.sucursal}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{Bs(p.precio)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={"stock-pill " + window.stockClass(p.stock)}>{p.stock === 0 ? 'AGOTADO' : p.stock}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} title="Editar" onClick={() => setEditing(p)}><FI.Edit size={14} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--danger)' }} title="Eliminar" onClick={() => setConfirmDel(p)}><FI.X size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty"><div className="ico"><FI.Search size={20} /></div>Sin resultados para esta búsqueda</div>}
      </FShell.Card>

      {editing && <window.ProductForm producto={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {confirmDel && (
        <window.Modal
          title="Eliminar producto"
          icon="AlertTriangle"
          onClose={() => setConfirmDel(null)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn danger" onClick={async () => {
                try {
                  await store.deleteProducto(confirmDel.id);
                  toast('Producto eliminado');
                } catch (err) {
                  toast(err.message || 'Error al eliminar producto', 'danger');
                }
                setConfirmDel(null);
              }}>
                <FI.X size={14} /> Sí, eliminar
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
            ¿Eliminar <strong>{confirmDel.nombre}</strong> (<span className="mono">{confirmDel.codigo}</span>) del catálogo?
            Esta acción no se puede deshacer.
          </p>
        </window.Modal>
      )}
    </>
  );
};

window.DashboardScreen = DashboardScreen;
window.ProductosScreen = ProductosScreen;
