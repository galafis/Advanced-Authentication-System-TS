# Advanced-Authentication-System-TS

## English

### Overview

Enterprise-grade authentication system built with TypeScript featuring JWT token management, TOTP-based multi-factor authentication, bcrypt password hashing, role-based access control, account lockout protection, and rate limiting.

### Technology Stack

- **TypeScript 5.0+** with strict mode enabled
- **JWT** (jsonwebtoken) for access and refresh token management
- **bcrypt** (bcryptjs) for secure password hashing
- **TOTP** (RFC 6238) for multi-factor authentication
- **Jest** with ts-jest for testing (73 tests, 94%+ coverage)
- **Node.js** targeting ES2020

### Features

- **User Registration & Login** with email/password credentials
- **JWT Access + Refresh Token** pattern with automatic rotation
- **TOTP-based Multi-Factor Authentication** with setup, enable, verify, and disable flows
- **Password Security** with bcrypt hashing and configurable strength policies
- **Account Lockout** after configurable failed login attempts
- **Rate Limiting** with token-bucket algorithm per user
- **Role-Based Access Control** with customizable roles
- **Session Management** including logout and logout-all-sessions
- **Password Change** with re-authentication and automatic session invalidation
- **Account Deletion** with password confirmation
- **Typed Error Hierarchy** with specific error codes and HTTP status codes
- **Swappable User Store** via interface (in-memory implementation included)
- **Full Test Suite** covering all services and utilities

### Quick Start

```bash
git clone https://github.com/galafis/Advanced-Authentication-System-TS.git
cd Advanced-Authentication-System-TS
npm install
npm run build
npm start
```

### Available Scripts

```bash
npm run build       # Compile TypeScript to JavaScript
npm start           # Run the compiled demo application
npm run dev         # Run directly with ts-node (no build needed)
npm test            # Run test suite with coverage
npm run test:watch  # Run tests in watch mode
npm run lint        # Type-check without emitting files
```

### Project Structure

```
Advanced-Authentication-System-TS/
├── main.ts                              # Demo entry point
├── src/
│   ├── index.ts                         # Public API exports
│   ├── types.ts                         # TypeScript interfaces
│   ├── config.ts                        # Configuration with defaults
│   ├── errors.ts                        # Typed error hierarchy
│   ├── services/
│   │   ├── auth.service.ts              # Main authentication orchestrator
│   │   ├── token.service.ts             # JWT access/refresh token management
│   │   ├── password.service.ts          # bcrypt password hashing
│   │   ├── mfa.service.ts              # TOTP multi-factor authentication
│   │   ├── user.store.ts               # User storage interface + in-memory impl
│   │   └── __tests__/                   # Service tests
│   └── utils/
│       ├── validation.ts                # Email and password validation
│       ├── rate-limiter.ts              # Token-bucket rate limiter
│       └── __tests__/                   # Utility tests
├── package.json
├── tsconfig.json
├── jest.config.ts
└── LICENSE
```

### Usage as a Library

```typescript
import { AuthService, InMemoryUserStore, createConfig } from "./src";

const config = createConfig({
  jwt: {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  },
});

const userStore = new InMemoryUserStore();
const auth = new AuthService(config, userStore);

// Register
const { user, tokens } = await auth.register({
  email: "user@example.com",
  password: "SecureP@ss123!",
});

// Login
const result = await auth.login({
  email: "user@example.com",
  password: "SecureP@ss123!",
});

// Verify access token
const payload = auth.verifyAccessToken(result.tokens.accessToken);

// Refresh tokens
const newTokens = await auth.refreshTokens(result.tokens.refreshToken);

// Setup MFA
const mfa = await auth.setupMfa(user.id);
// Show mfa.otpauthUrl as QR code to user
await auth.enableMfa(user.id, "<totp-token-from-authenticator>");

// Login with MFA
const mfaResult = await auth.login({
  email: "user@example.com",
  password: "SecureP@ss123!",
  mfaToken: "<totp-token>",
});
```

### Configuration

All settings are configurable via `createConfig()`:

| Setting | Default | Description |
|---------|---------|-------------|
| `jwt.accessTokenExpiresIn` | 900 (15 min) | Access token TTL in seconds |
| `jwt.refreshTokenExpiresIn` | 604800 (7 days) | Refresh token TTL in seconds |
| `password.saltRounds` | 12 | bcrypt salt rounds |
| `password.minLength` | 8 | Minimum password length |
| `password.requireUppercase` | true | Require uppercase letter |
| `password.requireLowercase` | true | Require lowercase letter |
| `password.requireNumbers` | true | Require digit |
| `password.requireSpecialChars` | true | Require special character |
| `rateLimit.maxAttempts` | 10 | Max requests per window |
| `rateLimit.windowMs` | 60000 (1 min) | Rate limit window |
| `account.maxFailedAttempts` | 5 | Failed logins before lockout |
| `account.lockoutDurationMs` | 900000 (15 min) | Account lockout duration |

### Error Handling

All errors extend `AuthError` with `code` and `statusCode` fields:

| Error | Code | Status |
|-------|------|--------|
| `InvalidCredentialsError` | INVALID_CREDENTIALS | 401 |
| `UserNotFoundError` | USER_NOT_FOUND | 404 |
| `UserAlreadyExistsError` | USER_ALREADY_EXISTS | 409 |
| `TokenExpiredError` | TOKEN_EXPIRED | 401 |
| `InvalidTokenError` | INVALID_TOKEN | 401 |
| `RateLimitExceededError` | RATE_LIMIT_EXCEEDED | 429 |
| `AccountLockedError` | ACCOUNT_LOCKED | 423 |
| `MfaRequiredError` | MFA_REQUIRED | 403 |
| `InvalidMfaTokenError` | INVALID_MFA_TOKEN | 401 |
| `ValidationError` | VALIDATION_ERROR | 400 |
| `PasswordPolicyError` | PASSWORD_POLICY_ERROR | 400 |

### Scalability

- **Swappable User Store**: The `UserStore` interface can be implemented with any database (PostgreSQL, MongoDB, Redis, etc.)
- **Stateless JWT Tokens**: Access tokens are verified without database lookups
- **Modular Architecture**: Each service is independent and can be scaled or replaced individually
- **Configurable Rate Limiting**: Per-user rate limiting with adjustable windows
- **Token Rotation**: Refresh tokens are rotated on each use to limit exposure

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Author

**Gabriel Demetrios Lafis**
- Data Scientist & Engineer
- Systems Developer & Analyst
- Cybersecurity Specialist

---

## Portugues

### Visao Geral

Sistema de autenticacao de nivel empresarial construido com TypeScript, com gerenciamento de tokens JWT, autenticacao multifator baseada em TOTP, hash de senhas com bcrypt, controle de acesso baseado em funcoes, protecao contra bloqueio de conta e limitacao de taxa.

### Stack Tecnologica

- **TypeScript 5.0+** com modo estrito habilitado
- **JWT** (jsonwebtoken) para gerenciamento de tokens de acesso e refresh
- **bcrypt** (bcryptjs) para hash seguro de senhas
- **TOTP** (RFC 6238) para autenticacao multifator
- **Jest** com ts-jest para testes (73 testes, 94%+ cobertura)
- **Node.js** direcionado para ES2020

### Funcionalidades

- **Registro e Login de Usuarios** com credenciais email/senha
- **Padrao JWT Access + Refresh Token** com rotacao automatica
- **Autenticacao Multifator baseada em TOTP** com fluxos de configuracao, ativacao, verificacao e desativacao
- **Seguranca de Senhas** com hash bcrypt e politicas de forca configuraveis
- **Bloqueio de Conta** apos tentativas de login falhadas configuraveis
- **Limitacao de Taxa** com algoritmo token-bucket por usuario
- **Controle de Acesso Baseado em Funcoes** com funcoes personalizaveis
- **Gerenciamento de Sessoes** incluindo logout e logout de todas as sessoes
- **Alteracao de Senha** com re-autenticacao e invalidacao automatica de sessoes
- **Exclusao de Conta** com confirmacao de senha
- **Hierarquia de Erros Tipada** com codigos de erro e status HTTP especificos
- **User Store Substituivel** via interface (implementacao em memoria incluida)
- **Suite de Testes Completa** cobrindo todos os servicos e utilitarios

### Inicio Rapido

```bash
git clone https://github.com/galafis/Advanced-Authentication-System-TS.git
cd Advanced-Authentication-System-TS
npm install
npm run build
npm start
```

### Contribuindo

Contribuicoes sao bem-vindas! Sinta-se a vontade para enviar um Pull Request.

### Licenca

Este projeto esta licenciado sob a Licenca MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

### Autor

**Gabriel Demetrios Lafis**
- Cientista e Engenheiro de Dados
- Desenvolvedor e Analista de Sistemas
- Especialista em Seguranca Cibernetica
