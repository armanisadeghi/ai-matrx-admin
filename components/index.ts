// components/index.ts

import {ParallaxScrollAdvanced} from "@/components/matrx/parallax-scroll/ParalaxStoreAdvanced";

export {
    SmallComponentLoading,
    MediumComponentLoading,
    LargeComponentLoading,
    CardLoading,
    FullPageLoading,
    TableLoadingComponent,
    MatrxTableLoading,
    TextLoading,
} from '@/components/matrx/LoadingComponents';

export { Logo, LogoIcon } from './layout/MatrixLogo';
export { MatrxWobbleCard } from '@/components/matrx/wobble-card';
export { Matrix3DFeatureCard } from '@/components/matrx/3d-feature-card';

// Consolidated export from AnimatedForm
export * from '@/components/matrx/AnimatedForm';


// Exporting directories with index files
export * from '@/components/matrx/AnimatedRevealCard';
export * from '@/components/matrx/buttons';
export * from '@/components/matrx/camera';
export * from '@/components/matrx/delete-dialog';
export * from '@/components/matrx/dragable-sidebar';
export * from '@/components/matrx/hover-tooltip';
export * from '@/components/matrx/input';
export * from '@/components/matrx/mobile-menu';
export * from '@/components/matrx/next-windows';
export * from '@/components/matrx/pagination';
export {ParallaxScroll} from '@/components/matrx/parallax-scroll/ParalaxScrollSubtle';
export {ParallaxScrollAdvanced} from '@/components/matrx/parallax-scroll/ParalaxStoreAdvanced';
export * from '@/components/matrx/radio';
export * from '@/components/matrx/scroll-area';
export {PlaceholdersVanishingSearchInput} from '@/components/matrx/search-input/PlaceholdersVanishingSearchInput';
export * from '@/components/matrx/three-dot-menu';
export * from '@/components/matrx/windows';
