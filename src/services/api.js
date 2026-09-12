let rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
if (rawBase && !rawBase.endsWith('/api') && rawBase.startsWith('http')) {
  rawBase = `${rawBase}/api`;
}
const API_BASE = rawBase || '/api';
const SERVER_BASE = API_BASE.replace(/\/api$/, '');

export const apiService = {
  /**
   * Helper to resolve relative media URLs to full backend URLs in production
   */
  resolveMediaUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/api') && API_BASE.startsWith('http')) {
      return `${SERVER_BASE}${url}`;
    }
    return url;
  },

  /**
   * Fetch backend limits & configuration
   */
  async getConfig() {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) throw new Error('Failed to fetch config');
      return await res.json();
    } catch (err) {
      console.warn('Backend config unavailable, using default client limits', err);
      return {
        success: true,
        limits: {
          maxFileSizeMB: 100,
          maxDurationSec: 300,
          maxConcurrentJobs: 3,
          fileExpiryMinutes: 30,
          hasAiConfigured: false
        }
      };
    }
  },

  /**
   * Upload video with progress reporting
   */
  uploadVideo(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('video', file);

      xhr.open('POST', `${API_BASE}/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data);
          } else {
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
          }
        } catch (err) {
          reject(new Error('Invalid response from server.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during video upload. Please check your backend connection.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Start restoration processing
   */
  async startProcessing(payload) {
    const res = await fetch(`${API_BASE}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to start restoration processing');
    }
    return data;
  },

  /**
   * Poll job status
   */
  async getJobStatus(jobId) {
    const res = await fetch(`${API_BASE}/status/${jobId}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to retrieve job status');
    }
    return data.job;
  },

  /**
   * Delete job
   */
  async deleteJob(jobId) {
    try {
      const res = await fetch(`${API_BASE}/video/${jobId}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (err) {
      console.error('Delete job error:', err);
    }
  },

  /**
   * Get direct download link
   */
  getDownloadUrl(jobId) {
    return `${API_BASE}/download/${jobId}`;
  }
};
