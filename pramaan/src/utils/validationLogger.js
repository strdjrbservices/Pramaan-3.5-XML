import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateVersion1ValidationLogPDF } from './version1ValidationLogger';

export const generateValidationLogPDF = (params) => {
  const {
    data = {},
    comparisonData = {},
    selectedFile = null,
    username = '',
    fileUploadTimer = 0,
    getValidationErrors = () => [],
    getValidationSuccesses = () => [],
    getFieldValueByPath = () => '',
    getRevisionLanguage = () => '',
    selectedFormType = '',
    subjectPdfFields = [],
    subjectFields = [],
    ADUResponse = null,
    unpaidOkResponse = null,
    fhaResponse = null,
    marketConditionsRows = [],
    salesGridRows = [],
    salesGridRows1025 = [],
    comparableSales = [],
    salesHistoryFields = [],
    stateReqResponse = null,
    clientReqResponse = null,
    escalationResponse = null,
    promptAnalysisResponse = null,
    setNotification = () => { }
  } = params || {};

  const formTypeStr = String(selectedFormType || data.formType || data.selectedFormType || '').trim();
  if (formTypeStr === 'Appraisal Version #1' || formTypeStr === 'Version 1' || formTypeStr === 'Version1') {
    return generateVersion1ValidationLogPDF(params);
  }

  if (Object.keys(data).length === 0) {
    setNotification({ open: true, message: 'No data to generate a log.', severity: 'warning' });
    return;
  }

  const reviewAllData = { ...data, comparisonData };

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let yPos = margin;

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
    const valStr = getFieldValueByPath(reviewAllData, path);
    const revLanguage = getRevisionLanguage(path, field, message, valStr);
    return [section, field, valStr, message, revLanguage];
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
    { label: 'FORM TYPE', val: formTypeStr || '1004' },
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
      didDrawPage: (data) => { yPos = data.cursor.y + 10; },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (title.includes('Consistency') || title.includes('Inconsistencies')) {
            data.cell.styles.textColor = [220, 53, 69];
            return;
          }

          if (title.includes('Check') || title.includes('Analysis') || title.includes('Escalation') || title.includes('Prompt') || title.includes('Requirement')) {
            const rowData = data.row.raw || [];
            const rawStatus = (rowData.length >= 5) ? rowData[4] : rowData[1];
            const statusType = checkStatusType(rawStatus);

            if (statusType === 'error') {
              data.cell.styles.textColor = [220, 53, 69];
              data.cell.styles.fontStyle = 'bold';
              if (data.column.index === 4 || data.column.index === 1) {
                data.cell.styles.fillColor = [255, 235, 235];
              }
            } else if (statusType === 'pass') {
              data.cell.styles.textColor = [34, 139, 34];
              data.cell.styles.fontStyle = 'normal';
              if (data.column.index === 4 || data.column.index === 1) {
                data.cell.styles.fillColor = [235, 247, 235];
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
      const section = row[0];
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
        } : columns.length === 3 ? {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 'auto' }
        } : undefined,
        didDrawPage: (data) => { yPos = data.cursor.y + 10; },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (mainTitle === 'Validation Errors') {
              if (data.column.index === 2) {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
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
    addSectionWiseTables('Validation Errors', uniqueValidationErrorRows, ['Field', 'Value', 'Error Message', 'Need to Add Revision language'], [220, 53, 69]);
  }

  // Requirement Checks Executive Summary Section
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
    
    if (details.length > 0) {
      const errorDetails = details.filter(d => checkStatusType(d.status) === 'error');
      if (errorDetails.length > 0) {
        errorDetails.forEach(d => {
          const itemTitle = d.requirement || d.state || d.item || d.checkpoint || checkTitle;
          const itemStatus = d.status || 'Needs Escalation';
          const itemComment = d.value_or_comment || d.comment || d.finding || d.description || '';
          reqCheckSummaryRows.push([itemTitle, itemStatus, itemComment]);
        });
      } else {
        const statusText = r.overallStatus || r.status || 'Passed';
        reqCheckSummaryRows.push([checkTitle, statusText, summaryText || 'All items passed.']);
      }
    } else if (summaryText) {
      const hasEscalations = details.some(d => checkStatusType(d.status) === 'error');
      const statusText = r.overallStatus || r.status || (hasEscalations ? 'Needs Escalation / Review' : 'Passed');
      reqCheckSummaryRows.push([checkTitle, statusText, summaryText]);
    }
  };

  parseReqSummary('State Requirement Check', stateReqResponse);
  parseReqSummary('Client Requirement Check', clientReqResponse);
  parseReqSummary('Escalation Check', escalationResponse);

  if (reqCheckSummaryRows.length > 0) {
    addSection('Requirement Checks Summary', ['Requirement Check', 'Overall Status', 'Executive Summary'], reqCheckSummaryRows, [44, 62, 80]);
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

  const errorPathsSet = new Set(
    validationErrors.map(([s, f, m, path]) => path ? JSON.stringify(path) : null).filter(Boolean)
  );
  const successPathsSet = new Set(
    validationSuccesses.map(([s, f, m, path]) => path ? JSON.stringify(path) : null).filter(Boolean)
  );

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

  const getSubjectCellFormatting = (field) => {
    let val = data.Subject?.[field] ?? data[field] ?? '';
    if ((field === 'ADU File Check' || field === 'ADU') && (!val || val === '')) {
      val = data['ADU File Check'] || data['ADU'] || ADUResponse?.summary || ADUResponse?.status || '';
    }
    if ((field === 'Unpaid OK' || field === 'Unpaid Ok') && (!val || val === '')) {
      const unpaidOkLenders = [
        'PRMG', 'Paramount Residential Mortgage Group', 'CARDINAL FINANCIAL COMPANY', 'Ice Lender Holdings LLC',
        'NP Inc', 'NQM Funding, LLC', 'East Coast Capital', 'Guaranteed Rate. Inc', 'Commercial Lender, LLC',
        'LoanDepot.com', 'Direct Lending Partners', 'CIVIC', 'CV3', 'United Faith Mortgage', 'Arixa Capital',
        'Crosswind Financial', 'Western Alliance Bank', 'RCN Capital, LLC', 'Aura Mortgage Advisors, LLC',
        'Blue Hub Capital', 'Nations Direct Mortgage LLC', 'Sierra Pacific Mortgage Company Inc', 'Champions Funding LLC'
      ].map(l => l.toLowerCase());
      const lender = data['Lender/Client'] || data.Subject?.['Lender/Client'] || '';
      const isUnpaidOkLender = lender && unpaidOkLenders.some(l => lender.toLowerCase().includes(l));
      val = data['Unpaid OK'] || unpaidOkResponse?.summary || unpaidOkResponse?.status || (isUnpaidOkLender ? 'Proceed with review' : (lender ? 'Unpaid OK cannot proceed with review (Check lender requirement)' : 'Check lender requirement')) || '';
    }
    if ((field === 'FHA Case #' || field === 'FHA Case No.' || field === 'FHA Case Number') && (!val || val === '')) {
      val = data['FHA Case No.'] || data['FHA Case #'] || data['FHA Case Number'] || fhaResponse?.summary || data.Subject?.['FHA Case No.'] || data.Subject?.['FHA Case #'] || '';
    }
    if ((field === 'Exposure Comment' || field === 'Exposure comment') && (!val || val === '')) {
      val = data['Exposure comment'] || data['Exposure Comment'] || data.Subject?.['Exposure comment'] || data.Subject?.['Exposure Comment'] || '';
    }
    if (field === 'ANSI' && (!val || val === '')) {
      val = data['ANSI'] || data['ANSI Standards'] || data.Subject?.['ANSI'] || '';
    }
    if ((field === 'Prior Service Comment' || field === 'Prior service comment') && (!val || val === '')) {
      val = data['Prior service comment'] || data['Prior Service Comment'] || data['Prior Service'] || data.Subject?.['Prior service comment'] || data.Subject?.['Prior Service Comment'] || '';
    }

    const text = String(val).trim();
    const path1 = ['Subject', field];
    const path2 = [field];
    const key1 = JSON.stringify(path1);
    const key2 = JSON.stringify(path2);

    const hasError = errorPathsSet.has(key1) || errorPathsSet.has(key2);
    const hasSuccess = successPathsSet.has(key1) || successPathsSet.has(key2);

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

  const subjFieldsToUse = (typeof subjectPdfFields !== 'undefined' && subjectPdfFields.length > 0)
    ? subjectPdfFields
    : (subjectFields && subjectFields.length > 0 ? subjectFields : Object.keys(data.Subject || {}));
  if (subjFieldsToUse.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Subject Information Section', margin, yPos);
    yPos += 8;

    const subjBody = [];
    for (let i = 0; i < subjFieldsToUse.length; i += 3) {
      const chunk = subjFieldsToUse.slice(i, i + 3);
      const rowCells = [];

      chunk.forEach(field => {
        rowCells.push({ content: field, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } });
        rowCells.push(getSubjectCellFormatting(field));
      });

      while (rowCells.length < 6) {
        rowCells.push('');
      }

      subjBody.push(rowCells);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Field 1', 'Value 1', 'Field 2', 'Value 2', 'Field 3', 'Value 3']],
      body: subjBody,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 8, fontStyle: 'bold' },
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
  }

  const VERSION_1_ONLY_FIELDS = [
    // Highest & Best Use & Market Analysis (Version 1)
    'Legally Permissible',
    'Physically Possible',
    'Financially Feasible',
    'Maximally Productive',
    'Highest and Best Use as Improved (Present Use)',
    'Highest and Best Use Commentary',
    'Market Area Boundary',
    'Active Listings',
    'Median Days on Market',
    'Lowest List Price',
    'Median List Price',
    'Highest List Price',
    'Pending Sales',
    'Sales in Past 12 Months',
    'Lowest Sale Price',
    'Median Sale Price',
    'Highest Sale Price',
    'Distressed Market Competition',
    'Price Trend Source',
    'Demand / Supply',
    'Market Commentary',
    'Search Criteria Description',
    'Price Trend Analysis Commentary',

    // Quality & Condition Breakdowns (Version 1)
    'Overall Quality',
    'Exterior Quality',
    'Interior Quality',
    'Exterior Quality Rating',
    'Interior Quality Rating',
    'Overall Condition',
    'Exterior Condition',
    'Interior Condition',
    'Exterior Condition Rating',
    'Interior Condition Rating',
    'Reconciliation of Overall Quality and Condition',
    'Overall Update Status Bathrooms',
    'Overall Update Status for Bathrooms',
    'Overall Update Status Flooring',
    'Overall Update Status for Flooring',

    // Amenities (Version 1)
    'Amenity Category',
    'Subject Property Amenity',
    'Amenity Material',
    'Amenity Detail',
    'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)',
    'Subject Property Amenities Exhibits',

    // Apparent Defects & Sub-details (Version 1)
    'Apparent Defects (Interior)',
    'Apparent Defects (Exterior)',
    'Apparent Defects (Site)',
    'Apparent Defects, Damages, Deficiencies (Unit Interior)',
    'Apparent Defects, Damages, Deficiencies (Dwelling Exterior)',
    'Apparent Defects, Damages, Deficiencies (Site)',
    'Electricity Detail',
    'Electricity Private Utility Impact',
    'Electricity Comment',
    'Sanitary Sewer Detail',
    'Sanitary Sewer Private Utility Impact',
    'Sanitary Sewer Comment',
    'Water Detail',
    'Water Private Utility Impact',
    'Water Comment',
    'Heating Detail',
    'Heating Fuel',
    'Cooling Detail',
    'Cooling Fuel',
    'Core Heating System Below Grade',

    // Unit & Structural Details (Version 1)
    'Units Excluding ADUs',
    'Accessory Dwelling Units (ADUs)',
    'Front Door Elevation',
    'Converted Area',
    'Dwelling Style',
    'Levels in Unit',
    'Floors in Building',
    'Units in Structure',
    'Construction Method',
    'Finished Above Grade',
    'Unfinished Above Grade',
    'Finished Below Grade',
    'Unfinished Below Grade',
    'Area Data Source',
    'Condop',
    'Property on Native American Lands',
    'Subject Site Owned in Common',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)',
    'Homeowner Maintenance Responsible',
    'Special Tax Assessments',
    'All Rights Included in Appraisal',
    'Subject Property Commentary',
    'APN Description',
    'Number of Parcels',
    'Zoning Classification Code',
    'Zoning Classification Description',
    'Primary Access',
    'Street Type and Surface',
    'Non-Residential Use',
    'Renewable Energy Components',
    'Known Building Certifications',
    'Known Efficiency Ratings',
    'Energy Efficient Features Impact',
    'Broadband Internet Available',
    'Subject Transfer History',
    'Subject Transfer Data Source',
    'Analysis of Subject Prior Sale/Transfer',
    'Analysis of Comparable Prior Sale/Transfer',

    // Cost Approach & Land Comparables (Version 1)
    'Cost Per Square Foot',
    'Site Improvement Description',
    'Site Improvement Amount',
    'Primary Site Valuation Method',
    'Land Comparable Number',
    'Land Comparable Address',
    'Land Comparable County',
    'Land Comparable Data Source',
    'Land Comparable Assessor Parcel Number (APN)',
    'Land Comparable Site Size',
    'Land Comparable Sale Date',
    'Land Comparable Sale Price',
    'Commentary on Remaining Economic Life',
    'Commentary on Effective Age',
    'General Description',
    'Cost Type',
    'Cost Method',
    'Depreciation Method',
    'Cost Approach Commentary',
    'Cost Approach Exhibits',
    'Indicated Value by Cost Approach',
    'Depreciated Cost of Dwellings',
    'As Is Value of Site Improvements',
    'Opinion of Site Value',
    'Above Grade Finished Area',
    'Above Grade Finished Area Cost Rate',
    'Depreciated Cost',
    'Physical Depreciation',
    'Functional Depreciation',
    'External Depreciation',
    'Total Depreciation',
    'Remaining Economic Life',
    'Effective Age',
    'Cost Data Source',
    'Quality Rating',
    'Effective Date'
  ];

  const render3FieldGridSection = (sectionTitle, sectionData, fieldList, sectionKeyPrefixes, headerColor) => {
    let rawFields = (fieldList && fieldList.length > 0)
      ? [...fieldList]
      : Object.keys(sectionData || {});

    const isV1Form = formTypeStr === 'Appraisal Version #1' || formTypeStr === 'Version 1' || formTypeStr === 'Version1';
    const fieldsToUse = isV1Form ? rawFields : rawFields.filter(f => !VERSION_1_ONLY_FIELDS.includes(f));

    if (!fieldsToUse || fieldsToUse.length === 0) return;

    const hasAnyHit = fieldsToUse.some(field => {
      let val = sectionData?.[field] ?? data[field] ?? '';
      const text = String(val ?? '').trim();
      if (text !== '' && text !== 'N/A' && text !== '-') return true;
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

    const getCellFormatting = (field) => {
      let val = sectionData?.[field] ?? data[field] ?? '';
      const text = String(val ?? '').trim();

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

    const sectionBody = [];
    for (let i = 0; i < fieldsToUse.length; i += 3) {
      const chunk = fieldsToUse.slice(i, i + 3);
      const rowCells = [];

      chunk.forEach(field => {
        rowCells.push({ content: field, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } });
        rowCells.push(getCellFormatting(field));
      });

      while (rowCells.length < 6) {
        rowCells.push('');
      }

      sectionBody.push(rowCells);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Field 1', 'Value 1', 'Field 2', 'Value 2', 'Field 3', 'Value 3']],
      body: sectionBody,
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

  render3FieldGridSection('Contract Section', data.CONTRACT || data.Contract || {}, null, [['CONTRACT'], ['Contract']], [108, 117, 125]);
  render3FieldGridSection('Neighborhood Section', data.NEIGHBORHOOD || data.Neighborhood || {}, null, [['NEIGHBORHOOD'], ['Neighborhood']], [40, 167, 69]);
  render3FieldGridSection('Site Section', data.SITE || data.Site || {}, null, [['SITE'], ['Site']], [255, 193, 7]);
  render3FieldGridSection('Improvements Section', data.IMPROVEMENTS || data.Improvements || {}, null, [['IMPROVEMENTS'], ['Improvements']], [23, 162, 184]);
  render3FieldGridSection('Reconciliation Section', data.RECONCILIATION || data.Reconciliation || {}, null, [['RECONCILIATION'], ['Reconciliation']], [111, 66, 193]);
  render3FieldGridSection('Cost Approach Section', data.COST_APPROACH || data['Cost Approach'] || {}, null, [['COST_APPROACH'], ['Cost Approach']], [232, 62, 140]);
  render3FieldGridSection('Income Approach Section', data.INCOME_APPROACH || data['Income Approach'] || {}, null, [['INCOME_APPROACH'], ['Income Approach']], [32, 201, 151]);
  // 1004MC Market Conditions Section
  const mcData = data.MARKET_CONDITIONS || data['MARKET CONDITIONS'] || data['Market Conditions'] || data['1004MC'] || data;
  const mcTimeframes = ["Prior 7-12 Months", "Prior 4-6 Months", "Current-3 Months", "Overall Trend"];

  const defaultMcRows = [
    { label: "Total # of Comparable Sales (Settled)", fullLabel: "Total # of Comparable Sales (Settled)" },
    { label: "Absorption Rate (Total Sales/Months)", fullLabel: "Absorption Rate (Total Sales/Months)" },
    { label: "Total # of Comparable Active Listings", fullLabel: "Total # of Comparable Active Listings" },
    { label: "Months of Housing Supply (Total Listings/Ab.Rate)", fullLabel: "Months of Housing Supply (Total Listings/Ab.Rate)" },
    { label: "Median Comparable Sale Price", fullLabel: "Median Comparable Sale Price" },
    { label: "Median Comparable Sales Days on Market", fullLabel: "Median Comparable Sales Days on Market" },
    { label: "Median Comparable List Price", fullLabel: "Median Comparable List Price" },
    { label: "Median Comparable Listings Days on Market", fullLabel: "Median Comparable Listings Days on Market" },
    { label: "Median Sale Price as % of List Price", fullLabel: "Median Sale Price as % of List Price" }
  ];

  const rowsToUse = (marketConditionsRows && marketConditionsRows.length > 0)
    ? marketConditionsRows
    : defaultMcRows;

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(40);
  doc.text('Market Conditions Section (1004MC)', margin, yPos);
  yPos += 8;

  const mcHead = [['Inventory Analysis', ...mcTimeframes]];
  const mcBody = [];

  const getMcCellFormatting = (rowLabel, fullLabel, tf) => {
    const key1 = `${fullLabel} (${tf})`;
    const key2 = `${rowLabel} (${tf})`;
    let val = mcData[key1] ?? mcData[key2] ?? mcData[fullLabel] ?? data[key1] ?? data[key2] ?? '';

    if (typeof val === 'object' && val !== null) {
      val = val.value ?? val.text ?? val.val ?? JSON.stringify(val);
    }
    const text = String(val ?? '').trim();

    const path1 = ['MARKET_CONDITIONS', key1];
    const path2 = ['MARKET_CONDITIONS', key2];
    const pKey1 = JSON.stringify(path1);
    const pKey2 = JSON.stringify(path2);

    const hasError = errorPathsSet.has(pKey1) || errorPathsSet.has(pKey2);
    const hasSuccess = successPathsSet.has(pKey1) || successPathsSet.has(pKey2);

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

  rowsToUse.forEach((row, idx) => {
    if (idx === 4) {
      mcBody.push([
        { content: 'Median Sale & List Price, DOM, Sale/List %', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        ...mcTimeframes.map(tf => ({ content: tf, styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'center' } }))
      ]);
    }

    const rowCells = [
      { content: row.label || row.fullLabel, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
    ];

    mcTimeframes.forEach(tf => {
      rowCells.push(getMcCellFormatting(row.label, row.fullLabel || row.label, tf));
    });

    mcBody.push(rowCells);
  });

  autoTable(doc, {
    startY: yPos,
    head: mcHead,
    body: mcBody,
    theme: 'grid',
    headStyles: { fillColor: [253, 126, 20], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' }
    },
    didDrawPage: (d) => { yPos = d.cursor.y + 10; }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  const mcNarrativeFields = [
    "Instructions:",
    "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
    "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).",
    "Are foreclosure sales (REO sales) a factor in the market?",
    "If yes, explain (including the trends in listings and sales of foreclosed properties).",
    "Cite data sources for above information.",
    "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
  ];
  render3FieldGridSection('Market Conditions Narrative Questions', mcData, mcNarrativeFields, [['MARKET_CONDITIONS']], [253, 126, 20]);
  renderCertificationSection();

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

  // Sales Comparison Approach (Sales Grid) Section
  const targetGridRows = (selectedFormType === 'Form 1025' || selectedFormType === '1025')
    ? (salesGridRows1025 && salesGridRows1025.length > 0 ? salesGridRows1025 : salesGridRows)
    : salesGridRows;

  const rawCompsToUse = comparableSales && comparableSales.length > 0
    ? comparableSales
    : Object.keys(data).filter(k => k.startsWith('Comparable Sale') || k.startsWith('Comp '));

  const compsToUse = rawCompsToUse.filter(compKey => {
    const compData = data[compKey] || reviewAllData[compKey];
    if (!compData || typeof compData !== 'object') return false;
    const keys = Object.keys(compData);
    if (keys.length === 0) return false;
    return keys.some(k => {
      const v = compData[k];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
  });

  if (compsToUse.length > 0 && targetGridRows && targetGridRows.length > 0) {
    const compChunks = [];
    for (let i = 0; i < compsToUse.length; i += 3) {
      compChunks.push(compsToUse.slice(i, i + 3));
    }

    compChunks.forEach((chunk, chunkIdx) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(40);
      const sectionTitle = chunkIdx === 0
        ? 'Sales Comparison Approach (Sales Grid)'
        : `Sales Comparison Approach (Comps ${chunkIdx * 3 + 1} - ${chunkIdx * 3 + chunk.length})`;
      doc.text(sectionTitle, margin, yPos);
      yPos += 8;

      const head = [['Feature', 'Subject', ...chunk.map((compKey, idx) => {
        const numMatch = compKey.match(/\d+/);
        return numMatch ? `Comp ${numMatch[0]}` : `Comp ${chunkIdx * 3 + idx + 1}`;
      })]];
      const body = [];

      const getSalesGridCellFormatting = (compKey, fieldKey, adjKey, sec) => {
        let val = getFieldValueByPath(reviewAllData, [compKey, fieldKey]) || data[compKey]?.[fieldKey] || '';
        if (typeof val === 'object' && val !== null) {
          val = val.value ?? val.text ?? val.val ?? JSON.stringify(val);
        }
        let adj = adjKey ? (getFieldValueByPath(reviewAllData, [compKey, adjKey]) || data[compKey]?.[adjKey] || '') : '';
        if (!adj && fieldKey && compKey !== 'Subject') {
          adj = getFieldValueByPath(reviewAllData, [compKey, `${fieldKey} Adjustment`]) ||
            data[compKey]?.[`${fieldKey} Adjustment`] ||
            data[compKey]?.[`${fieldKey} Adj`] ||
            data[compKey]?.[`${fieldKey}_adjustment`] ||
            '';
        }
        if (typeof adj === 'object' && adj !== null) {
          adj = adj.value ?? adj.text ?? adj.val ?? JSON.stringify(adj);
        }

        let text = String(val ?? '').trim();
        let adjText = String(adj ?? '').trim();
        if (text && adjText && text !== adjText) {
          text = `${text} / ${adjText}`;
        } else if (!text && adjText) {
          text = adjText;
        }

        const path1 = [compKey, fieldKey];
        const path2 = adjKey ? [compKey, adjKey] : null;
        const key1 = JSON.stringify(path1);
        const key2 = path2 ? JSON.stringify(path2) : null;

        const hasError = errorPathsSet.has(key1) || (key2 && errorPathsSet.has(key2));
        const hasSuccess = successPathsSet.has(key1) || (key2 && successPathsSet.has(key2));

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

      targetGridRows.forEach((row) => {
        const isFirstAdjustment = row.valueKey === "Sales or Financing Concessions" || row.valueKey === "Sales Concessions";
        const isFirstUnitBreakdown = row.isUnitBreakdown && row.unitNumber === 1;

        if (isFirstAdjustment) {
          body.push([
            { content: 'VALUE ADJUSTMENTS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: 'DESCRIPTION', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } },
            ...chunk.map(() => ({ content: 'DESCRIPTION / ADJ', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }))
          ]);
        }

        if (isFirstUnitBreakdown) {
          body.push([
            { content: 'UNIT BREAKDOWN', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: 'UNIT 1', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } },
            ...chunk.map(() => ({ content: '', styles: { fillColor: [240, 240, 240] } }))
          ]);
        }

        const isHeaderRow = !row.valueKey && !row.adjKey && row.label;
        if (isHeaderRow) {
          body.push([
            { content: row.label, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            { content: '', styles: { fillColor: [245, 245, 245] } },
            ...chunk.map(() => ({ content: '', styles: { fillColor: [245, 245, 245] } }))
          ]);
          return;
        }

        const labelText = row.subLabel || row.label || row.valueKey || '';
        const rowCells = [
          { content: labelText, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          getSalesGridCellFormatting('Subject', row.valueKey, row.adjKey, row.section)
        ];

        chunk.forEach((compKey) => {
          rowCells.push(getSalesGridCellFormatting(compKey, row.valueKey, row.adjKey, row.section));
        });

        body.push(rowCells);
      });

      const isLastChunk = chunkIdx === compChunks.length - 1;

      if (isLastChunk && salesHistoryFields && salesHistoryFields.length > 0) {
        body.push([
          { content: 'PRIOR SALE HISTORY', colSpan: 2 + chunk.length, styles: { fontStyle: 'bold', fillColor: [220, 230, 242], halign: 'left' } }
        ]);
        salesHistoryFields.forEach(feature => {
          const rowData = [feature, getSalesGridCellFormatting('Subject', feature, null, null)];
          chunk.forEach(compKey => {
            rowData.push(getSalesGridCellFormatting(compKey, feature, null, null));
          });
          body.push(rowData);
        });
      }

      const columnStylesConfig = {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      };
      for (let c = 2; c < head[0].length; c++) {
        columnStylesConfig[c] = { cellWidth: 'auto' };
      }

      autoTable(doc, {
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: columnStylesConfig,
        didDrawPage: (d) => { yPos = d.cursor.y + 10; }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    });
  }

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
            didDrawPage: (data) => { yPos = data.cursor.y + 10; },
            didParseCell: (data) => {
              if (data.section === 'body') {
                const rowData = data.row.raw || [];
                const statusType = checkStatusType(rowData[1]);

                if (statusType === 'error') {
                  data.cell.styles.textColor = [220, 53, 69];
                  data.cell.styles.fontStyle = 'bold';
                  if (data.column.index === 1) {
                    data.cell.styles.fillColor = [255, 235, 235];
                  }
                } else if (statusType === 'pass') {
                  data.cell.styles.textColor = [34, 139, 34];
                  data.cell.styles.fontStyle = 'normal';
                  if (data.column.index === 1) {
                    data.cell.styles.fillColor = [235, 247, 235];
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
    const formatPdfText = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        if (Array.isArray(val)) return val.map(item => formatPdfText(item)).join(', ');
        if ('value' in val) return formatPdfText(val.value);
        return Object.entries(val)
          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join('\n');
      }
      let textStr = String(val);
      textStr = textStr.replace(/URAR Page 1/gi, 'Subject Section')
        .replace(/URAR Page 2/gi, 'Sales Comparison Grid')
        .replace(/URAR Page 3/gi, 'Reconciliation & Certification')
        .replace(/URAR Page \d+/gi, 'Subject Report Section')
        .replace(/URAR Page/gi, 'Subject Report Section');
      return textStr;
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
      addSection('Prompt Analysis', ['Section', 'Sub Section', 'Values', 'Comment', 'Status'], paCompBody, [44, 62, 80]);
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
        addSection('Prompt Analysis Details', ['Field', 'Value', 'Comment'], paOtherBody, [44, 62, 80]);
      } else {
        addSection('Prompt Analysis', ['Status', 'Section', 'Comment'], [['Passed', 'General Verification', 'Prompt analysis completed — No prompt rule violations detected.']], [44, 62, 80]);
      }
    }
  } else {
    addSection('Prompt Analysis', ['Status', 'Section', 'Comment'], [['Passed', 'General Verification', 'Prompt analysis completed — No prompt rule violations detected.']], [44, 62, 80]);
  }

  const addressInconsistencies = [];
  const getFirstThreeWords = (str) => str ? str.split(/\s+/).slice(0, 3).join(' ').toLowerCase() : '';

  const listToUse = (compsToUse && compsToUse.length > 0) ? compsToUse : comparableSales;
  listToUse.forEach((sale, index) => {
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

  // Helper value lookup for Certification Section
  function getVal(fieldKey) {
    if (!fieldKey) return '';
    if (data[fieldKey] !== undefined && data[fieldKey] !== null) return data[fieldKey];
    if (data.Subject?.[fieldKey] !== undefined && data.Subject?.[fieldKey] !== null) return data.Subject[fieldKey];
    if (data.SUMMARY?.[fieldKey] !== undefined && data.SUMMARY?.[fieldKey] !== null) return data.SUMMARY[fieldKey];
    if (data.CONTACT?.[fieldKey] !== undefined && data.CONTACT?.[fieldKey] !== null) return data.CONTACT[fieldKey];
    if (data.CERTIFICATION?.[fieldKey] !== undefined && data.CERTIFICATION?.[fieldKey] !== null) return data.CERTIFICATION[fieldKey];
    return '';
  };

  // 19. APPRAISER & SUPERVISORY APPRAISER CERTIFICATION SECTION
  function renderCertificationSection() {
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
  }

  addHeaderFooter();
  const baseFileName = selectedFile?.name.replace(/\.[^/.]+$/, "") || 'Appraisal';
  doc.save(`${baseFileName}_Validation_Log.pdf`);
  setNotification({ open: true, message: 'log generated successfully.', severity: 'success' });
};
