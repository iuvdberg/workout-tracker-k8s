import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// GET /api/stats — personal stats for the current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // Run independent queries in parallel
  const [sessions, allSets] = await Promise.all([
    // All completed sessions (with startedAt for weekly bucketing)
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { id: true, startedAt: true, completedAt: true },
      orderBy: { startedAt: 'asc' },
    }),

    // All sets for this user (for volume, personal records, muscle groups)
    prisma.exerciseSet.findMany({
      where: { sessionExercise: { session: { userId } } },
      select: {
        reps: true,
        weightKg: true,
        completedAt: true,
        sessionExercise: {
          select: {
            exercise: { select: { id: true, name: true, muscleGroup: true } },
          },
        },
      },
    }),
  ]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const totalSets = allSets.length;
  const totalVolumeKg = allSets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);

  // ── Weekly activity (last 12 weeks) ────────────────────────────────────────
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const weeklyMap = new Map<string, number>();
  // Pre-fill all 12 weeks with 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weeklyMap.set(weekKey(d), 0);
  }
  for (const s of sessions) {
    if (new Date(s.startedAt) >= twelveWeeksAgo) {
      const k = weekKey(new Date(s.startedAt));
      weeklyMap.set(k, (weeklyMap.get(k) ?? 0) + 1);
    }
  }
  const weeklyActivity = Array.from(weeklyMap.entries()).map(([week, count]) => ({ week, count }));

  // ── Personal records (max weight per exercise) ─────────────────────────────
  const prMap = new Map<string, { exerciseId: string; exerciseName: string; maxWeightKg: number; reps: number; date: string }>();
  for (const s of allSets) {
    const ex = s.sessionExercise.exercise;
    const existing = prMap.get(ex.id);
    if (!existing || s.weightKg > existing.maxWeightKg) {
      prMap.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        maxWeightKg: s.weightKg,
        reps: s.reps,
        date: s.completedAt.toISOString(),
      });
    }
  }
  const personalRecords = Array.from(prMap.values())
    .sort((a, b) => b.maxWeightKg - a.maxWeightKg);

  // ── Top exercises by total volume ──────────────────────────────────────────
  const exerciseVolMap = new Map<string, { exerciseId: string; exerciseName: string; totalSets: number; totalVolumeKg: number }>();
  for (const s of allSets) {
    const ex = s.sessionExercise.exercise;
    const entry = exerciseVolMap.get(ex.id) ?? { exerciseId: ex.id, exerciseName: ex.name, totalSets: 0, totalVolumeKg: 0 };
    entry.totalSets += 1;
    entry.totalVolumeKg += s.reps * s.weightKg;
    exerciseVolMap.set(ex.id, entry);
  }
  const topExercises = Array.from(exerciseVolMap.values())
    .sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)
    .slice(0, 8);

  // ── Muscle groups (computed from allSets) ─────────────────────────────────
  const muscleGroupMap = new Map<string, number>();
  for (const s of allSets) {
    const mg = s.sessionExercise.exercise.muscleGroup;
    muscleGroupMap.set(mg, (muscleGroupMap.get(mg) ?? 0) + 1);
  }
  const muscleGroups = Array.from(muscleGroupMap.entries())
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);

  res.json({
    summary: { totalSessions, totalSets, totalVolumeKg: Math.round(totalVolumeKg) },
    weeklyActivity,
    personalRecords,
    topExercises,
    muscleGroups,
  });
});

function weekKey(d: Date): string {
  // ISO week start (Monday)
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default router;
