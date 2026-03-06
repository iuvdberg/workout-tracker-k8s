import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { getAuthUrl, exchangeCodeForUser } from '../lib/googleOAuth';
import { signToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// Step 1: redirect user to Google's consent screen
router.get('/google', (_req: Request, res: Response) => {
  res.redirect(getAuthUrl());
});

// Step 2: Google redirects back here with an auth code
router.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const googleUser = await exchangeCodeForUser(code);

    // Upsert: create user on first login, update avatar/name on subsequent logins
    const user = await prisma.user.upsert({
      where: { googleId: googleUser.googleId },
      update: {
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
      },
      create: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';

    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    next(err);
  }
});

// Returns the currently authenticated user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
