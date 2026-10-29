import uploadSoundFile from '../../../Assets/upload.mp3';
import successSoundFile from '../../../Assets/success.mp3';
import errorSoundFile from '../../../Assets/error.mp3';

const rawApiUrl = process.env.REACT_APP_API_URL || 'https://45.195.243.67';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const getComparisonStyle = (field, extractedValue, comparisonValue) => {
    if (!comparisonValue) {
        return {};
    }
    const areDifferent = String(extractedValue).trim() !== String(comparisonValue).trim();
    if (areDifferent) {
        return { border: '1px solid red' };
    }
    return {};
};

export const playSound = (soundType) => {
    let soundFile;
    if (soundType === 'success') {
        soundFile = successSoundFile;
    } else if (soundType === 'error') {
        soundFile = errorSoundFile;
    } else if (soundType === 'upload') {
        soundFile = uploadSoundFile;
    } else {
        return;
    }

    try {
        const audio = new Audio(soundFile);
        audio.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                console.warn("Error playing sound:", e);
            }
        });

    } catch (e) {
        if (e.name !== 'NotAllowedError') {
            console.warn("Error playing sound:", e);
        }
    }
};
