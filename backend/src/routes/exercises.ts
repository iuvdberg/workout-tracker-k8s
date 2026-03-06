import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { adminOnly } from '../middleware/adminOnly';
import { MuscleGroup } from '../generated/prisma/client';

const router = Router();

const VALID_MUSCLE_GROUPS = new Set<string>([
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'GLUTES', 'CORE', 'FULL_BODY',
]);

// GET /api/exercises — list all (any authenticated user)
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
  });
  res.json(exercises);
});

// POST /api/exercises — create (admin only)
router.post('/', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const { name, muscleGroup, description } = req.body as {
    name?: string;
    muscleGroup?: string;
    description?: string;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!muscleGroup || !VALID_MUSCLE_GROUPS.has(muscleGroup)) {
    res.status(400).json({ error: 'valid muscleGroup is required' });
    return;
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: name.trim(),
      muscleGroup: muscleGroup as MuscleGroup,
      description: description?.trim() || null,
    },
  });
  res.status(201).json(exercise);
});

// PATCH /api/exercises/:id — update (admin only)
router.patch('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const { name, muscleGroup, description } = req.body as {
    name?: string;
    muscleGroup?: string;
    description?: string;
  };

  if (muscleGroup && !VALID_MUSCLE_GROUPS.has(muscleGroup)) {
    res.status(400).json({ error: 'Invalid muscleGroup' });
    return;
  }

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(muscleGroup && { muscleGroup: muscleGroup as MuscleGroup }),
      ...(description !== undefined && { description: description.trim() || null }),
    },
  });
  res.json(exercise);
});

// DELETE /api/exercises/:id — delete (admin only)
router.delete('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  await prisma.exercise.delete({ where: { id } });
  res.status(204).send();
});

export default router;
