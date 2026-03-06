import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router({ mergeParams: true });

// GET /api/exercises/:id/history — all sets for the current user for one exercise
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;

  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: { id: true, name: true, muscleGroup: true },
  });

  if (!exercise) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;

  // Fetch every session where this user performed this exercise, newest first
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: {
      exerciseId: id,
      session: { userId, completedAt: { not: null } },
    },
    include: {
      session: { select: { id: true, name: true, completedAt: true } },
      sets: { orderBy: { setNumber: 'asc' } },
    },
    orderBy: { session: { completedAt: 'desc' } },
    ...(limit !== undefined ? { take: limit } : {}),
  });

  // Build per-session summaries
  const sessions = sessionExercises.map(se => {
    const maxWeightKg = se.sets.length
      ? Math.max(...se.sets.map(s => s.weightKg))
      : 0;
    const totalVolume = se.sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
    return {
      sessionId: se.session.id,
      sessionName: se.session.name,
      date: se.session.completedAt!.toISOString(),
      sets: se.sets.map(s => ({ setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg })),
      maxWeightKg,
      totalVolume: Math.round(totalVolume),
    };
  });

  // Personal record: highest single-set weight across all sessions
  let pr: { weightKg: number; reps: number; date: string } | null = null;
  for (const se of sessionExercises) {
    for (const s of se.sets) {
      if (!pr || s.weightKg > pr.weightKg) {
        pr = { weightKg: s.weightKg, reps: s.reps, date: se.session.completedAt!.toISOString() };
      }
    }
  }

  res.json({ exercise, sessions, personalRecord: pr });
});

export default router;
