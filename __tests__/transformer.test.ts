import { describe, it, expect } from "vitest";
import { Transformer } from "../src/transformer";

interface PageData {
  pageNumber: number;
  text: string;
}

describe("Transformer.transformPage", () => {
  const transformer = new Transformer();

  it("should extract ALL CAPS section headings and ignore numbered section titles like 603.4", () => {
    const page: PageData = {
      pageNumber: 1,
      text: [
        "WATER CLOSETS",
        "603.4 Coat Hooks",
        "THIS IS A HEADING",
        "page 12",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.sectionHeadings).toEqual([
      "WATER CLOSETS",
      "THIS IS A HEADING",
    ]);
  });

  it("should only take the first ALL CAPS heading when TABLE is present to avoid table columns", () => {
    const page: PageData = {
      pageNumber: 2,
      text: [
        "TABLE 604.1",
        "DOORS",
        "WIDTH   HEIGHT   MATERIAL",
        "EXTRA COLUMN",
        "ANOTHER HEADING",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.sectionHeadings).toEqual(["DOORS"]);
  });

  it("should detect section number from first lines like 707.1 General.", () => {
    const page: PageData = {
      pageNumber: 3,
      text: ["707.1 General. Scope of Section", "Additional text here"].join(
        "\n"
      ),
    };

    const result = transformer.transformPage(page as any);
    expect(result.sectionNumber).toBe("707.1");
  });

  it("should classify as requirement when mandatory language occurs at least twice", () => {
    const page: PageData = {
      pageNumber: 5,
      text: [
        "The door shall be accessible and shall provide clearance.",
        "It must comply with required standards.",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.mandatoryLanguageCount).toBeGreaterThanOrEqual(2);
    expect(result.contentType).toContain("requirement");
  });

  it("should classify as exception when exception language occurs at least twice", () => {
    const page: PageData = {
      pageNumber: 6,
      text: [
        "Exception: This is not required in certain cases.",
        "It is permitted when conditions are met. Allowed variations exist.",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.exceptionLanguageCount).toBeGreaterThanOrEqual(2);
    expect(result.contentType).toContain("exception");
  });

  it("should mark content as normal when no specific type detected", () => {
    const page: PageData = {
      pageNumber: 7,
      text: "Some general narrative without specific keywords.",
    };

    const result = transformer.transformPage(page as any);
    expect(result.contentType).toEqual(["normal"]);
  });

  it("should extract accessibility-related keywords uniquely and count them", () => {
    const page: PageData = {
      pageNumber: 8,
      text: [
        "Accessible design improves accessibility.",
        "ADA compliance and wheelchair access are required.",
        "Signage must be readable.",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    // keywords list is based on the internal list; ensure at least these are found
    expect(new Set(result.keywords)).toEqual(
      new Set([
        "accessible",
        "accessibility",
        "ADA",
        "wheelchair",
        "signage",
        "compliance",
      ])
    );
    expect(result.keywordCount).toBe(result.keywords.length);
  });

  it("should detect figure references like FIGURE 12 and see figure", () => {
    const page: PageData = {
      pageNumber: 9,
      text: [
        "See Figure for details.",
        "Also refer to FIGURE 12 in the appendix.",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.hasFigure).toBe(true);
  });

  it("should ignore non-heading lines and duplicates in section headings", () => {
    const page: PageData = {
      pageNumber: 10,
      text: [
        "RAMPS",
        "ramps",
        "RAMPS",
        "note: this is a note",
        "FIGURE 3",
      ].join("\n"),
    };

    const result = transformer.transformPage(page as any);
    expect(result.sectionHeadings).toEqual(["RAMPS"]);
  });
});
