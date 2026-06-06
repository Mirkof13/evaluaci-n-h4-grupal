# FARMABOL — Sistema de Control de Inventarios y Ventas

Sistema completo de gestión de inventario y punto de venta para **Farmacias Bolivianas Unidas (FARMABOL)** — 12 sucursales nacionales.

## Estructura del Proyecto

```
FARMABOL/
├── server.js              # Servidor Express (Backend API REST)
├── db.js                  # Conexión y esquema de base de datos PostgreSQL
├── FARMABOL.html          # Interfaz principal (Frontend React 18)
├── farmabol-app.jsx       # Componente principal + Login + Routing
├── farmabol-data.jsx      # Store reactivo conectado a la API
├── farmabol-screens.jsx   # Pantallas: Dashboard, Productos CRUD
├── farmabol-screens2.jsx  # Pantallas: POS, Ventas, Transferencias, Arquitectura
├── farmabol-ui.jsx        # Componentes compartidos: Modal, Toast, Formularios
├── farmabol-tweaks.jsx    # Panel de configuración de tema
├── icons.jsx              # Iconos SVG inline
├── shell.jsx              # Componentes de estructura: Card, PageHeader
├── styles.css             # Estilos globales (dark mode, diseño premium)
├── eslint.config.js       # Configuración de análisis estático ESLint
├── package.json           # Dependencias del proyecto
├── .env                   # Variables de entorno (NO subir a Git)
├── .gitignore             # Archivos excluidos del repositorio
├── README.md              # Documentación del proyecto
├── ARQUITECTURA.md        # Documentación técnica completa
└── docs/                  # Diagramas UML SVG
    ├── diagrama-arquitectura.svg
    ├── diagrama-clases.svg
    ├── diagrama-er.svg
    ├── diagrama-casos-uso.svg
    └── diagrama-secuencia.svg
```

## Instalación y Ejecución

### Requisitos previos
- **Node.js** v18 o superior
- **PostgreSQL** 14 o superior (instalado y en ejecución)
- **npm** (incluido con Node.js)

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/Mirkof13/evalacionh4.git
cd evalacionh4
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto con las credenciales de tu PostgreSQL:
```env
PORT=3000
PGUSER=postgres
PGPASSWORD=TU_CONTRASEÑA_AQUI
PGHOST=localhost
PGPORT=5432
PGDATABASE=farmabol
```

**4. Iniciar el servidor**
```bash
npm run dev
```

El sistema creará automáticamente la base de datos `farmabol`, las tablas y los datos de demostración al iniciar por primera vez.

**5. Abrir en el navegador**
```
http://localhost:3000
```

## Credenciales de Acceso

| Rol | Usuario | Contraseña | Permisos |
|-----|---------|-----------|----------|
| Administrador | `admin` | `admin123` | CRUD productos, ventas, reportes, transferencias, arquitectura |
| Vendedor | `vendedor` | `venta123` | Registrar ventas, consultar stock, ver transferencias |

## Base de Datos (PostgreSQL)

El sistema gestiona **5 tablas relacionales**:

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Personal con roles ADMIN/VENDEDOR y sucursal asignada |
| `productos` | Catálogo de medicamentos con stock por sucursal (UNIQUE codigo+sucursal) y fecha de vencimiento |
| `ventas` | Cabecera de transacciones de venta |
| `detalle_ventas` | Ítems de cada venta (relación N:M) |
| `transferencias` | Cola de mensajes para transferencia asíncrona entre sucursales |

## API REST — Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Autenticación de usuario |
| `GET` | `/api/state` | Estado completo (productos + ventas + transferencias) |
| `POST` | `/api/productos` | Crear producto (ADMIN) |
| `PUT` | `/api/productos/:id` | Actualizar producto (ADMIN) |
| `DELETE` | `/api/productos/:id` | Eliminar producto (ADMIN) |
| `POST` | `/api/ventas` | Registrar venta (transacción atómica con FOR UPDATE) |
| `POST` | `/api/transferencias` | Encolar transferencia asíncrona (retorna 202 Accepted) |
| `GET` | `/api/transferencias/status/:id` | Consultar estado de transferencia |
| `POST` | `/api/reset` | Restablecer datos de demostración |

## Message Queue (Cola de Mensajes Asíncrona)

El sistema implementa un **middleware de cola en memoria** para procesar transferencias entre sucursales:

1. El admin solicita una transferencia desde el formulario de Transferencias
2. El backend registra la solicitud con estado `PENDIENTE` y retorna `HTTP 202 Accepted` inmediatamente
3. La clase `MessageQueue` procesa el trabajo en segundo plano (con retardo simulado de 3 segundos)
4. El frontend realiza polling cada 2 segundos para actualizar el estado
5. Al completarse, el stock de origen se descuenta y el de destino se incrementa atómicamente

## Arquitectura

**Estilo:** Arquitectura por Capas (Layered Architecture) con Middleware de Message Queue

```
┌───────────────────────────────────────┐
│  Presentación: React 18 (SPA)         │
├───────────────────────────────────────┤
│  Negocio: Express.js Routes           │
│  + MessageQueue (Cola Asíncrona)      │
├───────────────────────────────────────┤
│  Datos: pg Pool + Transacciones ACID  │
├───────────────────────────────────────┤
│  Persistencia: PostgreSQL 18           │
└───────────────────────────────────────┘
```

## Análisis de Calidad Estática (ESLint)

```bash
npm run lint
```
Resultado: **0 errores, 0 advertencias** — Quality Gate: Passed

## Diagramas UML

Los diagramas se encuentran en la carpeta [`docs/`](./docs/):
- [Diagrama de Arquitectura](./docs/diagrama-arquitectura.svg)
- [Diagrama de Clases](./docs/diagrama-clases.svg)
- [Diagrama Entidad-Relación](./docs/diagrama-er.svg)
- [Diagrama de Casos de Uso](./docs/diagrama-casos-uso.svg)
- [Diagrama de Secuencia — Transferencia Asíncrona](./docs/diagrama-secuencia.svg)

## Despliegue en la Nube

Para desplegar en **Render** (gratuito):
1. Subir el repositorio a GitHub
2. Crear un nuevo **Web Service** en [Render](https://render.com)
3. Conectar el repositorio y definir las variables de entorno (`.env`)
4. El comando de inicio es: `npm start`

---

> **Nota:** Este sistema fue desarrollado como entregable de los Hitos 3 y 4 de la materia Software II.
