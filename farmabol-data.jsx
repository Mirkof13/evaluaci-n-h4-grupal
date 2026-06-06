// FARMABOL — Data store connected to the PostgreSQL + Express backend.
// Replaces the original localStorage implementation with API requests.

const TODAY = '2026-06-05';

let state = {
  usuarios: [],
  productos: [],
  ventas: [],
  transferencias: [],
  comprobantes: []
};

let loaded = false;
let loading = false;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

const Store = {
  // Inicialización: realiza la carga asíncrona del estado del servidor
  init() {
    if (!loaded && !loading) {
      loading = true;
      fetch('/api/state')
        .then((r) => {
          if (!r.ok) throw new Error('Error al obtener el estado');
          return r.json();
        })
        .then((data) => {
          state = data;
          loaded = true;
          loading = false;
          emit(); // Notificar a los componentes React
        })
        .catch((err) => {
          console.error('Error al inicializar FARMABOL Store:', err);
          loading = false;
        });
    }
    return state;
  },

  get() {
    return state;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Restablecer la base de datos PostgreSQL a los datos semilla iniciales
  async reset() {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al restablecer la base de datos');
    }
    const stateData = await fetch('/api/state').then((r) => r.json());
    state = stateData;
    emit();
  },

  // ---- Productos CRUD (API Backend) ----
  async addProducto(p) {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al crear producto');
    }
    // Recargar el estado
    const stateData = await fetch('/api/state').then((r) => r.json());
    state = stateData;
    emit();
  },

  async updateProducto(id, patch) {
    const res = await fetch(`/api/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al actualizar producto');
    }
    // Recargar el estado
    const stateData = await fetch('/api/state').then((r) => r.json());
    state = stateData;
    emit();
  },

  async deleteProducto(id) {
    const res = await fetch(`/api/productos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al eliminar producto');
    }
    // Recargar el estado
    const stateData = await fetch('/api/state').then((r) => r.json());
    state = stateData;
    emit();
  },

  // ---- Ventas (API Backend) ----
  async registrarVenta(items, vendedor) {
    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, vendedor })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al registrar la venta');
    }
    
    const venta = await res.json();
    
    // Recargar el estado para reflejar el descuento de stock y la nueva venta
    const stateData = await fetch('/api/state').then((r) => r.json());
    state = stateData;
    emit();
    
    return venta;
  },

  // ---- Transferencias (API Backend Queue) ----
  async transferirProducto(codigo, cantidad, origen, destino) {
    const res = await fetch('/api/transferencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, cantidad: parseInt(cantidad), origen, destino })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al iniciar la transferencia');
    }
    const data = await res.json();
    await this.reloadState();
    return data;
  },

  async reloadState() {
    try {
      const stateData = await fetch('/api/state').then((r) => {
        if (!r.ok) throw new Error('Error al recargar estado');
        return r.json();
      });
      state = stateData;
      emit();
    } catch (e) {
      console.error('Error al recargar el estado:', e);
    }
  },

  // ---- Consultas Derivadas (Sincrónicas sobre el estado cacheado) ----
  ventasHoy() {
    return state.ventas.filter((v) => v.fecha.startsWith(TODAY));
  },
  
  totalVentasHoy() {
    return this.ventasHoy().reduce((s, v) => s + v.total, 0);
  },
  
  stockBajo(umbral = 5, sucursal = null) {
    let prods = state.productos;
    if (sucursal) {
      prods = prods.filter(p => p.sucursal === sucursal);
    }
    return prods.filter((p) => p.stock < umbral).sort((a, b) => a.stock - b.stock);
  },

  productosProximosVencer(dias = 30, sucursal = null) {
    let prods = state.productos;
    if (sucursal) {
      prods = prods.filter(p => p.sucursal === sucursal);
    }
    return prods.filter((p) => {
      if (!p.fecha_vencimiento) return false;
      const today = new Date(TODAY);
      const exp = new Date(p.fecha_vencimiento);
      const diffTime = exp - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= dias;
    }).sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
  },
  
  valorInventario(sucursal = null) {
    let prods = state.productos;
    if (sucursal) {
      prods = prods.filter(p => p.sucursal === sucursal);
    }
    return prods.reduce((s, p) => s + p.precio * p.stock, 0);
  },
  
  unidadesVendidasHoy() {
    return this.ventasHoy().reduce((s, v) => s + v.items.reduce((a, it) => a + it.cantidad, 0), 0);
  },
};

window.FarmabolStore = Store;
window.FARMABOL_TODAY = TODAY;
