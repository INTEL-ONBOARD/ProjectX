import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import mongoose, { Schema } from 'mongoose';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const rootDir = process.cwd();
const defaultBackupDir = path.join(rootDir, 'backups', 'cloud-attachments-cleanup-2026-04-28T08-07-46-491Z');
const backupDir = path.resolve(process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? defaultBackupDir);
const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) process.env[key] = value;
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(backupDir, relativePath), 'utf8'));
}

function mimeFromName(name) {
  const ext = path.extname(name).toLowerCase();
  return {
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }[ext] || 'application/octet-stream';
}

function deterministicId(input) {
  return `restored-${createHash('sha256').update(input).digest('hex').slice(0, 32)}`;
}

function sanitizeFileName(name) {
  return path.basename(name).replace(/[^\w.\-() ]+/g, '_').replace(/\s+/g, ' ').trim() || 'attachment';
}

function r2Config() {
  const endpoint = (process.env.R2_ENDPOINT || (process.env.CLOUDFLARE_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')).replace(/\/+$/, '');
  const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const rawSecret = process.env.R2_SECRET_ACCESS_KEY;
  const secretAccessKey = rawSecret?.startsWith('cfat_')
    ? createHash('sha256').update(rawSecret).digest('hex')
    : rawSecret;
  const missing = [
    ['MONGODB_URI', process.env.MONGODB_URI],
    ['R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID', endpoint],
    ['R2_BUCKET_NAME', bucket],
    ['R2_ACCESS_KEY_ID', accessKeyId],
    ['R2_SECRET_ACCESS_KEY', secretAccessKey],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing required env values: ${missing.join(', ')}`);
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, '.env.local'));

if (!fs.existsSync(backupDir)) {
  throw new Error(`Backup directory not found: ${backupDir}`);
}

const summary = readJson('summary.json');
const imageManifest = readJson('task-images-manifest.json');
const attachmentMetadata = readJson('attachments-metadata.json');
const copiedAttachments = readJson('copied-local-attachments.json');
const copiedByAttachId = new Map(copiedAttachments.map(item => [item.attachId, item]));
const config = r2Config();
const s3 = new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

const TaskSchema = new Schema({ appId: String, files: Number }, { strict: false });
const AttachmentSchema = new Schema({
  attachId: { type: String, required: true, unique: true },
  taskId: { type: String, required: true },
  name: { type: String, required: true },
  filePath: { type: String, default: '' },
  storageProvider: { type: String, default: 'r2' },
  storageKey: { type: String, default: '' },
  mimeType: { type: String, default: 'application/octet-stream' },
  kind: { type: String, default: 'file' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: String, required: true },
}, { strict: false });
const TaskModel = mongoose.model('Task', TaskSchema);
const AttachmentModel = mongoose.model('Attachment', AttachmentSchema);

const stats = {
  imageCandidates: 0,
  fileCandidates: 0,
  uploaded: 0,
  skippedExisting: 0,
  skippedMissingTask: 0,
  skippedMissingFile: 0,
  affectedTasks: new Set(),
};

async function restoreOne({ taskId, attachId, name, sourcePath, mimeType, kind, uploadedAt, storageKey }) {
  if (!fs.existsSync(sourcePath)) {
    stats.skippedMissingFile += 1;
    return;
  }
  const taskExists = await TaskModel.exists({ appId: taskId });
  if (!taskExists) {
    stats.skippedMissingTask += 1;
    return;
  }
  const existing = await AttachmentModel.findOne({ $or: [{ attachId }, { storageKey }] }).lean();
  if (existing) {
    stats.skippedExisting += 1;
    stats.affectedTasks.add(taskId);
    return;
  }
  const body = fs.readFileSync(sourcePath);
  if (!dryRun) {
    await s3.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: body,
      ContentType: mimeType,
    }));
    await AttachmentModel.create({
      attachId,
      taskId,
      name,
      filePath: '',
      storageProvider: 'r2',
      storageKey,
      mimeType,
      kind,
      size: body.length,
      uploadedAt,
    });
  }
  stats.uploaded += 1;
  stats.affectedTasks.add(taskId);
}

async function recomputeFileCounts() {
  for (const taskId of stats.affectedTasks) {
    const count = await AttachmentModel.countDocuments({ taskId });
    if (!dryRun) await TaskModel.updateOne({ appId: taskId }, { $set: { files: count } });
  }
}

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 90000,
});

try {
  const backupId = path.basename(backupDir);
  for (const task of imageManifest) {
    for (const image of task.images ?? []) {
      stats.imageCandidates += 1;
      const sourcePath = path.join(backupDir, image.relativePath);
      const ext = path.extname(image.relativePath) || (image.mime === 'image/jpeg' ? '.jpg' : '.png');
      const name = `restored-image-${String(image.index + 1).padStart(2, '0')}${ext}`;
      const attachId = deterministicId(`${backupId}:${task.taskId}:${image.relativePath}`);
      const storageKey = `restored/${backupId}/tasks/${task.taskId}/${attachId}/${sanitizeFileName(name)}`;
      await restoreOne({
        taskId: task.taskId,
        attachId,
        name,
        sourcePath,
        mimeType: image.mime || mimeFromName(name),
        kind: 'image',
        uploadedAt: summary.createdAt,
        storageKey,
      });
    }
  }

  for (const attachment of attachmentMetadata) {
    const copied = copiedByAttachId.get(attachment.attachId);
    if (!copied) continue;
    stats.fileCandidates += 1;
    const sourcePath = path.join(backupDir, copied.relativePath);
    const name = attachment.name || copied.name;
    const mimeType = mimeFromName(name);
    const storageKey = `restored/${backupId}/tasks/${attachment.taskId}/${attachment.attachId}/${sanitizeFileName(name)}`;
    await restoreOne({
      taskId: attachment.taskId,
      attachId: attachment.attachId,
      name,
      sourcePath,
      mimeType,
      kind: mimeType.startsWith('image/') ? 'image' : 'file',
      uploadedAt: attachment.uploadedAt || summary.createdAt,
      storageKey,
    });
  }

  await recomputeFileCounts();

  console.log(JSON.stringify({
    dryRun,
    backupDir,
    imageCandidates: stats.imageCandidates,
    fileCandidates: stats.fileCandidates,
    uploadedOrWouldUpload: stats.uploaded,
    skippedExisting: stats.skippedExisting,
    skippedMissingTask: stats.skippedMissingTask,
    skippedMissingFile: stats.skippedMissingFile,
    affectedTaskCount: stats.affectedTasks.size,
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
