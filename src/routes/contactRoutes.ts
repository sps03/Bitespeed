import { Router } from 'express';
import { ContactController } from '../controllers/contactController';

const router = Router();
const contactController = new ContactController();

router.post('/identify', contactController.identify);

export default router;

