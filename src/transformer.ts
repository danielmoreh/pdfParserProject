import { PageData } from "./extractor";

export interface TransformedPage {
  pageNumber: number;
  rawText: string;
  sectionHeadings: string[];
  sectionNumber?: string;
  contentType: Array<"requirement" | "exception" | "definition" | "normal">;
  keywordCount: number;
  keywords: string[];
  hasFigure: boolean;
  mandatoryLanguageCount: number;
  exceptionLanguageCount: number;
}

export class Transformer {
  // Keywords related to accessibility compliance
  private readonly accessibilityKeywords = [
    "accessible",
    "accessibility",
    "ADA",
    "disabled",
    "wheelchair",
    "ramp",
    "handrail",
    "braille",
    "visual",
    "hearing",
    "mobility",
    "clearance",
    "width",
    "slope",
    "elevator",
    "signage",
    "compliance",
    "barrier-free",
    "universal design",
  ];

  /**
   * Transforms a single page
   */
  transformPage(page: PageData): TransformedPage {
    const sectionHeadings = this.extractSectionHeadings(page.text);
    const sectionNumber = this.extractSectionNumber(page.text);
    const keywords = this.extractAccessibilityKeywords(page.text);
    const keywordCount = keywords.length;
    const hasFigure = this.detectFigure(page.text);
    const mandatoryLanguageCount = this.countMandatoryLanguage(page.text);
    const exceptionLanguageCount = this.countExceptionLanguage(page.text);
    const contentType = this.classifyContentType(
      page.text,
      mandatoryLanguageCount,
      exceptionLanguageCount
    );

    return {
      pageNumber: page.pageNumber,
      rawText: page.text,
      sectionHeadings,
      sectionNumber,
      contentType,
      keywordCount,
      keywords,
      hasFigure,
      mandatoryLanguageCount,
      exceptionLanguageCount,
    };
  }

  private extractSectionHeadings(text: string): string[] {
    const headings: string[] = [];

    // Check if page contains a table (TABLE in capital letters)
    const hasTable = /\bTABLE\b/.test(text);

    // Patterns that are NOT headings (tables, figures, page numbers, etc.)
    const excludePatterns = [
      /^FIGURE\s+[\d.]+/i,
      /^TABLE\s+[\d.]+/i,
      /^Fig\.\s*[\d.]+/i,
      /^Diagram\s+[\d.]+/i,
      /^Illustration\s+[\d.]+/i,
      /^\d+$/, // Just numbers
      /^page\s+\d+/i, // Page numbers
      /^see\s+(figure|table|section)/i, // Cross-references
      /^note:/i, // Notes
      /^example:/i, // Examples
      /^\(\w+\)$/, // Single parenthetical like (a) or (1)
      /^EXCEPTIONS?:?$/i, // EXCEPTION or EXCEPTIONS (with optional colon)
      /\d+\.\d+/, // Section numbers with dots (e.g., "603.4", "1104.3.2")
    ];

    const lines = text.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip if too short or matches exclude patterns
      if (
        trimmedLine.length < 3 ||
        excludePatterns.some((p) => p.test(trimmedLine))
      )
        continue;

      // Rule: ALL CAPS + must have at least one letter
      if (
        trimmedLine === trimmedLine.toUpperCase() &&
        /[A-Z]/.test(trimmedLine) // Must contain at least one letter
      ) {
        headings.push(trimmedLine);

        if (hasTable) {
          // If page has a table, only take the first heading to avoid table columns
          break;
        }
      }
    }

    return [...new Set(headings)];
  }

  /**
   * Extracts list of accessibility-related keywords found in text
   */
  private extractAccessibilityKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundKeywords = new Set<string>();

    for (const keyword of this.accessibilityKeywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "gi");
      if (regex.test(lowerText)) {
        foundKeywords.add(keyword);
      }
    }

    return Array.from(foundKeywords);
  }

  /**
   * Extracts section number patterns from text
   * Looks for pattern: "707.1 General." - number with dot followed by text
   */
  private extractSectionNumber(text: string): string | undefined {
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      const numberTextMatch = line.match(/^(\d+(?:\.\d+)+)\s+[A-Za-z]/);
      if (numberTextMatch) return numberTextMatch[1];
    }

    return undefined;
  }

  /**
   * Classifies the content type of the page
   * Returns an array of all applicable content types
   */
  private classifyContentType(
    text: string,
    mandatoryLanguageCount: number,
    exceptionLanguageCount: number
  ): Array<"requirement" | "exception" | "definition" | "normal"> {
    const types: Array<"requirement" | "exception" | "definition" | "normal"> =
      [];

    // Check for definition section
    if (
      /\bdefinitions?\b/i.test(text) ||
      /\bmeans\b.*following/i.test(text) ||
      text.split("\n").filter((line) => /^[A-Z][A-Za-z\s]+\.\s+/.test(line))
        .length > 3
    ) {
      types.push("definition");
    }

    if (exceptionLanguageCount >= 2) {
      types.push("exception");
    }

    if (mandatoryLanguageCount >= 2) {
      types.push("requirement");
    }

    if (types.length === 0) {
      // If no specific type found, mark as normal
      types.push("normal");
    }

    return types;
  }

  /**
   * Detects if the page references figures or diagrams
   */
  private detectFigure(text: string): boolean {
    const figurePatterns = [
      /FIGURE\s+\d+/i,
      /Fig\.\s*\d+/i,
      /see\s+figure/i,
      /shown\s+in\s+figure/i,
      /diagram\s+\d+/i,
      /illustration/i,
    ];

    return figurePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Counts mandatory language occurrences (shall, must, required)
   */
  private countMandatoryLanguage(text: string): number {
    const mandatoryPatterns = [
      /\bshall\b/gi,
      /\bmust\b/gi,
      /\brequired\b/gi,
      /\bmandatory\b/gi,
    ];

    let count = 0;
    for (const pattern of mandatoryPatterns) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }

    return count;
  }

  /**
   * Counts exception/conditional language occurrences
   */
  private countExceptionLanguage(text: string): number {
    const exceptionPatterns = [
      /\bexception\b/gi,
      /\bpermitted\b/gi,
      /\ballowed\b/gi,
      /\bnot required\b/gi,
    ];

    let count = 0;
    for (const pattern of exceptionPatterns) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }

    return count;
  }
}
