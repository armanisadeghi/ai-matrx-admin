/**
 * The living aurora behind Smart Add: four slow radial blooms in the theme's own colors (primary +
 * chart tokens, so light and dark each get their palette), a veil into the page base and a fine
 * grain. Transform-only drift (GPU-cheap); still under reduced motion. It dims to a whisper once the
 * structured page is up (the page root carries `data-smart-add-stage`).
 */

import styles from "./stage.module.css";

export function StageBackdrop() {
  return (
    <div
      aria-hidden
      className={`${styles.backdrop} group-has-[[data-smart-add-stage=structured]]:opacity-30`}
    >
      <div className={`${styles.blob} ${styles.blobA}`} />
      <div className={`${styles.blob} ${styles.blobB}`} />
      <div className={`${styles.blob} ${styles.blobC}`} />
      <div className={`${styles.blob} ${styles.blobD}`} />
      <div className={styles.veil} />
      <div className={styles.grain} />
    </div>
  );
}
