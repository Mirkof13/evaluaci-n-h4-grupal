// FARMABOL — shared UI helpers: useStore hook, money format, Modal, Toast, ProductForm

const { useState: fS, useEffect: fE, useRef: fR, useCallback: fCB } = React;

// Reactive store hook — re-renders on any store change
function useStore() {
  const [, force] = fS(0);
  fE(() => window.FarmabolStore.subscribe(() => force((n) => n + 1)), []);
  return window.FarmabolStore;
}

const Bs = (n) => "Bs " + Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function stockClass(stock) {
  if (stock === 0) return 'out';
  if (stock < 5) return 'low';
  return 'ok';
}

// ---- Modal ----
const Modal = ({ title, icon, onClose, children, footer, wide }) => {
  const MI = window.Icons;
  fE(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const Ico = icon ? MI[icon] : null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {Ico && <Ico size={17} style={{ color: 'var(--accent)' }} />}
          <h3>{title}</h3>
          <div className="actions">
            <button className="icon-btn" onClick={onClose}><MI.X size={16} /></button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ---- Toast system ----
const ToastCtx = React.createContext(() => {});
const useToast = () => React.useContext(ToastCtx);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = fS([]);
  const push = fCB((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  const MI = window.Icons;
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => {
          const Ico = t.kind === 'ok' ? MI.Check : MI.AlertTriangle;
          return (
            <div key={t.id} className={"toast " + t.kind}>
              <Ico size={15} style={{ color: t.kind === 'ok' ? 'var(--ok)' : t.kind === 'warn' ? 'var(--warn)' : 'var(--danger)' }} />
              {t.msg}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};

// ---- Product form (create / edit) ----
const ProductForm = ({ producto, onClose }) => {
  const store = window.FarmabolStore;
  const toast = useToast();
  const isEdit = !!producto;
  const [form, setForm] = fS(producto || {
    codigo: '', nombre: '', precio: '', stock: '', laboratorio: 'Inti', categoria: 'Analgésico', fecha_vencimiento: '2026-08-05', sucursal: 'Central La Paz',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const labs = ["Inti", "Bagó", "Vita", "Bayer", "IFA", "Terbol"];
  const cats = ["Analgésico", "Antiinflamatorio", "Antibiótico", "Gastrointestinal", "Antialérgico", "Antidiabético", "Antihipertensivo", "Respiratorio", "Suplemento"];
  const sucursales = ["Central La Paz", "Sucursal Miraflores", "Sucursal Zona Sur", "Sucursal El Alto"];

  const valid = form.codigo.trim() && form.nombre.trim() && form.precio !== '' && form.stock !== '' && form.fecha_vencimiento && form.sucursal;

  const save = async () => {
    if (!valid) { toast('Completa código, nombre, precio, stock, fecha de vencimiento y sucursal', 'warn'); return; }
    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      laboratorio: form.laboratorio,
      categoria: form.categoria,
      fecha_vencimiento: form.fecha_vencimiento,
      sucursal: form.sucursal,
    };
    try {
      if (isEdit) {
        await store.updateProducto(producto.id, payload);
        toast('Producto actualizado');
      } else {
        await store.addProducto(payload);
        toast('Producto creado');
      }
      onClose();
    } catch (err) {
      toast(err.message || 'Error al guardar producto', 'danger');
    }
  };

  const MI = window.Icons;
  return (
    <Modal
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      icon={isEdit ? "Edit" : "Plus"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save}><MI.Check size={14} /> {isEdit ? "Guardar cambios" : "Crear producto"}</button>
        </>
      }
    >
      <div className="grid-2" style={{ gap: 14 }}>
        <div className="field">
          <label className="label">Código</label>
          <input className="input mono" placeholder="PARA-500" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} disabled={isEdit} />
        </div>
        <div className="field">
          <label className="label">Laboratorio</label>
          <select className="select" value={form.laboratorio} onChange={(e) => set('laboratorio', e.target.value)}>
            {labs.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label">Nombre del producto</label>
          <input className="input" placeholder="Paracetamol 500mg x10" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Precio (Bs)</label>
          <input className="input mono" type="number" step="0.50" placeholder="8.50" value={form.precio} onChange={(e) => set('precio', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Stock (unidades)</label>
          <input className="input mono" type="number" placeholder="100" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Fecha de Vencimiento</label>
          <input className="input mono" type="date" value={form.fecha_vencimiento} onChange={(e) => set('fecha_vencimiento', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Sucursal</label>
          <select className="select" value={form.sucursal} onChange={(e) => set('sucursal', e.target.value)} disabled={isEdit}>
            {sucursales.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label">Categoría</label>
          <select className="select" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, { useStore, Bs, stockClass, Modal, ToastProvider, useToast, ProductForm });
