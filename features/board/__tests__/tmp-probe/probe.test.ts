it("probe", async () => {
  const f = document.createElement("iframe");
  f.src = "/notes";
  document.body.appendChild(f);
  await new Promise((r) => setTimeout(r, 50));
  const w = f.contentWindow!;
  const got: unknown[] = [];
  window.addEventListener("message", (e) => got.push({ o: e.origin, s: e.source === w, d: e.data }));
  w.addEventListener("message", (e) => got.push({ inFrame: true, o: e.origin, s: e.source === window, d: e.data }));
  console.log("origins", window.location.origin, w.location.href, w.location.origin, w.parent === window);
  w.parent.postMessage({ type: "x" }, window.location.origin);
  w.postMessage({ type: "y" }, window.location.origin);
  await new Promise((r) => setTimeout(r, 50));
  console.log(JSON.stringify(got));
});
