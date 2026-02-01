const mongoose = require('mongoose');

// Set to false to allow querying for fields not defined in the schema
mongoose.set('strictQuery', false);

const connectDB = async () => {
  // Check if the MONGODB_URI is provided
  if (!process.env.MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
    process.exit(1); // Exit the process with a failure code
  }

  try {
    console.log('Attempting to connect to MongoDB Atlas...');

    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds for cloud connections
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected Successfully: ${connection.connection.host}`);
    return connection;

  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    // In a production environment, the container will likely restart,
    // but exiting ensures it doesn't run in a faulty state.
    process.exit(1);
  }
};

module.exports = connectDB;
