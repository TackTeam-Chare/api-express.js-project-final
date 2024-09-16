import pool from '../../config/db.js';

const getAllDistricts = async (req, res) => {
    try {
        const query = 'SELECT * FROM district';
        const [districts] = await pool.query(query);
        res.json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default {
    getAllDistricts,
};
