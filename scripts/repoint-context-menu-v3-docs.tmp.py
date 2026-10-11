# One-off: repoint prose/comment mentions of features/context-menu-v3 (deleted after the cutover).
import re,subprocess,sys
REACT={"NonEditableContextMenu","EditableContextMenu","ContextMenuV3","PageSurfaceMenu","menu-presence","regroup/RegroupContext","item/ItemMenuHostBinding","item/ItemContextMenuV3","components/OpenSurfaceMenuButton"}
MODEL={"model/menu-model","alchemy-provider","value-resolution","utils/editor-text-agent","utils/selection-write-back","utils/insert-into-editor","hooks/useContextMenuActions","hooks/useUnifiedAgentContextMenu"}
MC={"components/AlchemyMenuContent","components/ShortcutKeyRunner"}
def tgt(sub):
    sub=re.sub(r"\.(tsx?|jsx?)$","",sub)
    if sub in REACT or sub=="": return "@ai-matrx/context-menu/react"
    if sub in MODEL: return "@ai-matrx/context-menu/model"
    if sub in MC: return "@ai-matrx/context-menu/menu-content"
    return "@ai-matrx/context-menu/engine"
files=[l for l in subprocess.run(["git","grep","-l","features/context-menu-v3","--",".",":!docs/handoffs/**",":!docs/INDEX_FILES_AUDIT.md",":!migrations/**",":!*.json",":!scripts/*.tmp.*",":!features/context-menu-v3/**",":!features/context-menu-host/**"],capture_output=True,text=True).stdout.split("\n") if l]
for f in files:
    s=open(f).read(); o=s
    s=re.sub(r"@/features/context-menu-v3(?:/([A-Za-z0-9_./-]*[A-Za-z0-9_-]))?", lambda m: tgt(m.group(1) or ""), s)
    s=re.sub(r"((?:\.\./)*)features/context-menu-v3/SECTIONS\.md", lambda m: m.group(1)+"features/context-menu-host/SECTIONS.md", s)
    s=re.sub(r"((?:\.\./)*)features/context-menu-v3/FEATURE\.md", lambda m: m.group(1)+"features/context-menu-host/FEATURE.md", s)
    s=re.sub(r"features/context-menu-v3/((?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\.(?:tsx?|ts))", r"@ai-matrx/context-menu (src/engine/\1)", s)
    s=re.sub(r"features/context-menu-v3/?", "@ai-matrx/context-menu", s)
    if s!=o: open(f,"w").write(s); print(f)
