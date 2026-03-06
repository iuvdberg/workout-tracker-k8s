import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// GET /api/templates — list with exercise count
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const templates = await prisma.workoutTemplate.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(templates);
});

// POST /api/templates — create with exercises (admin)
router.post('/', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const { name, description, exercises = [] } = req.body as {
    name?: string;
    description?: string;
    exercises?: Array<{
      exerciseId: string;
      order: number;
      defaultSets?: number;
      defaultReps?: number;
      defaultWeight?: number;
    }>;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: req.user!.userId,
      exercises: {
        create: exercises.map(e => ({
          exerciseId: e.exerciseId,
          order: e.order,
          defaultSets: e.defaultSets ?? null,
          defaultReps: e.defaultReps ?? null,
          defaultWeight: e.defaultWeight ?? null,
        })),
      },
    },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
    },
  });
  res.status(201).json(template);
});

// GET /api/templates/:id — detail with exercises
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(template);
});

// PUT /api/templates/:id — full replace (admin)
router.put('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const { name, description, exercises = [] } = req.body as {
    name?: string;
    description?: string;
    exercises?: Array<{
      exerciseId: string;
      order: number;
      defaultSets?: number;
      defaultReps?: number;
      defaultWeight?: number;
    }>;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const template = await prisma.workoutTemplate.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      exercises: {
        deleteMany: {},
        create: exercises.map(e => ({
          exerciseId: e.exerciseId,
          order: e.order,
          defaultSets: e.defaultSets ?? null,
          defaultReps: e.defaultReps ?? null,
          defaultWeight: e.defaultWeight ?? null,
        })),
      },
    },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
    },
  });
  res.json(template);
});

// DELETE /api/templates/:id (admin)
router.delete('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  await prisma.workoutTemplate.delete({ where: { id } });
  res.status(204).send();
});

export default router;
