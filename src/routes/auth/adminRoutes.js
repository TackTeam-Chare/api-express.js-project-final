import express from 'express';
import DashboardController from '../../controllers/auth/DashboardController.js';
import ChatbotSuggestionController from '../../controllers/auth/ChatbotSuggestionController.js';
import TouristEntityController from '../../controllers/auth/TouristEntityController.js';
import TourismEntitiesImagesController from '../../controllers/auth/TourismEntitiesImagesController.js';
import SeasonEntityController from '../../controllers/auth/SeasonEntityController.js';
import SeasonsRelationController from '../../controllers/auth/SeasonsRelationController.js';
import CategoryEntityController from '../../controllers/auth/CategoryEntityController.js';
import OperatingHoursEntityController from '../../controllers/auth/OperatingHoursEntityController.js';
import DistrictEntityController from '../../controllers/auth/DistrictEntityController.js';
import upload from '../../config/multer.js';


const router = express.Router();


// Route สำหรับดึงจำนวนผู้เยี่ยมชมทั้งหมด
router.get('/dashboard/visitors/total', DashboardController.getTotalVisitors);

// Route สำหรับดึงจำนวนผู้เยี่ยมชมต่อวัน
router.get('/dashboard/visitors/daily', DashboardController.getVisitorsByDay);

// Route สำหรับดึงจำนวนผู้เยี่ยมชมต่อสัปดาห์
router.get('/dashboard/visitors/weekly', DashboardController.getVisitorsByWeek);

// Route สำหรับดึงจำนวนผู้เยี่ยมชมต่อเดือน
router.get('/dashboard/visitors/monthly', DashboardController.getVisitorsByMonth);

// Route สำหรับดึงจำนวนผู้เยี่ยมชมต่อเดือน
router.get('/dashboard/visitors/yearly', DashboardController.getVisitorsByYear);

// Route สำหรับดึงจำนวนสถานที่ท่องเที่ยว, ที่พัก, ร้านอาหาร, ร้านค้าของฝาก
router.get('/dashboard/entities/counts', DashboardController.getEntityCounts);

// Get all chatbot suggestions
router.get('/chatbot-suggestions', ChatbotSuggestionController.getAllChatbotSuggestions);

// Get chatbot suggestion by ID
router.get('/chatbot-suggestions/:id', ChatbotSuggestionController.getChatbotSuggestionById);

// Create a new chatbot suggestion
router.post('/chatbot-suggestions', ChatbotSuggestionController.createChatbotSuggestion);

// Update a chatbot suggestion
router.put('/chatbot-suggestions/:id', ChatbotSuggestionController.updateChatbotSuggestion);

// Delete a chatbot suggestion
router.delete('/chatbot-suggestions/:id', ChatbotSuggestionController.deleteChatbotSuggestion);

router.get('/search', TouristEntityController.searchTouristEntities);

// Tourist Entities
router.get('/check-duplicate-name', TouristEntityController.checkDuplicateName);
router.get('/place', TouristEntityController.getAllTouristEntities); // ดึงข้อมูลตารางสถานที่ทั้งหมด
router.get('/place/:id', TouristEntityController.getTouristEntityById); // ดึงข้อมูลตารางสถานที่ด้วยไอดี
router.post('/place', upload.array('image_paths', 10), TouristEntityController.createTouristEntity);
router.put('/place/:id', upload.array('image_paths', 10), TouristEntityController.updateTouristEntity);
router.delete('/place/:id', TouristEntityController.deleteTouristEntity); // ลบข้อมูลสถานที่ท่องเที่ยวตามไอดี

// Images routes
router.get('/images', TourismEntitiesImagesController.getAllImages);
router.get('/images/:id', TourismEntitiesImagesController.getImageById);
router.post('/insert-images-place', upload.array('image_paths', 10), TourismEntitiesImagesController.createImage);
router.put('/update-images-place/:id', upload.single('image_paths'), TourismEntitiesImagesController.updateImages);
router.delete('/images/:id', TourismEntitiesImagesController.deleteImage);

// Operating Hours
router.get('/time', OperatingHoursEntityController.getAllOperatingHours); // ดึงข้อมูลเวลาทำการทั้งหมด
router.get('/time/:id', OperatingHoursEntityController.getOperatingHoursById); // ดึงข้อมูลเวลาทำการตามไอดี
router.post('/time', OperatingHoursEntityController.createOperatingHours); // เพิ่มเวลาทำการใหม่
router.put('/time/:id', OperatingHoursEntityController.updateOperatingHours); // อัปเดตเวลาทำการตามไอดี
router.delete('/time/:id', OperatingHoursEntityController.deleteOperatingHours); // ลบเวลาทำการตามไอดี

// Seasons
router.get('/seasons', SeasonEntityController.getAllSeasons); // ดึงข้อมูลฤดูกาลทั้งหมด
router.get('/seasons/:id', SeasonEntityController.getSeasonById); // ดึงข้อมูลสถานที่ท่องเที่ยวตามฤดูกาล
router.post('/seasons', SeasonEntityController.createSeason); // เพิ่มฤดูกาลใหม่
router.put('/seasons/:id', SeasonEntityController.updateSeason); // อัปเดตฤดูกาลตามไอดี
router.delete('/seasons/:id', SeasonEntityController.deleteSeason); // ลบฤดูกาลตามไอดี

// Seasons Relation
router.get('/seasons-relation', SeasonsRelationController.getAllSeasonsRelations);
router.get('/seasons-relation/:id', SeasonsRelationController.getSeasonsRelationById);
router.post('/seasons-relation', SeasonsRelationController.createSeasonsRelation);
router.put('/seasons-relation/:id', SeasonsRelationController.updateSeasonsRelation);
router.delete('/seasons-relation/:id', SeasonsRelationController.deleteSeasonsRelation);


// Districts
router.get('/districts', DistrictEntityController.getAllDistricts); // ดึงข้อมูลเขตทั้งหมด
router.get('/districts/:id', DistrictEntityController.getDistrictById); // ดึงข้อมูลสถานที่ท่องเที่ยวตามเขต
router.post('/districts', DistrictEntityController.createDistrict); // เพิ่มเขตใหม่
router.put('/districts/:id', DistrictEntityController.updateDistrict); // อัปเดตเขตตามไอดี
router.delete('/districts/:id', DistrictEntityController.deleteDistrict); // ลบเขตตามไอดี

// Categories
router.get('/categories', CategoryEntityController.getAllCategories); // ดึงข้อมูลหมวดหมู่ทั้งหมด
router.get('/categories/:id', CategoryEntityController.getCategoryById); // ดึงข้อมูลตามหมวดหมู่
router.get('/categories/:id/place', CategoryEntityController.getTouristEntitiesByCategory); 
router.post('/categories', CategoryEntityController.createCategory); // เพิ่มหมวดหมู่ใหม่
router.put('/categories/:id', CategoryEntityController.updateCategory); // อัปเดตหมวดหมู่ตามไอดี
router.delete('/categories/:id', CategoryEntityController.deleteCategory); // ลบหมวดหมู่ตามไอดี

export default router;
