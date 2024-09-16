import pool from '../config/db.js';
import axios from 'axios';

const processChatbotQuestion = async (question, socket) => {
  let dbResponse = '';
  let hasRelevantData = false;

  try {
    // Check if the question contains specific categories
    if (["สถานที่ท่องเที่ยว", "ที่พัก", "ร้านอาหาร", "ร้านค้าของฝาก"].some(q => question.includes(q))) {
      let category = '';
      if (question.includes("สถานที่ท่องเที่ยว")) category = 'สถานที่ท่องเที่ยว';
      else if (question.includes("ที่พัก")) category = 'ที่พัก';
      else if (question.includes("ร้านอาหาร")) category = 'ร้านอาหาร';
      else if (question.includes("ร้านค้าของฝาก")) category = 'ร้านค้าของฝาก';

      // Query to fetch data from the database
      const [rows] = await pool.query(
        `SELECT te.name, te.description, te.id FROM tourist_entities te
         JOIN categories c ON te.category_id = c.id
         WHERE c.name = ?`, [category]);

      if (rows.length > 0) {
        dbResponse = `ข้อมูลที่พบสำหรับ "${category}":\n`;
        rows.forEach(row => {
          dbResponse += `${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
        });
        hasRelevantData = true;
      } else {
        dbResponse = `ไม่พบข้อมูลที่เกี่ยวข้องสำหรับ "${category}" ในฐานข้อมูล`;
      }
      
      // Emit early response from database to speed up feedback
      socket.emit('botMessage', dbResponse);
    } else {
      dbResponse = "ไม่พบคำถามที่ตรงกับข้อมูลในฐานข้อมูล";
      socket.emit('botMessage', dbResponse);
    }
  } catch (error) {
    dbResponse = "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
    socket.emit('botMessage', dbResponse);
  }

  // Fetch data from Google Places API
  try {
    const externalDataResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json`, {
      params: {
        query: question,
        key: process.env.GOOGLE_PLACES_API_KEY,
      }
    });

    const externalData = externalDataResponse.data.results.map(place => ({
      name: place.name,
      link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
    }));

    let externalResponse = 'ข้อมูลจากแหล่งภายนอก:\n';
    externalData.forEach(place => {
      externalResponse += `${place.name}\n ลิ้งค์ไปยัง Google Maps: ${place.link}\n\n`;
    });
    
    // ส่งข้อมูลจาก Google Maps กลับไปยัง frontend
    socket.emit('botMessage', externalResponse);
    hasRelevantData = true;
    
  } catch (error) {
    const externalError = "\nไม่สามารถดึงข้อมูลจากแหล่งภายนอกได้";
    socket.emit('botMessage', externalError);
  }

  // Use OpenAI GPT-4 for further enhancement if no relevant data found
  if (!hasRelevantData) {
    try {
      const openAIResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: question }],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const aiMessage = openAIResponse.data.choices[0].message.content;
      socket.emit('botMessage', aiMessage);
    } catch (error) {
      console.error('Error from OpenAI API:', error.response ? error.response.data : error.message);
      socket.emit('botMessage', 'เกิดข้อผิดพลาดในการประมวลผลคำตอบจาก AI');
    }
  }
};

export default processChatbotQuestion;
