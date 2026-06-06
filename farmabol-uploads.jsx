// FARMABOL — Cloud Storage: Upload y descarga de comprobantes

const UI2 = window.Icons;
const UShell2 = window.Shell;
const { useState: uS2, useRef: uR2 } = React;

const UploadsScreen = ({ user }) => {
  const store = window.useStore();
  const s = store.get();
  const toast = window.useToast();
  const fileRef = uR2(null);
  const [files, setFiles] = uS2(s.comprobantes || []);
  const [uploading, setUploading] = uS2(false);

  React.useEffect(() => {
    fetch('/api/comprobantes')
      .then(r => r.json())
      .then(data => setFiles(data))
      .catch(() => {});
  }, [s.comprobantes]);

  const uploadFile = async () => {
    const fileInput = fileRef.current;
    if (!fileInput.files.length) { toast('Selecciona un archivo', 'warn'); return; }
    const formData = new FormData();
    formData.append('archivo', fileInput.files[0]);
    formData.append('tipo', 'comprobante');
    try {
      setUploading(true);
      const res = await fetch('/api/comprobantes/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error al subir archivo');
      await res.json();
      toast('Archivo subido exitosamente a la nube');
      fileInput.value = '';
      const updated = await fetch('/api/comprobantes').then(r => r.json());
      setFiles(updated);
      await store.reloadState();
    } catch (err) {
      toast(err.message || 'Error al subir archivo', 'danger');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <UShell2.PageHeader
        title="Almacenamiento en la Nube"
        sub={<span>{user.sucursal} · Sube y consulta comprobantes, fotos y QR</span>}
      />

      <div className="grid-2" style={{ marginBottom: 14 }}>
        {user.rol === 'ADMIN' && (
          <UShell2.Card title="Subir archivo" sub="Comprobantes de venta, fotos, códigos QR">
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Seleccionar archivo</label>
              <input ref={fileRef} type="file" className="input" accept="image/*,.pdf" style={{ padding: 8 }} />
            </div>
            <button className="btn primary" onClick={uploadFile} disabled={uploading}>
              <UI2.Upload size={14} /> {uploading ? 'Subiendo...' : 'Subir a la nube'}
            </button>
          </UShell2.Card>
        )}

        <UShell2.Card title="Archivos almacenados" sub={`${files.length} archivos en total`}>
          {files.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}><div className="ico"><UI2.Clipboard size={20} /></div>Sin archivos aún</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(f => (
                <div key={f.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 10,
                  padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--accent)',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{f.nombre_archivo}</div>
                    <div className="muted-2" style={{ fontSize: 11.5 }}>
                      {f.tipo} · {f.fecha}
                    </div>
                  </div>
                  <a href={f.url} target="_blank" className="btn ghost sm" rel="noopener noreferrer">
                    <UI2.Download size={13} /> Ver
                  </a>
                </div>
              ))}
            </div>
          )}
        </UShell2.Card>
      </div>
    </>
  );
};

window.UploadsScreen = UploadsScreen;
