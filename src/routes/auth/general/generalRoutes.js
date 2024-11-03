import express from 'express';
import GeneralController from '../../../controllers/auth/general/GeneralController.js';

const router = express.Router();

router.get('/filters', GeneralController.getAllFilters); // Route to fetch all filters (seasons, districts, categories)

router.get('/search', GeneralController.getTouristEntities); // Unified search route for all criteria

export default router;