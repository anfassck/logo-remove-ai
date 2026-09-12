import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import { videoProcessor } from './services/videoProcessor.js';
import { jobManager } from './services/jobManager.js';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
if (ffprobeStatic && ffprobeStatic.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

async function runTest() {
  console.log('--- STARTING CLEANFRAME AI END-TO-END VERIFICATION ---');

  const testDir = path.resolve('temp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const inputSample = path.join(testDir, 'test_source.mp4');

  // 1. Generate synthetic test video with a watermark box in top-right corner
  console.log('Step 1: Generating synthetic test video with watermark using FFmpeg...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=blue:s=640x360:d=3')
      .inputFormat('lavfi')
      .input('sine=f=440:d=3')
      .inputFormat('lavfi')
      .videoFilters([
        // Draw simulated logo/watermark in bottom-right (x=450, y=280, w=150, h=50)
        'drawbox=x=450:y=280:w=150:h=50:color=red@0.9:t=fill',
        'drawtext=text="WATERMARK":x=465:y=295:fontsize=20:fontcolor=white'
      ])
      .outputOptions(['-pix_fmt yuv420p', '-c:v libx264', '-c:a aac', '-shortest'])
      .output(inputSample)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  console.log('✓ Test video generated:', inputSample, 'Size:', fs.statSync(inputSample).size);

  // 2. Test getMetadata
  console.log('Step 2: Inspecting video metadata...');
  const metadata = await videoProcessor.getMetadata(inputSample);
  console.log('✓ Metadata extracted:', {
    width: metadata.width,
    height: metadata.height,
    duration: metadata.duration,
    fps: metadata.fps,
    codec: metadata.codec,
    hasAudio: metadata.hasAudio
  });

  // 3. Test thumbnail generation
  console.log('Step 3: Generating preview thumbnail...');
  const thumb = await videoProcessor.generateThumbnail(inputSample, testDir, 'test_source.mp4');
  console.log('✓ Thumbnail created:', thumb);

  // 4. Test Job Creation and Restoration Processing
  console.log('Step 4: Running full video restoration job...');
  const job = jobManager.createJob({
    input: {
      fileId: 'test_job_1',
      filepath: inputSample,
      filename: 'test_source.mp4'
    },
    maskData: {
      x: 450,
      y: 280,
      width: 150,
      height: 50,
      feather: 2
    },
    engine: 'delogo'
  });

  const outputResult = await videoProcessor.processJob(job.jobId);
  console.log('✓ Video restoration job completed successfully!');
  console.log('✓ Output result:', {
    filename: outputResult.filename,
    filepath: outputResult.filepath,
    size: outputResult.size,
    strategy: outputResult.strategy
  });

  const finalJob = jobManager.getJob(job.jobId);
  console.log('✓ Final job status:', finalJob.status, 'Progress:', finalJob.progress);

  console.log('--- ALL BACKEND VERIFICATIONS PASSED ---');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
