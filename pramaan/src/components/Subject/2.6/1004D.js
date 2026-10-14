import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    Paper,
    Alert,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Stack,
    Container,
    Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import { API_BASE_URL } from '../utils/utils.js';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import uploadSoundFile from '../../../Assets/upload.mp3';
import successSoundFile from '../../../Assets/success.mp3';
import errorSoundFile from '../../../Assets/error.mp3';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PremiumLogo from '../../auth/logo';

const playSound = (soundType) => {
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
        audio.play().catch(e => console.error("Error playing sound:", e));
    } catch (e) {
        console.error("Error playing sound:", e);
    }
};

const Form1004D = () => {
    const [oldPdfFile, setOldPdfFile] = useState(null);
    const [htmlFile, setHtmlFile] = useState(null);
    const [newPdfFile, setNewPdfFile] = useState(null);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [error, setError] = useState('');
    const [comparisonMode, setComparisonMode] = useState('pdf-vs-pdf');
    const [successMessage, setSuccessMessage] = useState('');
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);

    const PDF_VS_PDF_PROMPT = `1. Please confirm if all sections/fields in the subject section of the 1004D are filled.
2. Compare 'Contract Price' and 'Date of Contract' from the 1004D (new PDF) to the contract section of the Original Appraisal (old PDF).
3. Compare 'Effective Date' and 'Final Value' (as Original Appraised Value) from the 1004D (new PDF) to the 'Effective Date' and 'Final Value' in the Original Appraisal (old PDF).
4. Compare 'Original Appraiser', 'Lender/Client', and 'Address' from the 1004D (new PDF) to the subject section's 'Appraiser', 'Lender/Client Name', and 'Address' of the Original Appraisal (old PDF).
5. In the 1004D PDF, check the "SUMMARY APPRAISAL UPDATE REPORT" section. If it is checked, verify that the question "HAS THE MARKET VALUE OF THE SUBJECT PROPERTY DECLINED SINCE THE EFFECTIVE DATE OF THE PRIOR APPRAISAL?" is answered 'Yes' or 'No'. If 'Yes', a difference value must be present. If 'No', no difference value should be present.
 
Also, if this section is checked, the 'Effective Date' in the signature area must be present. The 'Inspection Date' is optional, but if present, it must be less than or equal to the 'Effective Date'.
 
6. In the 1004D PDF, check the "CERTIFICATION OF COMPLETION" section. If it is checked, verify that the question "HAVE THE IMPROVEMENTS BEEN COMPLETED IN ACCORDANCE WITH THE REQUIREMENTS AND CONDITIONS STATED IN THE ORIGINAL APPRAISAL REPORT?" is answered 'Yes' or 'No'. If 'Yes', the repairs/changes mentioned should match the reconciliation section of the Original Appraisal (old PDF), where the appraisal should be marked "subject to".
 
Also, if this section is checked, the 'Inspection Date' in the signature area must be present. The 'Effective Date' is optional, but if present, it must be greater than or equal to the 'Inspection Date'.
 
 
7. Confirm the presence of a 'Subject street, front view' photo in the 1004D PDF.
8. Confirm the presence of 'E&O and license' details in the 1004D PDF.
9. Confirm the presence of a 'Subject photo addendum' in the 1004D PDF. This is mandatory if the "CERTIFICATION OF COMPLETION" section is checked.

For each item, provide a JSON object in a 'details' array. Each object must have 'sr_no', 'description' (the checklist item), 'original_appraisal_value' (value from old PDF), 'form_1004D_value' (value from new PDF), 'comment' (details of the finding), and 'status' ('Match', 'Mismatch', 'Not Found', or 'Present').`;

    const HTML_VS_PDF_PROMPT = `1. The lender/client's name and lender/client address from the signature section of the 1004d PDF should match the lender/client's name and address in HTML.
2. The inspection date of 1004D should match the inspection date of HTML.
3. The borrower's name and borrower address from HTML should match the subject section and certification section of 1004D.
4. The appraiser's name on the HTML should match with the appraiser's name in 1004d certification section.

For each item, provide a JSON object in a 'details' array. Each object must have 'field' (the checklist item), 'pdf_value' (value from PDF), 'html_value' (value from HTML), 'comment' (details of the finding), and 'status' ('Match', 'Mismatch', 'Not Found', or 'Present').`;

    useEffect(() => {
        if (error) playSound('error');
    }, [error]);

    useEffect(() => {
        if (response) playSound('success');
    }, [response]);

    useEffect(() => {
        if (comparisonMode === 'pdf-vs-pdf') {
            setPromptText(PDF_VS_PDF_PROMPT);
        } else {
            setPromptText(HTML_VS_PDF_PROMPT);
        }
    }, [comparisonMode, PDF_VS_PDF_PROMPT, HTML_VS_PDF_PROMPT]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleFileChange = (setter) => (event) => {
        setter(event.target.files[0]);
        setError('');
        setSuccessMessage('');
        setResponse(null);
        if (event.target.files[0]) playSound('upload');
    };

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setComparisonMode(newMode);
            setResponse(null);
            setSuccessMessage('');
            setError('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!promptText.trim()) {
            setError('Please provide a prompt or checklist.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        setResponse(null);
        setTimer(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

        const formData = new FormData();
        let endpoint = '';

        if (comparisonMode === 'pdf-vs-pdf') {
            if (!oldPdfFile || !newPdfFile) {
                setError('Please provide both the Original and New PDF files.');
                setLoading(false);
                return;
            }
            formData.append('old_pdf_file', oldPdfFile);
            formData.append('new_pdf_file', newPdfFile);
            formData.append('revision_request', promptText);
            endpoint = `${API_BASE_URL}/api/compare-pdfs/`;
        } else {
            if (!htmlFile || !newPdfFile) {
                setError('Please provide both the HTML and New PDF files.');
                setLoading(false);
                return;
            }
            formData.append('html_file', htmlFile);
            formData.append('pdf_file', newPdfFile);
            formData.append('comment', promptText);
            endpoint = `${API_BASE_URL}/api/htmlpdf/`;
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            const rawText = await res.text();

            if (!res.ok) {
                let errorDetail = `HTTP error! status: ${res.status}`;
                try {
                    const errorJson = JSON.parse(rawText);
                    errorDetail = errorJson.detail || errorJson.error || errorDetail;
                } catch (parseError) {
                    errorDetail = rawText || errorDetail;
                }
                throw new Error(errorDetail);
            }
            const result = JSON.parse(rawText);
            setResponse(result);
        } catch (e) {
            const errorMessage = e.message.includes('Failed to fetch') ? 'Could not connect to the server. Please ensure it is running.' : e.message;
            setError(errorMessage);
        } finally {
            setLoading(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSaveToDB = async () => {
        if (!response) return;
        setLoading(true);
        setSuccessMessage('');
        setError('');
        try {
            const username = localStorage.getItem('username') || 'Unknown User';
            const dataToSave = {
                file_name: newPdfFile?.name || '1004D_Report.pdf',
                user_name: username,
                report_data: {
                    formType: '1004D',
                    comparisonMode: comparisonMode,
                    data: response
                }
            };

            const res = await fetch(`${API_BASE_URL}/api/save-report/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave),
            });

            if (!res.ok) {
                throw new Error('Failed to save data.');
            }
            setSuccessMessage('Data saved successfully!');
            playSound('success');
        } catch (e) {
            setError(e.message);
            playSound('error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateValidationLog = () => {
        if (!response) return;
        const doc = new jsPDF();
        const title = "1004D Validation Log";
        doc.text(title, 14, 20);

        let body = [];
        let head = [];

        const details = response.fields?.details || response.details;

        if (details && Array.isArray(details)) {
            const headers = Object.keys(details[0] || {});
            head = [headers.map(h => h.replace(/_/g, ' ').toUpperCase())];
            const seenRows = new Set();
            const tempBody = details.map(item => headers.map(h => {
                const val = item[h];
                return typeof val === 'object' ? JSON.stringify(val) : (val || '');
            }));
            body = tempBody.filter(row => {
                const rowKey = JSON.stringify(row);
                if (seenRows.has(rowKey)) {
                    return false;
                }
                seenRows.add(rowKey);
                return true;
            });
        }

        if (body.length > 0) {
            autoTable(doc, {
                startY: 30,
                head: head,
                body: body,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [22, 160, 133] },
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        const valStr = String(data.cell.raw || '').toLowerCase();
                        const isError = valStr.includes('not') ||
                            valStr.includes('mismatch') ||
                            valStr.includes('error') ||
                            valStr.includes('fail') ||
                            valStr.includes('needs review') ||
                            valStr.includes('unfulfilled');
                        if (isError) {
                            data.cell.styles.textColor = [220, 53, 69];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
            doc.save('1004D_Validation_Log.pdf');
            setSuccessMessage('Validation Log generated.');
        } else {
            setError('No details found to generate log.');
        }
    };

    const renderStatus = (status, comment) => {
        const validStatuses = ['fulfilled', 'present', 'consistent', 'match'];
        const statusLower = String(status || '').toLowerCase();
        const isValid = validStatuses.some(s => statusLower.includes(s)) &&
            !statusLower.includes('not') &&
            !statusLower.includes('mismatch');

        const style = isValid
            ? { backgroundColor: '#91ff00ff', color: '#000000', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }
            : { backgroundColor: '#ff0000', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' };

        const tooltipText = typeof comment === 'object' ? JSON.stringify(comment) : String(comment || '');

        return (
            <Tooltip title={tooltipText} arrow>
                <span style={style}>
                    {status || 'N/A'}
                </span>
            </Tooltip>
        );
    };

    const renderGenericObject = (data) => {
        const rows = [];
        const processObject = (obj, prefix = '') => {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    const displayName = (prefix ? `${prefix} - ` : '') + key.replace(/_/g, ' ');

                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        if ('status' in value && 'details' in value) {
                            rows.push({ check: displayName, status: value.status, details: value.details });
                        } else {
                            processObject(value, displayName);
                        }
                    } else {
                        rows.push({ check: displayName, status: 'N/A', details: JSON.stringify(value) });
                    }
                }
            }
        };

        processObject(data);

        if (rows.length === 0) return null;

        return (
            <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Comparison Results</Typography>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }} aria-label="comparison table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', textTransform: 'capitalize', width: '30%' }}>Check</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textTransform: 'capitalize', width: '15%' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.check}</TableCell>
                                    <TableCell>{renderStatus(row.status, row.details)}</TableCell>
                                    <TableCell>{row.details}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    const renderPdfVsPdfResponse = (data) => {
        const details = data?.fields?.details || data?.details;
        if (!details || !Array.isArray(details) || details.length === 0 || !details[0].original_appraisal_value) {
            return renderGenericObject(data);
        }

        return (
            <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Comparison Results</Typography>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }} aria-label="pdf-vs-pdf comparison table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Sr. No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Original Appraisal Value</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>1004D Form Value</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {details.map((item, index) => (
                                <TableRow key={item.sr_no || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{item.sr_no || 'N/A'}</TableCell>
                                    <TableCell>{item.description || 'N/A'}</TableCell>
                                    <TableCell>{item.original_appraisal_value || 'N/A'}</TableCell>
                                    <TableCell>{item.form_1004D_value || 'N/A'}</TableCell>
                                    <TableCell>{item.comment || 'N/A'}</TableCell>
                                    <TableCell>{renderStatus(item.status, item.comment)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    const renderHtmlVsPdfResponse = (data) => {
        if (!data || !data.details || !Array.isArray(data.details) || data.details.length === 0) {
            return renderGenericObject(data);
        }

        const details = data.details;
        const headers = Object.keys(details[0] || {});

        return (
            <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Comparison Results</Typography>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }} aria-label="html-vs-pdf comparison table">
                        <TableHead>
                            <TableRow>
                                {headers.map(header => (
                                    <TableCell key={header} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                        {header.replace(/_/g, ' ')}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {details.map((item, index) => (
                                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    {headers.map(header => (
                                        <TableCell key={header}>
                                            {header === 'status' ? renderStatus(item[header], item.comment) : (item[header] || 'N/A')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };



    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    mb: 5,
                }}
            >
                <PremiumLogo size={70} fullScreen={false} />
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(45deg, #1976d2, #9c27b0)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    1004D REVIEW
                </Typography>
            </Box>

            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack spacing={3} alignItems="center">
                    <ToggleButtonGroup
                        color="primary"
                        value={comparisonMode}
                        exclusive
                        onChange={handleModeChange}
                        aria-label="Comparison Mode"
                        size="medium"
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 1,
                            '& .MuiToggleButton-root': {
                                px: { xs: 1.5, sm: 3 },
                                py: 1,
                                borderRadius: '8px !important',
                                mx: 0.5,
                                my: 0.5,
                                border: '1px solid rgba(0, 0, 0, 0.12) !important',
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="pdf-vs-pdf">PDF vs. PDF</ToggleButton>
                        <ToggleButton value="html-vs-pdf">HTML vs. PDF</ToggleButton>
                    </ToggleButtonGroup>

                    <Divider flexItem sx={{ width: '100%', maxWidth: 800, mx: 'auto !important' }} />

                    <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 1000 }}>
                        {comparisonMode === 'pdf-vs-pdf' && (
                            <>
                                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: oldPdfFile ? 'success.main' : 'divider', bgcolor: oldPdfFile ? 'success.lighter' : 'transparent' }}>
                                        <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                                            Upload Old/Original PDF
                                            <input type="file" hidden accept=".pdf,application/pdf" onChange={handleFileChange(setOldPdfFile)} />
                                        </Button>
                                        <Typography variant="caption" display="block" noWrap color={oldPdfFile ? "success.main" : "text.secondary"}>
                                            {oldPdfFile ? oldPdfFile.name : "No file selected"}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: newPdfFile ? 'success.main' : 'divider', bgcolor: newPdfFile ? 'success.lighter' : 'transparent' }}>
                                        <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                                            Upload 1004D PDF
                                            <input type="file" hidden accept=".pdf,application/pdf" onChange={handleFileChange(setNewPdfFile)} />
                                        </Button>
                                        <Typography variant="caption" display="block" noWrap color={newPdfFile ? "success.main" : "text.secondary"}>
                                            {newPdfFile ? newPdfFile.name : "No file selected"}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </>
                        )}
                        {comparisonMode === 'html-vs-pdf' && (
                            <>
                                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: htmlFile ? 'success.main' : 'divider', bgcolor: htmlFile ? 'success.lighter' : 'transparent' }}>
                                        <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                                            Upload HTML File
                                            <input type="file" hidden accept=".html,text/html" onChange={handleFileChange(setHtmlFile)} />
                                        </Button>
                                        <Typography variant="caption" display="block" noWrap color={htmlFile ? "success.main" : "text.secondary"}>
                                            {htmlFile ? htmlFile.name : "No file selected"}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: newPdfFile ? 'success.main' : 'divider', bgcolor: newPdfFile ? 'success.lighter' : 'transparent' }}>
                                        <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                                            Upload 1004D PDF
                                            <input type="file" hidden accept=".pdf,application/pdf" onChange={handleFileChange(setNewPdfFile)} />
                                        </Button>
                                        <Typography variant="caption" display="block" noWrap color={newPdfFile ? "success.main" : "text.secondary"}>
                                            {newPdfFile ? newPdfFile.name : "No file selected"}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </>
                        )}
                    </Grid>
                </Stack>
            </Paper>

            <form onSubmit={handleSubmit}>
                <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Checklist / Prompt Details</Typography>
                    <TextField
                        placeholder="Enter custom prompt or checklist..."
                        multiline
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        variant="outlined"
                        spellCheck="true"
                        fullWidth
                        rows={6}
                        required
                        sx={{
                            bgcolor: 'background.paper',
                            '& .MuiInputBase-input': {
                                resize: 'vertical',
                            },
                        }}
                    />
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        loading={loading}
                        disabled={!newPdfFile || !promptText.trim() || (comparisonMode === 'pdf-vs-pdf' ? !oldPdfFile : !htmlFile)}
                        startIcon={<PlayArrowIcon />}
                        sx={{ px: 4, py: 1.5, borderRadius: 3, fontSize: '1rem', fontWeight: 'bold', boxShadow: 4 }}
                    >
                        Run Check
                    </LoadingButton>
                    <Button
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={handleSaveToDB}
                        disabled={loading || !response}
                        startIcon={<SaveIcon />}
                        sx={{ px: 3, py: 1.5, borderRadius: 3 }}
                    >
                        Save to DB
                    </Button>
                    <Button
                        variant="outlined"
                        color="success"
                        size="large"
                        onClick={handleGenerateValidationLog}
                        disabled={loading || !response}
                        startIcon={<AssessmentIcon />}
                        sx={{ px: 3, py: 1.5, borderRadius: 3 }}
                    >
                        Generate Log
                    </Button>
                </Box>
                {loading && <Typography variant="body2" sx={{ mt: -2, mb: 3, textAlign: 'center', color: 'text.secondary' }}>Processing... {Math.floor(timer / 60)}m {timer % 60}s</Typography>}
            </form>

            <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMessage}</Alert>}
                {!loading && (response || error) && (
                    <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Total time taken: {Math.floor(timer / 60)}m {timer % 60}s
                    </Typography>
                )}
                {response && comparisonMode === 'pdf-vs-pdf' && renderPdfVsPdfResponse(response)}
                {response && comparisonMode === 'html-vs-pdf' && renderHtmlVsPdfResponse(response)}
            </Box>
        </Container>
    );
};

export default Form1004D;
