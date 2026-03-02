import { describe, expect, it, vi } from "vitest";

import {
  escapeCsvValue,
  convertToCsv,
  convertToJson,
  downloadFile,
  exportToCsv,
  exportToJson,
} from "./export";

describe("escapeCsvValue", () => {
  it("returns empty string for null or undefined", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("returns string value as-is for simple values", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue(123)).toBe("123");
    expect(escapeCsvValue(true)).toBe("true");
  });

  it("escapes values containing commas", () => {
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
  });

  it("escapes values containing quotes", () => {
    expect(escapeCsvValue('hello "world"')).toBe('"hello ""world"""');
  });

  it("escapes values containing newlines", () => {
    expect(escapeCsvValue("hello\nworld")).toBe('"hello\nworld"');
    expect(escapeCsvValue("hello\r\nworld")).toBe('"hello\r\nworld"');
  });

  it("escapes values with multiple special characters", () => {
    expect(escapeCsvValue('hello, "world"\nfoo')).toBe('"hello, ""world""\nfoo"');
  });
});

describe("convertToCsv", () => {
  type TestRow = {
    id: number;
    name: string;
    active: boolean;
  };

  const columns = [
    { key: "id" as const, header: "ID" },
    { key: "name" as const, header: "Name" },
    { key: "active" as const, header: "Active" },
  ];

  it("returns headers only for empty data", () => {
    const result = convertToCsv<TestRow>([], columns);
    expect(result).toBe("ID,Name,Active");
  });

  it("converts data to CSV format", () => {
    const data: TestRow[] = [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
    ];
    const result = convertToCsv(data, columns);
    expect(result).toBe("ID,Name,Active\n1,Alice,true\n2,Bob,false");
  });

  it("escapes special characters in data", () => {
    const data: TestRow[] = [
      { id: 1, name: 'Smith, "John"', active: true },
    ];
    const result = convertToCsv(data, columns);
    expect(result).toBe('ID,Name,Active\n1,"Smith, ""John""",true');
  });

  it("handles null and undefined values", () => {
    type NullableRow = {
      id: number;
      name: string | null;
      description?: string;
    };

    const nullableColumns = [
      { key: "id" as const, header: "ID" },
      { key: "name" as const, header: "Name" },
      { key: "description" as const, header: "Description" },
    ];

    const data: NullableRow[] = [
      { id: 1, name: null },
      { id: 2, name: "Test", description: undefined },
    ];
    const result = convertToCsv(data, nullableColumns);
    expect(result).toBe("ID,Name,Description\n1,,\n2,Test,");
  });
});

describe("convertToJson", () => {
  it("converts data to JSON string", () => {
    const data = [{ id: 1, name: "Alice" }];
    expect(convertToJson(data)).toBe('[{"id":1,"name":"Alice"}]');
  });

  it("converts empty array to JSON", () => {
    expect(convertToJson([])).toBe("[]");
  });

  it("formats JSON when pretty is true", () => {
    const data = [{ id: 1, name: "Alice" }];
    const result = convertToJson(data, true);
    expect(result).toBe('[\n  {\n    "id": 1,\n    "name": "Alice"\n  }\n]');
  });
});

describe("downloadFile", () => {
  it("creates and clicks a download link", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:url");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createElement = vi.fn().mockReturnValue({
      href: "",
      download: "",
      click,
    });

    document.createElement = createElement;
    document.body.appendChild = appendChild;
    document.body.removeChild = removeChild;

    downloadFile("content", "test.csv", "text/csv");

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElement).toHaveBeenCalledWith("a");
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");
  });
});

describe("exportToCsv", () => {
  it("downloads CSV file", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:url");
    const revokeObjectURL = vi.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    document.createElement = vi.fn().mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
    });
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    const data = [{ id: 1, name: "Alice" }];
    const columns = [
      { key: "id" as const, header: "ID" },
      { key: "name" as const, header: "Name" },
    ];

    exportToCsv(data, columns, "export.csv");

    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "text/csv;charset=utf-8;" }),
    );
  });
});

describe("exportToJson", () => {
  it("downloads JSON file", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:url");
    const revokeObjectURL = vi.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    document.createElement = vi.fn().mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
    });
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    const data = [{ id: 1, name: "Alice" }];

    exportToJson(data, "export.json");

    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "application/json" }),
    );
  });
});
