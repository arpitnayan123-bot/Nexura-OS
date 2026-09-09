import { describe, it, expect } from "vitest";
import { paginate, toCsv, rateLimit } from "@/lib/nx/api";
import type { NextRequest } from "next/server";

/* API foundations — pagination, CSV export, rate limiting. */

function fakeReq(params: Record<string, string>): NextRequest {
  const sp = new URLSearchParams(params);
  return {
    nextUrl: { searchParams: sp },
  } as unknown as NextRequest;
}

describe("paginate", () => {
  it("applies defaults", () => {
    const p = paginate(fakeReq({}));
    expect(p.page).toBe(1);
    expect(p.perPage).toBe(25);
    expect(p.skip).toBe(0);
    expect(p.order).toBe("desc");
  });

  it("computes skip correctly", () => {
    const p = paginate(fakeReq({ page: "3", perPage: "10" }));
    expect(p.skip).toBe(20);
    expect(p.take).toBe(10);
  });

  it("caps perPage at maxPerPage", () => {
    const p = paginate(fakeReq({ perPage: "9999" }), { maxPerPage: 100 });
    expect(p.perPage).toBe(100);
  });

  it("rejects non-numeric garbage", () => {
    const p = paginate(fakeReq({ page: "abc", perPage: "xyz" }));
    expect(p.page).toBe(1);
    expect(p.perPage).toBe(25);
  });

  it("order only asc|desc", () => {
    expect(paginate(fakeReq({ order: "asc" })).order).toBe("asc");
    expect(paginate(fakeReq({ order: "sideways" })).order).toBe("desc");
  });
});

describe("toCsv", () => {
  it("renders headers + rows", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
    expect(csv.split("\n")).toEqual(["a,b", "1,x", "2,y"]);
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = toCsv([{ name: 'He said "hi, there"\nagain' }]);
    expect(csv).toContain('"He said ""hi, there""\nagain"');
  });

  it("respects explicit column order", () => {
    const csv = toCsv([{ a: 1, b: 2 }], ["b", "a"]);
    expect(csv.split("\n")[0]).toBe("b,a");
  });

  it("returns empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});

describe("rateLimit", () => {
  it("allows under the limit and blocks over it", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it("tracks remaining count", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  it("isolates identifiers", () => {
    const a = `test-${Math.random()}`;
    const b = `test-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});
