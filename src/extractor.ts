import fs from 'fs';
import pdf from 'pdf-parse';

export interface PDFMetadata {
  fileName: string;
  totalPages: number;
}

export interface PageData {
  pageNumber: number;
  text: string;
}

export class PDFExtractor {
  async extract(filePath: string): Promise<{ metadata: PDFMetadata; pages: PageData[] }> {
    try {
      console.log(`\n📖 Starting PDF extraction from: ${filePath}`);

      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);

      // Parse PDF with pdf-parse
      const data = await pdf(dataBuffer, {
        max: 0, // Parse all pages
      });

      const metadata: PDFMetadata = {
        fileName: filePath.split(/[\\/]/).pop() || filePath,
        totalPages: data.numpages,
      };

      console.log(`✓ PDF loaded: ${metadata.fileName}`);
      console.log(`✓ Total pages: ${metadata.totalPages}`);

      // Extract page-by-page text
      // pdf-parse doesn't provide page-by-page extraction directly,
      // so we'll use a different approach with render_page option
      const pages: PageData[] = [];

      // Parse each page individually
      for (let i = 1; i <= data.numpages; i++) {
        const pageData = await pdf(dataBuffer, {
          max: 1,
          pagerender: this.renderPage(i),
        });

        pages.push({
          pageNumber: i,
          text: pageData.text,
        });
      }

      console.log(`✓ Extracted text from ${pages.length} pages\n`);

      return { metadata, pages };
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw error;
    }
  }

  // Helper function to render a specific page
  private renderPage(pageNum: number) {
    let currentPage = 0;

    return (pageData: any) => {
      currentPage++;

      // Only render the requested page
      if (currentPage !== pageNum) {
        return '';
      }

      // Render page function from pdf-parse
      let renderOptions = {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      };

      return pageData.getTextContent(renderOptions).then((textContent: any) => {
        let lastY: number | undefined;
        let text = '';

        for (let item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }

        return text;
      });
    };
  }
}
