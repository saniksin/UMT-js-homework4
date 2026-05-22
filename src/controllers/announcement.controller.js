import createHttpError from 'http-errors'
import prisma from '../../prisma/client.js'

const PER_PAGE = 10

export const listAnnouncements = async (req, res) => {
  const search = (req.query.search ?? '').trim()
  const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest'
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1

  const where = {}
  if (search) {
    where.title = { contains: search }
  }

  const orderBy = sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' }

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.announcement.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  res.json({
    data,
    pagination: {
      total,
      page,
      totalPages,
      perPage: PER_PAGE,
    },
  })
}

export const getAnnouncementById = async (req, res) => {
  const id = Number(req.params.id)
  const announcement = await prisma.announcement.findUniqueOrThrow({
    where: { id },
  })
  res.json(announcement)
}

export const createAnnouncement = async (req, res) => {
  const announcement = await prisma.announcement.create({
    data: { ...req.body, userId: req.user.id },
  })
  res.status(201).json(announcement)
}

export const updateAnnouncement = async (req, res) => {
  const id = Number(req.params.id)

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) {
    throw createHttpError(404, 'Resource not found')
  }
  if (existing.userId !== req.user.id) {
    throw createHttpError(403, 'Access denied')
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: req.body,
  })
  res.json(announcement)
}

export const deleteAnnouncement = async (req, res) => {
  const id = Number(req.params.id)

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) {
    throw createHttpError(404, 'Resource not found')
  }
  if (existing.userId !== req.user.id) {
    throw createHttpError(403, 'Access denied')
  }

  await prisma.announcement.delete({ where: { id } })
  res.status(204).end()
}
