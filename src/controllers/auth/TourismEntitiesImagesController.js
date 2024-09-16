import pool from '../../config/db.js';

// Controller functions with integrated model code

// // ดึงภาพทั้งหมด
// const getAllImages = async (req, res) => {
//     try {
//         const query = 'SELECT * FROM tourism_entities_images';
//         const [images] = await pool.query(query);
//         console.log('All Images:', images);
//         res.json(images);
//     } catch (error) {
//         console.error('Error fetching all images:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };
// ดึงภาพทั้งหมด
const getAllImages = async (req, res) => {
    try {
        const query = `
            SELECT tii.id, tii.tourism_entities_id, tii.image_path, te.name as tourism_entity_name
            FROM tourism_entities_images tii
            JOIN tourist_entities te ON tii.tourism_entities_id = te.id
        `;
        const [images] = await pool.query(query);
        images.forEach(image => {
            image.image_url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${image.image_path}`;
        });
        res.json(images);
    } catch (error) {
        console.error('Error fetching all images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ดึงภาพตามไอดี
const getImageById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM tourism_entities_images WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const image = rows[0];
        console.log(`Image with ID ${id}:`, image);
        if (image) {
            image.image_url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${image.image_path}`;
            res.json(image);
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Error fetching image by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



// สร้างภาพใหม่
const createImage = async (req, res) => {
    try {
        const tourism_entities_id = req.body.tourism_entities_id;
        const image_path = req.file.filename;

        // ตรวจสอบว่ามีรูปภาพสำหรับ tourism_entities_id นี้อยู่แล้วหรือไม่
        const [existingImages] = await pool.query('SELECT id FROM tourism_entities_images WHERE tourism_entities_id = ?', [tourism_entities_id]);
        if (existingImages.length > 0) {
            return res.status(400).json({ error: 'Image already exists for this tourism entity' });
        }

        const query = 'INSERT INTO tourism_entities_images (tourism_entities_id, image_path) VALUES (?, ?)';
        const [result] = await pool.query(query, [tourism_entities_id, image_path]);

        res.json({
            message: 'Image uploaded successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating image:', error);
        res.status(500).json({ error: error.message });
    }
};


// อัพเดทภาพที่มีอยู่เดิม
const updateImages = async (req, res) => {
    const id = req.params.id;
    const image_path = req.file.filename;

    try {
        // ตรวจสอบว่า entity ของนักท่องเที่ยวมีอยู่หรือไม่
        const [entity] = await pool.query('SELECT id FROM tourism_entities_images WHERE id = ?', [id]);
        console.log('Tourist Entity:', entity);

        if (entity.length === 0) {
            return res.status(404).json({ error: 'Tourist entity not found' });
        }

        // อัพเดทภาพที่มีอยู่เดิมสำหรับ tourist entity
        const updateQuery = 'UPDATE tourism_entities_images SET image_path = ?, created_at = ? WHERE id = ?';
        const values = [image_path, new Date(), id];
        const [result] = await pool.query(updateQuery, values);
        console.log('Updated Image:', values, 'Affected Rows:', result.affectedRows);

        res.json({ message: `Images for entity with ID ${id} updated successfully` });
    } catch (error) {
        console.error('Error updating images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// const createImage = async (req, res) => {
//     try {
//         const tourism_entities_id = req.body.tourism_entities_id;
//         const images = req.files.map(file => ({
//             tourism_entities_id: tourism_entities_id,
//             image_path: file.filename
//         }));

//         const insertIds = [];
//         for (const image of images) {
//             const query = 'INSERT INTO tourism_entities_images SET ?';
//             const [result] = await pool.query(query, image);
//             insertIds.push(result.insertId);
//             console.log('Insert Image:', image, 'Insert ID:', result.insertId);
//         }

//         res.json({
//             message: 'Images uploaded successfully',
//             ids: insertIds
//         });
//     } catch (error) {
//         console.error('Error creating images:', error);
//         res.status(500).json({ error: error.message });
//     }
// };


// const updateImages = async (req, res) => {
//     const id = req.params.id;
//     const imagePaths = req.files.map(file => file.filename);

//     try {
//         // ตรวจสอบว่า entity ของนักท่องเที่ยวมีอยู่หรือไม่
//         const [entity] = await pool.query('SELECT id FROM tourism_entities_images WHERE id = ?', [id]);
//         console.log('Tourist Entity:', entity);

//         if (entity.length === 0) {
//             return res.status(404).json({ error: 'Tourist entity not found' });
//         }

//         // อัพเดทภาพที่มีอยู่เดิมสำหรับ tourist entity
//         const updateQuery = 'UPDATE tourism_entities_images SET image_path = ?, created_at = ? WHERE id = ?';
//         for (let i = 0; i < imagePaths.length; i++) {
//             const values = [imagePaths[i], new Date(), id];
//             const [result] = await pool.query(updateQuery, values);
//             console.log('Updated Image:', values, 'Affected Rows:', result.affectedRows);
//         }

//         res.json({ message: `Images for entity with ID ${id} updated successfully` });
//     } catch (error) {
//         console.error('Error updating images:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

// const updateImages = async (req, res) => {
//     const id = req.params.id;
//     const imagePaths = req.files.map(file => file.filename);

//     try {
//         // Check if the tourist entity exists
//         const [entity] = await pool.query('SELECT id FROM tourist_entities WHERE id = ?', [id]);
//         console.log('Tourist Entity:', entity);

//         if (entity.length === 0) {
//             return res.status(404).json({ error: 'Tourist entity not found' });
//         }

//         // Delete existing images for the tourist entity
//         const deleteQuery = 'DELETE FROM tourism_entities_images WHERE tourism_entities_id = ?';
//         await pool.query(deleteQuery, [id]);
//         console.log(`Deleted Images for Entity ID ${id}`);

//         // Insert new images for the tourist entity
//         const insertQuery = 'INSERT INTO tourism_entities_images (tourism_entities_id, image_path, created_at) VALUES ?';
//         const values = imagePaths.map(imagePath => [id, imagePath, new Date()]);
//         const [result] = await pool.query(insertQuery, [values]);
//         console.log('Inserted Images:', values, 'Affected Rows:', result.affectedRows);

//         // Check if any rows were affected
//         if (result.affectedRows > 0) {
//             res.json({ message: `Images for entity with ID ${id} updated successfully` });
//         } else {
//             res.status(404).json({ error: 'Entity not found or no images updated' });
//         }
//     } catch (error) {
//         console.error('Error updating images:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };


const deleteImage = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM tourism_entities_images WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        console.log(`Deleted Image by ID ${id}:`, result.affectedRows);
        if (result.affectedRows > 0) {
            res.json({ message: `Image with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    getAllImages,
    getImageById,
    createImage,
    updateImages,
    deleteImage,
};
