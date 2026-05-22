# UMT-js-homework4 — Announcements REST API + JWT Auth

REST API для дошки оголошень з повноцінною **автентифікацією через
JWT (access + refresh)**, **bcrypt-хешуванням паролів**, **token rotation**
у refresh-flow, **HttpOnly cookie** для refresh-токена і **перевіркою
ownership** (редагувати та видаляти можна лише власні оголошення).

Це розширення [UMT-js-homework3](https://github.com/saniksin/UMT-js-homework3) — додано модель `User`,
модель `RefreshToken`, прив'язку `Announcement.userId` та маршрути
`/auth/*`.

## Стек

| Технологія | Призначення |
|------------|-------------|
| **Node.js + Express 5** | HTTP-сервер |
| **Prisma 7 + SQLite** | ORM + БД (`better-sqlite3` адаптер) |
| **bcrypt** | хешування паролів |
| **jsonwebtoken** | JWT (access + refresh з різними секретами) |
| **cookie-parser** | читання `req.cookies.refreshToken` |
| **celebrate (Joi)** | валідація body / params / query |
| **http-errors** | створення `401`/`403`/`409` через `createHttpError` |
| **swagger-jsdoc + swagger-ui-express** | автодокументація на `/api-docs` |

## Структура проєкту

```
UMT-js-homework4/
├── prisma/
│   ├── schema.prisma            # User, RefreshToken, Announcement(userId)
│   ├── client.js                # PrismaClient + better-sqlite3 адаптер
│   ├── seed.js                  # 2 демо-юзери + 25 оголошень
│   └── migrations/
│       └── 20260522130547_init/
├── src/
│   ├── constants/
│   │   └── time.js              # ACCESS_TOKEN_LIFETIME, REFRESH_TOKEN_LIFETIME
│   ├── controllers/
│   │   ├── announcements.controller.js # CRUD + ownership-checks
│   │   └── auth.controller.js          # register/login/refresh/logout/me
│   ├── middleware/
│   │   └── auth.middleware.js   # Bearer JWT → req.user.id
│   ├── routes/
│   │   ├── announcements.routes.js
│   │   └── auth.routes.js
│   ├── services/
│   │   └── auth.js              # createTokens, setRefreshTokenCookie
│   └── validators/
│       ├── announcements.validator.js
│       └── auth.validator.js
├── app.js                       # Express bootstrap, error handler, Swagger
├── requests.http                # 30+ запитів — повне покриття всіх критеріїв
├── .env / .env.example
├── package.json
└── README.md
```

## Передумови

- Node.js ≥ 20 (тестовано на 24)
- npm
- (нічого більше не потрібно — БД це локальний SQLite-файл)

## Швидкий старт

```bash
# 1. встановити залежності
#    postinstall-скрипт автоматично виконає `prisma generate`
#    (директорія `generated/` у .gitignore і у репо не зберігається)
npm install

# 2. сконфігурувати .env (вже є дев-дефолти, заміни секрети у проді!)
cp .env.example .env

# 3. застосувати міграції (створить файл dev.db у корені проєкту)
npx prisma migrate dev

# 4. (опційно) засіяти демо-дані: 2 юзери + 25 оголошень
npm run db:seed

# 5. запустити сервер
npm start            # або `npm run dev` для авто-перезапуску
```

Сервер слухає `http://localhost:${PORT}` (за замовчуванням `3000`,
див. `.env`).

Swagger UI — `http://localhost:3000/api-docs`.

## Демо-облікові записи (після `npm run db:seed`)

| username     | password         |
|--------------|------------------|
| `test_alice` | `alice-pass-123` |
| `test_bob`   | `bob-pass-123`   |

Префікс `test_` навмисний — він гарантує, що сценарії з `requests.http`
(секція 2 — `POST /auth/register` з `alice` / `bob`) **не конфліктують**
із сід-юзерами й завжди успішно відпрацьовують 201.

Оголошення розподілені почергово — id 1, 3, 5, … належать `test_alice`,
id 2, 4, 6, … — `test_bob`. Це дозволяє одразу перевіряти ownership:
запустити PATCH/DELETE «чужого» id під іншим токеном і отримати 403.

## Endpoint-и

### Публічні

| Метод | Шлях                       | Опис                         |
|-------|----------------------------|------------------------------|
| GET   | `/announcements`           | список (search, sort, page)  |
| GET   | `/announcements/:id`       | одне оголошення              |
| POST  | `/auth/register`           | реєстрація + видача токенів  |
| POST  | `/auth/login`              | вхід + видача токенів        |
| POST  | `/auth/refresh`            | rotation, видача нової пари  |
| GET   | `/api-docs`                | Swagger UI                   |

### Захищені (потрібен `Authorization: Bearer <accessToken>`)

| Метод  | Шлях                  | Особливості                                |
|--------|-----------------------|--------------------------------------------|
| POST   | `/auth/logout`        | видаляє refresh з БД, очищує cookie        |
| GET    | `/auth/me`            | профіль поточного юзера (без `password`)   |
| POST   | `/announcements`      | `userId` автора підставляється з токена    |
| PATCH  | `/announcements/:id`  | + ownership: 403, якщо не власник          |
| DELETE | `/announcements/:id`  | + ownership: 403, якщо не власник          |

### Коди відповідей

| Код | Сценарій |
|-----|----------|
| 200 | Успіх `GET`, `POST /login`, `POST /refresh`, `POST /logout`, `PATCH` |
| 201 | Успіх `POST /register`, `POST /announcements` |
| 204 | Успіх `DELETE /announcements/:id` |
| 400 | Помилка валідації (Joi) |
| 401 | Відсутній/невалідний токен, невірні креди, неіснуючий refresh |
| 403 | Спроба змінити/видалити чуже оголошення |
| 404 | Оголошення з таким id не знайдено |
| 409 | `POST /register` з уже зайнятим `username` |
| 500 | Внутрішня помилка |

## Перевірка ownership (короткий E2E через curl)

```bash
# 1. Аліса логіниться (test_alice — сід-юзер)
ALICE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test_alice","password":"alice-pass-123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 2. Боб логіниться
BOB=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test_bob","password":"bob-pass-123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 3. Боб намагається оновити оголошення id=1 (належить test_alice) → 403
curl -i -X PATCH http://localhost:3000/announcements/1 \
  -H "Authorization: Bearer $BOB" \
  -H 'Content-Type: application/json' \
  -d '{"price":1}'
# → HTTP/1.1 403 Forbidden
#   {"error":"Access denied"}
```

Повний сценарій (включно з token rotation, /me без пароля, перевіркою
401 на невалідному JWT і т.п.) — у `requests.http`.

## Token rotation (як працює `/auth/refresh`)

1. Контролер шукає refreshToken спочатку в `req.cookies.refreshToken`,
   якщо немає — у `req.body.refreshToken`.
2. Запис із цим токеном береться з таблиці `RefreshToken`. Якщо немає —
   `401 Invalid refresh token`.
3. Перевіряється `expiresAt`. Якщо протерміновано — запис видаляється,
   повертається `401 Refresh token expired`.
4. Старий запис видаляється з БД.
5. `createTokens(userId)` випускає **нову пару** і записує новий refresh
   у БД.
6. Новий refresh повертається в тілі відповіді **і** одночасно ставиться
   в HttpOnly cookie з `sameSite=strict`.

Це означає, що **повторне використання старого refresh — неможливе**
(перевірено в `requests.http`, секція 3.3 → 401).

## Скрипти `npm`

```bash
npm start                # node app.js
npm run dev              # node --watch app.js
npm run prisma:migrate   # prisma migrate dev
npm run prisma:generate  # prisma generate (вручну, якщо потрібно перегенерувати)
npm run db:seed          # populate users + announcements
# postinstall            # запускається автоматично після npm install → prisma generate
```

## Troubleshooting

**`Cannot find module '.../generated/prisma/client.js'`** — Prisma client не
згенерований. Це трапляється, коли `postinstall` був пропущений
(наприклад, `npm install --ignore-scripts`). Виконайте вручну:

```bash
npx prisma generate
```

## Конфігурація `.env`

```env
DATABASE_URL="file:./dev.db"
PORT=3000

# Різні секрети для access і refresh
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# 'production' робить HttpOnly cookie з secure=true
NODE_ENV=development
```

## Відповідність критеріїв `task.txt`

| # | Критерій | Бали | Реалізація |
|---|----------|------|-----------|
| 1 | Схема БД та міграція | 2 | `prisma/schema.prisma`, `prisma/migrations/20260522130547_init/migration.sql` |
| 2 | `POST /auth/register` | 2 | bcrypt у `auth.controller.js:23`; 409 у `auth.controller.js:27` |
| 3 | `POST /auth/login` | 2 | однакове повідомлення `Invalid credentials` для обох випадків; refresh у БД + cookie |
| 4 | `POST /auth/refresh` | 2 | приймає з cookie та body; rotation у `auth.controller.js:84-104` |
| 5 | `POST /auth/logout` | 1 | видаляє refresh з БД, чистить cookie |
| 6 | `GET /auth/me` | 1 | захищений, `publicUser()` ховає `password` |
| 7 | Middleware автентифікації | 2 | `src/middleware/auth.middleware.js`, Bearer-extract + 401 |
| 8 | Захист маршрутів оголошень | 2 | `authenticate` на POST/PATCH/DELETE у `announcements.routes.js` |
| 9 | Ownership | 2 | перевірки в `announcements.controller.js:54-58, 70-74` → 403 |
| 10 | Swagger | 2 | повний JSDoc у обох роутерах + `bearerAuth` securityScheme |
| 11 | `requests.http` | 2 | 30+ запитів, секція 6 — без токена, секція 8 — ownership |
| **Σ** | | **20** | усі критерії пройдено E2E |
