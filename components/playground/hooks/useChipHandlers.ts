import { useChipMenu } from '@/features/rich-text-editor/components/ChipContextMenu';
import { MatrxRecordId } from '@/types';
import { useCallback, useState } from 'react';

export function useChipHandlers(messageId: MatrxRecordId) {
    const { showMenu } = useChipMenu();
    const [showDialog, setShowDialog] = useState(false);

    const handleChipClick = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;

        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        // Add the test attribute to the clicked chip
        chip.setAttribute('data-test-clicked', 'true');

        console.log('Chip clicked:', chipId);
    }, []);

    const handleChipDoubleClick = useCallback(
        (event: MouseEvent) => {
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;

            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;

            setShowDialog(true);
        },
        [setShowDialog]
    );

    const handleChipMouseEnter = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;

        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        console.log('Mouse entered chip:', chipId);
    }, []);

    const handleChipMouseLeave = useCallback((event: MouseEvent) => {
        const chip = (event.target as HTMLElement).closest('[data-chip]');
        if (!chip) return;

        const chipId = chip.getAttribute('data-chip-id');
        if (!chipId) return;

        console.log('Mouse left chip:', chipId);
    }, []);

    const handleChipContextMenu = useCallback(
        (event: MouseEvent) => {
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;

            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;

            event.preventDefault();
            event.stopPropagation();
            showMenu(messageId, chipId, event.clientX, event.clientY);
        },
        [messageId, showMenu]
    );

    return {
        handleChipClick,
        handleChipDoubleClick,
        handleChipMouseEnter,
        handleChipMouseLeave,
        handleChipContextMenu,
    };
}

export type UseChipHandlersResult = ReturnType<typeof useChipHandlers>;

export default useChipHandlers;
