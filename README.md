# San Pablo API

API backend para tienda de arte y librería.

## Tech Stack

- **Runtime**: Node.js 20+ con TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL con Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT
- **Storage**: AWS S3
- **Queue**: AWS SQS
- **Email**: SMTP (Google Workspace / Gmail)

## Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Ejecutar migraciones
npm run db:migrate

# 4. Iniciar servidor de desarrollo
npm run dev
```

## Scripts

```bash
npm run dev              # Servidor de desarrollo con hot reload
npm run build            # Build para producción
npm start                # Iniciar servidor de producción
npm run typecheck        # Type checking
npm run lint             # Linting
npm run lint:fix         # Fix linting issues
npm run format           # Formatear código
npm run db:generate      # Generar migraciones desde schema
npm run db:migrate       # Ejecutar migraciones pendientes
npm run db:push          # Push schema directo (solo dev)
npm run db:studio        # Abrir Drizzle Studio
npm test                 # Ejecutar tests
npm run test:watch       # Tests en modo watch
```

## Configuración de Email (SMTP)

La API usa SMTP para enviar emails transaccionales (notificaciones de pedidos, confirmaciones, etc.).

### Google Workspace / Gmail

Para configurar SMTP con tu cuenta de Google Workspace o Gmail:

#### 1. Habilitar 2-Step Verification

Es **obligatorio** tener la verificación en dos pasos activada para usar App Passwords.

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. En "Signing in to Google", haz clic en "2-Step Verification"
3. Sigue los pasos para activarla

#### 2. Generar App Password

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. En "Signing in to Google", haz clic en "2-Step Verification"
3. Al final de la página, haz clic en "App passwords"
4. Selecciona "Mail" como aplicación
5. Selecciona tu dispositivo o "Other"
6. Haz clic en "Generate"
7. **Copia la contraseña de 16 caracteres** (se muestra una sola vez)

#### 3. Configurar Variables de Entorno

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@tudominio.com      # Tu email completo
SMTP_PASS=abcd-efgh-ijkl-mnop         # App Password (sin espacios)
SMTP_FROM_EMAIL=pedidos@tudominio.com # Email remitente
```

#### Notas importantes

- **SMTP_USER**: Debe ser tu dirección de email completa (ej: `ventas@miempresa.com`)
- **SMTP_PASS**: Es el App Password de 16 caracteres, **NO** tu contraseña normal de Google
- **SMTP_FROM_EMAIL**: Puede ser igual a `SMTP_USER` o un alias configurado en tu cuenta
- **SMTP_PORT 587**: Usa STARTTLS (conexión que se encripta después de conectar)
- **SMTP_PORT 465**: Usa SSL/TLS directo (requiere `SMTP_SECURE=true`)

### Otros proveedores SMTP

Puedes usar cualquier proveedor SMTP. Algunos ejemplos:

| Proveedor              | Host                              | Port | Secure |
| ---------------------- | --------------------------------- | ---- | ------ |
| Gmail/Google Workspace | smtp.gmail.com                    | 587  | false  |
| Outlook/Office 365     | smtp.office365.com                | 587  | false  |
| SendGrid               | smtp.sendgrid.net                 | 587  | false  |
| Mailgun                | smtp.mailgun.org                  | 587  | false  |
| Amazon SES             | email-smtp.{region}.amazonaws.com | 587  | false  |

### Verificar conexión SMTP

Para verificar que la configuración SMTP es correcta al iniciar el servidor, puedes usar la función `verifyEmailConnection()` de `src/config/email.ts`:

```typescript
import { verifyEmailConnection } from './config/email';

// En tu startup
const emailOk = await verifyEmailConnection();
if (!emailOk) {
  console.warn('SMTP not configured correctly - emails will fail');
}
```

## Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

### Variables requeridas

| Variable                | Descripción                                  |
| ----------------------- | -------------------------------------------- |
| `DATABASE_URL`          | Connection string de PostgreSQL              |
| `JWT_SECRET`            | Secret para firmar tokens JWT (min 32 chars) |
| `AWS_ACCESS_KEY_ID`     | Credenciales AWS para S3/SQS                 |
| `AWS_SECRET_ACCESS_KEY` | Credenciales AWS para S3/SQS                 |
| `S3_BUCKET`             | Nombre del bucket S3                         |
| `SMTP_USER`             | Email para autenticación SMTP                |
| `SMTP_PASS`             | Contraseña/App Password SMTP                 |
| `SMTP_FROM_EMAIL`       | Email remitente                              |
| `OWNER_EMAIL`           | Email del dueño (notificaciones)             |
| `OWNER_WHATSAPP`        | WhatsApp del dueño (links en emails)         |

## Estructura del Proyecto

```
src/
├── config/           # Configuración (env, database, aws, email, swagger)
├── db/schema/        # Definiciones de tablas Drizzle
├── db/migrations/    # Migraciones auto-generadas
├── modules/[name]/   # Módulos de features (controller, service, routes, schemas)
├── shared/middleware/  # Express middleware
├── shared/utils/     # Funciones utilitarias
├── shared/types/     # Tipos TypeScript compartidos
├── workers/          # Workers de SQS
├── app.ts            # Setup de Express app
└── server.ts         # Entry point
```

## API Documentation

La documentación Swagger está disponible en `/api-docs` cuando el servidor está corriendo.

```
http://localhost:3000/api-docs
```

## License

ISC
