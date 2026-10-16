// features/rich-document/actions/handlers/print.ts
//
// `print` (W1a) and `full-print` (W2b) are @ai-matrx/chat's own rows; this app's block printers
// stay registered here, so the package's print still prints every embedded artifact.

// Each embedded block prints through its type's adapter (the one block-printer registry).
import "@/features/canvas/artifact-types/artifact-printers";

