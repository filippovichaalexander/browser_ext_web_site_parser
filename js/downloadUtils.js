/**
 * Utility functions for handling downloads in the GSC extension
 */

/**
 * Triggers a download for a blob with the specified filename
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename to use for the download
 */
export function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
