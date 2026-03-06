import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// Verify session ownership (user owns it or is admin)
async function getOwnedSession(sessionId: string, req: AuthRequest, res: Response) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }
  if (session.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return session;
}

// GET /api/sessions — list current user's sessions
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: req.user!.userId },
    include: { _count: { select: { exercises: true } } },
    orderBy: { startedAt: 'desc' },
  });
  res.json(sessions);
});

// POST /api/sessions — start a new session
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, templateId } = req.body as { name?: string; templateId?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  // If starting from a template, load its exercises to pre-populate
  let templateExercises: Array<{
    exerciseId: string;
    order: number;
  }> = [];

  if (templateId) {
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    templateExercises = template.exercises.map(te => ({
      exerciseId: te.exerciseId,
      order: te.order,
    }));
  }

  const session = await prisma.workoutSession.create({
    data: {
      name: name.trim(),
      userId: req.user!.userId,
      templateId: templateId ?? null,
      exercises: {
        create: templateExercises.map(te => ({
          exerciseId: te.exerciseId,
          order: te.order,
        })),
      },
    },
    include: {
      exercises: {
        include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  res.status(201).json(session);
});

// GET /api/sessions/:id — session detail with exercises and sets
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  const detail = await prisma.workoutSession.findUnique({
    where: { id: session.id },
    include: {
      exercises: {
        include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  res.json(detail);
});

// PATCH /api/sessions/:id — update name/notes or mark complete
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  const { name, notes, complete } = req.body as {
    name?: string;
    notes?: string;
    complete?: boolean;
  };

  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(notes !== undefined && { notes: notes.trim() || null }),
      ...(complete && { completedAt: new Date() }),
    },
    include: {
      exercises: {
        include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  res.json(updated);
});

// DELETE /api/sessions/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;
  await prisma.workoutSession.delete({ where: { id: session.id } });
  res.status(204).send();
});

// POST /api/sessions/:id/exercises — add an exercise to the session
router.post('/:id/exercises', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  if (session.completedAt) {
    res.status(400).json({ error: 'Session is already completed' });
    return;
  }

  const { exerciseId } = req.body as { exerciseId?: string };
  if (!exerciseId) {
    res.status(400).json({ error: 'exerciseId is required' });
    return;
  }

  const maxOrder = await prisma.sessionExercise.aggregate({
    where: { sessionId: session.id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const sessionExercise = await prisma.sessionExercise.create({
    data: { sessionId: session.id, exerciseId, order: nextOrder },
    include: { exercise: true, sets: true },
  });
  res.status(201).json(sessionExercise);
});

// DELETE /api/sessions/:id/exercises/:sessionExerciseId
router.delete('/:id/exercises/:sessionExerciseId', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  await prisma.sessionExercise.deleteMany({
    where: { id: req.params['sessionExerciseId'] as string, sessionId: session.id },
  });
  res.status(204).send();
});

// POST /api/sessions/:id/exercises/:sessionExerciseId/sets — log a set
router.post('/:id/exercises/:sessionExerciseId/sets', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  if (session.completedAt) {
    res.status(400).json({ error: 'Session is already completed' });
    return;
  }

  const { reps, weightKg } = req.body as { reps?: number; weightKg?: number };
  if (!reps || weightKg === undefined) {
    res.status(400).json({ error: 'reps and weightKg are required' });
    return;
  }

  const sessionExercise = await prisma.sessionExercise.findFirst({
    where: { id: req.params['sessionExerciseId'] as string, sessionId: session.id },
    include: { sets: true },
  });
  if (!sessionExercise) {
    res.status(404).json({ error: 'Exercise not found in session' });
    return;
  }

  const nextSetNumber = sessionExercise.sets.length + 1;
  const set = await prisma.exerciseSet.create({
    data: {
      sessionExerciseId: sessionExercise.id,
      setNumber: nextSetNumber,
      reps: Number(reps),
      weightKg: Number(weightKg),
    },
  });
  res.status(201).json(set);
});

// DELETE /api/sessions/:id/exercises/:sessionExerciseId/sets/:setId
router.delete('/:id/exercises/:sessionExerciseId/sets/:setId', authenticate, async (req: AuthRequest, res: Response) => {
  const session = await getOwnedSession(req.params['id'] as string, req, res);
  if (!session) return;

  await prisma.exerciseSet.deleteMany({
    where: { id: req.params['setId'] as string, sessionExercise: { sessionId: session.id } },
  });
  res.status(204).send();
});

export default router;
