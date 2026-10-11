"use client";
// TEMPORARY verification page — never committed.
import { DbKindComponent } from "@/features/content-ir/react/db-component/DbKindComponent";
import { defaultComponentEntries } from "@ai-matrx/code-runtime/scope";

const imports = [...defaultComponentEntries(), "date-fns", "lodash", "motion/react", "react-katex", "xlsx", "three", "@react-three/fiber", "react-pdf"];
function res(key: string, source: string) {
  return {
    componentKey: key, source: "db", config: { allowed_imports: imports }, isActive: true, resolvedBy: "db" as const,
    componentSource: source, propsTransform: null, hasComponentSource: true, pinnedKindVersion: null, updatedAt: "2026-10-10T00:00:00Z", createdBy: null,
  };
}
const LINKS = `export default function C(){ return <div id="links" style={{display:'flex',gap:12,flexWrap:'wrap'}}>
<a id="l-web" href="https://example.com/" target="_blank" rel="noopener noreferrer">web</a>
<a id="l-rel" href="/ssr-test-link-target">relative</a>
<a id="l-js" href="javascript:alert(1)">js</a>
<a id="l-mail" href="mailto:a@b.co">mail</a></div>; }`;
const LIBS = `import { useState } from "react";
import { format, addDays } from "date-fns";
import _ from "lodash";
import { motion } from "motion/react";
export default function C(){ const [n]=useState(0);
 return <motion.div id="libs" initial={{opacity:0}} animate={{opacity:1}}>
 <p id="df">{format(addDays(new Date(2026,0,30),3),"yyyy-MM-dd")}</p>
 <p id="lo">{_.chunk([1,2,3,4,5],2).map(c=>c.join("+")).join("|")}</p>
 <p id="mo">motion ok {n}</p></motion.div>; }`;
const MORE = `import { BlockMath, InlineMath } from "react-katex";
import * as XLSX from "xlsx";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
export default function C(){
 const ws = XLSX.utils.aoa_to_sheet([["a","b"],[1,2]]);
 const csv = XLSX.utils.sheet_to_csv(ws);
 const v = new THREE.Vector3(1,2,3).length().toFixed(3);
 return <div id="more"><BlockMath math="\\\\int_0^1 x^2 dx" /><InlineMath math="E=mc^2" />
 <p id="xl">{csv.replace("\\n","/")}</p><p id="th">{v}</p>
 <div style={{width:200,height:100}}><Canvas><mesh><boxGeometry/><meshBasicMaterial color="red"/></mesh></Canvas></div></div>; }`;
const PDF = `import { Document, Page } from "react-pdf";
export default function C(){ return <div id="pdf"><Document file="data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMTAwXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAzNSA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDIwIDQwIFRkIChQREZPSykgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDAzMjYgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozOTYKJSVFT0Y=" onLoadSuccess={(d)=>{document.title="x"}} loading={<p id="pl">loading</p>} error={<p id="pe">PDF ERROR</p>}><Page pageNumber={1} width={200} renderTextLayer={false} renderAnnotationLayer={false} /></Document></div>; }`;
export default function Page() {
  const sandbox = { enabled: true, ceilings: { messageBytes: 262144 }, refusal: null };
  return (
    <div className="p-4 space-y-4">
      {[["tmp_links", LINKS], ["tmp_libs", LIBS], ["tmp_more", MORE], ["tmp_pdf", PDF]].map(([k, src]) => (
        <div key={k} id={`host-${k}`} className="border p-2">
          <DbKindComponent content={JSON.stringify({ __kind: k })} resolution={res(k, src)} sandbox={sandbox} />
        </div>
      ))}
    </div>
  );
}
