# I N D U S Backend

A robust Node.js backend service for the I N D U S platform, providing APIs for connecting daily wage workers with employers.

## 🚀 Features

- RESTful API architecture
- Secure authentication with JWT
- MongoDB database integration
- Real-time notifications
- SMS integration with Twilio
- Input validation with express-validator
- CORS enabled for frontend integration
- Environment-based configuration

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **Validation**: express-validator
- **SMS Service**: Twilio
- **Environment Variables**: dotenv
- **Development**: nodemon, concurrently

## 📦 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd I N D U Sbackend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

4. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
I N D U Sbackend/
├── server/
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Application entry point
│   └── package.json       # Server dependencies
├── test/                  # Test files
└── package.json          # Root package.json
```

## 🚀 Available Scripts

- `npm start`: Runs the server in production mode
- `npm run server`: Runs the server with nodemon for development
- `npm run dev`: Runs both server and client concurrently
- `npm test`: Runs the test suite

## 🔒 Environment Variables

The following environment variables are required:

- `PORT`: Server port number
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT
- `TWILIO_ACCOUNT_SID`: Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login user
- `GET /api/auth/verify`: Verify JWT token

### Workers
- `GET /api/workers`: Get all workers
- `GET /api/workers/:id`: Get worker by ID
- `POST /api/workers`: Create new worker profile
- `PUT /api/workers/:id`: Update worker profile
- `DELETE /api/workers/:id`: Delete worker profile

### Jobs
- `GET /api/jobs`: Get all jobs
- `GET /api/jobs/:id`: Get job by ID
- `POST /api/jobs`: Create new job
- `PUT /api/jobs/:id`: Update job
- `DELETE /api/jobs/:id`: Delete job

### Notifications
- `POST /api/notifications/sms`: Send SMS notification
- `GET /api/notifications/:userId`: Get user notifications

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. 