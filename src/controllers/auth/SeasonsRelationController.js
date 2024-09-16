import pool from '../../config/db.js';

// Controller functions with integrated model code

// Get all seasons_relation
// const getAllSeasonsRelations = async (req, res) => {
//     try {
//         const query = 'SELECT * FROM seasons_relation';
//         const [relations] = await pool.query(query);
//         res.json(relations);
//     } catch (error) {
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

const getAllSeasonsRelations = async (req, res) => {
    try {
        const query = `
            SELECT sr.id, sr.season_id, sr.tourism_entities_id, s.name AS season_name, te.name AS tourism_entity_name
            FROM seasons_relation sr
            JOIN seasons s ON sr.season_id = s.id
            JOIN tourist_entities te ON sr.tourism_entities_id = te.id
        `;
        const [relations] = await pool.query(query);
        res.json(relations);
    } catch (error) {
        console.error('Error fetching seasons relations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Get seasons_relation by ID
const getSeasonsRelationById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM seasons_relation WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const relation = rows[0];

        if (relation) {
            res.json(relation);
        } else {
            res.status(404).json({ error: 'Relation not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new seasons_relation
const createSeasonsRelation = async (req, res) => {
    const { season_id, tourism_entities_id } = req.body;
    try {
        // ตรวจสอบว่ามีฤดูกาลและสถานที่ท่องเที่ยวนี้ในตารางอยู่แล้วหรือไม่
        const checkQuery = 'SELECT * FROM seasons_relation WHERE season_id = ? AND tourism_entities_id = ?';
        const [existingRelation] = await pool.query(checkQuery, [season_id, tourism_entities_id]);

        if (existingRelation.length > 0) {
            // หากมีอยู่แล้ว ส่งข้อความแจ้งกลับไป
            return res.status(400).json({ error: 'This season and tourism entity relation already exists.' });
        }

        // ถ้าไม่มีอยู่แล้วทำการ insert ใหม่
        const insertQuery = 'INSERT INTO seasons_relation SET ?';
        const [result] = await pool.query(insertQuery, { season_id, tourism_entities_id });
        res.json({
            message: 'Relation created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a seasons_relation
const updateSeasonsRelation = async (req, res) => {
    const id = req.params.id;
    const relation = req.body;
    try {
        const query = 'UPDATE seasons_relation SET ? WHERE id = ?';
        const [result] = await pool.query(query, [relation, id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Relation with ID ${id} updated successfully` });
        } else {
            res.status(404).json({ error: 'Relation not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a seasons_relation
const deleteSeasonsRelation = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM seasons_relation WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Relation with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Relation not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default {
    getAllSeasonsRelations,
    getSeasonsRelationById,
    createSeasonsRelation,
    updateSeasonsRelation,
    deleteSeasonsRelation,
};
