import { renderFaceOf } from "@ai-matrx/rich-content/display/render-face";
import { splitContentIntoBlocksV2 } from "@ai-matrx/rich-content/display/markdown-classification/processors/utils/content-splitter-v2";
const S: Record<string,string> = {
  chart: '```chart\n{"type":"bar","data":[{"name":"A","value":1}]}\n```',
  quiz: '```quiz\n{"quiz_title":"Q","multiple_choice":[{"id":1,"question":"1+1?","options":["2","3"],"correctAnswer":0,"explanation":"x"}]}\n```',
  quizjson: '```json\n{"quiz_title":"Q","multiple_choice":[{"id":1,"question":"1+1?","options":["2","3"],"correctAnswer":0,"explanation":"x"}]}\n```',
  flashcards: '```flashcards\nFront: A\nBack: B\n```',
  table: '```table\n| a | b |\n|---|---|\n| 1 | 2 |\n```',
  csv: '```csv\na,b\n1,2\n```',
  mermaid: '```mermaid\ngraph TD\n A-->B\n```',
  svg: '```svg\n<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>\n```',
  stats: '```stats\n{"items":[{"label":"A","value":1}]}\n```',
  timeline: '```timeline\n{"title":"T","events":[{"date":"2026","title":"x"}]}\n```',
  math: '```math\nx^2\n```',
};
it("probe", () => {
  for (const [k, v] of Object.entries(S)) {
    const b = splitContentIntoBlocksV2(v).map((x:any)=>({type:x.type, lang:x.language, meta: x.metadata && Object.keys(x.metadata), kind: x.metadata?.__ir?.root?.kind}));
    console.log("PROBE", k, JSON.stringify(renderFaceOf(v)), JSON.stringify(b));
  }
});
