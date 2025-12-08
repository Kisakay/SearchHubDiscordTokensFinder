import * as path from 'path';
import * as fs from 'fs';

import type { ProgressData } from "../types/ProgressData";

const PROGRESS_FILE = path.join(__dirname, 'detection_progress.json');

export function loadProgress(): ProgressData | null {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
            return JSON.parse(data) as ProgressData;
        }
    } catch (error) {
        console.error('[LOAD ERROR]', error);
    }
    return null;
}

export function clearProgress(): void {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            fs.unlinkSync(PROGRESS_FILE);
            console.log('[CLEAR] Progression effacée');
        }
    } catch (error) {
        console.error('[CLEAR ERROR]', error);
    }
}

export function saveProgress(data: ProgressData): void {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[SAVE] Progression sauvegardée`);
    } catch (error) {
        console.error('[SAVE ERROR]', error);
    }
}