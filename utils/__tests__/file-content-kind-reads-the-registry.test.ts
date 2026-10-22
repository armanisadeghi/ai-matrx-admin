import { getFileType } from "@/utils/fileContentKind";
it("maps like the old table for the common cases", () => {
  const cases: Record<string,string> = { "a.json":"json","a.md":"markdown","a.markdown":"markdown","a.txt":"text","a.log":"text","a.csv":"text","a.yml":"text","a.yaml":"text","a.ts":"text","a.tsx":"text","a.css":"text","a.html":"text","a.xml":"text","a.png":"image","a.jpg":"image","a.svg":"image","a.webp":"image","a.pdf":"binary","a.docx":"binary","a.xlsx":"binary","a.zip":"binary" };
  const got = Object.fromEntries(Object.keys(cases).map(k => [k, getFileType(k)]));
  expect(got).toEqual(cases);
});
