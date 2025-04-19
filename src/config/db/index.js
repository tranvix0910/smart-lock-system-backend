import mongoose from 'mongoose';

async function connectDB() {
    try {
        const baseURI = process.env.MONGODB_URI;
        const dbName = process.env.MONGO_DB_NAME;

        const options = {
            dbName: dbName,
            useNewUrlParser: true,
            useUnifiedTopology: true
        };
    
        await mongoose.connect(baseURI, options);
        
        console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
    }
}

export default { connectDB };