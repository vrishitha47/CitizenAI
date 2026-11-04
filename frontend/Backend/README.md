# Civic Backend — Part 1 (Auth Module)

Spring Boot backend for the AI-Powered Civic Issue Reporting & Management System.
This is **Part 1**: project scaffold, MySQL connection, and a working JWT authentication module with `CITIZEN` and `ADMIN` roles.

## Prerequisites (install these on your Windows machine)

1. **Java 17 JDK** — https://adoptium.net/ (Temurin 17). Verify: `java -version` shows `17`.
2. **Maven 3.9+** — https://maven.apache.org/download.cgi (or use the Maven bundled with IntelliJ IDEA).
3. **MySQL 8** — https://dev.mysql.com/downloads/installer/ . Note the root password you set.

## Configure the database

The app auto-creates the `civic_db` database on first run. You only need to make sure the
username/password in `src/main/resources/application.properties` match your MySQL:

```properties
spring.datasource.username=root
spring.datasource.password=root   # <-- change to YOUR MySQL root password
```

## Run it

From the `backend/` folder:

```bash
mvn spring-boot:run
```

Or open the `backend` folder in IntelliJ IDEA and run `CivicBackendApplication`.

The server starts on **http://localhost:8080**.

On first startup a default admin is created:

- **Email:** `admin@civic.com`
- **Password:** `admin123`

## Try the endpoints

Health check (public):

```bash
curl http://localhost:8080/api/health
```

Register a citizen:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jane Citizen\",\"email\":\"jane@example.com\",\"password\":\"secret123\"}"
```

Login:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"password\":\"secret123\"}"
```

Both return a JSON body with a `token`. Use it to call protected endpoints:

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

## What's implemented in Part 1

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/health` | GET | Public | Service health check |
| `/api/auth/register` | POST | Public | Register a new citizen |
| `/api/auth/login` | POST | Public | Login, returns JWT |
| `/api/auth/me` | GET | Authenticated | Current user profile |

- Passwords hashed with **BCrypt**.
- **Stateless JWT** auth (token in `Authorization: Bearer` header).
- Role-based access: `/api/admin/**` will require `ADMIN` (used in later parts).
- CORS pre-configured for the React dev server (`localhost:5173` and `localhost:3000`).
- Global exception handler returns consistent JSON errors.

## Project structure

```
backend/src/main/java/com/civic/backend/
├── CivicBackendApplication.java      # main entry point
├── auth/                             # register/login endpoints + logic
│   ├── AuthController.java
│   ├── AuthService.java
│   └── dto/                          # request/response objects
├── security/                         # JWT + Spring Security config
│   ├── JwtService.java
│   ├── JwtAuthenticationFilter.java
│   ├── CustomUserDetailsService.java
│   └── SecurityConfig.java
├── user/                             # User entity, Role enum, repository
├── common/                           # health check + error handling
└── config/                           # default admin seeder
```

## Part 2 — Complaint Management (implemented)

Entities: **Complaint**, **AIAnalysis** (filled in Part 3), **ComplaintHistory** (audit trail).
Images are uploaded to a local `uploads/` folder and served at `/uploads/**`.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/categories` | GET | Public | List issue categories (value + label) |
| `/api/complaints` | POST | Citizen/Admin | Report an issue (multipart: `image` file + `data` JSON) |
| `/api/complaints/mine` | GET | Citizen/Admin | List the caller's own complaints |
| `/api/complaints/{id}` | GET | Owner or Admin | View one complaint (with AI + history) |
| `/api/admin/complaints` | GET | Admin | Paginated + filterable list (category/severity/status) |
| `/api/admin/complaints/{id}/status` | PATCH | Admin | Update status / assign / add remark |

### Reporting an issue (multipart example)

The POST expects two parts: the image file and a `data` part containing JSON.

```bash
# 1) get a token first (login as jane), then:
curl.exe -X POST http://localhost:8080/api/complaints ^
  -H "Authorization: Bearer <TOKEN>" ^
  -F "image=@C:\path\to\pothole.jpg" ^
  -F "data={\"category\":\"POTHOLE\",\"description\":\"Large pothole near junction\",\"latitude\":12.9716,\"longitude\":77.5946,\"locationAddress\":\"Main Road\"};type=application/json"
```

The response includes a generated `referenceCode` like `CIV-10001`, the `status`
(`SUBMITTED`), and an empty `aiAnalysis` (populated in Part 3).

### Status lifecycle

`SUBMITTED → AI_ANALYSIS → ASSIGNED → IN_PROGRESS → RESOLVED` (or `REJECTED`).
Every change is written to `complaint_history` with who did it and a remark.

## Next: Part 3

Mock AI service (Python/FastAPI) that returns a detected category, confidence,
severity and bounding box — wired into the backend so complaints get analysed
automatically on submission.
