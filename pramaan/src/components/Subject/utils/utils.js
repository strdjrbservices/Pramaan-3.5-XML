import uploadSoundFile from '../../../Assets/upload.mp3';
import successSoundFile from '../../../Assets/success.mp3';
import errorSoundFile from '../../../Assets/error.mp3';

export const API_BASE_URL = process.env.REACT_APP_API_URL || (
    typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.') ||
        window.location.hostname.startsWith('10.') ||
        window.location.hostname.startsWith('172.') ||
        window.location.port === '3000'
    )
        ? `http://${window.location.hostname || '127.0.0.1'}:8000`
        : 'https://appraisalreviewoffline-strdjrbservices.pythonanywhere.com'
);

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
