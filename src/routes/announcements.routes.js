import express from 'express'
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  listAnnouncements,
  updateAnnouncement,
} from '../controllers/announcements.controller.js'
import authenticate from '../middleware/auth.middleware.js'
import {
  createAnnouncementValidator,
  idParamValidator,
  listAnnouncementsValidator,
  updateAnnouncementValidator,
} from '../validators/announcements.validator.js'

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 5
 *         title:
 *           type: string
 *           example: "Продам ноутбук ASUS"
 *         description:
 *           type: string
 *           example: "Відмінний стан, 16GB RAM"
 *         price:
 *           type: number
 *           example: 18000
 *         category:
 *           type: string
 *           enum: [sale, service, job, other]
 *           example: sale
 *         contactInfo:
 *           type: string
 *           example: "0991234567"
 *         userId:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AnnouncementInput:
 *       type: object
 *       required: [title, description, price, category, contactInfo]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 100
 *         description:
 *           type: string
 *           minLength: 10
 *         price:
 *           type: number
 *           exclusiveMinimum: 0
 *         category:
 *           type: string
 *           enum: [sale, service, job, other]
 *         contactInfo:
 *           type: string
 *           minLength: 5
 *     AnnouncementPatch:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 100
 *         description:
 *           type: string
 *           minLength: 10
 *         price:
 *           type: number
 *           exclusiveMinimum: 0
 *         category:
 *           type: string
 *           enum: [sale, service, job, other]
 *         contactInfo:
 *           type: string
 *           minLength: 5
 *     ValidationError:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *           example: 400
 *         error:
 *           type: string
 *           example: "Bad Request"
 *         message:
 *           type: string
 *           example: "Validation failed"
 *     NotFoundError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Resource not found"
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Authentication required"
 *     ForbiddenError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Access denied"
 */

/**
 * @swagger
 * /announcements:
 *   get:
 *     summary: Отримати список оголошень з пошуком, сортуванням та пагінацією
 *     tags: [Announcements]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Підрядок для пошуку у назві (нечутливий до регістру)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *         description: Порядок сортування за датою створення (за замовчуванням newest)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Номер сторінки (10 записів на сторінку)
 *     responses:
 *       200:
 *         description: Список оголошень із метаданими пагінації
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Announcement'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, example: 23 }
 *                     page: { type: integer, example: 2 }
 *                     totalPages: { type: integer, example: 3 }
 *                     perPage: { type: integer, example: 10 }
 *       400:
 *         description: Помилка валідації query-параметрів
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get('/', listAnnouncementsValidator, listAnnouncements)

/**
 * @swagger
 * /announcements/{id}:
 *   get:
 *     summary: Отримати одне оголошення за ID
 *     tags: [Announcements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Унікальний ідентифікатор оголошення
 *     responses:
 *       200:
 *         description: Знайдене оголошення
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Невалідний ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Оголошення не знайдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get('/:id', idParamValidator, getAnnouncementById)

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Створити нове оголошення (потребує автентифікації)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnnouncementInput'
 *     responses:
 *       201:
 *         description: Оголошення успішно створено; userId автора підставляється з токена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Помилка валідації даних
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Відсутній або невалідний токен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post('/', authenticate, createAnnouncementValidator, createAnnouncement)

/**
 * @swagger
 * /announcements/{id}:
 *   patch:
 *     summary: Частково оновити власне оголошення
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Унікальний ідентифікатор оголошення
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnnouncementPatch'
 *     responses:
 *       200:
 *         description: Оновлене оголошення
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Помилка валідації або порожнє тіло запиту
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Відсутній або невалідний токен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Спроба редагувати чуже оголошення
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Оголошення не знайдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.patch(
  '/:id',
  authenticate,
  updateAnnouncementValidator,
  updateAnnouncement,
)

/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Видалити власне оголошення
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Унікальний ідентифікатор оголошення
 *     responses:
 *       204:
 *         description: Оголошення видалено (без тіла відповіді)
 *       400:
 *         description: Невалідний ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Відсутній або невалідний токен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Спроба видалити чуже оголошення
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Оголошення не знайдено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.delete('/:id', authenticate, idParamValidator, deleteAnnouncement)

export default router
