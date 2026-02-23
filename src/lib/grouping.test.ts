import { describe, it, expect } from "vitest";
import { groupByDomain, groupByDomainAndPath } from "./grouping";

// Helper to create items with url field
function item(url: string) {
  return { url, id: Math.random().toString(36).slice(2) };
}

describe("groupByDomain", () => {
  it("groups items from the same domain together", () => {
    const input = {
      a: [item("https://example.com/page1"), item("https://example.com/page2")],
    };
    const result = groupByDomain(input);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("example.com");
    expect(result[0].items).toHaveLength(2);
  });

  it("separates items from different domains", () => {
    const input = {
      a: [item("https://foo.com/a")],
      b: [item("https://bar.com/b")],
    };
    const result = groupByDomain(input);
    expect(result).toHaveLength(2);
    const domains = result.map((g) => g.domain).sort();
    expect(domains).toEqual(["bar.com", "foo.com"]);
  });

  it("sorts groups by item count descending", () => {
    const input = {
      a: [item("https://small.com/1")],
      b: [item("https://big.com/1"), item("https://big.com/2"), item("https://big.com/3")],
    };
    const result = groupByDomain(input);
    expect(result[0].domain).toBe("big.com");
    expect(result[0].items).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(groupByDomain({})).toEqual([]);
  });

  it("handles items with empty url as Global", () => {
    const input = { a: [item("")] };
    const result = groupByDomain(input);
    expect(result[0].domain).toBe("Global");
  });

  it("merges items across multiple storage keys for the same domain", () => {
    const input = {
      key1: [item("https://example.com/page1")],
      key2: [item("https://example.com/page2")],
    };
    const result = groupByDomain(input);
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
  });
});

describe("groupByDomainAndPath", () => {
  it("groups by domain and then by path", () => {
    const input = {
      a: [
        item("https://example.com/docs/intro"),
        item("https://example.com/docs/guide"),
        item("https://example.com/blog/post"),
      ],
    };
    const result = groupByDomainAndPath(input);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("example.com");
    expect(result[0].paths).toHaveLength(3);
    expect(result[0].totalCount).toBe(3);
  });

  it("groups items with same path together", () => {
    const input = {
      a: [
        item("https://example.com/docs"),
        item("https://example.com/docs"),
      ],
    };
    const result = groupByDomainAndPath(input);
    expect(result[0].paths).toHaveLength(1);
    expect(result[0].paths[0].items).toHaveLength(2);
  });

  it("sorts domains by total count descending", () => {
    const input = {
      a: [item("https://small.com/page")],
      b: [item("https://big.com/a"), item("https://big.com/b")],
    };
    const result = groupByDomainAndPath(input);
    expect(result[0].domain).toBe("big.com");
  });

  it("sorts paths within a domain by count descending", () => {
    const input = {
      a: [
        item("https://example.com/rare"),
        item("https://example.com/popular"),
        item("https://example.com/popular"),
      ],
    };
    const result = groupByDomainAndPath(input);
    expect(result[0].paths[0].path).toBe("/popular");
    expect(result[0].paths[0].items).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(groupByDomainAndPath({})).toEqual([]);
  });

  it("handles invalid URLs gracefully", () => {
    const input = { a: [item("not-a-url")] };
    const result = groupByDomainAndPath(input);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("not-a-url");
    expect(result[0].paths[0].path).toBe("/");
  });
});
