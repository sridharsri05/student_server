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
// reminderJob.start();
// console.log('✅ Monthly reminder cron job scheduled.');

// app.use(cors({
//     origin: '*', // Allow all origins
//     methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
//     allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
//     credentials: true // Allow credentials
// }));



// const allowedOrigins = [
//     "http://localhost:5173", // For development
//     "https://student-admin-frontend-seven.vercel.app", // For production
// ];

// // Dynamically configure CORS based on the request origin
// const corsOptions = {
//     origin: function (origin, callback) {
//         if (!origin || allowedOrigins.includes(origin)) {
//             // Allow requests with no origin (like mobile apps or Postman)
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     },
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
//     preflightContinue: false,
//     optionsSuccessStatus: 204,
//     credentials: true, // Allow credentials (cookies, authorization headers, etc.)
//     allowedHeaders: [
//         "Content-Type",
//         "Authorization",
//         "X-Requested-With",
//         "Accept",
//         "Origin",
//         "Access-Control-Allow-Origin",
//         "stripe-signature"
//     ]
// };
// app.use(cors(corsOptions));

// Special handling for Stripe webhook route - must come before bodyParser middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Regular body parsing for all other routes
app.use(bodyParser.json());


app.use(cookieParser());
// All routes in one place
app.use('/api', routes);

app.get('/', (req, res) => res.send('🎉 Server is running'));

export default app;
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
