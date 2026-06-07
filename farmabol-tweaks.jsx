// FARMABOL — Tweaks panel

const FarmaTweaks = ({ tweaks, setTweak, onClose }) => {
  const TI = window.Icons;
  const accents = [
    { id: 'default', color: '#d97757', label: 'Claude' },
    { id: 'teal', color: '#5a9e93', label: 'Farmacia' },
    { id: 'blue', color: '#6989b8', label: 'Azul' },
    { id: 'magenta', color: '#c4598c', label: 'Magenta' },
  ];
  return (
    <div className="tweaks">
      <div className="tweaks-header">
        <TI.Sliders size={13} />
        <strong>Tweaks</strong>
        <span className="spacer" />
        <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={onClose}><TI.X size={13} /></button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-group">
          <div className="label">Acento</div>
          <div className="swatches">
            {accents.map((a) => (
              <div key={a.id} className={"swatch" + (tweaks.accent === a.id ? " active" : "")} style={{ background: a.color }} title={a.label} onClick={() => setTweak({ accent: a.id })} />
            ))}
          </div>
        </div>
        <div className="tweak-group">
          <div className="label">Tema</div>
          <div className="seg">
            <button className={tweaks.theme === 'dark' ? 'active' : ''} onClick={() => setTweak({ theme: 'dark' })}>Oscuro</button>
            <button className={tweaks.theme === 'light' ? 'active' : ''} onClick={() => setTweak({ theme: 'light' })}>Claro</button>
          </div>
        </div>
        <div className="tweak-group">
          <div className="label">Densidad de tablas</div>
          <div className="seg">
            <button className={tweaks.density === 'normal' ? 'active' : ''} onClick={() => setTweak({ density: 'normal' })}>Normal</button>
            <button className={tweaks.density === 'compact' ? 'active' : ''} onClick={() => setTweak({ density: 'compact' })}>Compacta</button>
          </div>
        </div>
        <div className="tweak-group">
          <div className="label">Datos de demostración</div>
          <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }}
                  onClick={async () => {
                    if (confirm('¿Restablecer productos y ventas a los datos iniciales?')) {
                      try {
                        await window.FarmabolStore.reset();
                        alert('Base de datos restablecida con éxito.');
                      } catch (err) {
                        alert('Error al restablecer la base de datos: ' + err.message);
                      }
                    }
                  }}>
            <TI.Refresh size={12} /> Restablecer base de datos
          </button>
          <div className="muted-2" style={{ fontSize: 10.5, lineHeight: 1.5 }}>
            Vuelve el inventario y las ventas a su estado original (deshace tus pruebas).
          </div>
        </div>
        <div className="muted-2" style={{ fontSize: 10, lineHeight: 1.5, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
          Los cambios y ventas se guardan en la base de datos PostgreSQL.
        </div>
      </div>
    </div>
  );
};

window.FarmaTweaks = FarmaTweaks;
