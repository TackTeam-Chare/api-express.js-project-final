import pool from '../../config/db.js';

// ฟังก์ชันดึงจำนวนผู้เยี่ยมชมทั้งหมด
const getTotalVisitors = async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS total_visitors FROM visitors';
        const [rows] = await pool.query(query);
        const totalVisitors = rows[0].total_visitors;
        res.status(200).json({ totalVisitors });
    } catch (error) {
        console.error('Error fetching total visitors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ฟังก์ชันดึงจำนวนผู้เยี่ยมชมต่อวัน
const getVisitorsByDay = async (req, res) => {
    try {
        const query = `
            SELECT DATE(visit_time) AS visit_date, COUNT(*) AS visitor_count 
            FROM visitors 
            GROUP BY visit_date
            ORDER BY visit_date DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching visitors by day:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ฟังก์ชันดึงจำนวนผู้เยี่ยมชมต่อสัปดาห์
const getVisitorsByWeek = async (req, res) => {
    try {
        const query = `
            SELECT YEARWEEK(visit_time, 1) AS visit_week, COUNT(*) AS visitor_count
            FROM visitors
            GROUP BY visit_week
            ORDER BY visit_week DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching visitors by week:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ฟังก์ชันดึงจำนวนผู้เยี่ยมชมต่อเดือน
const getVisitorsByMonth = async (req, res) => {
    try {
        const query = `
            SELECT DATE_FORMAT(visit_time, '%Y-%m') AS visit_month, COUNT(*) AS visitor_count
            FROM visitors
            GROUP BY visit_month
            ORDER BY visit_month DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching visitors by month:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ฟังก์ชันดึงจำนวนผู้เยี่ยมชมต่อปี
const getVisitorsByYear = async (req, res) => {
    try {
        const query = `
            SELECT YEAR(visit_time) AS visit_year, COUNT(*) AS visitor_count 
            FROM visitors 
            GROUP BY visit_year
            ORDER BY visit_year DESC
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching visitors by year:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ฟังก์ชันดึงจำนวนสถานที่ท่องเที่ยว, ที่พัก, ร้านอาหาร, ร้านค้าของฝาก
const getEntityCounts = async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 1) AS total_tourist_spots,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 2) AS total_accommodations,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 3) AS total_restaurants,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 4) AS total_souvenir_shops
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching entity counts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    getTotalVisitors,
    getVisitorsByDay,
    getVisitorsByWeek,
    getVisitorsByMonth,
    getVisitorsByYear,
    getEntityCounts
};
