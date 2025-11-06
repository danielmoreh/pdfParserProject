import { PageData } from './extractor';

export interface TransformedPage {
  pageNumber: number;
  rawText: string;
  sectionHeading?: string;
  keywordCount: number;
}

export class Transformer {
  // Keywords related to accessibility compliance
  private readonly accessibilityKeywords = [
    'accessible',
    'accessibility',
    'ADA',
    'disabled',
    'wheelchair',
    'ramp',
    'handrail',
    'braille',
    'visual',
    'hearing',
    'mobility',
    'clearance',
    'width',
    'slope',
    'elevator',
    'signage',
    'compliance',
    'barrier-free',
    'universal design',
  ];

  transform(pages: PageData[]): TransformedPage[] {
    console.log('🔄 Starting transformation process...');

    const transformedPages = pages.map((page) => {
      const sectionHeading = this.extractSectionHeading(page.text);
      const keywordCount = this.countAccessibilityKeywords(page.text);

      return {
        pageNumber: page.pageNumber,
        rawText: page.text,
        sectionHeading,
        keywordCount,
      };
    });

    console.log('✓ Transformation complete');
    console.log(`✓ Identified ${transformedPages.filter((p) => p.sectionHeading).length} section headings`);
    console.log(
      `✓ Average keyword count: ${(
        transformedPages.reduce((sum, p) => sum + p.keywordCount, 0) / transformedPages.length
      ).toFixed(2)}`
    );

    return transformedPages;
  }

  /**
   * Extracts section heading from page text
   * Looks for patterns like:
   * - "SECTION 1104" or "Section 1104"
   * - "CHAPTER 11" or "Chapter 11"
   * - All caps lines at the beginning
   */
  private extractSectionHeading(text: string): string | undefined {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) return undefined;

    // Check first few lines for section patterns
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Pattern 1: SECTION or CHAPTER followed by number
      const sectionMatch = line.match(/^(SECTION|CHAPTER|Section|Chapter)\s+[\d.]+/i);
      if (sectionMatch) {
        return line;
      }

      // Pattern 2: All caps line (likely a heading) with reasonable length
      if (line === line.toUpperCase() && line.length > 5 && line.length < 100) {
        // Check if it contains at least one letter
        if (/[A-Z]/.test(line)) {
          return line;
        }
      }

      // Pattern 3: Lines ending with colon (often section titles)
      if (line.endsWith(':') && line.length < 100) {
        return line;
      }
    }

    return undefined;
  }

  /**
   * Counts occurrences of accessibility-related keywords
   * Case-insensitive matching
   */
  private countAccessibilityKeywords(text: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;

    for (const keyword of this.accessibilityKeywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Generates a summary report of the transformation
   */
  generateReport(transformedPages: TransformedPage[]): void {
    console.log('\n📊 Transformation Report:');
    console.log('─'.repeat(50));

    const pagesWithHighKeywords = transformedPages.filter((p) => p.keywordCount > 3);
    console.log(`Pages with high relevance (>3 keywords): ${pagesWithHighKeywords.length}`);

    if (pagesWithHighKeywords.length > 0) {
      console.log('\nTop 5 most relevant pages:');
      pagesWithHighKeywords
        .sort((a, b) => b.keywordCount - a.keywordCount)
        .slice(0, 5)
        .forEach((page) => {
          console.log(`  Page ${page.pageNumber}: ${page.keywordCount} keywords`);
          if (page.sectionHeading) {
            console.log(`    Section: ${page.sectionHeading.substring(0, 60)}...`);
          }
        });
    }

    console.log('─'.repeat(50) + '\n');
  }
}
