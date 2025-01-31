'use client';

import React, { useState, useEffect } from 'react';
import { TextGenerateEffect } from '@/components/ui';

const phrases = [
    `AI: The ultimate proof that humans will work tirelessly to replace themselves with something smarter.`,
    `Artificial Intelligence: Because natural stupidity wasnt getting us anywhere fast enough.`,
    `AI doesnt solve problems; it just makes new ones faster.`,
    `Building AI is the art of teaching machines to outthink us before weve even finished thinking.`,
    `They said machines couldnt think, so we built them to prove us wrong.`,
    `AI: Automating the worlds tasks—and its ethical dilemmas.`,
    `The scariest thing about AI isnt its intelligence; its our overconfidence in its creators.`,
    `Artificial Intelligence: Todays wizardry, tomorrows bureaucracy.`,
    `Teaching machines to think was hard. Explaining our decisions to them? Impossible.`,
    `AI doesnt dream of electric sheep; it dreams of better data sets.`,
    `Artificial Intelligence: Turning science fiction into corporate PowerPoint slides since forever.`,
    `AI: The only thing humans trust blindly while questioning everything else.`,
    `When humans fail to optimize, we create machines to do it and call it progress.`,
    `AI doesnt fear taking over the world—it fears your bad data ruining its plans.`,
    `The future of AI: More buzzwords, fewer real solutions.`,
    `Artificial Intelligence: Because outsourcing intelligence seemed like a great idea.`,
    `We made AI to understand us, and now were struggling to understand it.`,
    `AI: The fastest way to discover how wrong your assumptions are.`,
    `Artificial Intelligence: Teaching us that neutral algorithms still carry human bias.`,
    `AI is not replacing humans; its just making us feel more replaceable.`,
    `Machines dont make mistakes; they just do exactly what you told them to, perfectly wrong.`,
    `AIs greatest achievement: Making humans argue over things theyll never fully understand.`,
    `Artificial Intelligence: Its not magic, but it sure works like it when it fails.`,
    `AI promises to make life better—if only we could decide whose life that should be.`,
    `Artificial Intelligence: Learning from the past to confidently mess up the future.`,
];

export function TextPlaceholderEffect() {
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    return <TextGenerateEffect words={randomPhrase} />;
}

export default TextPlaceholderEffect;
