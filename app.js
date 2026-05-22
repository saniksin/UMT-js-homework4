import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import { errors as celebrateErrors } from 'celebrate'
import announcementsRouter from './src/routes/announcement.routes.js'
import authRouter from './src/routes/auth.routes.js'

const app = express()
const PORT = process.env.PORT || 3000

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Announcements REST API',
      version: '2.0.0',
      description:
        'REST API для дошки оголошень з JWT-автентифікацією (access + refresh), bcrypt-хешуванням паролів та перевіркою ownership.',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

app.use(express.json())
app.use(cookieParser())

app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/auth', authRouter)
app.use('/announcements', announcementsRouter)

app.use(celebrateErrors())

// 404 Not Found handler — must come after all routers.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Centralised error handler.
app.use((err, req, res, _next) => {
  console.error(err)

  // Invalid JSON body
  if (err.type === 'entity.parse.failed' && err.status === 400) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid JSON',
      validation: {
        body: {
          source: 'body',
          keys: [],
          message: 'Invalid JSON format in request body',
        },
      },
    })
  }

  // createHttpError(401, …), createHttpError(403, …), …
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message })
  }

  // Prisma error codes
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Unique constraint violation' })
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Foreign key constraint failed' })
  }

  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`API docs: http://localhost:${PORT}/api-docs`)
})
