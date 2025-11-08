import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Database } from "../src/database";
import { PDFExtractor } from "../src/extractor";
import { Transformer } from "../src/transformer";
import { Loader } from "../src/loader";
import * as fs from "fs";
import * as path from "path";

describe("ETL Pipeline End-to-End Test", () => {
  const TEST_PDF_FILE = "FBC-115-163.pdf";
  const TEST_DB_FILE = "test_e2e.db";
  let db: Database;

  beforeAll(async () => {
    const pdfPath = path.resolve(TEST_PDF_FILE);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(
        `PDF file not found: ${TEST_PDF_FILE}. Please ensure it exists in the project root.`
      );
    }

    // Delete test database if it exists
    const dbPath = path.resolve(TEST_DB_FILE);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    console.log("\n🚀 Starting ETL Pipeline End-to-End Test...\n");

    db = await Database.create(TEST_DB_FILE);
    await db.initializeDb();

    const extractor = new PDFExtractor();
    const transformer = new Transformer();
    const loader = new Loader(db);

    const BATCH_SIZE = 10;
    let batch: ReturnType<typeof transformer.transformPage>[] = [];

    // Run ETL pipeline
    await extractor.extract(TEST_PDF_FILE, async (pageData, docMetadata) => {
      if (pageData.pageNumber === 1) {
        // First page: initialize the loader
        await loader.initialize(docMetadata);
      }

      const transformedPage = transformer.transformPage(pageData);
      batch.push(transformedPage);

      if (batch.length >= BATCH_SIZE) {
        await loader.loadBatch(batch);
        batch = [];
      }
    });

    if (batch.length > 0) {
      // Load any remaining pages
      await loader.loadBatch(batch);
    }

    loader.finalize();

    console.log("\n✅ ETL Pipeline completed successfully\n");
  }, 60000); // 60 second timeout for the entire ETL process

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe("Document Metadata Verification", () => {
    it("should have correct document metadata", async () => {
      const docs = (await db.query(
        "SELECT file_name, total_pages FROM documents"
      )) as any[];

      expect(docs).toHaveLength(1);
      expect(docs[0].file_name).toBe(TEST_PDF_FILE);
      expect(docs[0].total_pages).toBe(49);
    });
  });

  describe("Page 1 Verification", () => {
    it('should have section heading "HANDRAIL NON-CIRCULAR CROSS SECTION"', async () => {
      const page1 = (await db.query(
        "SELECT section_headings FROM page_content WHERE page_number = ?",
        [1]
      )) as any[];

      expect(page1).toHaveLength(1);

      const sectionHeadings = JSON.parse(page1[0].section_headings);
      expect(sectionHeadings).toEqual(["HANDRAIL NON-CIRCULAR CROSS SECTION"]);
    });

    it("should have correct page structure", async () => {
      const page1 = (await db.query(
        "SELECT * FROM page_content WHERE page_number = ?",
        [1]
      )) as any[];

      expect(page1).toHaveLength(1);
      expect(page1[0].page_number).toBe(1);
      expect(page1[0].raw_text).toBeDefined();
      expect(page1[0].raw_text.length).toBeGreaterThan(0);
    });
  });

  describe("Page 3 Verification", () => {
    it('should have keywords "handrail" and "clearance"', async () => {
      const page3 = (await db.query(
        "SELECT keywords, keyword_count FROM page_content WHERE page_number = ?",
        [3]
      )) as any[];

      const keywords = JSON.parse(page3[0].keywords);
      expect(keywords).toContain("handrail");
      expect(keywords).toContain("clearance");
    });

    it("should have correct keyword count", async () => {
      const page3 = (await db.query(
        "SELECT keywords, keyword_count FROM page_content WHERE page_number = ?",
        [3]
      )) as any[];

      const keywords = JSON.parse(page3[0].keywords);
      expect(page3[0].keyword_count).toBe(keywords.length);
      expect(page3[0].keyword_count).toBe(2);
    });
  });

  describe("Data Integrity Checks", () => {
    it("should have all pages loaded sequentially", async () => {
      const pages = (await db.query(
        "SELECT page_number FROM page_content ORDER BY page_number ASC"
      )) as any[];

      expect(pages.length).toBe(49);

      // Check that page numbers are sequential starting from 1
      for (let i = 0; i < pages.length; i++) {
        expect(pages[i].page_number).toBe(i + 1);
      }
    });

    it("should have keyword_count matching keywords array length", async () => {
      const pages = (await db.query(
        "SELECT keywords, keyword_count FROM page_content"
      )) as any[];

      for (const page of pages) {
        const keywords = JSON.parse(page.keywords);
        expect(page.keyword_count).toBe(keywords.length);
      }
    });
  });
  it("should have at least some pages with accessibility keywords", async () => {
    const pagesWithKeywords = (await db.query(
      "SELECT COUNT(*) as count FROM page_content WHERE keyword_count > 0"
    )) as any[];

    expect(pagesWithKeywords[0].count).toBeGreaterThan(0);
  });

  it("should have pages with section numbers", async () => {
    const pagesWithSectionNumbers = (await db.query(
      "SELECT COUNT(*) as count FROM page_content WHERE section_number IS NOT NULL"
    )) as any[];

    expect(pagesWithSectionNumbers[0].count).toBeGreaterThan(0);
  });
});
