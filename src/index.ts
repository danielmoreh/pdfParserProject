import { Database } from './database';
import { PDFExtractor } from './extractor';
import { Transformer } from './transformer';
import { Loader } from './loader';
import { QueryDemonstration } from './queries';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main ETL Pipeline for PDF Accessibility Code to Database
 */
class ETLPipeline {
  private readonly PDF_FILE = 'FBC-115-163.pdf';
  private readonly DB_FILE = 'accessibility_codes.db';

  async run(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  PDF ACCESSIBILITY CODE - ETL PIPELINE');
    console.log('═'.repeat(70) + '\n');

    const startTime = Date.now();

    try {
      // Validate PDF file exists
      this.validatePDFFile();

      // Initialize database
      console.log('Step 1: Database Initialization');
      console.log('─'.repeat(70));
      const db = new Database(this.DB_FILE);
      await db.initialize();

      // EXTRACT
      console.log('\nStep 2: EXTRACT - Reading PDF Content');
      console.log('─'.repeat(70));
      const extractor = new PDFExtractor();
      const { metadata, pages } = await extractor.extract(this.PDF_FILE);

      // TRANSFORM
      console.log('\nStep 3: TRANSFORM - Processing & Analyzing Content');
      console.log('─'.repeat(70));
      const transformer = new Transformer();
      const transformedPages = transformer.transform(pages);
      transformer.generateReport(transformedPages);

      // LOAD
      console.log('\nStep 4: LOAD - Persisting to Database');
      console.log('─'.repeat(70));
      const loader = new Loader(db);
      await loader.load(metadata, transformedPages);

      // QUERY DEMONSTRATION
      console.log('\nStep 5: QUERY DEMONSTRATION');
      console.log('─'.repeat(70));
      const queries = new QueryDemonstration(db);
      await queries.runAllQueries();

      // Cleanup
      db.close();

      // Summary
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('✅ ETL Pipeline Completed Successfully!');
      console.log(`⏱️  Total execution time: ${duration} seconds`);
      console.log(`📁 Database file: ${this.DB_FILE}`);
      console.log('═'.repeat(70) + '\n');
    } catch (error) {
      console.error('\n❌ ETL Pipeline Failed!');
      console.error('Error:', error);
      process.exit(1);
    }
  }

  private validatePDFFile(): void {
    const pdfPath = path.resolve(this.PDF_FILE);

    if (!fs.existsSync(pdfPath)) {
      console.error(`\n❌ Error: PDF file not found at ${pdfPath}`);
      console.error(`\nPlease ensure '${this.PDF_FILE}' is in the project root directory.`);
      process.exit(1);
    }

    const stats = fs.statSync(pdfPath);
    if (stats.size === 0) {
      console.error(`\n❌ Error: PDF file is empty`);
      process.exit(1);
    }

    console.log(`✓ PDF file validated: ${this.PDF_FILE} (${(stats.size / 1024).toFixed(2)} KB)\n`);
  }
}

// Execute the pipeline
const pipeline = new ETLPipeline();
pipeline.run();
