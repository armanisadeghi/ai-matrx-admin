import {useNowPlaying} from "react-nowplaying";

const FADE_THRESHOLD = 30;
const PAUSE_THRESHOLD = 60;
const STOP_THRESHOLD = 100;
const SCORE_INCREMENT = 10;
const SCORE_DECREMENT = 5;
const DECAY_FACTOR = 0.95;
const FADE_STEP = 0.05;
const CONSTANT_DECAY = 0.99;

export class SpeechTransition {
    private transitionScore: number = 0;
    private fadeInterval: NodeJS.Timeout | null = null;
    private pausedPosition: number | null = null;
    private player: ReturnType<typeof useNowPlaying>['player'];
    private stopAudio: ReturnType<typeof useNowPlaying>['stop'];
    private targetVolume: number = 1;

    constructor(nowPlaying: ReturnType<typeof useNowPlaying>) {
        this.player = nowPlaying.player;
        this.stopAudio = nowPlaying.stop;
    }

    updateTransitionScore(hasSound: boolean) {
        if (hasSound) {
            this.transitionScore += SCORE_INCREMENT;
        } else {
            this.transitionScore -= SCORE_DECREMENT;
        }
        this.transitionScore *= DECAY_FACTOR;
        this.transitionScore *= CONSTANT_DECAY;  // Apply constant decay
        this.transitionScore = Math.max(0, Math.min(this.transitionScore, STOP_THRESHOLD));
        console.log('Transition score:', this.transitionScore);

        this.handleTransition();
    }

    private handleTransition() {
        if (this.transitionScore >= STOP_THRESHOLD) {
            this.stop();
        } else if (this.transitionScore >= PAUSE_THRESHOLD) {
            this.pause();
        } else if (this.transitionScore >= FADE_THRESHOLD) {
            this.targetVolume = Math.max(0.1, 1 - (this.transitionScore - FADE_THRESHOLD) / (PAUSE_THRESHOLD - FADE_THRESHOLD));
            this.adjustVolume();
        } else {
            this.targetVolume = 1;
            this.adjustVolume();
            if (this.pausedPosition !== null) {
                this.resume();
            }
        }
    }

    private adjustVolume() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }

        this.fadeInterval = setInterval(() => {
            if (this.player) {
                const currentVolume = this.player.volume || 1;
                if (Math.abs(currentVolume - this.targetVolume) < FADE_STEP) {
                    this.player.volume = this.targetVolume;
                    if (this.fadeInterval) {
                        clearInterval(this.fadeInterval);
                        this.fadeInterval = null;
                    }
                    this.fadeInterval = null;
                } else if (currentVolume < this.targetVolume) {
                    this.player.volume = Math.min(1, currentVolume + FADE_STEP);
                } else {
                    this.player.volume = Math.max(0, currentVolume - FADE_STEP);
                }
            }
        }, 50);
    }

    private pause() {
        if (this.player && this.player.currentTime && this.pausedPosition === null) {
            this.pausedPosition = this.player.currentTime;
            this.player.pause();
        }
    }

    private resume() {
        if (this.player && this.pausedPosition !== null) {
            this.player.currentTime = this.pausedPosition;
            this.player.play();
            this.pausedPosition = null;
        }
    }

    private stop() {
        if (this.player && !this.player.paused) {
            this.stopAudio();
        }
        this.pausedPosition = null;
    }

    onSpeechDetection(hasSound: boolean) {
        this.updateTransitionScore(hasSound);
    }

    onActivityDetected() {
        this.reset();
    }

    reset() {
        this.transitionScore = 0;
        this.targetVolume = 1;
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        if (this.player) {
            this.player.volume = 1;
        }
        this.pausedPosition = null;
    }
}
