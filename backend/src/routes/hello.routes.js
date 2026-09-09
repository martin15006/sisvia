import { Router } from 'express';
import { getHello, testSupabase } from '../controllers/hello.controller.js';

const router = Router();

router.get('/hello', getHello);
router.get('/test-supabase', testSupabase);

export default router;