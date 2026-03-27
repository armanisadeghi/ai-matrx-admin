import {
    messageActionsReducer,
    messageActionsActions,
    selectMessageActionInstance,
    selectOpenOverlays,
    selectOverlaysForInstance,
    selectIsMessageActionOverlayOpen,
    selectMessageActionOverlayData,
} from '../messageActionsSlice';

const {
    registerInstance,
    unregisterInstance,
    updateInstanceContext,
    openOverlay,
    closeOverlay,
    closeAllOverlaysForInstance,
} = messageActionsActions;

function makeInstance(overrides = {}) {
    return {
        content: 'Hello world',
        messageId: 'msg-1',
        sessionId: 'sess-1',
        conversationId: 'conv-1',
        rawContent: null,
        metadata: null,
        ...overrides,
    };
}

function stateWith(s) {
    return { messageActions: s };
}

describe('messageActionsSlice', () => {
    const initial = { instances: {}, openOverlays: [] };

    // ── registerInstance ──────────────────────────────────────────────

    it('registerInstance adds to instances map', () => {
        const next = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        expect(next.instances['a']).toEqual(makeInstance());
        expect(Object.keys(next.instances)).toHaveLength(1);
    });

    it('registerInstance overwrites existing instance', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance({ content: 'v1' }) }),
        );
        state = messageActionsReducer(
            state,
            registerInstance({ id: 'a', context: makeInstance({ content: 'v2' }) }),
        );
        expect(state.instances['a'].content).toBe('v2');
    });

    // ── unregisterInstance ────────────────────────────────────────────

    it('unregisterInstance removes instance AND its overlays', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            registerInstance({ id: 'b', context: makeInstance({ messageId: 'msg-2' }) }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'b', overlay: 'emailDialog' }),
        );

        state = messageActionsReducer(state, unregisterInstance('a'));

        expect(state.instances['a']).toBeUndefined();
        expect(state.instances['b']).toBeDefined();
        expect(state.openOverlays).toHaveLength(1);
        expect(state.openOverlays[0].instanceId).toBe('b');
    });

    it('unregisterInstance is a no-op for unknown id', () => {
        const state = messageActionsReducer(initial, unregisterInstance('unknown'));
        expect(state).toEqual(initial);
    });

    // ── updateInstanceContext ─────────────────────────────────────────

    it('updateInstanceContext merges partial updates', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            updateInstanceContext({ id: 'a', updates: { content: 'updated' } }),
        );
        expect(state.instances['a'].content).toBe('updated');
        expect(state.instances['a'].messageId).toBe('msg-1');
    });

    it('updateInstanceContext ignores unknown instance', () => {
        const state = messageActionsReducer(
            initial,
            updateInstanceContext({ id: 'nope', updates: { content: 'x' } }),
        );
        expect(state).toEqual(initial);
    });

    // ── openOverlay ──────────────────────────────────────────────────

    it('openOverlay pushes onto stack', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }),
        );
        expect(state.openOverlays).toHaveLength(1);
        expect(state.openOverlays[0]).toEqual({
            instanceId: 'a',
            overlay: 'saveToNotes',
            data: undefined,
        });
    });

    it('openOverlay is idempotent (no duplicate)', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }),
        );
        expect(state.openOverlays).toHaveLength(1);
    });

    it('openOverlay updates data on duplicate call', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'authGate', data: { featureName: 'v1' } }),
        );
        state = messageActionsReducer(
            state,
            openOverlay({ instanceId: 'a', overlay: 'authGate', data: { featureName: 'v2' } }),
        );
        expect(state.openOverlays).toHaveLength(1);
        expect(state.openOverlays[0].data).toEqual({ featureName: 'v2' });
    });

    it('openOverlay ignores unregistered instance', () => {
        const state = messageActionsReducer(
            initial,
            openOverlay({ instanceId: 'missing', overlay: 'saveToNotes' }),
        );
        expect(state.openOverlays).toHaveLength(0);
    });

    it('openOverlay preserves stack order (FIFO)', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'emailDialog' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'authGate' }));

        expect(state.openOverlays.map((o) => o.overlay)).toEqual([
            'saveToNotes',
            'emailDialog',
            'authGate',
        ]);
    });

    it('openOverlay works with new overlay types (submitFeedback, announcements, userPreferences)', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'submitFeedback' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'announcements' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'userPreferences', data: { initialTab: 'prompts' } }));

        expect(state.openOverlays).toHaveLength(3);
        expect(state.openOverlays.map((o) => o.overlay)).toEqual([
            'submitFeedback',
            'announcements',
            'userPreferences',
        ]);
        expect(state.openOverlays[2].data).toEqual({ initialTab: 'prompts' });
    });

    // ── closeOverlay ─────────────────────────────────────────────────

    it('closeOverlay removes the specific overlay', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'emailDialog' }));
        state = messageActionsReducer(
            state,
            closeOverlay({ instanceId: 'a', overlay: 'saveToNotes' }),
        );

        expect(state.openOverlays).toHaveLength(1);
        expect(state.openOverlays[0].overlay).toBe('emailDialog');
    });

    it('closeOverlay is a no-op for non-existent overlay', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            closeOverlay({ instanceId: 'a', overlay: 'htmlPreview' }),
        );
        expect(state.openOverlays).toHaveLength(0);
    });

    // ── closeAllOverlaysForInstance ───────────────────────────────────

    it('closeAllOverlaysForInstance clears only that instance', () => {
        let state = messageActionsReducer(
            initial,
            registerInstance({ id: 'a', context: makeInstance() }),
        );
        state = messageActionsReducer(
            state,
            registerInstance({ id: 'b', context: makeInstance({ messageId: 'msg-2' }) }),
        );
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'saveToNotes' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'a', overlay: 'emailDialog' }));
        state = messageActionsReducer(state, openOverlay({ instanceId: 'b', overlay: 'authGate' }));

        state = messageActionsReducer(state, closeAllOverlaysForInstance('a'));

        expect(state.openOverlays).toHaveLength(1);
        expect(state.openOverlays[0].instanceId).toBe('b');
        expect(state.instances['a']).toBeDefined();
    });

    // ── Selectors ────────────────────────────────────────────────────

    describe('selectors', () => {
        let state: MessageActionsState;

        beforeEach(() => {
            state = messageActionsReducer(
                initial,
                registerInstance({ id: 'x', context: makeInstance() }),
            );
            state = messageActionsReducer(
                state,
                registerInstance({ id: 'y', context: makeInstance({ messageId: 'msg-2' }) }),
            );
            state = messageActionsReducer(
                state,
                openOverlay({ instanceId: 'x', overlay: 'saveToNotes', data: { folder: 'Scratch' } }),
            );
            state = messageActionsReducer(
                state,
                openOverlay({ instanceId: 'y', overlay: 'emailDialog' }),
            );
        });

        it('selectMessageActionInstance returns correct instance', () => {
            expect(selectMessageActionInstance(stateWith(state), 'x')?.messageId).toBe('msg-1');
            expect(selectMessageActionInstance(stateWith(state), 'missing')).toBeUndefined();
        });

        it('selectOpenOverlays returns full stack', () => {
            expect(selectOpenOverlays(stateWith(state))).toHaveLength(2);
        });

        it('selectOverlaysForInstance filters by instanceId', () => {
            const filtered = selectOverlaysForInstance(stateWith(state), 'x');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].overlay).toBe('saveToNotes');
        });

        it('selectIsMessageActionOverlayOpen returns boolean', () => {
            expect(selectIsMessageActionOverlayOpen(stateWith(state), 'x', 'saveToNotes')).toBe(true);
            expect(selectIsMessageActionOverlayOpen(stateWith(state), 'x', 'emailDialog')).toBe(false);
        });

        it('selectMessageActionOverlayData returns overlay data', () => {
            expect(selectMessageActionOverlayData(stateWith(state), 'x', 'saveToNotes')).toEqual({ folder: 'Scratch' });
            expect(selectMessageActionOverlayData(stateWith(state), 'y', 'emailDialog')).toBeUndefined();
        });
    });
});
