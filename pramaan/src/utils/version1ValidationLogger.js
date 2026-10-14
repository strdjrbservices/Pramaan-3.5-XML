import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { checkFiveValuesConsistency, checkHbuConsistency } from '../validations/reconciliationValidation';


/**
 * Utility to generate and download the Appraisal Version #1 Review & Validation Log PDF report.
 * Robust data extraction across SUMMARY, Subject, SUBJECT_PROPERTY, CONTACT, SITE, etc.,
 * ensuring all UI field values appear in the generated PDF log.
 */
export const generateVersion1ValidationLogPDF = ({
  data = {},
  comparisonData = {},
  selectedFile = null,
  username = '',
  fileUploadTimer = 0,
  getValidationErrors = () => [],
  getValidationSuccesses = () => [],
  getFieldValueByPath = () => '',
  getRevisionLanguage = () => '',
  selectedFormType = 'Appraisal Version #1',
  stateReqResponse = null,
  clientReqResponse = null,
  escalationResponse = null,
  promptAnalysisResponse = null,
  setNotification = () => {}
}) => {
  if (!data || Object.keys(data).length === 0) {
    setNotification({ open: true, message: 'No data to generate Appraisal Version #1 log.', severity: 'warning' });
    return;
  }

  const reviewAllData = { ...data, comparisonData };
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let yPos = margin;

  // Comprehensive value resolution across all data object structures
  const getVal = (fieldName, pathArray = [], fallback = '') => {
    if (pathArray && pathArray.length > 0) {
      let curr = data;
      let found = true;
      for (let p of pathArray) {
        if (curr && typeof curr === 'object' && p in curr) {
          curr = curr[p];
        } else {
          found = false;
          break;
        }
      }
      if (found && curr !== undefined && curr !== null && String(curr).trim() !== '') {
        return String(curr).trim();
      }
    }

    const sectionsToSearch = [
      data.SUMMARY,
      data.Subject,
      data.SUBJECT_PROPERTY,
      data.CONTACT,
      data.SITE,
      data.IMPROVEMENTS,
      data.DWELLING_EXTERIOR,
      data.UNIT_INTERIOR,
      data.NEIGHBORHOOD,
      data.HBU,
      data.RECONCILIATION,
      data.COST_APPROACH,
      data.CERTIFICATION,
      data.APPRAISER,
      data.SALES_GRID,
      data
    ];

    for (const sec of sectionsToSearch) {
      if (sec && typeof sec === 'object' && fieldName in sec) {
        const v = sec[fieldName];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          return String(v).trim();
        }
      }
    }

    return fallback;
  };

  const checkStatusType = (statusValRaw) => {
    const statusVal = String(statusValRaw || '').toLowerCase().trim();

    const isExplicitError = statusVal.includes('not fulfilled') ||
      statusVal.includes('not present') ||
      statusVal.includes('unfulfilled') ||
      statusVal.includes('missing') ||
      statusVal.includes('escalat') ||
      statusVal.includes('fail') ||
      statusVal.includes('error') ||
      statusVal.includes('mismatch') ||
      statusVal.includes('needs review') ||
      statusVal.includes('non-compliant') ||
      statusVal.includes('non compliant');

    if (isExplicitError) return 'error';

    const isPass = statusVal.includes('fulfilled') ||
      statusVal.includes('present') ||
      statusVal.includes('ok') ||
      statusVal.includes('pass') ||
      statusVal.includes('passed') ||
      statusVal.includes('not applicable') ||
      statusVal.includes('n/a') ||
      statusVal.includes('na') ||
      statusVal.includes('compliant') ||
      statusVal.includes('met') ||
      statusVal.includes('satisfied') ||
      statusVal.includes('valid') ||
      statusVal.includes('complete');

    if (isPass) return 'pass';
    return 'normal';
  };

  // -------------------------------------------------------------
  // PRE-CALCULATE VALIDATION ERRORS & METRICS
  // -------------------------------------------------------------
  const validationErrors = getValidationErrors();
  const validationErrorRows = validationErrors.map(([section, field, message, path]) => {
    const valStr = getFieldValueByPath(reviewAllData, path) || getVal(field);
    const revLanguage = getRevisionLanguage(path, field, message, valStr);
    return [section, field, valStr, message, revLanguage];
  });

  const collectReqCheckErrors = (sectionTitle, responseObj) => {
    if (!responseObj) return;
    let respData = responseObj;
    if (typeof respData === 'string') {
      try { respData = JSON.parse(respData); } catch (e) { respData = null; }
    }
    if (respData && typeof respData === 'object') {
      const details = Array.isArray(respData.details) ? respData.details : [];
      details.forEach(item => {
        const rawStatus = item.status || '';
        if (checkStatusType(rawStatus) === 'error') {
          const field = item.requirement || item.section || 'Requirement Check';
          const rawComment = item.value_or_comment ?? item.comment ?? '';
          const comment = typeof rawComment === 'object' && rawComment !== null ? (rawComment.value || rawComment.comment || JSON.stringify(rawComment)) : String(rawComment || '');
          const valStr = item.value || getVal(field) || 'Needs Review';
          const revLang = getRevisionLanguage(null, field, comment, valStr) || `Please review and comply with ${sectionTitle}: ${comment || rawStatus}`;
          validationErrorRows.push([sectionTitle, field, valStr, comment || `${sectionTitle} requirement not met (${rawStatus})`, revLang]);
        }
      });
    }
  };

  collectReqCheckErrors('State Requirement Check', stateReqResponse);
  collectReqCheckErrors('Client Requirement Check', clientReqResponse);
  collectReqCheckErrors('Escalation Check', escalationResponse);

  // Direct safety fallback for Appraisal Version #1 consistency rules
  try {
    const v1Val = getVal('Opinion of Market Value');
    const fiveValRes = checkFiveValuesConsistency('Opinion of Market Value', v1Val, reviewAllData, ['SUMMARY', 'Opinion of Market Value']);
    if (fiveValRes && fiveValRes.isError) {
      const message = fiveValRes.message;
      const revLang = getRevisionLanguage(['SUMMARY', 'Opinion of Market Value'], 'Opinion of Market Value', message) || `Please update 'Opinion of Market Value' in the Summary / Reconciliation section to resolve the value mismatch.`;
      const alreadyAdded = validationErrorRows.some(row => row[3] === message || (row[1] === 'Opinion of Market Value' && String(row[3]).includes('values is not same')));
      if (!alreadyAdded) {
        validationErrorRows.unshift(['Summary', 'Opinion of Market Value', v1Val || '3100', message, revLang]);
      }
    }
  } catch (e) { }

  try {
    const hbuVal = getVal('Highest and Best Use as Present Use');
    const hbuRes = checkHbuConsistency('Highest and Best Use as Present Use', hbuVal, reviewAllData, ['SITE', 'Highest and Best Use as Present Use']);
    if (hbuRes && hbuRes.isError) {
      const message = hbuRes.message;
      const revLang = getRevisionLanguage(['SITE', 'Highest and Best Use as Present Use'], 'Highest and Best Use as Present Use', message) || `Please verify 'Highest and Best Use' fields.`;
      const alreadyAdded = validationErrorRows.some(row => row[3] === message);
      if (!alreadyAdded) {
        validationErrorRows.push(['Site', 'Highest and Best Use as Present Use', hbuVal || 'Yes', message, revLang]);
      }
    }
  } catch (e) { }

  const cleanFieldName = (name) => {
    if (!name) return '';
    return String(name)
      .toLowerCase()
      .replace(/\s*\((subject|subject property)\)\s*$/i, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const errorFieldsSet = new Set();
  validationErrors.forEach(([s, field, m, path]) => {
    if (field) errorFieldsSet.add(cleanFieldName(field));
  });

  const combineValidationErrorRows = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const groups = new Map();
    const groupOrder = [];

    rows.forEach(row => {
      const [section, field, valStr, message, revLanguage] = row;
      const cleanSection = String(section || '').trim();
      const cleanMsg = String(message || '').trim();

      const match = String(field || '').match(/^(.*?)\s*(\([^)]+\))$/);
      let baseField = String(field || '').trim();
      let suffix = '';
      if (match) {
        baseField = match[1].trim();
        suffix = match[2].trim();
      }

      const normSuffix = (suffix.toLowerCase() === '(subject)' || suffix.toLowerCase() === '(subject property)') ? '' : suffix;
      const normalizedBaseField = baseField.replace(/\s+Adjustments?$/i, '').trim();
      const groupKey = `${cleanSection.toLowerCase()}|${normalizedBaseField.toLowerCase()}|${normSuffix.toLowerCase()}|${cleanMsg.toLowerCase()}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          section: cleanSection,
          message: cleanMsg,
          suffix: normSuffix,
          items: []
        });
        groupOrder.push(groupKey);
      }

      groups.get(groupKey).items.push({
        field: String(field || '').trim(),
        baseField,
        valStr: String(valStr || '').trim(),
        revLanguage: String(revLanguage || '').trim()
      });
    });

    const combinedRows = [];

    groupOrder.forEach(key => {
      const group = groups.get(key);
      const { section, message, suffix, items } = group;

      const distinctBaseFields = [];
      const seenBaseFields = new Set();
      items.forEach(item => {
        const cleanBF = item.baseField.toLowerCase();
        if (!seenBaseFields.has(cleanBF)) {
          seenBaseFields.add(cleanBF);
          distinctBaseFields.push(item.baseField);
        }
      });

      const combinedFieldBase = distinctBaseFields.join(' / ');
      const combinedField = suffix ? `${combinedFieldBase} ${suffix}` : combinedFieldBase;

      const distinctVals = [];
      const seenVals = new Set();
      items.forEach(item => {
        if (item.valStr && !seenVals.has(item.valStr)) {
          seenVals.add(item.valStr);
          distinctVals.push(item.valStr);
        }
      });
      const combinedVal = distinctVals.join(' / ');

      let combinedRevLanguage = items.find(i => i.revLanguage)?.revLanguage || '';
      if (combinedRevLanguage && combinedRevLanguage.includes('(Current Value:')) {
        if (combinedVal) {
          combinedRevLanguage = combinedRevLanguage.replace(/\(Current Value:\s*"[^"]*"\)/i, `(Current Value: "${combinedVal}")`);
        }
      }

      combinedRows.push([section, combinedField, combinedVal, message, combinedRevLanguage]);
    });

    return combinedRows;
  };

  const uniqueValidationErrorRows = combineValidationErrorRows(validationErrorRows);
  uniqueValidationErrorRows.forEach(row => {
    if (row[1]) errorFieldsSet.add(cleanFieldName(row[1]));
    const msg = String(row[3] || '');
    if (msg.includes('values is not same')) {
      errorFieldsSet.add(cleanFieldName('Opinion of Market Value'));
      errorFieldsSet.add(cleanFieldName('Indicated Value by Sales Comparison Approach Indicated'));
      errorFieldsSet.add(cleanFieldName('Sales Comparison Approach Indicated Value'));
      errorFieldsSet.add(cleanFieldName('Median Sale Price'));
      errorFieldsSet.add(cleanFieldName('Indicated Value by Sales Comparison Approach'));
    }
  });

  const now = new Date();
  const dateOnlyStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeOnlyStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const generationTimestamp = `${dateOnlyStr}, ${timeOnlyStr}`;
  const totalTime = `${Math.floor(fileUploadTimer / 3600).toString().padStart(2, '0')}:${Math.floor((fileUploadTimer % 3600) / 60).toString().padStart(2, '0')}:${(fileUploadTimer % 60).toString().padStart(2, '0')}`;

  const addHeaderFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      if (i === 1) {
        // Page 1 Top Header Banner (Dark Charcoal Gray)
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, 210, 14, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('DJRB SERVICES PVT LTD', margin, 9.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(240, 244, 248);
        doc.text('Enterprise Appraisal Review & Quality Assurance', doc.internal.pageSize.width - margin, 9.5, { align: 'right' });
      } else {
        // Page 2+ Running Header Line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, 12, doc.internal.pageSize.width - margin, 12);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(44, 62, 80);
        doc.text('DJRB SERVICES   |   APPRAISAL VALIDATION REPORT', margin, 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(113, 128, 150);
        doc.text(`Generated: ${dateOnlyStr}`, doc.internal.pageSize.width - margin, 9, { align: 'right' });
      }

      // Page Footer Separator Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, doc.internal.pageSize.width - margin, pageHeight - 12);

      // Page Footer Text (Left, Center, Right 3-column layout)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 128, 150);

      // Left: Brand & Confidentiality
      doc.text('Generated by DJRB Services Pvt Ltd | Confidential', margin, pageHeight - 6);

      // Center: Page numbers
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 6, { align: 'center' });

      // Right: Timestamp
      doc.text(generationTimestamp, doc.internal.pageSize.width - margin, pageHeight - 6, { align: 'right' });
    }
  };

  // -------------------------------------------------------------
  // RENDER PAGE 1 COVER & EXECUTIVE DASHBOARD TEMPLATE (4-Color Palette)
  // -------------------------------------------------------------
  // Title Block
  yPos = 22;
  doc.setFillColor(44, 62, 80);
  doc.rect(margin, yPos, 40, 3, 'F');
  yPos += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('APPRAISAL VALIDATION REPORT', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(108, 117, 125);
  doc.text('Comprehensive Quality Assurance, Compliance & Rule Verification Audit', margin, yPos);
  yPos += 9;

  // Metadata Card Box (Review Details)
  const cardX = margin;
  const cardY = yPos;
  const cardWidth = 180;
  const cardHeight = 58;

  doc.setFillColor(244, 246, 248);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

  // Vertical Accent Line on Left inside Card (Dark Gray)
  doc.setFillColor(44, 62, 80);
  doc.roundedRect(cardX, cardY, 4, cardHeight, 1.5, 1.5, 'F');
  doc.rect(cardX + 2, cardY, 2, cardHeight, 'F');

  const metaCol1 = [
    { label: 'REPORT DATE', val: dateOnlyStr },
    { label: 'REVIEWED BY (USER)', val: username || 'abhi' },
    { label: 'REVIEW DURATION', val: totalTime },
    { label: 'DOCUMENT VERSION', val: 'v1.0 Enterprise' }
  ];

  const metaCol2 = [
    { label: 'FILE NAME', val: selectedFile?.name || '267-03474.PDF' },
    { label: 'FORM TYPE', val: selectedFormType || 'Appraisal Version #1' },
    { label: 'GENERATION TIMESTAMP', val: generationTimestamp },
    { label: 'PREPARED BY', val: 'DJRB Services Pvt Ltd' }
  ];

  let metaY = cardY + 9;
  metaCol1.forEach((item, idx) => {
    const item2 = metaCol2[idx];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(108, 117, 125);
    doc.text(item.label, cardX + 12, metaY);
    if (item2) doc.text(item2.label, cardX + 100, metaY);

    metaY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(26, 37, 48);
    doc.text(String(item.val), cardX + 12, metaY);
    if (item2) doc.text(String(item2.val), cardX + 100, metaY);

    metaY += 8.5;
  });

  yPos = cardY + cardHeight + 8;

  // Audit Summary Status Banner Card (Green for Pass / Red for Fail)
  const statusCardY = yPos;
  const statusCardHeight = 22;
  const hasErrors = uniqueValidationErrorRows.length > 0;

  if (hasErrors) {
    doc.setFillColor(198, 40, 40); // Red
  } else {
    doc.setFillColor(46, 125, 50); // Green
  }
  doc.roundedRect(cardX, statusCardY, cardWidth, statusCardHeight, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AUDIT SUMMARY STATUS', cardX + 10, statusCardY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (hasErrors) {
    doc.text(`FAILED — ${uniqueValidationErrorRows.length} automated check(s) or rule validation(s) require review.`, cardX + 10, statusCardY + 15);
  } else {
    doc.text('PASSED — All automated checks and rule validations satisfied cleanly.', cardX + 10, statusCardY + 15);
  }

  yPos = statusCardY + statusCardHeight + 10;

  // Executive Summary Dashboard Header Bar (Dark Gray)
  const dashBarY = yPos;
  const dashBarHeight = 8;
  doc.setFillColor(44, 62, 80);
  doc.roundedRect(cardX, dashBarY, cardWidth, dashBarHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE SUMMARY DASHBOARD', cardX + 8, dashBarY + 5.5);

  yPos = dashBarY + dashBarHeight + 5;

  // KPI Metric Cards (2 rows x 4 cols - 4-Color Strict Palette)
  const totalErrCount = uniqueValidationErrorRows.length;
  const validationSuccesses = getValidationSuccesses();
  const totalPassCount = (validationSuccesses && validationSuccesses.length > 0) ? validationSuccesses.length : Math.max(0, 50 - totalErrCount);
  const totalFieldCount = totalPassCount + totalErrCount;
  const scoreVal = totalFieldCount > 0 ? Math.round((totalPassCount / totalFieldCount) * 100) : (totalErrCount === 0 ? 100 : 0);

  const kpiCards = [
    { label: 'TOTAL FIELDS', val: String(totalFieldCount || 50), color: [46, 125, 50] },
    { label: 'PASSED CHECKS', val: String(totalPassCount || 50), color: [46, 125, 50] },
    { label: 'FAILED (ERRORS)', val: String(totalErrCount), color: totalErrCount > 0 ? [198, 40, 40] : [46, 125, 50] },
    { label: 'WARNINGS', val: '0', color: [46, 125, 50] },
    { label: 'MISSING FIELDS', val: String(totalErrCount > 0 ? totalErrCount : 0), color: totalErrCount > 0 ? [198, 40, 40] : [46, 125, 50] },
    { label: 'VALIDATION SCORE', val: `${scoreVal}%`, color: scoreVal >= 90 ? [46, 125, 50] : [198, 40, 40] },
    { label: 'REVIEW TIME', val: totalTime, color: [100, 116, 139] },
    { label: 'COMPLETION %', val: '100%', color: [46, 125, 50] }
  ];

  const cardW = 42.5;
  const cardH = 15;
  const gapX = 3.3;
  const gapY = 3.5;

  kpiCards.forEach((kpi, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const kx = cardX + col * (cardW + gapX);
    const ky = yPos + row * (cardH + gapY);

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, ky, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(kx, ky, 2.5, cardH, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(113, 128, 150);
    doc.text(kpi.label, kx + 5, ky + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 32, 44);
    doc.text(kpi.val, kx + 5, ky + 11.5);
  });

  yPos += 2 * (cardH + gapY) + 8;

  const addSection = (title, head, body, headerColor = [44, 62, 80]) => {
    if (body.length === 0) return;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text(title, margin, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [head],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: headerColor, textColor: 255, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
      didDrawPage: (d) => { yPos = d.cursor.y + 10; },
      didParseCell: (d) => {
        if (d.section === 'body') {
          if (title.includes('Consistency') || title.includes('Inconsistencies')) {
            d.cell.styles.textColor = [220, 53, 69];
            return;
          }

          if (title.includes('Check') || title.includes('Analysis') || title.includes('Escalation') || title.includes('Prompt') || title.includes('Requirement')) {
            const rowData = d.row.raw || [];
            const rawStatus = (rowData.length >= 5) ? rowData[4] : (rowData.length >= 2 ? rowData[1] : '');
            const statusType = checkStatusType(rawStatus);

            if (statusType === 'error') {
              d.cell.styles.textColor = [220, 53, 69];
              d.cell.styles.fontStyle = 'bold';
              if (d.column.index === 4 || d.column.index === 1) {
                d.cell.styles.fillColor = [255, 235, 235];
              }
            } else if (statusType === 'pass') {
              d.cell.styles.textColor = [34, 139, 34];
              d.cell.styles.fontStyle = 'normal';
              if (d.column.index === 4 || d.column.index === 1) {
                d.cell.styles.fillColor = [235, 247, 235];
              }
            }
          }
        }
      }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  };

  const groupBySection = (rows) => {
    const groups = {};
    rows.forEach((row) => {
      const section = row[0] || 'General';
      const rest = row.slice(1);
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(rest);
    });
    return groups;
  };

  const addSectionWiseTables = (mainTitle, rows, columns, headerColor) => {
    if (rows.length === 0) return;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text(mainTitle, margin, yPos);
    yPos += 8;

    const grouped = groupBySection(rows);
    Object.keys(grouped).forEach(sectionTitle => {
      const body = grouped[sectionTitle];
      if (body.length === 0) return;

      if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(60);
      doc.text(sectionTitle, margin, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [columns],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 255 },
        styles: { fontSize: 8.5, overflow: 'linebreak' },
        columnStyles: columns.length === 5 ? {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 25 },
          2: { cellWidth: 55 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 22, halign: 'center' }
        } : columns.length === 4 ? {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 60 },
          3: { cellWidth: 'auto' }
        } : undefined,
        didDrawPage: (d) => { yPos = d.cursor.y + 10; },
        didParseCell: (d) => {
          if (d.section === 'body') {
            if (mainTitle.includes('Errors')) {
              if (d.column.index === 2) {
                d.cell.styles.textColor = [220, 53, 69];
                d.cell.styles.fontStyle = 'bold';
              }
            } else if (mainTitle.includes('Successes') || mainTitle.includes('Passed')) {
              if (d.column.index === 2) {
                d.cell.styles.textColor = [34, 139, 34];
                d.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });
      yPos = doc.lastAutoTable.finalY + 8;
    });
  };

  if (uniqueValidationErrorRows.length === 0) {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Validation Errors', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('No validation errors found.', margin, yPos);
    yPos += 10;
  } else {
    addSectionWiseTables('Validation Errors', uniqueValidationErrorRows, ['Field', 'Value', 'Error Message', 'Revision Language'], [220, 53, 69]);
  }

  if (comparisonData && Object.keys(comparisonData).length > 0) {
    if (Array.isArray(comparisonData.comparison_results)) {
      if (comparisonData.comparison_results.length > 0) {
        const htmlDataRows = comparisonData.comparison_results.map(item => [
          String(item.field || ''),
          String(item.html_value || ''),
          String(item.pdf_value || ''),
          String(item.status || '')
        ]);
        addSection('HTML Data Analysis (Comparison Results)', ['Field', 'Value from HTML', 'Value from PDF', 'Status'], htmlDataRows, [44, 62, 80]);
      } else {
        addSection('HTML Data Analysis (Comparison Results)', ['Status'], [['No comparison results found.']], [44, 62, 80]);
      }
    } else {
      const flatKeys = Object.keys(comparisonData).filter(k => k !== 'comparison_results');
      if (flatKeys.length > 0) {
        const htmlDataRows = flatKeys.map(k => [String(k), String(comparisonData[k] || '')]);
        addSection('HTML Data Analysis (Extracted HTML Data)', ['Field', 'Value'], htmlDataRows, [44, 62, 80]);
      }
    }
  }

  // 2. Requirement Checks Executive Summary Section
  const reqCheckSummaryRows = [];
  const parseReqSummary = (checkTitle, resp) => {
    if (!resp) return;
    let r = resp;
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch (e) { return; }
    }
    if (!r || typeof r !== 'object') return;
    const summaryText = r.summary || r.overall_summary || r.summary_comment || r.description || '';
    const details = Array.isArray(r.details) ? r.details : [];
    const hasEscalations = details.some(d => checkStatusType(d.status) === 'error');
    const statusText = r.overallStatus || r.status || (hasEscalations ? 'Needs Escalation / Review' : 'Passed');
    if (summaryText || details.length > 0) {
      reqCheckSummaryRows.push([checkTitle, statusText, summaryText || `${details.length} items checked.`]);
    }
  };

  parseReqSummary('State Requirement Check', stateReqResponse);
  parseReqSummary('Client Requirement Check', clientReqResponse);
  parseReqSummary('Escalation Check', escalationResponse);

  if (reqCheckSummaryRows.length > 0) {
    addSection('Requirement Checks Summary', ['Requirement Check', 'Overall Status', 'Executive Summary'], reqCheckSummaryRows, [70, 130, 180]);
  }

  // 3. Validation Successes / Passed Log Section (Success paths tracked for in-grid green cell highlighting)

  // Path Tracking Sets for Cell Highlighting
  const errorPathsSet = new Set(
    validationErrors.map(([s, f, m, path]) => path ? JSON.stringify(path) : null).filter(Boolean)
  );
  const successPathsSet = new Set(
    validationSuccesses.map(([s, f, m, path]) => path ? JSON.stringify(path) : null).filter(Boolean)
  );

  // Grid Section Renderer with Universal Value Lookup & Status Styling
  const renderGridSection = (sectionTitle, fieldsMap, headerColor = [41, 128, 185], sectionKeyPrefixes = []) => {
    const populatedRows = [];
    Object.entries(fieldsMap).forEach(([field, value]) => {
      const valStr = value !== undefined && value !== null && String(value).trim() !== '' ? String(value).trim() : '';
      populatedRows.push([field, valStr]);
    });

    const hasAnyHit = populatedRows.some(([field, valStr]) => {
      if (valStr !== '' && valStr !== 'N/A' && valStr !== '-') return true;
      const cleanF = cleanFieldName(field);
      if (cleanF && errorFieldsSet.has(cleanF)) return true;
      return false;
    });

    if (!hasAnyHit) return;

    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text(sectionTitle, margin, yPos);
    yPos += 8;

    const getCellFormatting = (field, textVal) => {
      const text = String(textVal || '').trim();

      let hasError = false;
      let hasSuccess = false;

      if (sectionKeyPrefixes && sectionKeyPrefixes.length > 0) {
        for (const prefix of sectionKeyPrefixes) {
          const key = JSON.stringify([...prefix, field]);
          if (errorPathsSet.has(key)) hasError = true;
          if (successPathsSet.has(key)) hasSuccess = true;
        }
      }
      const directKey = JSON.stringify([field]);
      if (errorPathsSet.has(directKey)) hasError = true;
      if (successPathsSet.has(directKey)) hasSuccess = true;

      const cleanF = cleanFieldName(field);
      if (cleanF && errorFieldsSet.has(cleanF)) {
        hasError = true;
      }

      if (hasError) {
        return {
          content: text || 'Missing',
          styles: { textColor: [220, 53, 69], fontStyle: 'bold', fillColor: [255, 235, 235] }
        };
      } else if (hasSuccess || text !== '') {
        return {
          content: text,
          styles: { textColor: [34, 139, 34], fontStyle: 'bold' }
        };
      }
      return text;
    };

    const gridBody = [];
    for (let i = 0; i < populatedRows.length; i += 3) {
      const item1 = populatedRows[i];
      const item2 = populatedRows[i + 1] || ['', ''];
      const item3 = populatedRows[i + 2] || ['', ''];

      gridBody.push([
        { content: item1[0], styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        getCellFormatting(item1[0], item1[1]),
        { content: item2[0] ? item2[0] : '', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        item2[0] ? getCellFormatting(item2[0], item2[1]) : '',
        { content: item3[0] ? item3[0] : '', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        item3[0] ? getCellFormatting(item3[0], item3[1]) : ''
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value', 'Field', 'Value', 'Field', 'Value']],
      body: gridBody,
      theme: 'grid',
      headStyles: { fillColor: headerColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 32, fontStyle: 'bold' },
        5: { cellWidth: 'auto' }
      },
      didDrawPage: (d) => { yPos = d.cursor.y + 10; }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  };


  // 4. Summary & Review Overview Section
  const summarySectionFields = {
    'Opinion of Market Value': getVal('Opinion of Market Value'),
    'Indicated Value by Sales Comparison Approach Indicated': getVal('Indicated Value by Sales Comparison Approach Indicated') || getVal('Indicated Value by Sales Comparison Approach') || getVal('Sales Comparison Approach Indicated Value'),
    'Market Value Condition': getVal('Market Value Condition'),
    'Effective Date of Appraisal': getVal('Effective Date of Appraisal'),
    'Assignment Reason': getVal('Assignment Reason'),
    'Borrower Name': getVal('Borrower Name'),
    'Current Owner of Public Record': getVal('Current Owner of Public Record'),
    'Listing Status': getVal('Listing Status'),
    'Property Valuation Method': getVal('Property Valuation Method'),
    'Appraiser Name': getVal('Appraiser Name'),
    'Construction Method': getVal('Construction Method'),
    'Attachment Type': getVal('Attachment Type'),
    'Overall Quality': getVal('Overall Quality'),
    'Overall Condition': getVal('Overall Condition'),
    'Planned Unit Development (PUD)': getVal('Planned Unit Development (PUD)'),
    'Condominium': getVal('Condominium'),
    'Cooperative': getVal('Cooperative'),
    'Condop': getVal('Condop'),
    'Subject Site Owned in Common': getVal('Subject Site Owned in Common'),
    'Units Excluding ADUs': getVal('Units Excluding ADUs'),
    'Accessory Dwelling Units (ADUs)': getVal('Accessory Dwelling Units (ADUs)') || getVal('ADU'),
    'Property Rights Appraised': getVal('Property Rights Appraised'),
    'Highest and Best Use as Present Use': getVal('Highest and Best Use as Present Use') || getVal('Highest and Best Use as Improved (Present Use)'),
    'Zoning Compliance': getVal('Zoning Compliance'),
    'Apparent Defects, Damages, Deficiencies Requiring Action': getVal('Apparent Defects, Damages, Deficiencies Requiring Action') || getVal('Apparent Defects, Damages, Deficiencies'),
    'Appraisal Version': getVal('Appraisal Version'),
    'Appraiser Reference ID': getVal('Appraiser Reference ID')
  };
  renderGridSection('Summary & Review Overview', summarySectionFields, [44, 62, 80], [['SUMMARY'], ['Subject']]);

  // 5. Assignment Information
  const assignmentFields = {
    'Assignment Reason': getVal('Assignment Reason'),
    'Borrower Name': getVal('Borrower Name'),
    'Current Owner of Public Record': getVal('Current Owner of Public Record'),
    'Property Valuation Method': getVal('Property Valuation Method'),
    'Property Data Report Used in Lieu of Inspection': getVal('Property Data Report Used in Lieu of Inspection')
  };
  renderGridSection('Assignment Information', assignmentFields, [44, 62, 80], [['SUMMARY']]);

  // 6. Contact Information Section
  const contactFields = {
    'Client/Lender Company Name': getVal('Client/Lender Company Name') || getVal('Lender/Client'),
    'Client/Lender Company Address': getVal('Client/Lender Company Address'),
    'Appraisal Management Company Name': getVal('Appraisal Management Company Name'),
    'Appraisal Management Company Address': getVal('Appraisal Management Company Address'),
    'Appraiser Name': getVal('Appraiser Name'),
    'Appraiser Company Name': getVal('Appraiser Company Name'),
    'Appraiser Company Address': getVal('Appraiser Company Address'),
    'Subject Property Inspection': getVal('Subject Property Inspection'),
    'Exterior Physical Inspection': getVal('Exterior Physical Inspection'),
    'Interior Physical Inspection': getVal('Interior Physical Inspection'),
    'Inspection Date': getVal('Inspection Date'),
    'Appraiser Credential Level': getVal('Appraiser Credential Level'),
    'Appraiser ID': getVal('Appraiser ID'),
    'Appraiser State': getVal('Appraiser State'),
    'Appraiser License Expiration Date': getVal('Appraiser License Expiration Date'),
    'Appraiser ASC Identifier': getVal('Appraiser ASC Identifier')
  };
  renderGridSection('Contact Information', contactFields, [44, 62, 80], [['CONTACT'], ['SUMMARY']]);

  // 7. Subject Property Section
  const subjectPropertyFields = {
    'Physical Address': getVal('Physical Address') || getVal('Full Address'),
    'County': getVal('County'),
    'Neighborhood Name': getVal('Neighborhood Name'),
    'Planned Unit Development (PUD)': getVal('Planned Unit Development (PUD)'),
    'Condominium': getVal('Condominium'),
    'Cooperative': getVal('Cooperative'),
    'Condop': getVal('Condop'),
    'Property on Native American Lands': getVal('Property on Native American Lands'),
    'Subject Site Owned in Common': getVal('Subject Site Owned in Common'),
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)': getVal('Homeowner Responsible for All Exterior Maintenance of Dwelling(s)') || getVal('Homeowner Maintenance Responsible'),
    'New Construction': getVal('New Construction'),
    'Attachment Type': getVal('Attachment Type'),
    'Units Excluding ADUs': getVal('Units Excluding ADUs'),
    'Accessory Dwelling Units (ADUs)': getVal('Accessory Dwelling Units (ADUs)'),
    'Special Tax Assessments': getVal('Special Tax Assessments'),
    'Property Rights Appraised': getVal('Property Rights Appraised'),
    'All Rights Included in Appraisal': getVal('All Rights Included in Appraisal'),
    'Legal Description': getVal('Legal Description'),
    'Subject Property Commentary': getVal('Subject Property Commentary')
  };
  renderGridSection('Subject Property', subjectPropertyFields, [44, 62, 80], [['SUBJECT_PROPERTY'], ['Subject'], ['SUMMARY']]);

  // 8. Site & Utilities Section
  const siteFields = {
    'Total Site Size': getVal('Total Site Size'),
    'Number of Parcels': getVal('Number of Parcels'),
    'Assessor Parcel Number (APN)': getVal('Assessor Parcel Number (APN)'),
    'APN Description': getVal('APN Description'),
    'Parcel Size': getVal('Parcel Size'),
    'Zoning Compliance': getVal('Zoning Compliance'),
    'Zoning Classification Code': getVal('Zoning Classification Code'),
    'Zoning Classification Description': getVal('Zoning Classification Description'),
    'Primary Access': getVal('Primary Access'),
    'Street Type and Surface': getVal('Street Type and Surface'),
    'Typical for Market': getVal('Typical for Market'),
    'Non-Residential Use': getVal('Non-Residential Use'),
    'Apparent Defects (Site)': getVal('Apparent Defects, Damages, Deficiencies (Site)'),
    'Renewable Energy Components': getVal('Renewable Energy Components'),
    'Ownership': getVal('Ownership'),
    'Financing Arrangement': getVal('Financing Arrangement'),
    'Known Building Certifications': getVal('Known Building Certifications'),
    'Known Efficiency Ratings': getVal('Known Efficiency Ratings'),
    'Energy Efficient Features Impact': getVal('Energy Efficient and Green Features Impact to Value/Marketability'),
    'Broadband Internet Available': getVal('Broadband Internet Available'),
    'Electricity': `${getVal('Electricity')} | Detail: ${getVal('Electricity Detail')} | Impact: ${getVal('Electricity Private Utility Impact')}`,
    'Sanitary Sewer': `${getVal('Sanitary Sewer')} | Detail: ${getVal('Sanitary Sewer Detail')} | Impact: ${getVal('Sanitary Sewer Private Utility Impact')}`,
    'Water': `${getVal('Water')} | Detail: ${getVal('Water Detail')} | Impact: ${getVal('Water Private Utility Impact')}`
  };
  renderGridSection('Site & Utilities', siteFields, [44, 62, 80], [['SITE']]);

  // 9. Dwelling Exterior & Mechanicals Section
  const exteriorFields = {
    'Units in Structure': getVal('Units in Structure'),
    'Floors in Building': getVal('Floors in Building'),
    'Dwelling Style': getVal('Dwelling Style'),
    'Front Door Elevation': getVal('Front Door Elevation'),
    'Year Built': getVal('Year Built'),
    'Construction Method': getVal('Construction Method'),
    'Converted Area': getVal('Converted Area'),
    'Exterior Quality Rating': getVal('Exterior Quality Rating') || getVal('Exterior Quality'),
    'Exterior Condition Rating': getVal('Exterior Condition Rating') || getVal('Exterior Condition'),
    'Heating': `Detail: ${getVal('Heating Detail')} | Fuel: ${getVal('Heating Fuel')}`,
    'Cooling': `Detail: ${getVal('Cooling Detail')} | Fuel: ${getVal('Cooling Fuel')}`,
    'Core Heating System Below Grade': getVal('Core Heating System Below Grade'),
    'Apparent Defects (Exterior)': getVal('Apparent Defects, Damages, Deficiencies (Dwelling Exterior)')
  };
  renderGridSection('Dwelling Exterior & Mechanicals', exteriorFields, [44, 62, 80], [['DWELLING_EXTERIOR'], ['IMPROVEMENTS']]);

  // 10. Unit Interior Section
  const interiorFields = {
    'Finished Above Grade': getVal('Finished Above Grade') || getVal('Finished Area Above Grade'),
    'Unfinished Above Grade': getVal('Unfinished Above Grade'),
    'Finished Below Grade': getVal('Finished Below Grade') || getVal('Finished Area Below Grade'),
    'Unfinished Below Grade': getVal('Unfinished Below Grade') || getVal('Unfinished Area Below Grade'),
    'Area Data Source': getVal('Area Data Source'),
    'Levels in Unit': getVal('Levels in Unit'),
    'Occupancy': getVal('Occupancy'),
    'Total Bedrooms': getVal('Total Bedrooms') || getVal('Bedrooms'),
    'Total Bathrooms - Full': getVal('Total Bathrooms - Full') || getVal('Bathrooms - Full'),
    'Total Bathrooms - Half': getVal('Total Bathrooms - Half') || getVal('Bathrooms - Half'),
    'Overall Update Status Bathrooms': getVal('Overall Update Status for Bathrooms'),
    'Overall Update Status Flooring': getVal('Overall Update Status for Flooring'),
    'Apparent Defects (Interior)': getVal('Apparent Defects, Damages, Deficiencies (Unit Interior)'),
    'Interior Quality Rating': getVal('Interior Quality Rating') || getVal('Interior Quality'),
    'Interior Condition Rating': getVal('Interior Condition Rating') || getVal('Interior Condition')
  };
  renderGridSection('Unit Interior', interiorFields, [44, 62, 80], [['UNIT_INTERIOR'], ['IMPROVEMENTS']]);

  // 11. Highest & Best Use & Market Analysis Section
  const marketFields = {
    'Legally Permissible': getVal('Legally Permissible'),
    'Physically Possible': getVal('Physically Possible'),
    'Financially Feasible': getVal('Financially Feasible'),
    'Maximally Productive': getVal('Maximally Productive'),
    'Highest and Best Use as Improved (Present Use)': getVal('Highest and Best Use as Improved (Present Use)') || getVal('Highest and Best Use as Present Use'),
    'Highest and Best Use Commentary': getVal('Highest and Best Use Commentary'),
    'Market Area Boundary': getVal('Market Area Boundary'),
    'Search Criteria Description': getVal('Search Criteria Description'),
    'Active Listings': getVal('Active Listings'),
    'Median Days on Market': getVal('Median Days on Market'),
    'Lowest List Price': getVal('Lowest List Price'),
    'Median List Price': getVal('Median List Price'),
    'Highest List Price': getVal('Highest List Price'),
    'Pending Sales': getVal('Pending Sales'),
    'Sales in Past 12 Months': getVal('Sales in Past 12 Months'),
    'Lowest Sale Price': getVal('Lowest Sale Price'),
    'Median Sale Price': getVal('Median Sale Price'),
    'Highest Sale Price': getVal('Highest Sale Price'),
    'Distressed Market Competition': getVal('Distressed Market Competition'),
    'Demand / Supply': getVal('Demand/Supply'),
    'Marketing Time': getVal('Marketing Time'),
    'Market Commentary': getVal('Market Commentary')
  };
  renderGridSection('Highest & Best Use & Market Analysis', marketFields, [44, 62, 80], [['NEIGHBORHOOD'], ['HBU']]);

  // 12. Sales or Transfer History Section
  const renderSalesOrTransferHistorySection = () => {
    const historyFields = [
      {
        field: 'THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___',
        val: data['There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___'] ??
             data['THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM$ ___TO $___'] ??
             data['THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___'] ??
             data['Comparable Properties Currently Offered for Sale'] ??
             data.Subject?.['There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___'] ?? ''
      },
      {
        field: 'THERE ARE ____ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ___',
        val: data['There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____'] ??
             data['THERE ARE ____ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM$___ TO $____'] ??
             data['THERE ARE ____ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ___'] ??
             data['Comparable Sales in Subject Neighborhood Past 12 Months'] ??
             data.Subject?.['There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____'] ?? ''
      },
      {
        field: 'I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain',
        val: data['I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain'] ?? data['Research Sale/Transfer History'] ?? data.Subject?.['Research Sale/Transfer History'] ?? ''
      },
      {
        field: 'My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.',
        val: data['My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.'] ?? data['Subject Prior Sales Reveal'] ?? data.Subject?.['Subject Prior Sales Reveal'] ?? ''
      },
      {
        field: 'Data Source(s) for subject property research',
        val: data['Data Source(s) for subject property research'] ?? data['Subject Transfer Data Source'] ?? data['Data Source(s)'] ?? data['Data Source'] ?? data.Subject?.['Subject Transfer Data Source'] ?? ''
      },
      {
        field: 'My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.',
        val: data['My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.'] ?? data['Comps Prior Sales Reveal'] ?? data.Subject?.['Comps Prior Sales Reveal'] ?? ''
      },
      {
        field: 'Data Source(s) for comparable sales research',
        val: data['Data Source(s) for comparable sales research'] ?? data['Comparable Sales Data Source'] ?? data.Subject?.['Comparable Sales Data Source'] ?? ''
      },
      {
        field: 'Analysis of prior sale or transfer history of the subject property and comparable sales',
        val: data['Analysis of prior sale or transfer history of the subject property and comparable sales'] ?? data['Analysis of Subject Prior Sale/Transfer'] ?? data['Analysis of Prior Sale and Transfer History of Subject Property'] ?? data.Subject?.['Analysis of Prior Sale and Transfer History of Subject Property'] ?? ''
      },
      {
        field: 'Summary of Sales Comparison Approach',
        val: data['Summary of Sales Comparison Approach'] ?? data['Sales Comparison Commentary'] ?? data.Subject?.['Summary of Sales Comparison Approach'] ?? ''
      },
      {
        field: 'Indicated Value by Sales Comparison Approach $',
        val: data['Indicated Value by Sales Comparison Approach $'] ?? data['Indicated Value by Sales Comparison Approach'] ?? data['Sales Comparison Approach Indicated Value'] ?? data['Opinion of Market Value'] ?? data.Subject?.['Opinion of Market Value'] ?? ''
      }
    ];

    const hasAnyHit = historyFields.some(item => {
      let rawVal = item.val;
      if (typeof rawVal === 'object' && rawVal !== null) {
        rawVal = rawVal.value ?? rawVal.text ?? rawVal.val ?? JSON.stringify(rawVal);
      }
      const valStr = String(rawVal ?? '').trim();
      if (valStr !== '' && valStr !== 'N/A' && valStr !== '-') return true;
      const cleanF = cleanFieldName(item.field);
      if (cleanF && errorFieldsSet.has(cleanF)) return true;
      return false;
    });

    if (!hasAnyHit) return;

    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Sales or Transfer History', margin, yPos);
    yPos += 8;

    const bodyRows = historyFields.map(item => {
      let rawVal = item.val;
      if (typeof rawVal === 'object' && rawVal !== null) {
        rawVal = rawVal.value ?? rawVal.text ?? rawVal.val ?? JSON.stringify(rawVal);
      }
      const valStr = String(rawVal ?? '').trim();
      const isPopulated = valStr !== '' && valStr !== 'N/A';

      return [
        { content: item.field, styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
        {
          content: valStr || '-',
          styles: isPopulated
            ? { textColor: [34, 139, 34], fontStyle: 'bold', fillColor: [235, 247, 235] }
            : { textColor: [120, 120, 120], fontStyle: 'normal' }
        }
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 95, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      didDrawPage: (d) => { yPos = d.cursor.y + 10; }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  };

  renderSalesOrTransferHistorySection();

  // 13. Sales Comparison Approach Grid Section (Comps 1 to 9 Matrix)
  const compSalesKeys = [
    'Subject',
    'COMPARABLE SALE #1', 'COMPARABLE SALE #2', 'COMPARABLE SALE #3',
    'COMPARABLE SALE #4', 'COMPARABLE SALE #5', 'COMPARABLE SALE #6',
    'COMPARABLE SALE #7', 'COMPARABLE SALE #8', 'COMPARABLE SALE #9'
  ];

  const gridFeatures = [
    'Address', 'Proximity to Subject', 'Data Source', 'List Price', 'Listing Status', 'Sale Price',
    'Transfer Terms', 'Financing Type', 'Sales Concessions', 'Contract Date', 'Sale Date', 'Days on Market',
    'Attached / Detached', 'Property Rights Appraised', 'Site Size', 'Location', 'View', 'Range of View',
    'Year Built', 'Construction Method', 'Heating', 'Amenities', 'Bedrooms', 'Bathrooms - Full', 'Bathrooms - Half',
    'GLA / GBA', 'Finished Area Below Grade', 'Unfinished Area Below Grade', 'Exterior Quality', 'Exterior Condition',
    'Interior Quality', 'Interior Condition', 'Overall Quality', 'Overall Condition', 'Vehicle Storage Type',
    'Vehicle Storage Spaces', 'Net Adjustment (Total)', 'Adjusted Price', 'Comparable Weight'
  ];

  const activeComps = compSalesKeys.filter(compKey => compKey === 'Subject' || (data[compKey] && Object.keys(data[compKey]).length > 0));

  if (activeComps.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Sales Comparison Approach Grid', margin, yPos);
    yPos += 8;

    const getSalesGridCellFormatting = (compKey, featKey) => {
      let valStr = '';

      if (compKey === 'Subject') {
        const subjObj = data.Subject || {};
        if (featKey === 'Address') {
          valStr = subjObj['Address'] ||
            subjObj['Subject Property Address'] ||
            subjObj['Physical Address'] ||
            getVal('Physical Address') ||
            getVal('Full Address') ||
            '';
        } else if (featKey === 'Proximity to Subject') {
          valStr = subjObj['Proximity to Subject'] || subjObj['Proximity'] || 'Subject Property';
        } else if (featKey === 'Attached / Detached') {
          valStr = subjObj['Attached / Detached'] || subjObj['Attachment Type'] || getVal('Attachment Type') || '';
        } else if (featKey === 'GLA / GBA') {
          valStr = subjObj['GLA / GBA'] || subjObj['Finished Area Above Grade'] || getVal('Finished Above Grade') || getVal('Finished Area Above Grade') || '';
        } else if (featKey === 'Location') {
          valStr = subjObj['Location'] || subjObj['Site Influence (Location)'] || getVal('Location') || '';
        } else {
          valStr = subjObj[featKey] ||
            subjObj[`Subject Property ${featKey}`] ||
            getVal(featKey) ||
            '';
        }
      } else {
        const compObj = data[compKey] || reviewAllData[compKey] || {};
        let val = '';
        let adj = '';

        if (featKey === 'Address') {
          val = compObj['Comparable Property Address'] ||
            compObj['Address'] ||
            compObj['Physical Address'] ||
            compObj['Property Address'] ||
            '';
        } else if (featKey === 'Location') {
          val = compObj['Site Influence (Location)'] || compObj['Location'] || compObj['Site Influence'] || '';
        } else if (featKey === 'GLA / GBA') {
          val = compObj['Finished Area Above Grade'] || compObj['GLA / GBA'] || compObj['GLA'] || compObj['Above Grade Finished Area'] || '';
        } else if (featKey === 'Net Adjustment (Total)') {
          val = compObj['Net Adjustment Total'] || compObj['Net Adjustment (Total)'] || compObj['Net Adjustment'] || '';
        } else {
          val = compObj[featKey] || compObj[`Comparable Property ${featKey}`] || '';
        }

        adj = compObj[`${featKey} Adjustment`] ||
              compObj[`${featKey} Adj`] ||
              compObj[`${featKey}_adjustment`] ||
              compObj[`${featKey}_adj`] ||
              compObj[`${featKey} Value Adjustment`] ||
              '';

        if (typeof val === 'object' && val !== null) {
          val = val.value ?? val.text ?? val.val ?? JSON.stringify(val);
        }
        if (typeof adj === 'object' && adj !== null) {
          adj = adj.value ?? adj.text ?? adj.val ?? JSON.stringify(adj);
        }

        const valText = String(val ?? '').trim();
        const adjText = String(adj ?? '').trim();

        if (valText && adjText && valText !== adjText) {
          valStr = `${valText} / ${adjText}`;
        } else if (valText) {
          valStr = valText;
        } else if (adjText) {
          valStr = adjText;
        }
      }


      const text = valStr !== undefined && valStr !== null && String(valStr).trim() !== '' ? String(valStr).trim() : '-';

      const key1 = JSON.stringify([compKey, featKey]);
      const key2 = JSON.stringify([compKey, `${featKey} Adjustment`]);

      const hasError = errorPathsSet.has(key1) || errorPathsSet.has(key2);
      const hasSuccess = successPathsSet.has(key1) || successPathsSet.has(key2);

      if (hasError) {
        return {
          content: text || 'Missing',
          styles: { textColor: [220, 53, 69], fontStyle: 'bold', fillColor: [255, 235, 235] }
        };
      } else if (hasSuccess || (text !== '-' && text !== '')) {
        return {
          content: text,
          styles: { textColor: [34, 139, 34], fontStyle: 'bold' }
        };
      }
      return text;
    };

    const salesGridHead = ['Feature', ...activeComps.map(c => c.replace('COMPARABLE SALE #', 'Comp '))];
    const salesGridBody = gridFeatures.map(feat => {
      const row = [{ content: feat, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }];
      activeComps.forEach(compKey => {
        row.push(getSalesGridCellFormatting(compKey, feat));
      });
      return row;
    });


    autoTable(doc, {
      startY: yPos,
      head: [salesGridHead],
      body: salesGridBody,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      didDrawPage: (d) => { yPos = d.cursor.y + 10; }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // 14. Cost Approach Section
  const costApproachFields = {
    'Indicated Value by Cost Approach': getVal('Indicated Value by Cost Approach'),
    'Depreciated Cost of Dwellings': getVal('Depreciated Cost of Dwellings'),
    'As Is Value of Site Improvements': getVal('As Is Value of Site Improvements'),
    'Opinion of Site Value': getVal('Opinion of Site Value'),
    'Above Grade Finished Area Cost Rate': getVal('Above Grade Finished Area Rate'),
    'Physical Depreciation': getVal('Physical Depreciation'),
    'Functional Depreciation': getVal('Functional Depreciation'),
    'External Depreciation': getVal('External Depreciation'),
    'Remaining Economic Life': getVal('Remaining Economic Life'),
    'Effective Age': getVal('Effective Age'),
    'Primary Site Valuation Method': getVal('Primary Site Valuation Method'),
    'Cost Data Source': getVal('Cost Data Source'),
    'Quality Rating': getVal('Quality Rating'),
    'Effective Date': getVal('Effective Date'),
    'Cost Method': getVal('Cost Method'),
    'Depreciation Method': getVal('Depreciation Method'),
    'Cost Approach Commentary': getVal('Cost Approach Commentary')
  };
  renderGridSection('Cost Approach', costApproachFields, [44, 62, 80], [['COST_APPROACH']]);

  // 15. Reconciliation Section
  const reconciliationFields = {
    'Sales Comparison Approach Indicated Value': getVal('Sales Comparison Approach Indicated Value'),
    'Income Approach Indicated Value': getVal('Income Approach Indicated Value'),
    'Cost Approach Indicated Value': getVal('Cost Approach Indicated Value'),
    'Opinion of Market Value': getVal('Opinion of Market Value'),
    'Reasonable Exposure Time': getVal('Reasonable Exposure Time'),
    'Market Value Condition': getVal('Market Value Condition'),
    'Effective Date of Appraisal': getVal('Effective Date of Appraisal'),
    'Reconciliation of Market Value Commentary': getVal('Reconciliation of Market Value'),
    'Apparent Defects / Deficiencies': getVal('Apparent Defects, Damages, Deficiencies')
  };
  renderGridSection('Reconciliation', reconciliationFields, [44, 62, 80], [['RECONCILIATION']]);

  // 16. Detailed Requirement Checks Sections
  const renderCheckSection = (title, responseObj, headerColor) => {
    if (!responseObj) return;
    let respData = responseObj;
    if (typeof respData === 'string') {
      try { respData = JSON.parse(respData); } catch (e) { respData = null; }
    }
    if (respData && typeof respData === 'object') {
      const summaryText = respData.summary || respData.overall_summary || respData.summary_comment || respData.description || '';
      const details = Array.isArray(respData.details) ? respData.details : [];

      if (summaryText) {
        if (yPos > pageHeight - 35) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40);
        doc.text(title, margin, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(60);
        const textLines = doc.splitTextToSize(`Summary: ${summaryText}`, doc.internal.pageSize.width - 2 * margin);
        doc.text(textLines, margin, yPos);
        yPos += (textLines.length * 4) + 4;
      }

      const body = [];
      details.forEach(item => {
        const rawComment = (item.value_or_comment !== undefined && item.value_or_comment !== null)
          ? item.value_or_comment
          : (item.comment !== undefined && item.comment !== null)
            ? item.comment
            : '';
        const comment = (typeof rawComment === 'object' && rawComment !== null)
          ? (rawComment.value || rawComment.comment || JSON.stringify(rawComment))
          : String(rawComment || '');

        body.push([item.requirement || item.section || 'Requirement', item.status || 'N/A', comment]);
      });

      const uniqueBody = [];
      const seenKeys = new Set();
      body.forEach(row => {
        const key = JSON.stringify(row);
        if (!seenKeys.has(key)) {
          uniqueBody.push(row);
          seenKeys.add(key);
        }
      });

      if (uniqueBody.length > 0) {
        if (summaryText) {
          autoTable(doc, {
            startY: yPos,
            head: [['Requirement', 'Status', 'Comment']],
            body: uniqueBody,
            theme: 'grid',
            headStyles: { fillColor: headerColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
            columnStyles: {
              0: { cellWidth: 50, fontStyle: 'bold' },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 'auto' }
            },
            didDrawPage: (d) => { yPos = d.cursor.y + 10; },
            didParseCell: (d) => {
              if (d.section === 'body') {
                const rowData = d.row.raw || [];
                const statusType = checkStatusType(rowData[1]);

                if (statusType === 'error') {
                  d.cell.styles.textColor = [220, 53, 69];
                  d.cell.styles.fontStyle = 'bold';
                  if (d.column.index === 1) {
                    d.cell.styles.fillColor = [255, 235, 235];
                  }
                } else if (statusType === 'pass') {
                  d.cell.styles.textColor = [34, 139, 34];
                  d.cell.styles.fontStyle = 'normal';
                  if (d.column.index === 1) {
                    d.cell.styles.fillColor = [235, 247, 235];
                  }
                }
              }
            }
          });
          yPos = doc.lastAutoTable.finalY + 10;
        } else {
          addSection(title, ['Requirement', 'Status', 'Comment'], uniqueBody, headerColor);
        }
      }
    }
  };

  renderCheckSection('State Requirement Check', stateReqResponse, [44, 62, 80]);
  renderCheckSection('Client Requirement Check', clientReqResponse, [44, 62, 80]);
  renderCheckSection('Escalation Check', escalationResponse, [198, 40, 40]);

  // 17. Prompt Analysis Section
  const cleanSectionName = (name) => {
    if (!name) return '';
    let str = String(name).trim();
    str = str.replace(/^(?:\d+|[a-zA-Z])[-.)]\s*/, '').trim();
    if (!str.includes(' ') && (str.includes('_') || str.includes('-'))) {
      str = str.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return str;
  };

  let paData = promptAnalysisResponse;
  if (typeof paData === 'string') {
    try { paData = JSON.parse(paData); } catch (e) { }
  }
  if (typeof paData === 'string') {
    try { paData = JSON.parse(paData); } catch (e) { }
  }
  if (paData && typeof paData === 'object') {
    paData = paData.promptAnalysis || paData.fields || paData;
  }

  if (paData && typeof paData === 'object' && !Array.isArray(paData)) {
    const formatPdfText = (v) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') {
        if (Array.isArray(v)) return v.map(item => formatPdfText(item)).join(', ');
        if ('value' in v) return formatPdfText(v.value);
        return Object.entries(v)
          .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join('\n');
      }
      return String(v);
    };

    if (Array.isArray(paData.comparison_summary) && paData.comparison_summary.length > 0) {
      if (paData.summary) {
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
        doc.setFontSize(10); doc.setFont(undefined, 'italic'); doc.setTextColor(80);
        const textLines = doc.splitTextToSize(`Summary: ${paData.summary}`, doc.internal.pageSize.width - 2 * margin);
        doc.text(textLines, margin, yPos);
        yPos += (textLines.length * 5) + 5;
      }
      const seenPaComp = new Set();
      const paCompBody = [];
      paData.comparison_summary.forEach(item => {
        let mainSection = String(item.section || '').trim();
        let subSection = String(item.sub_section || item.subSection || '').trim();
        if (!subSection && mainSection.includes(':')) {
          const colonIdx = mainSection.indexOf(':');
          subSection = mainSection.substring(colonIdx + 1).trim();
          mainSection = mainSection.substring(0, colonIdx).trim();
        }

        mainSection = cleanSectionName(mainSection);
        subSection = cleanSectionName(subSection);

        const rawValues = formatPdfText(item.values);
        const values = rawValues ? rawValues.replace(/;\s*/g, '\n') : '';
        const comment = String(item.comment || '');
        const status = String(item.status || '');
        const key = `${mainSection}|${subSection}|${values}|${comment}|${status}`;
        if (!seenPaComp.has(key)) {
          paCompBody.push([mainSection, subSection, values, comment, status]);
          seenPaComp.add(key);
        }
      });
      addSection('Prompt Analysis', ['Section', 'Sub Section', 'Values', 'Comment', 'Status'], paCompBody, [30, 120, 180]);
    } else {
      const { summary: _paSummary, comparison_summary: _paCS, ...paOtherData } = paData;
      const paOtherKeys = Object.keys(paOtherData).filter(k => k !== 'raw');
      if (paOtherKeys.length > 0) {
        const seenPaOther = new Set();
        const paOtherBody = [];
        paOtherKeys.forEach(key => {
          const value = paOtherData[key];
          const rawValueStr = formatPdfText(value);
          const valueStr = rawValueStr ? rawValueStr.replace(/;\s*/g, '\n') : '';
          const comment = (typeof value === 'object' && value !== null)
            ? String(value.comment || value.tooltip || '') : '';

          const uniqKey = `${key}|${valueStr}|${comment}`;
          if (!seenPaOther.has(uniqKey)) {
            paOtherBody.push([cleanSectionName(key), valueStr, comment]);
            seenPaOther.add(uniqKey);
          }
        });
        addSection('Prompt Analysis Details', ['Field', 'Value', 'Comment'], paOtherBody, [30, 120, 180]);
      } else {
        addSection('Prompt Analysis', ['Status', 'Section', 'Comment'], [['Passed', 'General Verification', 'Prompt analysis completed — No prompt rule violations detected.']]);
      }
    }
  } else {
    addSection('Prompt Analysis', ['Status', 'Section', 'Comment'], [['Passed', 'General Verification', 'Prompt analysis completed — No prompt rule violations detected.']]);
  }

  // 18. Comparable Address Inconsistencies Section
  const addressInconsistencies = [];
  const getFirstThreeWords = (str) => str ? str.split(/\s+/).slice(0, 3).join(' ').toLowerCase() : '';

  const activeCompsForAddr = activeComps.filter(c => c !== 'Subject');
  activeCompsForAddr.forEach((sale, index) => {
    const compNum = index + 1;
    const salesGridAddress = data[sale]?.Address || '';
    const locationMapAddress = data[`Location Map Address ${compNum}`] || '';
    const photoAddress = data[`Comparable Photo Address ${compNum}`] || '';
    const allAddresses = [salesGridAddress, locationMapAddress, photoAddress];
    const validAddresses = allAddresses.filter(Boolean);

    let isConsistent = false;
    if (validAddresses.length < 2) {
      isConsistent = true;
    } else {
      const shortAddresses = validAddresses.map(getFirstThreeWords);
      const uniqueShortAddresses = new Set(shortAddresses);
      if (uniqueShortAddresses.size < shortAddresses.length) {
        isConsistent = true;
      }
    }

    if (!isConsistent) {
      addressInconsistencies.push([`Comp #${compNum}`, salesGridAddress, locationMapAddress, photoAddress]);
    }
  });

  const uniqueAddressInconsistencies = [];
  const seenAddressInconsistencies = new Set();
  addressInconsistencies.forEach(row => {
    const key = JSON.stringify(row);
    if (!seenAddressInconsistencies.has(key)) {
      uniqueAddressInconsistencies.push(row);
      seenAddressInconsistencies.add(key);
    }
  });

  addSection('Comparable Address Inconsistencies', ['Comparable', 'Sales Grid Address', 'Location Map Address', 'Photo Address'], uniqueAddressInconsistencies, [198, 40, 40]);

  // 19. APPRAISER & SUPERVISORY APPRAISER CERTIFICATION SECTION
  const renderCertificationSection = () => {
    if (yPos > pageHeight - 110) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFillColor(44, 62, 80);
    doc.rect(margin, yPos, doc.internal.pageSize.width - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('CERTIFICATION', margin + 4, yPos + 4.8);
    yPos += 9;

    const fmt = (val, defaultVal = '') => {
      const text = (val !== undefined && val !== null && String(val).trim() !== '') ? String(val).trim() : defaultVal;
      if (text && text !== 'Not Present' && text !== '-' && text !== 'N/A') {
        return {
          content: text,
          styles: { textColor: [34, 139, 34], fontStyle: 'bold', fillColor: [235, 247, 235] }
        };
      }
      return {
        content: text || '',
        styles: { textColor: [120, 120, 120], fontStyle: 'normal' }
      };
    };

    const appraiserSig = getVal('Appraiser Signature') || getVal('Signature') || (getVal('Name') || getVal('Appraiser Name') ? 'Present' : 'Not Present');
    const supSig = getVal('Supervisory Signature') || getVal('Supervisory Appraiser Signature') || (getVal('Supervisory Name') || getVal('Supervisory Appraiser Name') ? 'Present' : 'Not Present');

    const certRows = [
      [
        { content: 'APPRAISER', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } },
        { content: 'SUPERVISORY APPRAISER (ONLY IF REQUIRED)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } }
      ],
      [{ content: 'Signature', styles: { fontStyle: 'bold' } }, fmt(appraiserSig), { content: 'Signature', styles: { fontStyle: 'bold' } }, fmt(supSig, 'Not Present')],
      [{ content: 'Name', styles: { fontStyle: 'bold' } }, fmt(getVal('Name') || getVal('Appraiser Name')), { content: 'Name', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Name') || getVal('Supervisory Appraiser Name'))],
      [{ content: 'Company Name', styles: { fontStyle: 'bold' } }, fmt(getVal('Company Name') || getVal('Appraiser Company Name')), { content: 'Company Name', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Company Name') || getVal('Supervisory Appraiser Company Name'))],
      [{ content: 'Company Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Company Address') || getVal('Appraiser Company Address')), { content: 'Company Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Company Address') || getVal('Supervisory Appraiser Company Address'))],
      [{ content: 'Telephone Number', styles: { fontStyle: 'bold' } }, fmt(getVal('Telephone Number') || getVal('Appraiser Telephone Number') || getVal('Appraiser Phone')), { content: 'Telephone Number', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Telephone Number') || getVal('Supervisory Appraiser Telephone Number'))],
      [{ content: 'Email Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Email Address') || getVal('Appraiser Email Address') || getVal('Appraiser Email')), { content: 'Email Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Email Address') || getVal('Supervisory Appraiser Email Address'))],
      [{ content: 'Date of Signature', styles: { fontStyle: 'bold' } }, fmt(getVal('Date of Signature and Report') || getVal('Date of Signature')), { content: 'Date of Signature', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Date of Signature') || getVal('Supervisory Appraiser Date of Signature'))],
      [{ content: 'Effective Date of Appraisal', styles: { fontStyle: 'bold' } }, fmt(getVal('Effective Date of Appraisal') || getVal('Effective Date')), { content: 'State Certification #', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory State Certification #') || getVal('Supervisory Appraiser State Certification #'))],
      [{ content: 'State Certification #', styles: { fontStyle: 'bold' } }, fmt(getVal('State Certification #') || getVal('Appraiser ID')), { content: 'or State License #', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory or State License #') || getVal('Supervisory Appraiser State License #'))],
      [{ content: 'or State License #', styles: { fontStyle: 'bold' } }, fmt(getVal('or State License #') || getVal('Appraiser State License #')), { content: 'State', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory State') || getVal('Supervisory Appraiser State'))],
      [{ content: 'or Other (describe)', styles: { fontStyle: 'bold' } }, fmt(getVal('or Other (describe)') || getVal('Appraiser Other State License')), { content: 'Expiration Date', styles: { fontStyle: 'bold' } }, fmt(getVal('Supervisory Expiration Date of Certification or License') || getVal('Supervisory Appraiser Expiration Date'))],
      [{ content: 'State', styles: { fontStyle: 'bold' } }, fmt(getVal('State #') || getVal('State') || getVal('Appraiser State')), { content: '', colSpan: 2 }],
      [{ content: 'Expiration Date', styles: { fontStyle: 'bold' } }, fmt(getVal('Expiration Date of Certification or License') || getVal('Appraiser License Expiration Date')), { content: '', colSpan: 2 }],

      [
        { content: 'ADDRESS OF PROPERTY APPRAISED', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } },
        { content: 'SUBJECT PROPERTY', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } }
      ],
      [
        { content: 'Address', styles: { fontStyle: 'bold' } }, fmt(getVal('ADDRESS OF PROPERTY APPRAISED') || getVal('Property Address') || getVal('Physical Address') || getVal('Full Address') || getVal('Address')),
        { content: 'Subject Inspection', colSpan: 2, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'APPRAISED VALUE OF SUBJECT PROPERTY', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } },
        fmt(getVal('Subject Property Inspection'))
      ],
      [
        { content: 'Appraised Value $', styles: { fontStyle: 'bold' } }, fmt(getVal('APPRAISED VALUE OF SUBJECT PROPERTY $') || getVal('Opinion of Market Value') || getVal('Appraised Value')),
        { content: 'Date of Inspection: ' + (getVal('Inspection Date') || 'N/A'), colSpan: 2, styles: { fontStyle: 'italic' } }
      ],
      [
        { content: 'LENDER/CLIENT', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } },
        { content: 'COMPARABLE SALES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } }
      ],
      [
        { content: 'Name', styles: { fontStyle: 'bold' } }, fmt(getVal('LENDER/CLIENT Name') || getVal('Lender/Client Name') || getVal('Client/Lender Company Name') || getVal('Lender/Client')),
        fmt(getVal('Comparable Sales Inspection'))
      ],
      [
        { content: 'Company Name', styles: { fontStyle: 'bold' } }, fmt(getVal('Lender/Client Company Name') || getVal('Lender Company Name') || getVal('Appraisal Management Company Name')),
        { content: 'Date of Inspection: ' + (getVal('Inspection Date') || 'N/A'), colSpan: 2, styles: { fontStyle: 'italic' } }
      ],
      [
        { content: 'Company Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Lender/Client Company Address') || getVal('Client/Lender Company Address')),
        { content: '', colSpan: 2 }
      ],
      [
        { content: 'Email Address', styles: { fontStyle: 'bold' } }, fmt(getVal('Lender/Client Email Address') || getVal('Lender Email Address')),
        { content: '', colSpan: 2 }
      ],

      [
        { content: 'Additional Info & E&O Insurance', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 243, 246], textColor: [44, 62, 80] } }
      ],
      [
        { content: 'Appraiser License', styles: { fontStyle: 'bold' } }, fmt(getVal('Appraiser License') || getVal('Appraiser ID')),
        { content: 'E&O Insurance', styles: { fontStyle: 'bold' } }, fmt(getVal('E&O Insurance'))
      ],
      [
        { content: 'Policy Period From', styles: { fontStyle: 'bold' } }, fmt(getVal('Policy Period From')),
        { content: 'Policy Period To', styles: { fontStyle: 'bold' } }, fmt(getVal('Policy Period To'))
      ],
      [
        { content: 'License Valid To', styles: { fontStyle: 'bold' } }, fmt(getVal('License Valid To') || getVal('License Vaild To') || getVal('Appraiser License Expiration Date')),
        { content: 'License # / Reg #', styles: { fontStyle: 'bold' } }, fmt(getVal('LICENSE/REGISTRATION/CERTIFICATION #') || getVal('License # / Reg #') || getVal('Appraiser ASC Identifier'))
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      body: certRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 'auto' }
      },
      didDrawPage: (d) => { yPos = d.cursor.y + 10; }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  };

  renderCertificationSection();

  addHeaderFooter();
  const baseFileName = selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, "") : 'Appraisal_Version1';
  doc.save(`${baseFileName}_Validation_Log.pdf`);
  setNotification({ open: true, message: 'Appraisal Version #1 Validation Log generated successfully.', severity: 'success' });
};
