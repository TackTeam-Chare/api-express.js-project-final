import pool from '../../config/db.js';

const getAllCategories = async (req, res) => {
    try {
        const query = 'SELECT * FROM categories';
        const [categories] = await pool.query(query);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default {
    getAllCategories,
};

