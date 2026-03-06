import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import exercisesRouter from './exercises';
import templatesRouter from './templates';
import sessionsRouter from './sessions';
import statsRouter from './stats';
import usersRouter from './users';
import exerciseHistoryRouter from './exercise-history';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/exercises', exercisesRouter);
router.use('/exercises/:id/history', exerciseHistoryRouter);
router.use('/templates', templatesRouter);
router.use('/sessions', sessionsRouter);
router.use('/stats', statsRouter);
router.use('/users', usersRouter);

export default router;
