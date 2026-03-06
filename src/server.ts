import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import jobRoutes from './routes/job.routes.js';
import offcutRoutes from './routes/offcut.routes.js';
import reportRoutes from './routes/report.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/offcuts', offcutRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
