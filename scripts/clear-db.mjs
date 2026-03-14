/**
 * Clears all documents from users, tasks, projects, and attendance collections in MongoDB Atlas.
 * Run: node scripts/clear-db.mjs
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';

await mongoose.connect(uri);
console.log('Connected to MongoDB Atlas');

const db = mongoose.connection.db;
const collections = ['users', 'tasks', 'projects', 'attendances'];

for (const col of collections) {
  const result = await db.collection(col).deleteMany({});
  console.log(`  ${col}: deleted ${result.deletedCount} documents`);
}

console.log('Done. All collections cleared.');
await mongoose.disconnect();
