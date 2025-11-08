import { Database } from "./database";
import { PDFExtractor } from "./extractor";
import { Transformer } from "./transformer";
import { Loader } from "./loader";
import { QueryExamples } from "./queries";
import * as fs from "fs";
import * as path from "path";

/**
 * Main ETL Pipeline for PDF Accessibility Code to Database
 */
class ETLPipeline {
  private readonly pdfFile: string;
  private readonly dbFile: string;

  constructor(pdfFile: string, dbFile: string) {
    this.pdfFile = pdfFile;
    this.dbFile = dbFile;
  }

  async run(): Promise<void> {
    console.log("\n" + "═".repeat(70));
    console.log("  PDF ACCESSIBILITY CODE - ETL PIPELINE");
    console.log("═".repeat(70) + "\n");

    const startTime = Date.now();

    try {
      this.validatePDFFile();
      this.deleteExistingDatabase();

      // Initialize database
      console.log("Step 1: Database Initialization");
      console.log("─".repeat(70));
      const db = await Database.create(this.dbFile);
      await db.initializeDb();

      const extractor = new PDFExtractor();
      const transformer = new Transformer();
      const loader = new Loader(db);

      console.log(
        "\nStep 2: BATCHED ETL - Extract → Transform → Load (10 pages per batch)"
      );
      console.log("─".repeat(70));

      const BATCH_SIZE = 10;
      let batch: ReturnType<typeof transformer.transformPage>[] = [];

      // BATCHED PROCESS: Extract and transform pages, load in batches
      await extractor.extract(this.pdfFile, async (pageData, docMetadata) => {
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
        // Load any remaining pages in the final batch
        await loader.loadBatch(batch);
      }

      loader.finalize();

      // QUERY DEMONSTRATION
      console.log("\nStep 3: QUERY DEMONSTRATION");
      console.log("─".repeat(70));
      const queries = new QueryExamples(db);
      await queries.runAllQueries();

      // Cleanup
      await db.close();

      // Summary
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log("✅ ETL Pipeline Completed Successfully!");
      console.log(`⏱️  Total execution time: ${duration} seconds`);
      console.log(`📁 Database file: ${this.dbFile}`);
      console.log("═".repeat(70) + "\n");
    } catch (error) {
      console.error("\n❌ ETL Pipeline Failed!");
      console.error("Error:", error);
      process.exit(1);
    }
  }

  private deleteExistingDatabase(): void {
    const dbPath = path.resolve(this.dbFile);

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`✓ Deleted existing database file: ${this.dbFile}\n`);
    }
  }

  private validatePDFFile(): void {
    const pdfPath = path.resolve(this.pdfFile);

    if (!fs.existsSync(pdfPath)) {
      console.error(`\n❌ Error: PDF file not found at ${pdfPath}`);
      console.error(
        `\nPlease ensure '${this.pdfFile}' is in the project root directory.`
      );
      process.exit(1);
    }

    const stats = fs.statSync(pdfPath);
    if (stats.size === 0) {
      console.error(`\n❌ Error: PDF file is empty`);
      process.exit(1);
    }

    console.log(
      `✓ PDF file validated: ${this.pdfFile} (${(stats.size / 1024).toFixed(
        2
      )} KB)\n`
    );
  }
}

const pdfFile = "FBC-115-163.pdf";
const dbFile = "accessibility_codes.db";
const pipeline = new ETLPipeline(pdfFile, dbFile);
pipeline.run();
