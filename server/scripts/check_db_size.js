const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Get DB statistics
    const stats = await mongoose.connection.db.command({ dbStats: 1 });

    const storageSizeBytes = stats.storageSize || 0; // Actual disk storage space used
    const dataSizeBytes = stats.dataSize || 0;       // Raw data size (documents)
    const indexSizeBytes = stats.indexSize || 0;     // Index size

    const storageSizeMB = storageSizeBytes / (1024 * 1024);
    const dataSizeMB = dataSizeBytes / (1024 * 1024);
    const indexSizeMB = indexSizeBytes / (1024 * 1024);

    const limitMB = 512;
    const percentageUsed = (storageSizeMB / limitMB) * 100;

    console.log('\n--- MongoDB Atlas Storage Usage ---');
    console.log(`Database Name:       ${stats.db}`);
    console.log(`Raw Data Size:       ${dataSizeMB.toFixed(4)} MB`);
    console.log(`Index Size:          ${indexSizeMB.toFixed(4)} MB`);
    console.log(`Total Storage Used:  ${storageSizeMB.toFixed(4)} MB (Actual space occupied on disk)`);
    console.log(`Free Tier Limit:     ${limitMB} MB`);
    console.log(`Usage Percentage:    ${percentageUsed.toFixed(2)}%`);
    console.log('------------------------------------\n');

  } catch (err) {
    console.error('Error fetching db stats:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

run();
