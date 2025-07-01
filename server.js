import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import reminderJob from './jobs/reminderJob.js'; // ✅ Add this
import cookieParser from 'cookie-parser';

dotenv.config();
const app = express();
connectDB();

// Start cron job
reminderJob.start();
console.log('✅ Monthly reminder cron job scheduled.');

app.use(cors({
    origin: 'http://localhost:5173', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true // Allow credentials
}));
app.use(bodyParser.json());


app.use(cookieParser());
// All routes in one place
app.use('/api', routes);

app.get('/', (req, res) => res.send('🎉 Server is running'));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
