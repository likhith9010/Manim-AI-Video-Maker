const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
// In Cloud Run, the secret is mounted as a file at /app/.gcp/service-account-key.json
// Locally, uses the keyFilename from .gcp folder
const keyPath = path.join(__dirname, '.gcp', 'service-account-key.json');

const storage = new Storage({
  keyFilename: keyPath,
  projectId: 'gen-lang-client-0281755331'
});

const bucketName = process.env.GCS_BUCKET || 'manim_ai_videomaker_backend';
const bucket = storage.bucket(bucketName);

/**
 * Upload a file to Google Cloud Storage
 * @param {string} localFilePath - Local path to the file
 * @param {string} destination - Destination path in GCS (e.g., 'audio/file.wav' or 'videos/file.mp4')
 * @param {boolean} makePublic - Whether to make the file publicly accessible
 * @returns {Promise<{publicUrl: string, gcsPath: string}>}
 */
async function uploadFile(localFilePath, destination, makePublic = true) {
  try {
    console.log(`[GCS] Uploading ${localFilePath} to gs://${bucketName}/${destination}`);
    
    const options = {
      destination: destination,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      // Use predefinedAcl instead of makePublic() for uniform bucket-level access
      predefinedAcl: makePublic ? 'publicRead' : 'private'
    };

    await bucket.upload(localFilePath, options);
    
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
    
    console.log(`[GCS] Upload successful: ${publicUrl}`);
    
    return {
      publicUrl,
      gcsPath: `gs://${bucketName}/${destination}`
    };
  } catch (error) {
    console.error('[GCS] Upload error:', error.message);
    throw new Error(`Failed to upload to GCS: ${error.message}`);
  }
}

/**
 * Delete a file from Google Cloud Storage
 * @param {string} destination - Path in GCS to delete
 */
async function deleteFile(destination) {
  try {
    await bucket.file(destination).delete();
    console.log(`[GCS] Deleted: gs://${bucketName}/${destination}`);
  } catch (error) {
    console.error('[GCS] Delete error:', error.message);
    // Don't throw - file might already be deleted
  }
}

/**
 * Delete files older than specified days
 * @param {string} prefix - Folder prefix (e.g., 'videos/', 'audio/')
 * @param {number} daysOld - Delete files older than this many days
 */
async function cleanupOldFiles(prefix, daysOld = 30) {
  try {
    const [files] = await bucket.getFiles({ prefix });
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const fileAge = now - new Date(metadata.timeCreated).getTime();
      
      if (fileAge > maxAge) {
        await file.delete();
        deletedCount++;
        console.log(`[GCS] Deleted old file: ${file.name}`);
      }
    }
    
    console.log(`[GCS] Cleanup complete: ${deletedCount} files deleted from ${prefix}`);
    return deletedCount;
  } catch (error) {
    console.error('[GCS] Cleanup error:', error.message);
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  cleanupOldFiles
};
