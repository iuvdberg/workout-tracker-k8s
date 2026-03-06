import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// GET /api/users — list all users with session counts (admin only)
router.get('/', authenticate, adminOnly, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// PATCH /api/users/:id — update role (admin only, cannot demote yourself)
router.patch('/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params['id'] as string;
  const { role } = req.body as { role?: string };

  if (role !== 'ADMIN' && role !== 'MEMBER') {
    res.status(400).json({ error: 'role must be ADMIN or MEMBER' });
    return;
  }

  if (id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot change your own role' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true },
  });
  res.json(updated);
});

export default router;
