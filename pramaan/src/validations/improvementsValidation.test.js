import {
    parseDesignStyle,
    checkSubjectDesignStyleConsistency,
    checkDesignStyle
} from './improvementsValidation';

describe('Improvements Section - Design (Style) Validations', () => {
    describe('parseDesignStyle', () => {
        test('correctly parses UAD formatted design style with prefix', () => {
            expect(parseDesignStyle('DT1;R Ranch')).toEqual({
                prefix: 'DT1',
                style: 'R Ranch'
            });
            expect(parseDesignStyle('DT1.5;Colonial')).toEqual({
                prefix: 'DT1.5',
                style: 'Colonial'
            });
            expect(parseDesignStyle('AT2;Townhouse')).toEqual({
                prefix: 'AT2',
                style: 'Townhouse'
            });
        });

        test('correctly parses plain design style without UAD prefix', () => {
            expect(parseDesignStyle('R Ranch')).toEqual({
                prefix: '',
                style: 'R Ranch'
            });
            expect(parseDesignStyle('Colonial')).toEqual({
                prefix: '',
                style: 'Colonial'
            });
        });

        test('handles empty or whitespace strings', () => {
            expect(parseDesignStyle('')).toEqual({
                prefix: '',
                style: ''
            });
            expect(parseDesignStyle('   ')).toEqual({
                prefix: '',
                style: ''
            });
            expect(parseDesignStyle(null)).toEqual({
                prefix: '',
                style: ''
            });
        });
    });

    describe('checkSubjectDesignStyleConsistency', () => {
        const mockAllData = (impStyle, gridStyle) => ({
            IMPROVEMENTS: {
                'Design (Style)': impStyle
            },
            Subject: {
                'Design (Style)': gridStyle
            }
        });

        test('matches when Improvements is "R Ranch" and Sales Grid Subject is "DT1;R Ranch" (UAD format)', () => {
            const allData = mockAllData('R Ranch', 'DT1;R Ranch');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });

        test('matches when both are plain "R Ranch"', () => {
            const allData = mockAllData('R Ranch', 'R Ranch');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });

        test('matches when called from Sales Grid Subject field', () => {
            const allData = mockAllData('R Ranch', 'DT1;R Ranch');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'DT1;R Ranch',
                allData,
                ['Subject', 'Design (Style)'],
                'Subject'
            );
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });

        test('matches standard abbreviations like "Raised Ranch" and "R Ranch"', () => {
            const allData1 = mockAllData('Raised Ranch', 'DT1;R Ranch');
            const res1 = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'Raised Ranch',
                allData1,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res1).toEqual({ isMatch: true, message: 'validated' });

            const allData2 = mockAllData('R Ranch', 'DT1;Raised Ranch');
            const res2 = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData2,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res2).toEqual({ isMatch: true, message: 'validated' });
        });

        test('matches "Split Level" and "Split Lvl"', () => {
            const allData = mockAllData('Split Level', 'DT1;Split Lvl');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'Split Level',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });

        test('returns error when Improvements "R Ranch" conflicts with Sales Grid "DT1;Split Lvl"', () => {
            const allData = mockAllData('R Ranch', 'DT1;Split Lvl');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "Design (Style) mismatch: Improvements section indicates 'R Ranch', but Sales Comparison Grid (Subject) indicates 'DT1;Split Lvl'. Please reconcile and revise."
            });
        });

        test('returns error when Improvements "Colonial" conflicts with Sales Grid "DT1;R Ranch"', () => {
            const allData = mockAllData('Colonial', 'DT1;R Ranch');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'Colonial',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "Design (Style) mismatch: Improvements section indicates 'Colonial', but Sales Comparison Grid (Subject) indicates 'DT1;R Ranch'. Please reconcile and revise."
            });
        });

        test('returns null for comparable sales (not Subject)', () => {
            const allData = mockAllData('R Ranch', 'DT1;R Ranch');
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'DT1;Split Lvl',
                allData,
                ['COMPARABLE SALE #1', 'Design (Style)'],
                'COMPARABLE SALE #1'
            );
            expect(res).toBeNull();
        });

        test('returns null when either section is empty', () => {
            const allData1 = mockAllData('', 'DT1;R Ranch');
            expect(checkSubjectDesignStyleConsistency(
                'Design (Style)',
                '',
                allData1,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            )).toBeNull();

            const allData2 = mockAllData('R Ranch', '');
            expect(checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData2,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            )).toBeNull();
        });

        test('supports nested clean_data structure', () => {
            const allData = {
                clean_data: {
                    IMPROVEMENTS: { 'Design (Style)': 'R Ranch' },
                    Subject: { 'Design (Style)': 'DT1;R Ranch' }
                }
            };
            const res = checkSubjectDesignStyleConsistency(
                'Design (Style)',
                'R Ranch',
                allData,
                ['IMPROVEMENTS', 'Design (Style)'],
                null
            );
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });
    });

    describe('checkDesignStyle blank validation', () => {
        test('returns error when Design (Style) is blank', () => {
            expect(checkDesignStyle('Design (Style)', '')).toEqual({
                isError: true,
                message: "'Design (Style)' cannot be blank."
            });
        });

        test('returns match when Design (Style) has value', () => {
            expect(checkDesignStyle('Design (Style)', 'R Ranch')).toEqual({
                isMatch: true
            });
        });
    });
});
