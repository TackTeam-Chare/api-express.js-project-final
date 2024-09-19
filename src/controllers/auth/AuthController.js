import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const createAdminHandler = async (req, res) => {
    const { username, password, name } = req.body;
    try {
        const [existingAdmin] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = { username, password: hashedPassword, name };
        const insertId = await createAdmin(admin);

        const token = jwt.sign({ id: insertId, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await storeToken(insertId, token);
        res.json({ message: 'Admin created successfully', id: insertId, token });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: error.message });
    }
};

const storeToken = async (adminId, token) => {
    try {
        await pool.query(
            'INSERT INTO admin_tokens (admin_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = ?',
            [adminId, token, token]
        );
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
};

const loginHandler = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        const admin = rows[0];
        if (admin && await bcrypt.compare(password, admin.password)) {
            const token = jwt.sign(
                { id: admin.id, username: admin.username, name: admin.name },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
              );
            // const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await storeToken(admin.id, token);
            res.json({ token, name: admin.name });
            // res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getProfileHandler = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await getAdminById(adminId);

        if (admin) {
            res.json(admin);
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAdminById = async (adminId) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name FROM admin WHERE id = ?', [adminId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error fetching admin by ID:', error);
        throw new Error('Database query failed');
    }
};

const updateProfileHandler = async (req, res) => {
    const { username, name, password } = req.body;
    const adminId = req.user.id;

    try {
        const [currentProfile] = await pool.query('SELECT * FROM admin WHERE id = ?', [adminId]);
        const currentAdmin = currentProfile[0];

        let updates = [];
        let values = [];

        if (name && name !== currentAdmin.name) {
            updates.push('name = ?');
            values.push(name);
        }

        if (username && username !== currentAdmin.username) {
            updates.push('username = ?');
            values.push(username);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            if (await bcrypt.compare(password, currentAdmin.password)) {
                return res.status(400).json({ error: 'New password must be different from old password' });
            }
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided or same as current values' });
        }

        values.push(adminId);
        const [result] = await pool.query(`UPDATE admin SET ${updates.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows > 0) {
            res.json({ message: 'Profile updated successfully' });
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const logoutHandler = async (req, res) => {
    const adminId = req.user.id;
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) {
            return res.status(403).json({ message: 'Access denied, no token provided.' });
        }
        await pool.query('DELETE FROM admin_tokens WHERE admin_id = ? AND token = ?', [adminId, token]);
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: error.message });
    }
};

const verifyPasswordHandler = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        const admin = rows[0];
        if (admin && await bcrypt.compare(password, admin.password)) {
            res.json({ verified: true });
        } else {
            res.status(401).json({ verified: false });
        }
    } catch (error) {
        console.error('Verify password error:', error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    createAdminHandler,
    storeToken,
    loginHandler,
    verifyPasswordHandler,
    getProfileHandler,
    updateProfileHandler,
    logoutHandler,
};
