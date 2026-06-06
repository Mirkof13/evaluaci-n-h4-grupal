// FARMABOL — Login (roles), Sidebar, Topbar, App routing

const { useState: aS, useEffect: aE } = React;
const AI2 = window.Icons;

// ============================================================
// Login
// ============================================================
const FarmaLogin = ({ onLogin }) => {
  const store = window.FarmabolStore;
  const [rol, setRol] = aS('ADMIN');
  const [usuario, setUsuario] = aS('admin');
  const [pass, setPass] = aS('admin123');
  const [error, setError] = aS('');

  const pickRole = (r) => {
    setRol(r);
    if (r === 'ADMIN') { setUsuario('admin'); setPass('admin123'); }
    else { setUsuario('vendedor'); setPass('venta123'); }
    setError('');
  };

  const submit = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), pass })
      });
      if (!response.ok) {
        const err = await response.json();
        setError(err.message || 'Usuario o contraseña incorrectos');
        return;
      }
      const u = await response.json();
      onLogin(u);
    } catch (e) {
      setError('Error de conexión con el servidor.');
    }
  };

  return (
    <div className="login-shell">
      <aside className="login-brandside">
        <div className="brand" style={{ padding: 0, border: 0 }}>
          <div className="brand-mark" style={{ fontFamily: 'var(--font-sans)' }}>+</div>
          <div className="brand-name">FARMA<em>BOL</em></div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 22 }}>
            <span className="pill">Sistema</span>
            Control de inventario y ventas
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 46, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 18px' }}>
            Farmacias<br />Bolivianas Unidas
          </h1>
          <p className="muted" style={{ fontSize: 15, maxWidth: 420, lineHeight: 1.55 }}>
            Gestión de productos, registro de ventas con descuento automático de stock
            y reportes en tiempo real para las 12 sucursales.
          </p>
        </div>

        <div className="row" style={{ gap: 22, fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
          <span><strong style={{ color: 'var(--text-1)' }}>12</strong> sucursales</span>
          <span><strong style={{ color: 'var(--text-1)' }}>15</strong> productos</span>
          <span><strong style={{ color: 'var(--text-1)' }}>RBAC</strong> 2 roles</span>
          <span><strong style={{ color: 'var(--text-1)' }}>PostgreSQL</strong></span>
        </div>
      </aside>

      <main className="login-formside">
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Iniciar sesión</h1>
          <div className="muted" style={{ fontSize: 13.5, marginBottom: 24 }}>Selecciona tu rol para acceder.</div>

          <div className="role-grid" style={{ marginBottom: 20 }}>
            <div className={"role-card" + (rol === 'ADMIN' ? ' active' : '')} onClick={() => pickRole('ADMIN')}>
              <div className="ico"><AI2.Shield size={18} /></div>
              <h4>Administrador</h4>
              <p>Gestión total: productos, ventas, reportes y usuarios.</p>
            </div>
            <div className={"role-card" + (rol === 'VENDEDOR' ? ' active' : '')} onClick={() => pickRole('VENDEDOR')}>
              <div className="ico"><AI2.Users size={18} /></div>
              <h4>Vendedor</h4>
              <p>Registrar ventas y consultar stock disponible.</p>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label className="label">Usuario</label>
            <input className="input" value={usuario} onChange={(e) => { setUsuario(e.target.value); setError(''); }} />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label">Contraseña</label>
            <input className="input" type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(''); }}
                   onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>

          {error && <div className="banner danger" style={{ marginBottom: 14, fontSize: 12.5 }}><AI2.AlertTriangle size={14} /> {error}</div>}

          <button className="btn primary lg" style={{ width: '100%' }} onClick={submit}>
            <AI2.Lock size={15} /> Ingresar como {rol === 'ADMIN' ? 'Administrador' : 'Vendedor'}
          </button>

          <div style={{ marginTop: 18, padding: 11, background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', fontSize: 11.5 }} className="muted-2">
            <strong style={{ color: 'var(--text-2)' }}>Credenciales demo:</strong><br />
            admin / admin123 · vendedor / venta123
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// Sidebar + Topbar
// ============================================================
const FarmaSidebar = ({ active, onNav, user }) => {
  const isAdmin = user.rol === 'ADMIN';
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Home', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'pos', label: 'Registrar venta', icon: 'Cross', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'productos', label: 'Productos', icon: 'Pill', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'ventas', label: 'Historial de ventas', icon: 'Activity', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'transferencias', label: 'Transferencias', icon: 'Refresh', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'uploads', label: 'Cloud Storage', icon: 'Upload', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'arquitectura', label: 'Arquitectura y calidad', icon: 'Layers', roles: ['ADMIN'] },
  ];
  const visible = items.filter((it) => it.roles.includes(user.rol));

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>+</div>
        <div className="brand-name">FARMA<em>BOL</em></div>
      </div>

      <div className="sidebar-section">Operación</div>
      {visible.map((it) => {
        const Ico = AI2[it.icon];
        return (
          <div key={it.id} className={"nav-item" + (active === it.id ? ' active' : '')} onClick={() => onNav(it.id)}>
            <Ico size={16} />
            <span>{it.label}</span>
          </div>
        );
      })}

      <div className="sidebar-footer">
        <div className="avatar">{user.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        <div className="user-meta">
          <div className="name">{user.nombre}</div>
          <div className="role">{user.rol === 'ADMIN' ? 'Administrador' : 'Vendedor'}</div>
        </div>
      </div>
    </aside>
  );
};

const FarmaTopbar = ({ crumbs, user, onLogout }) => (
  <header className="topbar">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="search" style={{ marginLeft: 'auto' }}>
      <AI2.Search size={14} />
      <input placeholder="Buscar…" />
    </div>
    <div className="topbar-actions">
      <span className="role-badge">
        {user.rol === 'ADMIN' ? <AI2.Shield size={12} /> : <AI2.Users size={12} />}
        {user.rol}
      </span>
      <button className="icon-btn" title="Salir" onClick={onLogout}><AI2.Logout size={16} /></button>
    </div>
  </header>
);

// ============================================================
// App
// ============================================================
const FarmaApp = () => {
  window.FarmabolStore.init();
  const [user, setUser] = aS(null);
  const [active, setActive] = aS('dashboard');
  const [tweaksOpen, setTweaksOpen] = aS(false);
  const [tweaks, setTweaks] = aS({ accent: 'default', theme: 'dark', density: 'normal' });
  const setTweak = (patch) => setTweaks((t) => ({ ...t, ...patch }));

  aE(() => {
    const r = document.documentElement;
    if (tweaks.accent === 'default') r.removeAttribute('data-accent'); else r.setAttribute('data-accent', tweaks.accent);
    if (tweaks.theme === 'light') r.setAttribute('data-theme', 'light'); else r.removeAttribute('data-theme');
    if (tweaks.density === 'compact') r.setAttribute('data-density', 'compact'); else r.removeAttribute('data-density');
  }, [tweaks]);

  aE(() => {
    const onMsg = (ev) => {
      if (ev.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (ev.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const nav = (id) => { setActive(id); window.scrollTo(0, 0); };

  const TweaksFab = tweaksOpen
    ? <window.FarmaTweaks tweaks={tweaks} setTweak={setTweak} onClose={() => { setTweaksOpen(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }} />
    : <button className="fab" onClick={() => setTweaksOpen(true)} title="Tweaks"><AI2.Sliders size={18} /></button>;

  if (!user) {
    return (
      <window.ToastProvider>
        <FarmaLogin onLogin={(u) => { setUser(u); setActive('dashboard'); }} />
        {TweaksFab}
      </window.ToastProvider>
    );
  }

  const titles = {
    dashboard: ['Dashboard'], pos: ['Registrar venta'], productos: ['Productos'],
    ventas: ['Historial de ventas'], transferencias: ['Transferencias'], uploads: ['Cloud Storage'],
    arquitectura: ['Arquitectura y calidad'],
  };
  const crumbs = [user.sucursal, ...(titles[active] || [])];

  const screen = (() => {
    switch (active) {
      case 'dashboard': return <window.DashboardScreen user={user} onNav={nav} />;
      case 'pos': return <window.POSScreen user={user} />;
      case 'productos': return <window.ProductosScreen user={user} />;
      case 'ventas': return <window.VentasScreen user={user} />;
      case 'transferencias': return <window.TransferenciasScreen user={user} />;
      case 'uploads': return <window.UploadsScreen user={user} />;
      case 'arquitectura': return user.rol === 'ADMIN' ? <window.ArquitecturaScreen /> : <window.DashboardScreen user={user} onNav={nav} />;
      default: return <window.DashboardScreen user={user} onNav={nav} />;
    }
  })();

  return (
    <window.ToastProvider>
      <div className="app">
        <FarmaSidebar active={active} onNav={nav} user={user} />
        <FarmaTopbar crumbs={crumbs} user={user} onLogout={() => setUser(null)} />
        <main className="main">
          <div key={active}>{screen}</div>
        </main>
      </div>
      {TweaksFab}
    </window.ToastProvider>
  );
};

window.FarmaLogin = FarmaLogin;
window.FarmaSidebar = FarmaSidebar;
window.FarmaTopbar = FarmaTopbar;
window.FarmaApp = FarmaApp;

ReactDOM.createRoot(document.getElementById('root')).render(<window.FarmaApp />);
