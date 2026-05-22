import express from 'express'
import {
  login,
  logout,
  me,
  refresh,
  register,
} from '../controllers/auth.controller.js'
import authenticate from '../middleware/authenticate.js'
import {
  loginValidator,
  refreshValidator,
  registerValidator,
} from '../validators/auth.validator.js'

const router = express.Router()

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         username:
 *           type: string
 *           example: ivan_petrenko
 *         name:
 *           type: string
 *           example: Іван
 *         createdAt:
 *           type: string
 *           format: date-time
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id: { type: integer, example: 1 }
 *             username: { type: string, example: ivan_petrenko }
 *             name: { type: string, example: Іван }
 *         accessToken:
 *           type: string
 *           example: eyJhbGciOi...
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOi...
 *     TokensResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string }
 *         refreshToken: { type: string }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Invalid credentials
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Зареєструвати нового користувача
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, name]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: ivan_petrenko
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: super-secret
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Іван
 *     responses:
 *       201:
 *         description: |
 *           Користувач створений. Refresh token встановлюється в HttpOnly cookie
 *           і одночасно повертається в тілі відповіді.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Помилка валідації
 *       409:
 *         description: Користувач з таким username уже існує
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', registerValidator, register)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Увійти за username і паролем
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: ivan_petrenko
 *               password:
 *                 type: string
 *                 example: super-secret
 *     responses:
 *       200:
 *         description: Вхід успішний; refresh token встановлюється в HttpOnly cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Помилка валідації
 *       401:
 *         description: Невірний username або пароль
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', loginValidator, login)

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Видати нову пару токенів через refresh token
 *     description: |
 *       Refresh token зчитується спочатку з HttpOnly cookie `refreshToken`,
 *       якщо відсутній — з тіла запиту. Виконується token rotation: старий
 *       refresh видаляється, новий записується у БД та повертається в cookie
 *       і в тілі відповіді.
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Опційний fallback, якщо cookie не передана
 *     responses:
 *       200:
 *         description: Нова пара токенів видана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokensResponse'
 *       401:
 *         description: Refresh token відсутній, невалідний або прострочений
 */
router.post('/refresh', refreshValidator, refresh)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Вийти з акаунту (видалити refresh token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refresh token видалений з БД, cookie очищена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Не автентифіковано
 */
router.post('/logout', authenticate, logout)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Отримати дані поточного користувача
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профіль автентифікованого користувача (без пароля)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не автентифіковано
 */
router.get('/me', authenticate, me)

export default router
