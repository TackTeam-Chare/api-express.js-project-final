import pool from '../../config/db.js';

const getAllSeasons = async (req, res) => {
    try {
        const query = 'SELECT * FROM seasons ORDER BY id DESC';
        const [seasons] = await pool.query(query);
        res.json(seasons);
    } catch (error) {
        console.error('Error fetching seasons:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default {
    getAllSeasons,
};
