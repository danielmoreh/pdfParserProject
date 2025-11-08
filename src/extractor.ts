import fs from "fs";

export interface PDFMetadata {
  fileName: string;
  totalPages: number;
}

export interface PageData {
  pageNumber: number;
  text: string;
}

// Callback type for processing each page as it's extracted
export type PageCallback = (
  pageData: PageData,
  metadata: PDFMetadata
) => Promise<void>;

export class PDFExtractor {
  /**
   * Extracts PDF pages one at a time and calls the callback for each page
   * @param filePath Path to the PDF file
   * @param onPageExtracted Callback function called for each extracted page
   * @returns PDF metadata
   */
  async extract(
    filePath: string,
    onPageExtracted: PageCallback
  ): Promise<PDFMetadata> {
    try {
      console.log(`\n📖 Starting PDF extraction from: ${filePath}`);

      // Import canvas for DOM polyfills needed by pdfjs, must be done BEFORE importing pdfjs-dist
      const canvas = await import("canvas");
      const globalAny = globalThis as any;
      globalAny.DOMMatrix = canvas.DOMMatrix;
      globalAny.ImageData = canvas.ImageData;
      globalAny.Canvas = canvas.Canvas;
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const dataBuffer = fs.readFileSync(filePath);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true,
      });

      const pdfDocument = await loadingTask.promise;

      const metadata: PDFMetadata = {
        fileName: filePath.split(/[\\/]/).pop() || filePath,
        totalPages: pdfDocument.numPages,
      };

      console.log(`✓ PDF loaded: ${metadata.fileName}`);
      console.log(`✓ Total pages: ${metadata.totalPages}`);

      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = this.extractTextFromPage(textContent);

        const pageData: PageData = {
          pageNumber: pageNum,
          text: text,
        };

        await onPageExtracted(pageData, metadata); // Call the callback to process this page immediately
      }

      console.log(
        `✓ Completed extraction of all ${metadata.totalPages} pages\n`
      );

      return metadata;
    } catch (error) {
      console.error("Error extracting PDF:", error);
      throw error;
    }
  }

  /**
   * Extracts text from a page's text content
   */
  private extractTextFromPage(textContent: any): string {
    let lastY: number | undefined;
    let text = "";

    for (const item of textContent.items) {
      // Check if we're on a new line based on Y position
      if (lastY !== undefined && lastY !== item.transform[5]) {
        text += "\n";
      }
      text += item.str;
      lastY = item.transform[5];
    }
    return text;
  }
}
