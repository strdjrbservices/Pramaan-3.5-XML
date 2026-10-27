import { checkUspapReportingOption } from './appraiserLenderValidation';

describe('checkUspapReportingOption', () => {
    const longKey = 'This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).';

    test('validates Appraisal Report option', () => {
        const res = checkUspapReportingOption(longKey, 'Appraisal Report', {});
        expect(res).toEqual({ isMatch: true, message: 'validated' });
    });

    test('validates Appraisal Report with Standards Rule', () => {
        const res = checkUspapReportingOption(longKey, 'Appraisal Report (USPAP Standards Rule 2-2(a))', {});
        expect(res).toEqual({ isMatch: true, message: 'validated' });
    });

    test('validates Restricted Appraisal Report when comment is present', () => {
        const allData = {
            'Comments on Appraisal and Report Identification': 'Use of this report is restricted to client only for internal decision making.'
        };
        const res = checkUspapReportingOption(longKey, 'Restricted Appraisal Report', allData);
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('validated');
    });

    test('fails Restricted Appraisal Report when comment is missing', () => {
        const allData = {};
        const res = checkUspapReportingOption(longKey, 'Restricted Appraisal Report', allData);
        expect(res.isError).toBe(true);
        expect(res.message).toContain('comment is required');
    });

    test('fails when blank or empty', () => {
        const res = checkUspapReportingOption(longKey, '', {});
        expect(res.isError).toBe(true);
    });
});
