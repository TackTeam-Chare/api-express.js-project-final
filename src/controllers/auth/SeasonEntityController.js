import pool from '../../config/db.js';

// Controller functions with integrated model code

const getAllSeasons = async (req, res) => {
    try {
        const query = 'SELECT * FROM seasons';
        const [seasons] = await pool.query(query);
        res.json(seasons);
    } catch (error) {
        console.error('Error fetching seasons:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Get season by ID
const getSeasonById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM seasons WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const season = rows[0];

        if (season) {
            res.json(season);
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createSeason = async (req, res) => {
    const { name, date_start, date_end } = req.body;

    try {
        // Check if the season name already exists
        const checkQuery = 'SELECT COUNT(*) as count FROM seasons WHERE name = ?';
        const [rows] = await pool.query(checkQuery, [name]);

        if (rows[0].count > 0) {
            return res.status(409).json({
                status: 'duplicate',
                message: 'Season name already exists, please choose a different name.'
            });
        }

        // If no duplicate, proceed with the creation
        const query = 'INSERT INTO seasons (name, date_start, date_end) VALUES (?, ?, ?)';
        const [result] = await pool.query(query, [name, date_start, date_end]);
        res.status(201).json({
            message: 'Season created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};



// Update a season
const updateSeason = async (req, res) => {
    const id = req.params.id;
    const season = req.body;
    try {
        const query = 'UPDATE seasons SET ? WHERE id = ?';
        const [result] = await pool.query(query, [season, id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Season with ID ${id} updated successfully` });
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a season
const deleteSeason = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM seasons WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Season with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default {
    getAllSeasons,
    getSeasonById,
    createSeason,
    updateSeason,
    deleteSeason,
};
