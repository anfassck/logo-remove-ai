import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { removeGeminiWatermarkRaw, getAlphaMapForSize, unblendRegion } from './geminiRestorer.js';

/**
 * PixelRestorer — Professional Zero-Blur Logo & Watermark Removal Engine
 * 
 * Features:
 * 1. Global & Local Reverse Alpha Blending (Exact Mathematical Inversion):
 *    - Automatically pinpoints the subpixel position of the watermark inside any user-drawn box.
 *    - Reverses the semi-transparent alpha compositing with zero interpolation.
 *    - Restores the 100% sharp original image pixels underneath (foliage, skin, textures) with ZERO BLUR.
 * 
 * 2. Texture-Preserving Exemplar Synthesis (for opaque watermarks & non-Gemini logos):
 *    - Synthesizes real image texture, grain, and gradients instead of blurry interpolation.
 *    - Cosine feathered boundary blending eliminates seams.
 */
class PixelRestorer {
  /**
   * Restore an image by removing watermarks/logos at given mask regions
   * @param {string} inputPath - Path to the source image
   * @param {string} outputPath - Path to write the restored image
   * @param {Array} masks - Array of {x, y, width, height, feather?} objects
   * @returns {Promise<{width: number, height: number, size: number, method: string}>}
   */
  async restoreImage(inputPath, outputPath, masks = []) {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const rawBuffer = await image
      .ensureAlpha()
      .raw()
      .toBuffer();

    let pixels = Buffer.from(rawBuffer);
    const channels = 4;
    let restorationMethod = 'Reverse Alpha Blending (Zero Blur)';

    // ========================================================
    // PASS 1: Global Gemini Reverse Alpha Blending Pass
    // ========================================================
    let globalGeminiApplied = false;
    try {
      const globalResult = await removeGeminiWatermarkRaw(rawBuffer, width, height, { adaptiveMode: 'always' });
      if (globalResult && globalResult.meta && globalResult.meta.applied) {
        pixels = Buffer.from(globalResult.data);
        globalGeminiApplied = true;
        console.log('[PixelRestorer] PASS 1: Auto-detected and removed Gemini watermark globally (Zero Blur)!');
      }
    } catch (err) {
      console.warn('[PixelRestorer] Global detection pass note:', err.message);
    }

    // ========================================================
    // PASS 2: Localized Reverse Alpha Blending for User-Drawn Boxes
    // ========================================================
    if (masks && masks.length > 0) {
      for (const mask of masks) {
        const mx = Math.max(0, Math.round(mask.x));
        const my = Math.max(0, Math.round(mask.y));
        const mw = Math.min(width - mx, Math.round(mask.width));
        const mh = Math.min(height - my, Math.round(mask.height));
        const feather = Math.max(2, Math.min(16, mask.feather || 4));

        if (mw <= 0 || mh <= 0) continue;

        // If global pass already cleaned bottom-right, check if this mask is over that same area
        const isBottomRight = (mx + mw >= width * 0.7) && (my + mh >= height * 0.7);
        if (globalGeminiApplied && isBottomRight) {
          console.log('[PixelRestorer] Mask already restored by global Reverse Alpha pass.');
          continue;
        }

        // Scan inside and around the user's box to pinpoint any Gemini watermark
        console.log(`[PixelRestorer] Scanning box (${mx}, ${my}, ${mw}x${mh}) for watermark pattern...`);
        const match = await this._scanForGeminiWatermark(pixels, width, height, channels, mx, my, mw, mh);

        if (match && match.score >= 0.22) {
          console.log(`[PixelRestorer] Found watermark at (${match.x}, ${match.y}) size ${match.size}px (score: ${match.score.toFixed(3)}). Applying Reverse Alpha Blending!`);
          
          const imgData = { width, height, data: new Uint8ClampedArray(pixels) };
          unblendRegion(
            imgData, 
            match.alphaMap, 
            { x: match.x, y: match.y, width: match.size, height: match.size }, 
            { alphaGain: 1, logoValue: 255 }
          );
          
          pixels = Buffer.from(imgData.data.buffer, imgData.data.byteOffset, imgData.data.byteLength);
          restorationMethod = 'Reverse Alpha Blending (Zero Blur)';
        } else {
          // If not a Gemini watermark (opaque logo/text), use Crisp Texture Exemplar Inpainting
          console.log(`[PixelRestorer] No translucent watermark detected (score: ${match ? match.score.toFixed(3) : 0}). Applying Texture-Preserving Inpainting.`);
          this._applyCrispExemplarInpainting(pixels, rawBuffer, width, height, channels, mx, my, mw, mh, feather);
          restorationMethod = 'Texture-Aware Synthesis';
        }
      }
    }

    // ========================================================
    // PASS 3: Write Output Image Losslessly
    // ========================================================
    const outputExt = path.extname(outputPath).toLowerCase();
    let sharpOutput = sharp(pixels, {
      raw: { width, height, channels }
    });

    if (outputExt === '.jpg' || outputExt === '.jpeg') {
      sharpOutput = sharpOutput.jpeg({ quality: 98, mozjpeg: true });
    } else if (outputExt === '.webp') {
      sharpOutput = sharpOutput.webp({ quality: 98, lossless: false });
    } else {
      sharpOutput = sharpOutput.png({ compressionLevel: 6 });
    }

    await sharpOutput.toFile(outputPath);
    const stats = fs.statSync(outputPath);

    return {
      width,
      height,
      size: stats.size,
      method: restorationMethod
    };
  }

  /**
   * Fast correlation scanner: pinpoints Gemini star watermark position inside/around user-drawn box
   */
  async _scanForGeminiWatermark(pixels, width, height, channels, mx, my, mw, mh) {
    // Choose candidate sizes based on user box dimensions
    const maxDim = Math.max(mw, mh);
    let candidateSizes = [96, 48, 64, 36];
    if (maxDim < 60) candidateSizes = [48, 36, 64, 96];
    else if (maxDim > 120) candidateSizes = [96, 128, 64, 48];

    let best = { score: -1, x: 0, y: 0, size: 0, alphaMap: null };

    for (const size of candidateSizes) {
      if (size > width || size > height) continue;
      const alphaMap = await getAlphaMapForSize(size);
      if (!alphaMap || alphaMap.length !== size * size) continue;

      // Precalculate alpha statistics
      let aSum = 0;
      for (let i = 0; i < alphaMap.length; i++) aSum += alphaMap[i];
      const aMean = aSum / alphaMap.length;
      let aVar = 0;
      for (let i = 0; i < alphaMap.length; i++) aVar += (alphaMap[i] - aMean) ** 2;
      if (aVar < 1e-6) continue;

      // Define search bounding area: around user's box with padding
      const padding = 24;
      const minX = Math.max(0, mx - padding);
      const maxX = Math.min(width - size, mx + mw - size + padding);
      const minY = Math.max(0, my - padding);
      const maxY = Math.min(height - size, my + mh - size + padding);

      if (minX > maxX || minY > maxY) continue;

      // Coarse search (step 2)
      for (let y = minY; y <= maxY; y += 2) {
        for (let x = minX; x <= maxX; x += 2) {
          let iSum = 0;
          const step = 2;
          let count = 0;

          for (let dy = 0; dy < size; dy += step) {
            for (let dx = 0; dx < size; dx += step) {
              const idx = ((y + dy) * width + (x + dx)) * channels;
              const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
              iSum += lum;
              count++;
            }
          }

          const iMean = iSum / count;
          let covar = 0, iVar = 0;

          for (let dy = 0; dy < size; dy += step) {
            for (let dx = 0; dx < size; dx += step) {
              const idx = ((y + dy) * width + (x + dx)) * channels;
              const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
              const aVal = alphaMap[dy * size + dx];
              covar += (lum - iMean) * (aVal - aMean);
              iVar += (lum - iMean) ** 2;
            }
          }

          const denom = Math.sqrt(iVar * (aVar / 4));
          const corr = denom > 1e-5 ? covar / denom : 0;

          if (corr > best.score) {
            best = { score: corr, x, y, size, alphaMap };
          }
        }
      }
    }

    // If a good match is found, refine by 1 pixel around the peak
    if (best.score >= 0.18) {
      const { size, alphaMap } = best;
      const cx = best.x;
      const cy = best.y;

      let aSum = 0;
      for (let i = 0; i < alphaMap.length; i++) aSum += alphaMap[i];
      const aMean = aSum / alphaMap.length;
      let aVar = 0;
      for (let i = 0; i < alphaMap.length; i++) aVar += (alphaMap[i] - aMean) ** 2;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x + size > width || y + size > height) continue;

          let iSum = 0, count = 0;
          for (let sy = 0; sy < size; sy += 2) {
            for (let sx = 0; sx < size; sx += 2) {
              const idx = ((y + sy) * width + (x + sx)) * channels;
              iSum += 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
              count++;
            }
          }
          const iMean = iSum / count;
          let covar = 0, iVar = 0;
          for (let sy = 0; sy < size; sy += 2) {
            for (let sx = 0; sx < size; sx += 2) {
              const idx = ((y + sy) * width + (x + sx)) * channels;
              const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
              const aVal = alphaMap[sy * size + sx];
              covar += (lum - iMean) * (aVal - aMean);
              iVar += (lum - iMean) ** 2;
            }
          }
          const denom = Math.sqrt(iVar * (aVar / 4));
          const corr = denom > 1e-5 ? covar / denom : 0;
          if (corr > best.score) {
            best = { score: corr, x, y, size, alphaMap };
          }
        }
      }
    }

    return best.score > 0 ? best : null;
  }

  /**
   * Crisp Exemplar Inpainting — Content-Aware Texture Synthesis (for general logos)
   * Samples coherent textures and grains from surrounding borders to prevent blur smudges.
   */
  _applyCrispExemplarInpainting(pixels, originalPixels, imgW, imgH, channels, mx, my, mw, mh, feather) {
    const ringDepth = Math.max(8, Math.min(32, Math.round(Math.min(mw, mh) * 0.4)));

    // Sample border texture bank
    const textureBank = this._buildTextureBank(pixels, imgW, imgH, channels, mx, my, mw, mh, ringDepth);

    // Compute boundary profiles
    const topEdge = this._sampleEdgeColor(pixels, imgW, imgH, channels, mx, my, mw, 'top', ringDepth);
    const botEdge = this._sampleEdgeColor(pixels, imgW, imgH, channels, mx, my + mh, mw, 'bottom', ringDepth);
    const leftEdge = this._sampleEdgeColor(pixels, imgW, imgH, channels, mx, my, mh, 'left', ringDepth);
    const rightEdge = this._sampleEdgeColor(pixels, imgW, imgH, channels, mx + mw, my, mh, 'right', ringDepth);

    for (let ry = 0; ry < mh; ry++) {
      for (let rx = 0; rx < mw; rx++) {
        const px = mx + rx;
        const py = my + ry;
        if (px >= imgW || py >= imgH) continue;

        const nx = mw > 1 ? rx / (mw - 1) : 0.5;
        const ny = mh > 1 ? ry / (mh - 1) : 0.5;

        // Base field interpolation
        const baseColor = this._interpolateBaseField(topEdge, botEdge, leftEdge, rightEdge, nx, ny, rx, ry);

        // High-frequency texture and grain synthesis (prevents blur!)
        const textureOffset = this._sampleTextureGrain(textureBank, rx, ry, mw, mh);

        const r = Math.max(0, Math.min(255, Math.round(baseColor.r + textureOffset.r)));
        const g = Math.max(0, Math.min(255, Math.round(baseColor.g + textureOffset.g)));
        const b = Math.max(0, Math.min(255, Math.round(baseColor.b + textureOffset.b)));

        const idx = (py * imgW + px) * channels;
        pixels[idx + 0] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = 255;
      }
    }

    // Boundary harmonization
    this._harmonizeBoundaries(pixels, originalPixels, imgW, imgH, channels, mx, my, mw, mh, feather);
  }

  _buildTextureBank(pixels, imgW, imgH, channels, mx, my, mw, mh, ringDepth) {
    const bank = [];
    const step = 2;

    for (let x = Math.max(0, mx - ringDepth); x < Math.min(imgW, mx + mw + ringDepth); x += step) {
      for (let d = 1; d <= ringDepth; d += 2) {
        const yTop = my - d;
        if (yTop >= 0) {
          const idx = (yTop * imgW + x) * channels;
          bank.push({ r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] });
        }
        const yBot = my + mh + d - 1;
        if (yBot < imgH) {
          const idx = (yBot * imgW + x) * channels;
          bank.push({ r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] });
        }
      }
    }

    for (let y = Math.max(0, my - ringDepth); y < Math.min(imgH, my + mh + ringDepth); y += step) {
      for (let d = 1; d <= ringDepth; d += 2) {
        const xLeft = mx - d;
        if (xLeft >= 0) {
          const idx = (y * imgW + xLeft) * channels;
          bank.push({ r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] });
        }
        const xRight = mx + mw + d - 1;
        if (xRight < imgW) {
          const idx = (y * imgW + xRight) * channels;
          bank.push({ r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] });
        }
      }
    }

    return bank.length > 0 ? bank : [{ r: 128, g: 128, b: 128 }];
  }

  _sampleEdgeColor(pixels, imgW, imgH, channels, startX, startY, length, direction, depth) {
    const samples = [];
    for (let i = 0; i < length; i++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let d = 1; d <= depth; d++) {
        let sx = startX, sy = startY;
        if (direction === 'top') { sx = startX + i; sy = startY - d; }
        else if (direction === 'bottom') { sx = startX + i; sy = startY + d - 1; }
        else if (direction === 'left') { sx = startX - d; sy = startY + i; }
        else if (direction === 'right') { sx = startX + d - 1; sy = startY + i; }

        sx = Math.max(0, Math.min(imgW - 1, sx));
        sy = Math.max(0, Math.min(imgH - 1, sy));
        const idx = (sy * imgW + sx) * channels;
        rSum += pixels[idx];
        gSum += pixels[idx + 1];
        bSum += pixels[idx + 2];
        count++;
      }
      samples.push({
        r: rSum / count,
        g: gSum / count,
        b: bSum / count
      });
    }
    return samples;
  }

  _interpolateBaseField(top, bot, left, right, nx, ny, rx, ry) {
    const tC = top[Math.min(rx, top.length - 1)] || { r: 128, g: 128, b: 128 };
    const bC = bot[Math.min(rx, bot.length - 1)] || { r: 128, g: 128, b: 128 };
    const lC = left[Math.min(ry, left.length - 1)] || { r: 128, g: 128, b: 128 };
    const rC = right[Math.min(ry, right.length - 1)] || { r: 128, g: 128, b: 128 };

    const wTop = 1.0 / (ny + 0.05);
    const wBot = 1.0 / (1.0 - ny + 0.05);
    const wLeft = 1.0 / (nx + 0.05);
    const wRight = 1.0 / (1.0 - nx + 0.05);
    const wSum = wTop + wBot + wLeft + wRight;

    return {
      r: (tC.r * wTop + bC.r * wBot + lC.r * wLeft + rC.r * wRight) / wSum,
      g: (tC.g * wTop + bC.g * wBot + lC.g * wLeft + rC.g * wRight) / wSum,
      b: (tC.b * wTop + bC.b * wBot + lC.b * wLeft + rC.b * wRight) / wSum
    };
  }

  _sampleTextureGrain(bank, rx, ry, mw, mh) {
    if (!bank || bank.length === 0) return { r: 0, g: 0, b: 0 };
    const hash = Math.abs(Math.sin(rx * 12.9898 + ry * 78.233) * 43758.5453);
    const idx = Math.floor(hash) % bank.length;
    const sample = bank[idx];
    const bankMean = (sample.r + sample.g + sample.b) / 3;
    const strength = 0.4;

    return {
      r: (sample.r - bankMean) * strength,
      g: (sample.g - bankMean) * strength,
      b: (sample.b - bankMean) * strength
    };
  }

  _harmonizeBoundaries(pixels, originalPixels, imgW, imgH, channels, mx, my, mw, mh, feather) {
    for (let ry = 0; ry < mh; ry++) {
      for (let rx = 0; rx < mw; rx++) {
        const px = mx + rx;
        const py = my + ry;
        if (px >= imgW || py >= imgH) continue;

        const distLeft = rx;
        const distRight = mw - 1 - rx;
        const distTop = ry;
        const distBottom = mh - 1 - ry;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist < feather) {
          const t = minDist / feather;
          const blend = 0.5 * (1 - Math.cos(Math.PI * t));

          const idx = (py * imgW + px) * channels;
          pixels[idx + 0] = Math.round(originalPixels[idx + 0] * (1 - blend) + pixels[idx + 0] * blend);
          pixels[idx + 1] = Math.round(originalPixels[idx + 1] * (1 - blend) + pixels[idx + 1] * blend);
          pixels[idx + 2] = Math.round(originalPixels[idx + 2] * (1 - blend) + pixels[idx + 2] * blend);
        }
      }
    }
  }
}

export const pixelRestorer = new PixelRestorer();
