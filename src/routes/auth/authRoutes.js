import express from 'express';
import AuthController from '../../controllers/auth/AuthController.js';
import authenticateJWT from '../../middleware/authMiddleware.js';
const router = express.Router();

// Admin
router.post('/login', AuthController.loginHandler);
router.post('/register', AuthController.createAdminHandler);

// token-based authentication
router.post('/logout', authenticateJWT,AuthController.logoutHandler);
router.post('/verify-password', authenticateJWT, AuthController.verifyPasswordHandler);
router.get('/profile',authenticateJWT, AuthController.getProfileHandler);
router.put('/profile',authenticateJWT, AuthController.updateProfileHandler);


export default router;
