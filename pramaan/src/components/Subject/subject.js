import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Subject.css';
import { GlobalStyles } from '@mui/system';
import {
  Info,
  Warning as WarningIcon,
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  NoteAlt as NoteAltIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Save as SaveIcon,
  Assessment as AssessmentIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  LocationCity as LocationCityIcon,
  Terrain as TerrainIcon,
  Analytics as AnalyticsIcon,
  MeetingRoom as MeetingRoomIcon,
  History as HistoryIcon,
  Build as BuildIcon,
  MonetizationOn as MonetizationOnIcon,
  CompareArrows as CompareArrowsIcon,
  RequestQuote as RequestQuoteIcon,
  TableChart as TableChartIcon,
  MergeType as MergeTypeIcon,
  Balance as BalanceIcon,
  Calculate as CalculateIcon,
  AttachMoney as AttachMoneyIcon,
  Domain as DomainIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  FactCheck as FactCheckIcon,
  Code as CodeIcon,
  Apartment as ApartmentIcon,
  FileDownload as FileDownloadIcon,
  DeleteForever as DeleteForeverIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Map as MapIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import { Button, Stack, IconButton, Tooltip, Paper, Box, Typography, LinearProgress, Alert, Snackbar, Fade, CircularProgress, useTheme, CssBaseline, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Fab, Autocomplete, TextField, Select, MenuItem, FormControl, InputLabel, InputAdornment, Chip, Popover, Divider } from '@mui/material';
import jsPDF from 'jspdf';
import GetAppIcon from '@mui/icons-material/GetApp';
import autoTable from 'jspdf-autotable';
import Sidebar from './layout/Sidebar.js';
import PromptAnalysis from '../tools/PromptAnalysis.js';

import {
  ContractComparisonDialog,
  RevisionLanguageDialog,
  NotepadDialog,
  EngagementLetterDialog,
  PdfXmlDiffDialog,
} from './components/dialogs.js';
import { SalesComparisonSection, ComparisonResultTable, SubjectRentScheduleTable } from './components/tables.js';
import { getComparisonStyle, playSound, API_BASE_URL } from './utils/utils.js';

import Form1004 from './2.6/1004';
import Form1007 from './2.6/1007';
import Form1004And1007 from './2.6/1004And1007';
import Form1073 from './2.6/1073';
import Form1025 from './2.6/1025';
import Form1004D from './2.6/1004D';
import Version1 from './Version1/Version1';
import ECR from './ECR';
import { EditableField, GridInfoCard } from './components/FormComponents';
import StateRequirementCheck, { STATE_REQUIREMENTS_PROMPT } from '../check/StateRequirementCheck';
import UnpaidOkCheck, { UNPAID_OK_PROMPT } from '../check/UnpaidOkCheck';
import ClientRequirementCheck, { CLIENT_REQUIREMENT_PROMPT } from '../check/ClientRequirementCheck';
import EscalationCheck, { ESCALATION_CHECK_PROMPT } from '../check/EscalationCheck';
import FhaCheck, { FHA_REQUIREMENTS_PROMPT } from '../check/FhaCheck';
import ADUCheck, { ADU_REQUIREMENTS_PROMPT } from '../check/ADUCheck';

import { generateValidationLogPDF } from '../../utils/validationLogger';

import * as contractValidation from '../../validations/contractValidation';
import * as subjectValidation from '../../validations/subjectValidation';
import * as siteValidation from '../../validations/siteValidation';
import * as neighborhoodValidation from '../../validations/neighborhoodValidation';
import * as improvementsValidation from '../../validations/improvementsValidation';
import * as salesComparisonValidation from '../../validations/salesComparisonValidation';
import * as reconciliationValidation from '../../validations/reconciliationValidation';
import * as rentScheduleValidation from '../../validations/rentScheduleValidation';
import * as appraiserLenderValidation from '../../validations/appraiserLenderValidation';
import * as marketConditionsValidation from '../../validations/marketConditionsValidation';
import * as form1073Validation from '../../validations/form1073Validation';
import * as pudInformationValidation from '../../validations/pudInformationValidation';
import * as unitDescriptionsValidation from '../../validations/unitDescriptionsValidation';
import * as projectAnalysisValidation from '../../validations/projectAnalysisValidation';
import * as projectSiteValidation from '../../validations/projectSiteValidation';
import * as incomeApproachValidation from '../../validations/incomeApproachValidation';
import * as priorSaleHistoryValidation from '../../validations/priorSaleHistoryValidation';
import * as htmlDataValidation from '../../validations/htmldatavaliadtion';
import * as infoOfSalesValidation from '../../validations/infoOfSalesValidation';
import * as costApproachValidation from '../../validations/costApproachValidation';
import * as version1Validation from './Version1/version1Validation';
import * as form1004And1007Validation from '../../validations/form1004And1007Validation';
import { checkUnpaidLenderStatus } from '../../utils/unpaidLenders';

import PremiumLogo from '../auth/logo';
import { SUBJECT_REVISION_PROMPTS, CONTRACT_REVISION_PROMPTS, NEIGHBORHOOD_REVISION_PROMPTS, SITE_REVISION_PROMPTS, IMPROVEMENTS_REVISION_PROMPTS, SALES_GRID_REVISION_PROMPTS, RECONCILIATION_REVISION_PROMPTS, COST_APPROACH_REVISION_PROMPTS, CERTIFICATION_REVISION_PROMPTS, ADDENDUM_GENERAL_REVISION_PROMPTS, FORM_1007_REVISION_PROMPTS } from '../tools/revisionPrompts';
import { useThemeContext } from '../../context/ThemeContext';
import Footer from '../pages/Footer';
import { useLocation } from 'react-router-dom';
import PdfPreview from '../common/PdfPreview';

const normalizeFullFileData = (raw) => {
  if (!raw) return {};

  let target = raw;
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch (e) {
      console.error("Error parsing stringified reportData in subject.js:", e);
    }
  }
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch (e) { }
  }

  if (!target || typeof target !== 'object') return {};

  if (target.data && typeof target.data === 'object' && !Array.isArray(target.data)) {
    target = { ...target.data, ...target };
    delete target.data;
  }

  const normalized = { ...target };

  if (!normalized.Subject || typeof normalized.Subject !== 'object') {
    normalized.Subject = raw.Subject || raw.SUBJECT || raw.clean_data?.Subject || raw.clean_data?.SUBJECT || {};
  }
  if (!normalized.SUBJECT || typeof normalized.SUBJECT !== 'object') {
    normalized.SUBJECT = normalized.Subject;
  }
  if (!normalized.SALES_GRID || typeof normalized.SALES_GRID !== 'object') {
    normalized.SALES_GRID = raw.SALES_GRID || raw['Sales Grid'] || raw.clean_data?.['Sales Grid'] || raw.clean_data?.SALES_GRID || {};
  }
  if (!normalized['Sales Grid'] || typeof normalized['Sales Grid'] !== 'object') {
    normalized['Sales Grid'] = normalized.SALES_GRID;
  }

  if (!normalized.CONTRACT || typeof normalized.CONTRACT !== 'object') {
    normalized.CONTRACT = raw.CONTRACT || raw.Contract || raw.contract || {};
  }
  if (!normalized.NEIGHBORHOOD || typeof normalized.NEIGHBORHOOD !== 'object') {
    normalized.NEIGHBORHOOD = raw.NEIGHBORHOOD || raw.Neighborhood || raw.neighborhood || {};
  }
  if (!normalized.SITE || typeof normalized.SITE !== 'object') {
    normalized.SITE = raw.SITE || raw.Site || raw.site || {};
  }
  if (!normalized.INFO_OF_SALES || typeof normalized.INFO_OF_SALES !== 'object') {
    normalized.INFO_OF_SALES = raw.INFO_OF_SALES || raw['Sales Comparison'] || raw.sales_comparison || {};
  }
  if (!normalized.PROJECT_INFO || typeof normalized.PROJECT_INFO !== 'object') {
    normalized.PROJECT_INFO = raw.PROJECT_INFO || raw['Project Information'] || raw.clean_data?.['Project Information'] || {};
  }
  if (!normalized['Project Information'] || typeof normalized['Project Information'] !== 'object') {
    normalized['Project Information'] = normalized.PROJECT_INFO;
  }
  if (!normalized.PROJECT_ANALYSIS || typeof normalized.PROJECT_ANALYSIS !== 'object') {
    normalized.PROJECT_ANALYSIS = raw.PROJECT_ANALYSIS || raw['Project Analysis'] || raw.clean_data?.['Project Analysis'] || {};
  }
  if (!normalized['Project Analysis'] || typeof normalized['Project Analysis'] !== 'object') {
    normalized['Project Analysis'] = normalized.PROJECT_ANALYSIS;
  }

  const sectionKeyMap = {
    CONTRACT: [
      "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
      "Contract Price $", "Contract Price", "Date of Contract",
      "Is property seller owner of public record?", "Data Source(s) (Contract)",
      "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
      "If Yes, report the total dollar amount and describe the items to be paid"
    ],
    NEIGHBORHOOD: [
      "Location", "Built-Up", "Growth", "Property Values", "Demand/Supply",
      "Marketing Time", "One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other",
      "Neighborhood Boundaries", "Neighborhood Description", "Market Conditions"
    ],
    SITE: [
      "Dimensions", "Area", "Shape", "View", "Zoning Compliance", "Zoning Description",
      "Specific Zoning Classification", "FEMA Special Flood Hazard Area", "FEMA Flood Zone",
      "FEMA Map #", "FEMA Map Date", "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley"
    ],
    INFO_OF_SALES: [
      "Sales Comparison Approach Indicated Value", "Data Source(s)", "Verification Source(s)"
    ]
  };

  Object.entries(sectionKeyMap).forEach(([sec, keys]) => {
    keys.forEach(k => {
      if (normalized[k] !== undefined && normalized[sec][k] === undefined) {
        normalized[sec][k] = normalized[k];
      }
      if (normalized[sec][k] !== undefined && normalized[k] === undefined) {
        normalized[k] = normalized[sec][k];
      }
    });
  });

  Object.keys(raw).forEach(secKey => {
    if (raw[secKey] && typeof raw[secKey] === 'object' && !Array.isArray(raw[secKey])) {
      // Sales Grid and Subject are two different sections - do not let Sales Grid's 'Subject' column overwrite root Subject
      if (secKey === 'Sales Grid' || secKey === 'SALES_GRID') {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (subKey.toLowerCase() !== 'subject' && normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
        });
      } else {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
        });
      }
    }
  });

  return normalized;
};

const TooltipStyles = () => (
  <GlobalStyles styles={{
    '.editable-field-container[style*="--tooltip-message"]': {
      position: 'relative',
      cursor: 'pointer',
    },
    '.editable-field-container[style*="--tooltip-message"]:hover::after': {
      content: 'var(--tooltip-message)',
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#864242ff',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      marginBottom: '5px',
    },
    '@keyframes eyeBlink': {
      '5%, 100%': { transform: 'scaleY(1)' },
      '50%': { transform: 'scaleY(0.2)' },
    },
    '.animated-eye': {
      animation: 'eyeBlink 3s infinite',
    },
  }} />
);

const ComparisonDialog = ({ open, onClose, data, onDataChange, pdfFile, htmlFile, setComparisonData }) => {


  const [result, setResult] = useState(null);

  const handleCompare = React.useCallback(async () => {

    setResult(null);

    const formData = new FormData();
    if (pdfFile) formData.append('pdf_file', pdfFile);
    if (htmlFile) formData.append('html_file', htmlFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/compare/`, { method: 'POST', body: formData });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'PDF-HTML comparison failed.');
      }
      const apiResult = await res.json();
      setComparisonData(prev => ({ ...prev, ...apiResult }));
    } catch (err) {

    } finally {

    }
  }, [pdfFile, htmlFile, setComparisonData]);

  useEffect(() => {
    if (open && !result) {
      handleCompare();
    }
  }, [open, result, handleCompare]);


};

const detectFormTypeFromXmlString = (xmlString) => {
  if (!xmlString) return null;
  try {
    const reportMatch = xmlString.match(/<REPORT\b([^>]*)/i);
    const reportAttrs = reportMatch ? reportMatch[1] : '';

    const formNameRegex = /<FORM\b[^>]*\bAppraisalReportContentName="([^"]+)"/gi;
    const formMatches = [];
    let match;
    while ((match = formNameRegex.exec(xmlString)) !== null) {
      formMatches.push(match[1]);
    }

    const formIdRegex = /<FORM\b[^>]*\bAppraisalReportContentIdentifier="([^"]+)"/gi;
    const formIdentifiers = [];
    while ((match = formIdRegex.exec(xmlString)) !== null) {
      formIdentifiers.push(match[1]);
    }

    const combined = (reportAttrs + ' ' + formMatches.join(' ') + ' ' + formIdentifiers.join(' ')).toUpperCase();
    const has1007 = [...formMatches, ...formIdentifiers].some(f =>
      /\b(?:1007|FNM\s*1007|FRE\s*1000|SRX)\b|SINGLE\s*FAMILY\s*(?:COMPARABLE\s*)?RENT/i.test(f)
    );

    if (combined.includes('1025') || combined.includes('SMALL RESIDENTIAL') || combined.includes('2-4 UNIT') || combined.includes('FRE72')) {
      return '1025';
    }
    if (combined.includes('1073') || combined.includes('CONDOMINIUM') || combined.includes('FRE465')) {
      return has1007 ? '1073 + 1007' : '1073';
    }
    if (combined.includes('1004C') || combined.includes('MANUFACTURED')) {
      return '1004C';
    }
    if (combined.includes('1004D')) {
      return '1004D';
    }
    if (combined.includes('2055')) {
      return '2055';
    }
    if (combined.includes('1075')) {
      return '1075';
    }
    if (combined.includes('2090')) {
      return '2090';
    }
    if (combined.includes('2095')) {
      return '2095';
    }
    if (combined.includes('203K')) {
      return '203k-FHA';
    }
    if (combined.includes('1004') || combined.includes('URAR') || combined.includes('FRE70')) {
      return has1007 ? '1004 + 1007' : '1004';
    }
    if (combined.includes('ERC') || combined.includes('ECR')) {
      return 'ERC';
    }
    if (combined.includes('1007') || combined.includes('RENT SCHEDULE')) {
      return '1007';
    }
    if (combined.includes('216')) {
      return '216';
    }
    if (combined.includes('1004MC') || combined.includes('MARKET CONDITIONS ADDENDUM')) {
      return '1004MC';
    }
    return '1004';
  } catch (e) {
    console.error('Error detecting XML form type:', e);
    return null;
  }
};

const normalizeExtractedFormType = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const upper = s.toUpperCase();
  if ((upper.includes('1004') && upper.includes('1007')) || upper === '1004 + 1007') return '1004 + 1007';
  if ((upper.includes('1025') && upper.includes('1007')) || upper === '1025 + 1007') return '1025 + 1007';
  if ((upper.includes('1073') && upper.includes('1007')) || upper === '1073 + 1007') return '1073 + 1007';
  if (upper.includes('1025') || upper.includes('SMALL RESIDENTIAL')) return '1025';
  if (upper.includes('1073') || upper.includes('465') || upper.includes('CONDOMINIUM')) return '1073';
  if (upper.includes('1004C') || upper.includes('MANUFACTURED')) return '1004C';
  if (upper.includes('1004D')) return '1004D';
  if (upper.includes('2055')) return '2055';
  if (upper.includes('1075')) return '1075';
  if (upper.includes('2090')) return '2090';
  if (upper.includes('2095')) return '2095';
  if (upper.includes('203K')) return '203k-FHA';
  if (upper.includes('1007')) return '1007';
  if (upper.includes('216')) return '216';
  if (upper.includes('1004MC')) return '1004MC';
  if (upper.includes('1004') || upper.includes('URAR') || upper.includes('FRE70')) return '1004';
  if (upper.includes('ERC') || upper.includes('ECR')) return 'ERC';
  if (upper.includes('VERSION 1') || upper.includes('VERSION #1')) return 'Appraisal Version #1';
  return s;
};

const getCleanDisplayJson = (data) => {
  if (!data || typeof data !== 'object') return {};
  const excludedGridKeys = new Set([
    'Sale Price', 'Proximity to Subject', 'Proximity to Subject comment', 'Sale Price/Gross Liv. Area', 'Sale Price/Gross Bldg. Area',
    'Gross Monthly Rent', 'Gross Rent Multiplier', 'Price Per Unit', 'Price Per Room', 'Price Per Bedroom',
    'Adj. Price Per Unit', 'Adj. Price Per Room', 'Adj. Price Per Bdrm.', 'Value Per Unit', 'Value Per Gross Bldg. Area',
    'Sales or Financing Concessions', 'Sales Concessions', 'Sales Concessions Adjustment',
    'Date of Sale/Time', 'Date of Sale/Time Adjustment', 'Location Adjustment',
    'Leasehold/Fee Simple Adjustment', 'Site Adjustment', 'View Adjustment',
    'Design (Style) Adjustment', 'Quality of Construction Adjustment', 'Actual Age Adjustment',
    'Condition Adjustment', 'Above Grade Room Count Adjustment', 'Gross Living Area Adjustment',
    'Basement & Finished Rooms Below Grade Adjustment', 'Functional Utility Adjustment',
    'Heating/Cooling Adjustment', 'Energy Efficient Items Adjustment', 'Garage/Carport Adjustment',
    'Porch/Patio/Deck Adjustment', 'Net Adjustment (Total)', 'Net Adj. (total)', 'Adjusted Sale Price'
  ]);

  if (data.clean_data && typeof data.clean_data === 'object' && Object.keys(data.clean_data).length > 0) {
    const cd = { ...data.clean_data };
    if (cd.Subject && typeof cd.Subject === 'object') {
      const cleanSubj = {};
      Object.keys(cd.Subject).forEach(k => {
        if (!excludedGridKeys.has(k)) {
          cleanSubj[k] = cd.Subject[k];
        }
      });
      cd.Subject = cleanSubj;
    }
    return cd;
  }
  const clean = {};
  const formType = data['Form Type'] || data.formType || data['From Type'] || data.selectedFormType;
  if (formType) clean['Form Type'] = formType;

  // 2. Subject Section (strictly Page 1 property identification & assignment info)
  const rawSubj = data.Subject || data.SUBJECT || {};
  if (rawSubj && typeof rawSubj === 'object' && Object.keys(rawSubj).length > 0) {
    const cleanSubj = {};
    Object.keys(rawSubj).forEach(k => {
      if (!excludedGridKeys.has(k)) {
        cleanSubj[k] = rawSubj[k];
      }
    });
    clean['Subject'] = cleanSubj;
  }

  // 3. Contract Section
  const contractObj = data.CONTRACT || data.Contract || {};
  if (contractObj && typeof contractObj === 'object' && Object.keys(contractObj).length > 0) {
    clean['Contract'] = contractObj;
  }

  // 4. Neighborhood Section
  const neighborhoodObj = data.NEIGHBORHOOD || data.Neighborhood || {};
  if (neighborhoodObj && typeof neighborhoodObj === 'object' && Object.keys(neighborhoodObj).length > 0) {
    clean['Neighborhood'] = neighborhoodObj;
  }

  // 5. Site Section
  const siteObj = data.SITE || data.Site || {};
  if (siteObj && typeof siteObj === 'object' && Object.keys(siteObj).length > 0) {
    clean['Site'] = siteObj;
  }

  // 6. Improvements Section
  const improvementsObj = data.IMPROVEMENTS || data.Improvements || {};
  if (improvementsObj && typeof improvementsObj === 'object' && Object.keys(improvementsObj).length > 0) {
    clean['Improvements'] = improvementsObj;
  }

  // 7. Sales Grid Section (Page 2 comparison grid: Subject column and Comps 1..N)
  const salesGridSource = data.clean_data?.['Sales Grid'] || data.clean_data?.['Sales Comparison'] || data['Sales Grid'] || data.SALES_GRID || data.SALES_COMPARISON || data['Sales Comparison'] || {};
  if (salesGridSource && typeof salesGridSource === 'object') {
    const cleanSalesGrid = {};
    if (salesGridSource['Subject'] && typeof salesGridSource['Subject'] === 'object') {
      cleanSalesGrid['Subject'] = salesGridSource['Subject'];
    }
    const compMap = new Map();
    Object.keys(salesGridSource).forEach(k => {
      const val = salesGridSource[k];
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && k.toLowerCase() !== 'subject') {
        const numMatch = k.match(/(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (!compMap.has(num)) compMap.set(num, val);
        }
      }
    });
    for (let i = 1; i <= 9; i++) {
      if (!compMap.has(i)) {
        const rootComp = data['COMPARABLE SALE #' + i] || data['Comparable Sale #' + i] || data['Comparable Sale ' + i] || data['Comp ' + i];
        if (rootComp && typeof rootComp === 'object' && !Array.isArray(rootComp)) {
          compMap.set(i, rootComp);
        }
      }
    }
    Array.from(compMap.keys()).sort((a, b) => a - b).forEach(num => {
      cleanSalesGrid['Comparable Sale ' + num] = compMap.get(num);
    });
    if (Object.keys(cleanSalesGrid).length > 0) {
      clean['Sales Grid'] = cleanSalesGrid;
    }
  }

  // 8. Reconciliation
  const reconciliationObj = data.RECONCILIATION || data.Reconciliation || {};
  if (reconciliationObj && typeof reconciliationObj === 'object' && Object.keys(reconciliationObj).length > 0) {
    clean['Reconciliation'] = reconciliationObj;
  }
  const sectionPairs = [
    ['COST_APPROACH', 'Cost Approach'],
    ['INCOME_APPROACH', 'Income Approach'],
    ['PUD_INFO', 'PUD Information'],
    ['PROJECT_INFO', 'Project Information'],
    ['PROJECT_ANALYSIS', 'Project Analysis'],
    ['MARKET_CONDITIONS', 'Market Conditions Addendum'],
    ['CONDO_COOP_PROJECTS', 'Condo / Coop Projects'],
    ['CONDO_FORECLOSURE', 'Condo Foreclosure'],
    ['SUBJECT_RENT_SCHEDULE', 'Subject Rent Schedule'],
    ['COMPARABLE_RENTAL_DATA', 'Comparable Rental Data'],
    ['CERTIFICATION', 'Certification'],
  ];
  sectionPairs.forEach(([secKey, label]) => {
    const obj = data[secKey] || data[label] || {};
    if (obj && typeof obj === 'object' && Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== '' && v !== null && v !== undefined)) {
      clean[label] = obj;
    }
  });
  if (Object.keys(clean).length > 1) return clean;
  return data;
};

function Subject({ defaultFormType }) {
  const isFieldValBlank = (val) => {
    if (val === undefined || val === null) return true;
    if (typeof val === 'object') {
      return Object.values(val).every(v => v === undefined || v === null || String(v).trim() === '');
    }
    return String(val).trim() === '';
  };

  const getFieldValueByPath = (allData, path) => {
    if (!path || !Array.isArray(path)) return '';
    let current = allData;
    for (const k of path) {
      if (current && typeof current === 'object') {
        current = current[k];
      } else {
        return '';
      }
    }
    if (current === undefined || current === null) return '';
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current);
  };

  const { themeMode, toggleTheme: handleThemeChange } = useThemeContext();
  const activeTheme = useTheme();
  const location = useLocation();
  const [data, setData] = useState({});
  const cleanDisplayJson = useMemo(() => getCleanDisplayJson(data), [data]);
  const [rawSectionFilter, setRawSectionFilter] = useState('ALL');
  const [rawSearchQuery, setRawSearchQuery] = useState('');

  const rawSectionOptions = useMemo(() => {
    if (!cleanDisplayJson || typeof cleanDisplayJson !== 'object') return [];
    return Object.keys(cleanDisplayJson).filter(k => k !== 'clean_data' && k !== 'Form Type');
  }, [cleanDisplayJson]);

  const filteredDisplayJson = useMemo(() => {
    if (!cleanDisplayJson || typeof cleanDisplayJson !== 'object') return {};

    // 1. Filter by section if not ALL
    let base = {};
    if (rawSectionFilter === 'ALL') {
      base = { ...cleanDisplayJson };
    } else if (cleanDisplayJson[rawSectionFilter] !== undefined) {
      base = { [rawSectionFilter]: cleanDisplayJson[rawSectionFilter] };
    } else {
      base = { ...cleanDisplayJson };
    }

    // 2. Filter by search query if provided
    const query = (rawSearchQuery || '').trim().toLowerCase();
    if (!query) {
      return base;
    }

    const filterObject = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        const filteredArray = obj
          .map(item => (typeof item === 'object' ? filterObject(item) : item))
          .filter(item => {
            if (item === null || item === undefined) return false;
            if (typeof item === 'object') return Object.keys(item).length > 0;
            return String(item).toLowerCase().includes(query);
          });
        return filteredArray.length > 0 ? filteredArray : null;
      }

      const filteredObj = {};
      Object.entries(obj).forEach(([k, v]) => {
        const keyMatches = k.toLowerCase().includes(query);
        if (v && typeof v === 'object') {
          const nested = filterObject(v);
          if (nested && Object.keys(nested).length > 0) {
            filteredObj[k] = nested;
          } else if (keyMatches) {
            filteredObj[k] = v;
          }
        } else if (keyMatches || (v !== null && v !== undefined && String(v).toLowerCase().includes(query))) {
          filteredObj[k] = v;
        }
      });
      return Object.keys(filteredObj).length > 0 ? filteredObj : null;
    };

    const result = filterObject(base);
    return result || {};
  }, [cleanDisplayJson, rawSectionFilter, rawSearchQuery]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [timer, setTimer] = useState(0);
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialFormType = useMemo(() => {
    if (defaultFormType) return defaultFormType;
    if (location.pathname === '/ecr' || location.pathname === '/erc') return 'ERC';
    return location.state?.formType || queryParams.get('formType') || '1004';
  }, [defaultFormType, location.pathname, location.state, queryParams]);
  const [selectedFormType, setSelectedFormType] = useState(initialFormType);

  useEffect(() => {
    if (initialFormType) {
      setSelectedFormType(initialFormType);
    }
  }, [initialFormType]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [extractionAttempted, setExtractionAttempted] = useState(false);
  const [lastExtractionTime, setLastExtractionTime] = useState(null);
  const timerRef = useRef(null);
  const isEditable = true;
  const htmlFileInputRef = useRef(null);
  const contractFileInputRef = useRef(null);
  const engagementLetterFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const xmlFileInputRef = useRef(null);
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlDetectedFormType, setXmlDetectedFormType] = useState(null);
  const [extractionSource, setExtractionSource] = useState('pdf'); // 'pdf' | 'xml'
  const [pdfExtractedData, setPdfExtractedData] = useState({});
  const [xmlExtractedData, setXmlExtractedData] = useState({});
  const [isPdfXmlDiffOpen, setIsPdfXmlDiffOpen] = useState(false);
  const [pdfXmlDiffResult, setPdfXmlDiffResult] = useState(null);
  const [pdfXmlDiffLoading, setPdfXmlDiffLoading] = useState(false);
  const [pdfXmlDiffError, setPdfXmlDiffError] = useState('');
  const sidebarLeaveTimerRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isComparisonDialogOpen, setIsComparisonDialogOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [promptAnalysisLoading, setPromptAnalysisLoading] = useState(false);
  const [promptAnalysisResponse, setPromptAnalysisResponse] = useState(null);
  const [promptAnalysisError, setPromptAnalysisError] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [fileUploadTimer, setFileUploadTimer] = useState(0);
  const [activeTimedFileName, setActiveTimedFileName] = useState('');
  const [fileReviewHistory, setFileReviewHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('reviewer_file_timers_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed['Active Document'];
        delete parsed[''];
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });
  const [timerHistoryAnchor, setTimerHistoryAnchor] = useState(null);

  // Tab-isolated timer refs (strictly private to this browser tab to prevent multi-tab interference)
  const tabStartTimeRef = useRef(null);
  const tabElapsedBaseRef = useRef(0);
  const tabPausedRef = useRef(false);
  const activeTimedFileRef = useRef('');
  const fileReviewHistoryRef = useRef({});
  const [stateReqLoading, setStateReqLoading] = useState(false);
  const [stateReqResponse, setStateReqResponse] = useState(null);
  const [stateReqError, setStateReqError] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [unpaidOkLoading, setUnpaidOkLoading] = useState(false);
  const [unpaidOkResponse, setUnpaidOkResponse] = useState(null);
  const [unpaidOkError, setUnpaidOkError] = useState('');
  const [clientReqLoading, setClientReqLoading] = useState(false);
  const [clientReqResponse, setClientReqResponse] = useState(null);
  const [clientReqError, setClientReqError] = useState('');
  const [fhaLoading, setFhaLoading] = useState(false);
  const [fhaResponse, setFhaResponse] = useState(null);
  const [fhaError, setFhaError] = useState('');
  const [ADULoading, setADULoading] = useState(false);
  const [ADUResponse, setADUResponse] = useState(null);
  const [ADUError, setADUError] = useState('');
  const [escalationLoading, setEscalationLoading] = useState(false);
  const [escalationResponse, setEscalationResponse] = useState(null);
  const [escalationError, setEscalationError] = useState('');
  const [extractedSections, setExtractedSections] = useState(new Set());
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [htmlFile, setHtmlFile] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [engagementLetterFile, setEngagementLetterFile] = useState(null);
  const [username, setUsername] = useState('');
  const [loadingSection, setLoadingSection] = useState(null);

  const [manualValidations, setManualValidations] = useState({});

  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const [isContractCompareOpen, setIsContractCompareOpen] = useState(false);
  const [contractCompareLoading, setContractCompareLoading] = useState(false);
  const [contractCompareResult, setContractCompareResult] = useState(null);
  const [contractCompareError, setContractCompareError] = useState('');

  const [isEngagementLetterDialogOpen, setIsEngagementLetterDialogOpen] = useState(false);
  const [engagementLetterCompareLoading, setEngagementLetterCompareLoading] = useState(false);
  const [engagementLetterCompareResult, setEngagementLetterCompareResult] = useState(null);
  const [engagementLetterCompareError, setEngagementLetterCompareError] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isHtmlReviewLoading, setIsHtmlReviewLoading] = useState(false);
  const [htmlExtractionTimer, setHtmlExtractionTimer] = useState(0);
  const htmlExtractionTimerRef = useRef(null);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isRentFormTypeMismatchDialogOpen, setIsRentFormTypeMismatchDialogOpen] = useState(false);
  const [isContractPriceRevisionLangDialogOpen, setContractPriceRevisionLangDialogOpen] = useState(false);
  const [isFinancialAssistanceRevisionLangDialogOpen, setFinancialAssistanceRevisionLangDialogOpen] = useState(false);
  const [isDateOfContractRevisionLangDialogOpen, setDateOfContractRevisionLangDialogOpen] = useState(false);
  const [isNeighborhoodBoundariesRevisionLangDialogOpen, setNeighborhoodBoundariesRevisionLangDialogOpen] = useState(false);
  const [isOtherLandUseRevisionLangDialogOpen, setOtherLandUseRevisionLangDialogOpen] = useState(false);
  const [isZoningComplianceRevisionLangDialogOpen, setZoningComplianceRevisionLangDialogOpen] = useState(false);
  const [isAreaRevisionLangDialogOpen, setAreaRevisionLangDialogOpen] = useState(false);

  const [isFemaHazardRevisionLangDialogOpen, setFemaHazardRevisionLangDialogOpen] = useState(false);
  const [isRevisionLangDialogOpen, setRevisionLangDialogOpen] = useState(false);
  const [isContractRevisionLangDialogOpen, setContractRevisionLangDialogOpen] = useState(false);
  const [isNeighborhoodRevisionLangDialogOpen, setNeighborhoodRevisionLangDialogOpen] = useState(false);
  const [isSiteRevisionLangDialogOpen, setSiteRevisionLangDialogOpen] = useState(false);
  const [isImprovementsRevisionLangDialogOpen, setImprovementsRevisionLangDialogOpen] = useState(false);
  const [isSalesGridRevisionLangDialogOpen, setSalesGridRevisionLangDialogOpen] = useState(false);
  const [isReconciliationRevisionLangDialogOpen, setReconciliationRevisionLangDialogOpen] = useState(false);
  const [isCostApproachRevisionLangDialogOpen, setCostApproachRevisionLangDialogOpen] = useState(false);
  const [isCertificationRevisionLangDialogOpen, setCertificationRevisionLangDialogOpen] = useState(false);
  const [isAddendumRevisionLangDialogOpen, setAddendumRevisionLangDialogOpen] = useState(false);
  const [isPropertyAddressRevisionLangDialogOpen, setPropertyAddressRevisionLangDialogOpen] = useState(false);
  const [isLenderClientRevisionLangDialogOpen, setLenderClientRevisionLangDialogOpen] = useState(false);
  const [isHoaRevisionLangDialogOpen, setHoaRevisionLangDialogOpen] = useState(false);
  const [isonewithAccessoryUnitRevisionLangDialogOpen, setOneWithAccessoryUnitRevisionLangDialogOpen] = useState(false);
  const [isLenderClientAddressRevisionLangDialogOpen, setLenderClientAddressRevisionLangDialogOpen] = useState(false);
  const [is1007RevisionLangDialogOpen, set1007RevisionLangDialogOpen] = useState(false);

  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isHtmlDataMinimized, setIsHtmlDataMinimized] = useState(false);
  const [isValidationSectionMinimized, setIsValidationSectionMinimized] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const lastParamFormTypeRef = useRef(queryParams.get('formType'));
  useEffect(() => {
    const fType = queryParams.get('formType');
    if (fType && fType !== lastParamFormTypeRef.current) {
      lastParamFormTypeRef.current = fType;
      setSelectedFormType(fType);
    }
  }, [queryParams]);

  useEffect(() => {
    if (location.state && location.state.reportData) {
      const { reportData, validationLog, fileName, pdfFile } = location.state;
      setData(normalizeFullFileData(reportData));

      let valLog = validationLog;
      if (typeof valLog === 'string') {
        try { valLog = JSON.parse(valLog); } catch (e) { }
      }
      if (typeof valLog === 'string') {
        try { valLog = JSON.parse(valLog); } catch (e) { }
      }
      if (!valLog || typeof valLog !== 'object') {
        valLog = reportData || {};
        if (typeof valLog === 'string') {
          try { valLog = JSON.parse(valLog); } catch (e) { }
        }
      }

      if (valLog && typeof valLog === 'object') {
        if (valLog.stateRequirementCheck) setStateReqResponse(valLog.stateRequirementCheck);
        if (valLog.clientRequirementCheck) setClientReqResponse(valLog.clientRequirementCheck);
        if (valLog.escalationCheck) setEscalationResponse(valLog.escalationCheck);
        if (valLog.promptAnalysis) setPromptAnalysisResponse(valLog.promptAnalysis);
        if (valLog.fhaCheck) setFhaResponse(valLog.fhaCheck);
        if (valLog.aduCheck) setADUResponse(valLog.aduCheck);
      }

      if (pdfFile) {
        setNotification({ open: true, message: 'Restoring PDF file...', severity: 'info' });
        fetch(pdfFile)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], fileName || 'restored.pdf', { type: 'application/pdf' });
            setSelectedFile(file);
            setNotification({ open: true, message: 'Report data and PDF loaded from history.', severity: 'success' });
          })
          .catch(err => {
            console.error("Error restoring PDF:", err);
            setNotification({ open: true, message: 'Report data loaded, but failed to restore PDF file.', severity: 'warning' });
            if (fileName) setSelectedFile({ name: fileName });
          });
      } else {
        if (fileName) {
          setSelectedFile({ name: fileName });
        }
        setNotification({ open: true, message: 'Report data loaded from history.', severity: 'success' });
      }

      if (reportData['From Type']) {
        setSelectedFormType(reportData['From Type']);
      }
    }
  }, [location.state]);



  const handleOpenNotepad = () => {
    if (!notes) {
      const now = new Date();
      const dateTimeString = now.toLocaleString();
      setNotes(`Date and Time: ${dateTimeString}\n\n`);
    }
    setIsNotepadOpen(true);
  };

  const unpaidLenderStatus = checkUnpaidLenderStatus(data);
  const isUnpaidOkLender = unpaidLenderStatus.isUnpaidOkLender;
  const unpaidLenderComment = unpaidLenderStatus.comment;
  const unpaidLenderName = unpaidLenderStatus.matchedLender;

  const eoVal = data?.['E&O'] ?? data?.['E&O Present'] ?? data?.CERTIFICATION?.['E&O'] ?? data?.CERTIFICATION?.['E&O Present'] ?? (data?.['E&O Insurance'] || data?.CERTIFICATION?.['E&O Insurance'] ? 'Present' : '') ?? 'Absent';
  const isEoPresent = String(eoVal).trim().toLowerCase() === 'present';

  const invVal = data?.['Invoice Attached'] ?? data?.['Invoice Present'] ?? data?.CERTIFICATION?.['Invoice Attached'] ?? data?.CERTIFICATION?.['Invoice Present'] ?? data?.SUBJECT?.['Invoice Attached'] ?? data?.Subject?.['Invoice Attached'] ?? (data?.INVOICE?.['Invoice Attached'] || data?.INVOICE ? 'Yes' : '') ?? 'No';
  const isInvoiceAttached = ['yes', 'true', 'attached', 'included', '1', 'present'].includes(String(invVal).trim().toLowerCase());

  const buildValidationRegistry = () => {
    const registry = {
      'LENDER/CLIENT Name': [
        appraiserLenderValidation.checkClientNameHtmlConsistency
      ],
      'Client Name': [
        appraiserLenderValidation.checkClientNameHtmlConsistency
      ],
      'Lender/Client Company Address': [
        htmlDataValidation.checkLenderAddressInconsistency,
        appraiserLenderValidation.checkLenderAddressInconsistency,
      ],
      'Client Address': [appraiserLenderValidation.checkClientAddressHtmlConsistency],
      'Borrower (and Co-Borrower)': [appraiserLenderValidation.checkBorrowerHtmlConsistency],

      // Site Validations
      'Zoning Compliance': [siteValidation.checkZoning],
      'Legal Nonconforming (Grandfathered Use) comment': [siteValidation.checkNonconformingComment],
      'Legal Nonconforming comment': [siteValidation.checkNonconformingComment],
      'Nonconforming comment': [siteValidation.checkNonconformingComment],
      'Zoning Compliance comment': [siteValidation.checkNonconformingComment],
      'Zoning Description': [siteValidation.checkZoningDescription],
      'Specific Zoning Classification': [siteValidation.checkSpecificZoningClassification, neighborhoodValidation.checkSpecificZoningClassification],
      'Zoning Classification Description': [version1Validation.checkZoningClassificationDescription],
      'Classification Code Description': [version1Validation.checkZoningClassificationDescription],
      'Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?': [siteValidation.checkHighestAndBestUse],
      'FEMA Special Flood Hazard Area': [siteValidation.checkFemaInconsistency, siteValidation.checkFemaFieldsConsistency],
      'FEMA Flood Zone': [siteValidation.checkFemaInconsistency, siteValidation.checkFemaFieldsConsistency],
      'FEMA Map #': [siteValidation.checkFemaInconsistency, siteValidation.checkFemaFieldsConsistency],
      'FEMA Map Date': [siteValidation.checkFemaInconsistency, siteValidation.checkFemaFieldsConsistency],
      'Dimensions': [siteValidation.checkSiteSectionBlank],
      'Shape': [siteValidation.checkSiteSectionBlank],
      'View': [siteValidation.checkSiteSectionBlank, salesComparisonValidation.checkViewAdjustment], 'View Adjustment': [salesComparisonValidation.checkViewAdjustment],
      'Area': [siteValidation.checkArea],
      'Are the utilities and off-site improvements typical for the market area? If No, describe': [(field, text, data) => siteValidation.checkYesNoWithComment(field, text, data, { name: 'Are the utilities and off-site improvements typical for the market area? If No, describe', wantedValue: 'yes', unwantedValue: 'no' })],
      'Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe': [(field, text, data) => siteValidation.checkYesNoWithComment(field, text, data, { name: 'Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe', wantedValue: 'no', unwantedValue: 'yes' })],
      "Electricity": [siteValidation.checkUtilities], "Gas": [siteValidation.checkUtilities], "Water": [siteValidation.checkUtilities], "Sanitary Sewer": [siteValidation.checkUtilities], "Street": [siteValidation.checkUtilities], "Alley": [siteValidation.checkUtilities],

      'Electricity Detail': [version1Validation.checkVersion1UtilitySubfields],
      'Electricity Private Utility Impact': [version1Validation.checkVersion1UtilitySubfields],
      'Electricity Comment': [version1Validation.checkVersion1UtilitySubfields],
      'Sanitary Sewer Detail': [version1Validation.checkVersion1UtilitySubfields],
      'Sanitary Sewer Private Utility Impact': [version1Validation.checkVersion1UtilitySubfields],
      'Sanitary Sewer Comment': [version1Validation.checkVersion1UtilitySubfields],
      'Water Detail': [version1Validation.checkVersion1UtilitySubfields],
      'Water Private Utility Impact': [version1Validation.checkVersion1UtilitySubfields],
      'Water Comment': [version1Validation.checkVersion1UtilitySubfields],
      'Total Site Size': [version1Validation.checkSiteSizesConsistency],
      'Parcel Size': [version1Validation.checkSiteSizesConsistency],
      'Site Size': [version1Validation.checkSiteSizesConsistency, version1Validation.checkVersion1SiteSizeAdjustmentConsistency],
      'Site Size Adjustment': [version1Validation.checkVersion1SiteSizeAdjustmentConsistency],
      'Above Grade Finished Area': [version1Validation.checkAboveGradeFinishedAreaConsistency],
      'Finished Area Above Grade': [version1Validation.checkAboveGradeFinishedAreaConsistency, version1Validation.checkVersion1AreaAdjustmentConsistency],
      'Finished Area Above Grade Adjustment': [version1Validation.checkVersion1AreaAdjustmentConsistency],
      'Finished Area Below Grade': [version1Validation.checkVersion1AreaAdjustmentConsistency],
      'Finished Area Below Grade Adjustment': [version1Validation.checkVersion1AreaAdjustmentConsistency],
      'Unfinished Area Below Grade': [version1Validation.checkVersion1AreaAdjustmentConsistency],
      'Unfinished Area Below Grade Adjustment': [version1Validation.checkVersion1AreaAdjustmentConsistency],

      'Full Address': [subjectValidation.checkFullAddressConsistency, subjectValidation.checkSubjectFieldsNotBlank],
      'Exposure comment': [subjectValidation.checkPresence],
      'Prior service comment': [subjectValidation.checkPresence],
      'ADU File Check': [subjectValidation.checkPresence],
      'FHA Case No.': [subjectValidation.checkFhaCaseNo],
      'FHA Case #': [subjectValidation.checkFhaCaseNo],
      'FHA Case Number': [subjectValidation.checkFhaCaseNo],
      'Tax Year': [subjectValidation.checkTaxYear],
      'R.E. Taxes $': [subjectValidation.checkRETaxes],
      'Special Assessments $': [subjectValidation.checkSpecialAssessments],
      'PUD': [subjectValidation.checkPUD, subjectValidation.checkHOA],
      'HOA $': [subjectValidation.checkHOA],
      'Offered for Sale in Last 12 Months': [subjectValidation.checkOfferedForSale],
      'ANSI': [subjectValidation.checkAnsi],
      'Property Address': [subjectValidation.checkSubjectFieldsNotBlank, salesComparisonValidation.checkSubjectAddressInconsistency],
      'County': [subjectValidation.checkSubjectFieldsNotBlank],
      'Borrower': [subjectValidation.checkSubjectFieldsNotBlank, htmlDataValidation.checkBorrowerNameVsHtml],
      'Owner of Public Record': [subjectValidation.checkSubjectFieldsNotBlank],
      'Legal Description': [subjectValidation.checkSubjectFieldsNotBlank],
      "Assessor's Parcel #": [subjectValidation.checkSubjectFieldsNotBlank],
      'Neighborhood Name': [subjectValidation.checkSubjectFieldsNotBlank],
      'Map Reference': [subjectValidation.checkSubjectFieldsNotBlank],
      'Census Tract': [subjectValidation.checkSubjectFieldsNotBlank, subjectValidation.checkCensusTract],
      'Occupant': [subjectValidation.checkSubjectFieldsNotBlank, subjectValidation.checkOccupancy],
      'Occupancy': [subjectValidation.checkOccupancy],
      'Property Rights Appraised': [subjectValidation.checkSubjectFieldsNotBlank, subjectValidation.checkPropertyRightsInconsistency],
      'Lender/Client': [subjectValidation.checkSubjectFieldsNotBlank, appraiserLenderValidation.checkLenderNameInconsistency, htmlDataValidation.checkSubjectLenderNameVsHtml],
      'Address (Lender/Client)': [subjectValidation.checkSubjectFieldsNotBlank, htmlDataValidation.checkLenderAddressInconsistency, appraiserLenderValidation.checkLenderAddressInconsistency],

      'one unit housing price(high,low,pred)': [neighborhoodValidation.checkHousingPriceAndAge, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'one unit housing age(high,low,pred)': [neighborhoodValidation.checkHousingPriceAndAge, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "One-Unit": [neighborhoodValidation.checkNeighborhoodUsageConsistency, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "2-4 Unit": [neighborhoodValidation.checkNeighborhoodUsageConsistency, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Multi-Family": [neighborhoodValidation.checkNeighborhoodUsageConsistency, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],

      "Commercial": [neighborhoodValidation.checkNeighborhoodUsageConsistency, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Other": [neighborhoodValidation.checkOtherLandUseComment, neighborhoodValidation.checkNeighborhoodUsageConsistency, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Present Land Use for other": [neighborhoodValidation.checkOtherLandUse],
      "Neighborhood Boundaries": [neighborhoodValidation.checkNeighborhoodBoundaries, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Built-Up": [neighborhoodValidation.checkSingleChoiceFields, neighborhoodValidation.checkNeighborhoodFieldsNotBlank], "Growth": [neighborhoodValidation.checkSingleChoiceFields, neighborhoodValidation.checkNeighborhoodFieldsNotBlank], "Property Values": [neighborhoodValidation.checkSingleChoiceFields, neighborhoodValidation.checkNeighborhoodFieldsNotBlank], "Demand/Supply": [neighborhoodValidation.checkSingleChoiceFields, neighborhoodValidation.checkNeighborhoodFieldsNotBlank], "Marketing Time": [neighborhoodValidation.checkSingleChoiceFields, neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Neighborhood Description": [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      "Market Conditions:": [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Legally Permissible': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Physically Possible': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Financially Feasible': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Maximally Productive': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Highest and Best Use as Improved (Present Use)': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Highest and Best Use Commentary': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Market Area Boundary': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Active Listings': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Median Days on Market': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Lowest List Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodListPricesConsistency],
      'Median List Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodListPricesConsistency],
      'Highest List Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodListPricesConsistency],
      'Pending Sales': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Sales in Past 12 Months': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Lowest Sale Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodSalePricesConsistency],
      'Median Sale Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodSalePricesConsistency],
      'Highest Sale Price': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkNeighborhoodSalePricesConsistency],
      'Distressed Market Competition': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Price Trend Source': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Demand / Supply': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkSingleChoiceFields],
      'Market Commentary': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Search Criteria Description': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank, neighborhoodValidation.checkSearchCriteriaDescription],
      'Price Trend Analysis Commentary': [neighborhoodValidation.checkNeighborhoodFieldsNotBlank],
      'Listing Status': [version1Validation.checkVersion1ComparableListingStatusConsistency],
      'Transfer Terms': [version1Validation.checkVersion1ComparableTransferTermsConsistency],
      'Site Influence (Location)': [version1Validation.checkVersion1LocationAdjustmentConsistency],
      'Attached / Detached': [version1Validation.checkVersion1AttachedDetachedAdjustmentConsistency],
      'Attached / Detached Adjustment': [version1Validation.checkVersion1AttachedDetachedAdjustmentConsistency],
      'Heating': [version1Validation.checkVersion1HeatingAdjustmentConsistency],
      'Heating Adjustment': [version1Validation.checkVersion1HeatingAdjustmentConsistency],
      'Amenities': [version1Validation.checkVersion1AmenitiesAdjustmentConsistency],
      'Amenities Adjustment': [version1Validation.checkVersion1AmenitiesAdjustmentConsistency],

      'Units': [improvementsValidation.checkUnits, improvementsValidation.checkAccessoryUnit],
      '# of Stories': [improvementsValidation.checkNumberOfStories],
      'Type': [improvementsValidation.checkPropertyType],
      'Existing/Proposed/Under Const.': [improvementsValidation.checkConstructionStatusAndReconciliation],
      'Design (Style)': [improvementsValidation.checkDesignStyle, improvementsValidation.checkSubjectDesignStyleConsistency, salesComparisonValidation.checkDesignStyleAdjustment],
      'Year Built': [improvementsValidation.checkYearBuilt, version1Validation.checkYearBuiltConsistency, version1Validation.checkVersion1YearBuiltAdjustmentConsistency],
      'Year Built Adjustment': [version1Validation.checkVersion1YearBuiltAdjustmentConsistency],
      'Construction Method': [version1Validation.checkVersion1ConstructionMethodAdjustmentConsistency],
      'Construction Method Adjustment': [version1Validation.checkVersion1ConstructionMethodAdjustmentConsistency],
      'Effective Age (Yrs)': [improvementsValidation.checkEffectiveAge],
      'Additional features': [improvementsValidation.checkAdditionalFeatures],
      'Describe the condition of the property': [improvementsValidation.checkPropertyConditionDescription],
      'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe': [improvementsValidation.checkPhysicalDeficienciesImprovements],
      'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe': [improvementsValidation.checkNeighborhoodConformity],
      'Foundation Type': [improvementsValidation.checkFoundationType],
      'Basement Area sq.ft.': [improvementsValidation.checkBasementDetails],
      'Basement Finish %': [improvementsValidation.checkBasementDetails],
      'Infestation': [improvementsValidation.checkEvidenceOf], 'Dampness': [improvementsValidation.checkEvidenceOf], 'Settlement': [improvementsValidation.checkEvidenceOf],
      'Foundation Walls (Material/Condition)': [improvementsValidation.checkMaterialCondition], 'Exterior Walls (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Roof Surface (Material/Condition)': [improvementsValidation.checkMaterialCondition], 'Gutters & Downspouts (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Window Type (Material/Condition)': [improvementsValidation.checkMaterialCondition], 'Floors (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Walls (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Appraiser Name': [version1Validation.checkAppraiserNameConsistency],
      'Trim/Finish (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Bath Floor (Material/Condition)': [improvementsValidation.checkMaterialCondition], 'Bath Wainscot (Material/Condition)': [improvementsValidation.checkMaterialCondition],
      'Fuel': [improvementsValidation.checkHeatingFuel, improvementsValidation.checkImprovementsFieldsNotBlank],
      'Car Storage': [improvementsValidation.checkCarStorage, improvementsValidation.checkImprovementsFieldsNotBlank],
      'Amenity Category': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Subject Property Amenity': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Amenity Material': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Amenity Detail': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Subject Property Amenities Exhibits': [improvementsValidation.checkImprovementsFieldsNotBlank],
      'Overall Quality': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1OverallQualityConditionAdjustmentConsistency],
      'Overall Quality Adjustment': [version1Validation.checkVersion1OverallQualityConditionAdjustmentConsistency],
      'Exterior Quality': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1QualityConditionConsistency],
      'Interior Quality': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1QualityConditionConsistency],
      'Exterior Condition': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1QualityConditionConsistency],
      'Interior Condition': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1QualityConditionConsistency],
      'Overall Condition': [improvementsValidation.checkImprovementsFieldsNotBlank, version1Validation.checkVersion1OverallQualityConditionAdjustmentConsistency],
      'Overall Condition Adjustment': [version1Validation.checkVersion1OverallQualityConditionAdjustmentConsistency],
      'Vehicle Storage Type': [version1Validation.checkVersion1VehicleStorageAdjustmentConsistency],
      'Vehicle Storage Spaces': [version1Validation.checkVersion1VehicleStorageAdjustmentConsistency],
      'Vehicle Storage Adjustment': [version1Validation.checkVersion1VehicleStorageAdjustmentConsistency],

      'Address': [salesComparisonValidation.checkSubjectAddressInconsistency],
      'Condition': [salesComparisonValidation.checkConditionAdjustment], 'Condition Adjustment': [salesComparisonValidation.checkConditionAdjustment],
      'Bedrooms': [salesComparisonValidation.checkBedroomsAdjustment], 'Bedrooms Adjustment': [salesComparisonValidation.checkBedroomsAdjustment],
      'Baths': [salesComparisonValidation.checkBathsAdjustment], 'Baths Adjustment': [salesComparisonValidation.checkBathsAdjustment],
      'Quality of Construction': [salesComparisonValidation.checkQualityOfConstructionAdjustment], 'Quality of Construction Adjustment': [salesComparisonValidation.checkQualityOfConstructionAdjustment],
      'Proximity to Subject': [salesComparisonValidation.checkProximityToSubject],
      'Site': [salesComparisonValidation.checkSiteAdjustment, version1Validation.checkSiteSizesConsistency], 'Site Adjustment': [salesComparisonValidation.checkSiteAdjustment],
      'Gross Living Area': [salesComparisonValidation.checkGrossLivingAreaAdjustment], 'Gross Living Area Adjustment': [salesComparisonValidation.checkGrossLivingAreaAdjustment],
      'Design (Style) Adjustment': [salesComparisonValidation.checkDesignStyleAdjustment],
      'Functional Utility': [salesComparisonValidation.checkFunctionalUtilityAdjustment], 'Functional Utility Adjustment': [salesComparisonValidation.checkFunctionalUtilityAdjustment],
      'Energy Efficient Items': [salesComparisonValidation.checkEnergyEfficientItemsAdjustment], 'Energy Efficient Items Adjustment': [salesComparisonValidation.checkEnergyEfficientItemsAdjustment],
      'Porch/Patio/Deck': [salesComparisonValidation.checkPorchPatioDeckAdjustment], 'Porch/Patio/Deck Adjustment': [salesComparisonValidation.checkPorchPatioDeckAdjustment],
      'Heating/Cooling': [salesComparisonValidation.checkHeatingCoolingAdjustment], 'Heating/Cooling Adjustment': [salesComparisonValidation.checkHeatingCoolingAdjustment],
      'Data Source(s)': [salesComparisonValidation.checkDataSourceDOM],
      'Actual Age': [salesComparisonValidation.checkActualAgeAdjustment, salesComparisonValidation.checkSubjectAgeConsistency], 'Actual Age Adjustment': [salesComparisonValidation.checkActualAgeAdjustment],
      'Sale Price': [salesComparisonValidation.checkSalePrice],
      'Leasehold/Fee Simple': [salesComparisonValidation.checkLeaseholdFeeSimpleConsistency], 'Leasehold/Fee Simple Adjustment': [salesComparisonValidation.checkLeaseholdFeeSimpleConsistency],
      'Date of Sale/Time': [salesComparisonValidation.checkDateOfSale],
      'Location': [salesComparisonValidation.checkLocationConsistency, neighborhoodValidation.checkLocation, neighborhoodValidation.checkNeighborhoodFieldsNotBlank, version1Validation.checkVersion1LocationAdjustmentConsistency],
      'Location Adjustment': [salesComparisonValidation.checkLocationConsistency, version1Validation.checkVersion1LocationAdjustmentConsistency],

      'Indicated Value by Sales Comparison Approach $': [reconciliationValidation.checkFinalValueConsistency],
      'Indicated Value by: Sales Comparison Approach $': [reconciliationValidation.checkFinalValueConsistency, reconciliationValidation.checkCostApproachDeveloped],
      'opinion of the market value, as defined, of the real property that is the subject of this report is $': [reconciliationValidation.checkFinalValueConsistency],
      'APPRAISED VALUE OF SUBJECT PROPERTY $': [reconciliationValidation.checkFinalValueConsistency],
      'Cost Approach (if developed)': [reconciliationValidation.checkCostApproachDeveloped, form1004And1007Validation.checkCostApproachMatchConsistency],
      'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:': [reconciliationValidation.checkAppraisalCondition],
      'as of': [reconciliationValidation.checkAsOfDate, form1004And1007Validation.checkRentScheduleAsOfDateConsistency],
      'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': [form1004And1007Validation.checkRentScheduleAsOfDateConsistency],
      'TO BE $': [form1004And1007Validation.checkRentScheduleToBeAmountConsistency],
      'final value': [reconciliationValidation.checkFinalValueBracketing, reconciliationValidation.checkReconciliationFieldsNotBlank, reconciliationValidation.checkFinalValueConsistency],
      'Supervisory Signature': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Signature': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Name': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Name': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Company Name': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Company Name': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Company Address': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Company Address': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Telephone Number': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Telephone Number': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Phone': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Email Address': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Email Address': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Email': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Date of Signature': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Date of Signature': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory State Certification #': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser State Certification #': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory or State License #': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser or State License #': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser State License #': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory State': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser State': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Expiration Date of Certification or License': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Expiration Date': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Expiration Date': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Supervisory Appraiser Expiration Date of Certification or License': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Did not inspect subject property': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Did inspect exterior of subject property from street': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Subject Property Date of Inspection (Exterior)': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Did inspect interior and exterior of subject property': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Subject Property Date of Inspection (Interior/Exterior)': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Did not inspect exterior of comparable sales from street': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Did inspect exterior of comparable sales from street': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Comparable Sales Date of Inspection': [appraiserLenderValidation.checkSupervisoryAppraiserFields],
      'Appraiser License': [appraiserLenderValidation.checkAppraiserFieldsNotBlank],
      'E&O': [appraiserLenderValidation.checkAppraiserFieldsNotBlank],
      'E&O Present': [appraiserLenderValidation.checkAppraiserFieldsNotBlank],
      'E&O Insurance': [appraiserLenderValidation.checkAppraiserFieldsNotBlank],
      'Policy Period From': [appraiserLenderValidation.checkAppraiserFieldsNotBlank],
      'Policy Period To': [appraiserLenderValidation.checkAppraiserFieldsNotBlank, appraiserLenderValidation.checkDateGreaterThanToday],
      'License Valid To': [appraiserLenderValidation.checkAppraiserFieldsNotBlank, appraiserLenderValidation.checkDateGreaterThanToday],
      'License Vaild To': [appraiserLenderValidation.checkAppraiserFieldsNotBlank, appraiserLenderValidation.checkDateGreaterThanToday],
      'LICENSE/REGISTRATION/CERTIFICATION #': [appraiserLenderValidation.checkAppraiserFieldsNotBlank, appraiserLenderValidation.checkLicenseNumberConsistency],
      'State Certification #': [appraiserLenderValidation.checkAppraiserLicenseGroup],
      'or State License #': [appraiserLenderValidation.checkAppraiserLicenseGroup],
      'or Other (describe)': [appraiserLenderValidation.checkAppraiserLicenseGroup],
      'State #': [appraiserLenderValidation.checkAppraiserLicenseGroup],
      'Assignment Type': [subjectValidation.checkAssignmentTypeConsistency],

      "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency],
      "Contract Price $": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency],
      "Date of Contract": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency],
      "Is property seller owner of public record?": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency, (field, text, data) => contractValidation.checkYesNoOnly(field, text, data, { name: 'Is property seller owner of public record?' })],
      "Data Source(s) (Contract)": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency],
      "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?": [contractValidation.checkContractFieldsMandatory, contractValidation.checkContractAnalysisConsistency, (field, text, data) => contractValidation.checkYesNoOnly(field, text, data, { name: 'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?' }), contractValidation.checkFinancialAssistanceInconsistency],
      "If Yes, report the total dollar amount and describe the items to be paid": [contractValidation.checkContractFieldsMandatory, contractValidation.checkFinancialAssistanceInconsistency, contractValidation.checkContractAnalysisConsistency],
      'Date Lease Begins': [rentScheduleValidation.checkLeaseDates],
      'Date Lease Expires': [rentScheduleValidation.checkLeaseDates],
      'Monthly Rental': [rentScheduleValidation.checkSubjectMonthlyRental],
      'Less: Utilities': [rentScheduleValidation.checkSubjectUtilities],
      'Furniture': [rentScheduleValidation.checkSubjectFurniture],
      'Adjusted Monthly Rent': [rentScheduleValidation.checkSubjectAdjustedMonthlyRent],
      'Other (e.g., basement, etc.)': [rentScheduleValidation.checkOtherBasement],
      'Design and Appeal': [rentScheduleValidation.checkRentSubjectDesignStyleConsistency, rentScheduleValidation.checkRentDesignAppealAdjustment],
      'Design and Appeal Adjustment': [rentScheduleValidation.checkRentDesignAppealAdjustment],
      'Design & Appeal': [rentScheduleValidation.checkRentSubjectDesignStyleConsistency, rentScheduleValidation.checkRentDesignAppealAdjustment],
      'Design & Appeal Adjustment': [rentScheduleValidation.checkRentDesignAppealAdjustment],
    };

    marketConditionsFields.forEach(field => {
      registry[field] = [marketConditionsValidation.checkMarketConditionsFieldsNotBlank];
    });

    const timeframes = ["Prior 7-12 Months", "Prior 4-6 Months", "Current-3 Months", "Overall Trend"];
    marketConditionsRows.forEach(row => {
      timeframes.forEach(tf => {
        const fieldName = `${row.fullLabel} (${tf})`;
        registry[fieldName] = [marketConditionsValidation.checkMarketConditionsTableFields];
      });
    });

    condoForeclosureFields.forEach(field => {
      registry[field] = [form1073Validation.checkCondoForeclosureFieldsNotBlank];
    });

    const condoTimeframes = ["Prior 7–12 Months", "Prior 4–6 Months", "Current – 3 Months", "Overall Trend"];
    condoCoopProjectsRows.forEach(row => {
      condoTimeframes.forEach(tf => {
        const fieldName = `${row.fullLabel} (${tf})`;
        registry[fieldName] = [form1073Validation.checkCondoCoopProjectsTableFields];
      });
    });

    pudInformationFields.forEach(field => {
      registry[field] = [
        pudInformationValidation.checkPudInformationFieldsNotBlank,
        pudInformationValidation.checkPudControlAndFees
      ];
    });

    unitDescriptionsFields.forEach(field => {
      registry[field] = [unitDescriptionsValidation.checkUnitDescriptionsFieldsNotBlank];
    });

    projectAnalysisFields.forEach(field => {
      registry[field] = [projectAnalysisValidation.checkProjectAnalysisFieldsNotBlank];
    });

    projectSiteFields.forEach(field => {
      registry[field] = [projectSiteValidation.checkProjectSiteFieldsNotBlank];
    });

    incomeApproachFields.forEach(field => {
      const validators = [incomeApproachValidation.checkIncomeApproachFieldsNotBlank];
      if (incomeApproachValidation.INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(field)) {
        validators.push((f, text, allData, path, saleName) =>
          incomeApproachValidation.checkIncomeApproach1007Required(f, text, allData, path, saleName, selectedFormType)
        );
      }
      registry[field] = validators;
    });

    priorSaleHistoryFields.forEach(field => {
      registry[field] = [priorSaleHistoryValidation.checkPriorSaleHistoryFieldsNotBlank];
    });

    infoOfSalesFields.forEach(field => {
      registry[field] = [infoOfSalesValidation.checkInfoOfSalesFieldsNotBlank];
    });

    projectInfoFields.forEach(field => {
      registry[field] = [form1073Validation.checkProjectInfoFieldsNotBlank];
    });

    reconciliationFields.forEach(field => {
      if (!registry[field]) registry[field] = [];
      registry[field].push(reconciliationValidation.checkReconciliationFieldsNotBlank);
    });

    if (!registry['Estimated Monthly Market Rent $']) registry['Estimated Monthly Market Rent $'] = [];
    registry['Estimated Monthly Market Rent $'].push(form1004And1007Validation.checkRentScheduleToBeAmountConsistency);

    if (!registry['Indicated Value by Income Approach']) registry['Indicated Value by Income Approach'] = [];
    registry['Indicated Value by Income Approach'].push(form1004And1007Validation.checkIncomeApproachIndicatedValueConsistency);

    if (!registry['Income Approach (if developed) $']) registry['Income Approach (if developed) $'] = [];
    registry['Income Approach (if developed) $'].push(form1004And1007Validation.checkIncomeApproachIndicatedValueConsistency);

    if (!registry['Cost Approach (if developed)']) registry['Cost Approach (if developed)'] = [];
    registry['Cost Approach (if developed)'].push(form1004And1007Validation.checkCostApproachMatchConsistency);

    if (!registry['Cost Approach (if developed) $']) registry['Cost Approach (if developed) $'] = [];
    registry['Cost Approach (if developed) $'].push(form1004And1007Validation.checkCostApproachMatchConsistency);

    if (!registry['Indicated Value By Cost Approach......................................................=$']) registry['Indicated Value By Cost Approach......................................................=$'] = [];
    registry['Indicated Value By Cost Approach......................................................=$'].push(form1004And1007Validation.checkCostApproachMatchConsistency);

    if (!registry['Indicated Value by Cost Approach']) registry['Indicated Value by Cost Approach'] = [];
    registry['Indicated Value by Cost Approach'].push(form1004And1007Validation.checkCostApproachMatchConsistency);

    if (!registry['I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF']) registry['I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF'] = [];
    registry['I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF'].push(form1004And1007Validation.checkRentScheduleAsOfDateConsistency);

    if (!registry['TO BE $']) registry['TO BE $'] = [];
    registry['TO BE $'].push(form1004And1007Validation.checkRentScheduleToBeAmountConsistency);

    if (!registry['as of']) registry['as of'] = [];
    registry['as of'].push(form1004And1007Validation.checkRentScheduleAsOfDateConsistency);

    const checkFields = [
      'Sales Comparison Approach Indicated Value',
      'Opinion of Market Value',
      'Median Sale Price',
      'Indicated Value by Sales Comparison Approach',
      'Indicated Value by Sales Comparison Approach $',
      'Indicated Value by Sales Comparison Approach Indicated'
    ];
    checkFields.forEach(field => {
      if (!registry[field]) registry[field] = [];
      registry[field].push(reconciliationValidation.checkFiveValuesConsistency);
    });


    const dateCheckFields = [
      'Effective Date of Appraisal',
      'Inspection Date',
      'Effective Date'
    ];
    dateCheckFields.forEach(field => {
      if (!registry[field]) registry[field] = [];
      registry[field].push(reconciliationValidation.checkEffectiveDatesConsistency);
      if (selectedFormType === 'Appraisal Version #1' || selectedFormType === 'Version 1' || selectedFormType === 'Version1') {
        registry[field].push(version1Validation.checkVersion1EffectiveDatesConsistency);
      }
    });

    if (selectedFormType === 'Appraisal Version #1' || selectedFormType === 'Version 1' || selectedFormType === 'Version1') {
      const qualityCheckFields = [
        'Overall Quality',
        'Exterior Quality',
        'Interior Quality',
        'Exterior Quality Rating',
        'Interior Quality Rating'
      ];
      qualityCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkPropertyQualityConsistency);
      });

      const conditionCheckFields = [
        'Overall Condition',
        'Exterior Condition',
        'Interior Condition',
        'Exterior Condition Rating',
        'Interior Condition Rating'
      ];
      conditionCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkPropertyConditionConsistency);
      });

      const hbuCheckFields = [
        'Highest and Best Use as Improved (Present Use)',
        'Legally Permissible',
        'Physically Possible',
        'Financially Feasible',
        'Maximally Productive'
      ];
      hbuCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkHbuConsistency);
      });

      const costApproachCheckFields = [
        'Indicated Value by Cost Approach',
        'Cost Approach Indicated Value'
      ];
      costApproachCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkCostApproachConsistency);
      });

      const attachmentCheckFields = [
        'Attachment Type',
        'Attached / Detached'
      ];
      attachmentCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkAttachmentTypeConsistency);
      });

      const propertyRightsCheckFields = [
        'Property Rights Appraised'
      ];
      propertyRightsCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkPropertyRightsConsistency);
      });

      const credentialLevelCheckFields = [
        'Appraiser Credential Level'
      ];
      credentialLevelCheckFields.forEach(field => {
        if (!registry[field]) registry[field] = [];
        registry[field].push(reconciliationValidation.checkAppraiserCredentialLevelConsistency);
      });
    }

    const opinionOfSiteFields = [
      "OPINION OF SITE VALUE = $ ................................................",
      "OPINION OF SITE VALUE",
      "Opinion of Site Value",
      "Opinion of Site Value $",
      "OPINION OF SITE VALUE $"
    ];
    opinionOfSiteFields.forEach(f => {
      registry[f] = [costApproachValidation.checkOpinionOfSiteValue];
    });

    const remainingEconomicLifeFields = [
      "Estimated Remaining Economic Life (HUD and VA only)",
      "Remaining Economic Life",
      "Estimated Remaining Economic Life",
      "Estimated Remaining Economic Life Years"
    ];
    remainingEconomicLifeFields.forEach(f => {
      registry[f] = [costApproachValidation.checkRemainingEconomicLife];
    });

    return registry;
  };

  const rentScheduleValidationRegistry = {
    'Proximity to Subject': [rentScheduleValidation.checkRentProximityToSubject],
    'Date Lease Begins': [rentScheduleValidation.checkLeaseDates],
    'Date Lease Expires': [rentScheduleValidation.checkLeaseDates],
    'Monthly Rental': [rentScheduleValidation.checkSubjectMonthlyRental],
    'Less: Utilities': [rentScheduleValidation.checkSubjectUtilities],
    'Furniture': [rentScheduleValidation.checkSubjectFurniture],
    'Adjusted Monthly Rent': [rentScheduleValidation.checkSubjectAdjustedMonthlyRent],
    'Other (e.g., basement, etc.)': [rentScheduleValidation.checkOtherBasement],
    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': [form1004And1007Validation.checkRentScheduleAsOfDateConsistency],
    'TO BE $': [form1004And1007Validation.checkRentScheduleToBeAmountConsistency],
    'Design and Appeal': [rentScheduleValidation.checkRentSubjectDesignStyleConsistency, rentScheduleValidation.checkRentDesignAppealAdjustment],
    'Design and Appeal Adjustment': [rentScheduleValidation.checkRentDesignAppealAdjustment],
    'Design & Appeal': [rentScheduleValidation.checkRentSubjectDesignStyleConsistency, rentScheduleValidation.checkRentDesignAppealAdjustment],
    'Design & Appeal Adjustment': [rentScheduleValidation.checkRentDesignAppealAdjustment],
    'Location/View': [rentScheduleValidation.checkRentSubjectLocationViewConsistency, rentScheduleValidation.checkRentLocationViewAdjustment],
    'Location/View Adjustment': [rentScheduleValidation.checkRentLocationViewAdjustment],
    'Age': [rentScheduleValidation.checkRentSubjectAgeConsistency, rentScheduleValidation.checkRentAgeAdjustment],
    'Age Adjustment': [rentScheduleValidation.checkRentAgeAdjustment],
    'Condition': [rentScheduleValidation.checkRentSubjectConditionConsistency, rentScheduleValidation.checkRentConditionAdjustment],
    'Condition Adjustment': [rentScheduleValidation.checkRentConditionAdjustment],
    'Room Count Total': [rentScheduleValidation.checkRentSubjectRoomCountConsistency, rentScheduleValidation.checkRentRoomCountAdjustment],
    'Room Count Bdrms': [rentScheduleValidation.checkRentSubjectRoomCountConsistency, rentScheduleValidation.checkRentRoomCountAdjustment],
    'Room Count Baths': [rentScheduleValidation.checkRentSubjectRoomCountConsistency, rentScheduleValidation.checkRentRoomCountAdjustment],
    'Room Count Total Adjustment': [rentScheduleValidation.checkRentRoomCountAdjustment],
    'Gross Living Area': [rentScheduleValidation.checkRentSubjectGrossLivingAreaConsistency, rentScheduleValidation.checkRentGrossLivingAreaAdjustment],
    'Gross Living Area Adjustment': [rentScheduleValidation.checkRentGrossLivingAreaAdjustment],
    'Other:': [rentScheduleValidation.checkRentSubjectOtherConsistency, rentScheduleValidation.checkRentOtherAdjustment],
    'Other: Adjustment': [rentScheduleValidation.checkRentOtherAdjustment],
    'Other': [rentScheduleValidation.checkRentSubjectOtherConsistency, rentScheduleValidation.checkRentOtherAdjustment],
    'Other Adjustment': [rentScheduleValidation.checkRentOtherAdjustment],
  };

  const getProperSectionName = (path, defaultSection) => {
    if (!path || path.length === 0) return defaultSection;
    const key = path[0];
    if (key.startsWith('Subject Project Data ')) return 'Condo/Co-op Projects';
    if (key === 'CONTRACT') return 'Contract Section';
    if (key === 'NEIGHBORHOOD') return 'Neighborhood Section';
    if (key === 'SITE') return 'Site Section';
    if (key === 'MARKET_CONDITIONS') return 'Market Conditions';
    if (key === 'CONDO_FORECLOSURE') return 'Condo Foreclosure';
    if (key === 'CERTIFICATION') return 'Certification';
    if (key === 'RECONCILIATION') return 'Reconciliation';
    if (key === 'INCOME_APPROACH') return 'Income Approach';
    if (key === 'INFO_OF_SALES') return 'Sales Comparison';
    if (key === 'IMPROVEMENTS') return 'Improvements Section';
    if (key === 'COST_APPROACH') return 'Cost Approach';
    if (key === 'PUD_INFO') return 'PUD Information';
    const fieldToCheck = path.length > 1 ? path[1] : path[0];
    if (['Date Lease Begins', 'Date Lease Expires', 'Monthly Rental', 'Less: Utilities', 'Furniture', 'Adjusted Monthly Rent'].includes(fieldToCheck)) return 'Rent Schedule';
    if (key === 'Subject') return 'Subject Information';
    if (comparableSales.includes(key)) return 'Sales Comparison';
    if (comparableRents.includes(key) || ComparableRentAdjustments.includes(key)) return 'Rent Schedule';

    if (summaryFields.includes(fieldToCheck)) return 'Subject Information';
    if (contractFields.includes(fieldToCheck)) return 'Contract Section';
    if (neighborhoodFields.includes(fieldToCheck)) return 'Neighborhood Section';
    if (siteFields.includes(fieldToCheck) || siteFieldsVersion1.includes(fieldToCheck)) return 'Site Section';
    if (improvementsFields.includes(fieldToCheck)) return 'Improvements Section';
    if (reconciliationFields.includes(fieldToCheck)) return 'Reconciliation';
    if (incomeApproachFields.includes(fieldToCheck)) return 'Income Approach';
    if (costApproachFields.includes(fieldToCheck)) return 'Cost Approach';
    if (pudInformationFields.includes(fieldToCheck)) return 'PUD Information';
    if (subjectFields.includes(fieldToCheck)) return 'Subject Information';
    if (rentScheduleReconciliationFields.includes(fieldToCheck)) return 'Rent Schedule';
    if (projectSiteFields.includes(fieldToCheck)) return 'Project Site';
    if (projectInfoFields.includes(fieldToCheck)) return 'Project Information';
    if (projectAnalysisFields.includes(fieldToCheck)) return 'Project Analysis';
    if (unitDescriptionsFields.includes(fieldToCheck)) return 'Unit Descriptions';
    if (priorSaleHistoryFields.includes(fieldToCheck)) return 'Prior Sale History';
    if (marketConditionsFields.includes(fieldToCheck)) return 'Market Conditions';
    if (appraiserFields.includes(fieldToCheck)) return 'Certification';
    if (condoForeclosureFields.includes(fieldToCheck)) return 'Condo Foreclosure';
    if (salesComparisonAdditionalInfoFields.includes(fieldToCheck) || salesHistoryFields.includes(fieldToCheck)) return 'Sales Comparison';

    if (defaultSection === 'IMPROVEMENTS') return 'Improvements Section';
    if (defaultSection === 'COST_APPROACH') return 'Cost Approach';
    if (defaultSection === 'PUD_INFO') return 'PUD Information';
    if (defaultSection === 'Subject') return 'Subject Information';

    return defaultSection;
  };

  const getRevisionLanguage = (path, fieldName, message, rawValue) => {
    const cleanField = fieldName ? fieldName.trim() : '';
    const messageStr = String(message || '').trim();
    const messageLower = messageStr.toLowerCase();

    const matchComp = cleanField.match(/^(.*?)\s*(\([^)]+\))$/);
    const baseFieldName = matchComp ? matchComp[1].trim() : cleanField;

    let valueStr = '';
    if (path && path.length > 0) {
      const allData = { ...data, comparisonData };
      let current = allData;
      for (const k of path) {
        if (current && typeof current === 'object') {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }
      if (current === undefined || current === null || (typeof current === 'string' && current.trim() === '')) {
        valueStr = (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') ? String(rawValue) : 'Blank';
      } else if (typeof current === 'boolean') {
        valueStr = current ? 'Yes' : 'No';
      } else if (typeof current === 'object') {
        valueStr = JSON.stringify(current);
      } else {
        valueStr = String(current);
      }
    } else if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
      valueStr = String(rawValue);
    }

    const valueSuffix = valueStr ? ` (Current Value: "${valueStr}")` : '';

    let sectionTitle = getProperSectionName(path, 'Subject');
    sectionTitle = sectionTitle.replace(/ (Section|Information)$/i, '');

    const isMismatch = messageLower.includes('mismatch') || messageLower.includes('inconsistent') || messageLower.includes('differs') || messageLower.includes('does not match') || messageLower.includes('identical') || messageLower.includes('conflict');
    const isBlank = messageLower.includes('blank') || messageLower.includes('missing') || messageLower.includes('not be empty') || messageLower.includes('empty') || messageLower.includes('required');
    const isGreaterOrExceeds = messageLower.includes('greater than') || messageLower.includes('exceeds') || messageLower.includes('must not be greater') || messageLower.includes('should not be greater');

    // 1. Proximity to Subject handling
    if (baseFieldName.toLowerCase() === 'proximity to subject' || messageLower.includes('proximity to subject') || messageLower.includes('proximity')) {
      const valText = (valueStr && valueStr !== 'Blank') ? valueStr : (messageStr.match(/\(([^)]+)\)/)?.[1] || '');
      if (isGreaterOrExceeds || messageLower.includes('miles') || messageLower.includes('1.0')) {
        return `Sales grid: Proximity to Subject (${valText || 'distance'}) exceeds distance guideline of 1.0 mile. Please address or provide explanation for using this comparable sale.${valueSuffix}`;
      } else {
        return `Sales grid: Please address 'Proximity to Subject' for comparable sale as distance guideline may be exceeded.${valueSuffix}`;
      }
    }

    // 2. Assignment Type handling
    if (baseFieldName.toLowerCase() === 'assignment type' || cleanField.toLowerCase().includes('assignment type')) {
      return `Please revise the assignment type according to contract section.${valueSuffix}`;
    }

    // 2. Mismatch handling
    if (messageStr && isMismatch) {
      return `Please update '${cleanField}' to resolve the inconsistency: ${messageStr}.${valueSuffix}`;
    }

    // 3. Blank / Missing handling
    if (messageStr && isBlank) {
      return `Please provide '${cleanField}' in the ${sectionTitle} section.${valueSuffix}`;
    }

    // 4. Greater than / numerical threshold handling
    if (messageStr && isGreaterOrExceeds) {
      return `${sectionTitle}: '${cleanField}' value (${valueStr || 'current'}) does not meet required guideline: ${messageStr}.${valueSuffix}`;
    }

    // 5. Select section prompt list
    let prompts = [];
    if (path && path.length > 0) {
      const key = path[0];
      if (key === 'SUMMARY' || (typeof summaryFields !== 'undefined' && summaryFields.includes(key))) {
        prompts = SUBJECT_REVISION_PROMPTS;
      } else if (key === 'CONTRACT' || (typeof contractFields !== 'undefined' && contractFields.includes(key))) {
        prompts = CONTRACT_REVISION_PROMPTS;
      } else if (key === 'NEIGHBORHOOD' || (typeof neighborhoodFields !== 'undefined' && neighborhoodFields.includes(key))) {
        prompts = NEIGHBORHOOD_REVISION_PROMPTS;
      } else if (key === 'SITE' || (typeof siteFields !== 'undefined' && siteFields.includes(key)) || (typeof projectSiteFields !== 'undefined' && projectSiteFields.includes(key))) {
        prompts = SITE_REVISION_PROMPTS;
      } else if (key === 'IMPROVEMENTS' || (typeof improvementsFields !== 'undefined' && improvementsFields.includes(key))) {
        prompts = IMPROVEMENTS_REVISION_PROMPTS;
      } else if (key === 'RECONCILIATION' || (typeof reconciliationFields !== 'undefined' && reconciliationFields.includes(key))) {
        prompts = RECONCILIATION_REVISION_PROMPTS;
      } else if (typeof costApproachFields !== 'undefined' && costApproachFields.includes(key)) {
        prompts = COST_APPROACH_REVISION_PROMPTS;
      } else if (key === 'CERTIFICATION' || (typeof appraiserFields !== 'undefined' && appraiserFields.includes(key))) {
        prompts = CERTIFICATION_REVISION_PROMPTS;
      } else if ((typeof comparableRents !== 'undefined' && comparableRents.includes(key)) || (typeof ComparableRentAdjustments !== 'undefined' && ComparableRentAdjustments.includes(key)) || (typeof rentScheduleReconciliationFields !== 'undefined' && rentScheduleReconciliationFields.includes(key))) {
        prompts = FORM_1007_REVISION_PROMPTS;
      } else if ((typeof comparableSales !== 'undefined' && comparableSales.includes(key)) || (typeof priorSaleHistoryFields !== 'undefined' && priorSaleHistoryFields.includes(key)) || (typeof salesComparisonAdditionalInfoFields !== 'undefined' && salesComparisonAdditionalInfoFields.includes(key)) || (typeof salesHistoryFields !== 'undefined' && salesHistoryFields.includes(key)) || key === 'INFO_OF_SALES' || (typeof key === 'string' && key.startsWith('COMPARABLE'))) {
        prompts = SALES_GRID_REVISION_PROMPTS;
      } else {
        prompts = SUBJECT_REVISION_PROMPTS;
      }
    } else {
      prompts = SUBJECT_REVISION_PROMPTS;
    }

    const normalize = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .replace(/[\u2018\u2019\u201C\u201D'"`]/g, '')
        .replace(/[$?:()#\-+/.,]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const isHardcodedSample = (p) => /5727 Kilbury|3437-3439|Viking St|River Bend|Adam Gleve|Arnett|Tucson|Tukwila|Aura Capital|OCMBC|JMAC|BPL Mortgage|NQM Funding/i.test(p);

    const normalizedBaseField = normalize(baseFieldName);
    const ignoreWords = new Set(['sale', 'sales', 'grid', 'comparable', 'comp', 'comps', 'subject', 'property', 'section', 'info', 'information', 'the', 'and', 'for', 'with', 'from', 'type', 'value', 'values']);
    const significantWords = normalizedBaseField.split(' ').filter(w => w.length >= 3 && !ignoreWords.has(w));

    let matchedPrompt = prompts.find(p => {
      if (isHardcodedSample(p)) return false;
      const normalizedPrompt = normalize(p);
      return normalizedPrompt.includes(normalizedBaseField);
    });

    if (!matchedPrompt && significantWords.length > 0) {
      matchedPrompt = prompts.find(p => {
        if (isHardcodedSample(p)) return false;
        const normalizedPrompt = normalize(p);
        return significantWords.every(word => normalizedPrompt.includes(word));
      });
    }

    if (matchedPrompt) {
      return matchedPrompt + valueSuffix;
    }

    if (messageStr) {
      return `${sectionTitle}: Please revise '${cleanField}' (${valueStr || 'current value'}): ${messageStr}.${valueSuffix}`;
    } else {
      return `${sectionTitle}: Please review and revise '${cleanField}' in the ${sectionTitle} section.${valueSuffix}`;
    }
  };

  const getValidationErrors = () => {
    const errors = [];
    const seenErrorKeys = new Set();
    if (!data || Object.keys(data).length === 0) {
      return errors;
    }

    const validationRegistry = buildValidationRegistry();
    const activeFormTypeStr = String(selectedFormType || data?.formType || data?.selectedFormType || data?.['Form Type'] || data?.['From Type'] || '').trim();
    const isV1FormType = activeFormTypeStr === 'Appraisal Version #1' || activeFormTypeStr === 'Version 1' || activeFormTypeStr === 'Version1';
    const allData = { ...data, comparisonData, formType: activeFormTypeStr };

    const runChecksForField = (sectionName, fieldName, rawValue, path, saleName = null, customRegistry = validationRegistry) => {
      const value = typeof rawValue === 'object' && rawValue !== null
        ? (rawValue.value !== undefined ? rawValue.value : (rawValue.comment !== undefined ? rawValue.comment : ''))
        : rawValue;
      const lookupField = (path && path[0] === 'CONTRACT' && fieldName === 'Data Source(s)') ? 'Data Source(s) (Contract)' : fieldName;
      const isPudSpecialCheck = (lookupField === "Is the developer/builder in control of the Homeowners' Association (HOA)?" || lookupField === "PUD Fees $") && String(allData['PUD'] || '').trim().toLowerCase() === 'yes';
      const isContractSpecialCheck = Boolean(path && path[0] === 'CONTRACT');
      const is1007SpecialCheck = incomeApproachValidation.INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(lookupField) &&
        (String(selectedFormType || '').toLowerCase().includes('1007') || String(selectedFormType || '').toLowerCase().includes('1025'));
      const isRentScheduleSubjectSpecialCheck = (
        saleName === 'Subject' || (path && path[0] === 'Subject')
      ) && [
        'Date Lease Begins',
        'Date Lease Expires',
        'Monthly Rental',
        'Less: Utilities',
        'Furniture',
        'Adjusted Monthly Rent'
      ].includes(lookupField);

      const comparativeFields = [
        'Actual Age', 'Actual Age Adjustment',
        'Quality of Construction', 'Quality of Construction Adjustment',
        'Condition', 'Condition Adjustment',
        'Bedrooms', 'Bedrooms Adjustment',
        'Baths', 'Baths Adjustment',
        'Gross Living Area', 'Gross Living Area Adjustment',
        'Site', 'Site Adjustment',
        'Design (Style)', 'Design (Style) Adjustment',
        'Design and Appeal', 'Design and Appeal Adjustment',
        'Design & Appeal', 'Design & Appeal Adjustment',
        'Functional Utility', 'Functional Utility Adjustment',
        'Heating/Cooling', 'Heating/Cooling Adjustment',
        'Energy Efficient Items', 'Energy Efficient Items Adjustment',
        'Porch/Patio/Deck', 'Porch/Patio/Deck Adjustment',
        'Location', 'Location Adjustment',
        'Leasehold/Fee Simple', 'Leasehold/Fee Simple Adjustment',
        'View', 'View Adjustment',
        'Location/View', 'Location/View Adjustment',
        'Age', 'Age Adjustment',
        'Room Count Total', 'Room Count Total Adjustment',
        'Room Count Bdrms', 'Room Count Baths',
        'Other:', 'Other: Adjustment',
        'Other', 'Other Adjustment'
      ];
      const isComparativeCheck = comparativeFields.includes(lookupField);
      const isFiveValCheck = [
        'Sales Comparison Approach Indicated Value',
        'Opinion of Market Value',
        'Median Sale Price',
        'Indicated Value by Sales Comparison Approach',
        'Indicated Value by Sales Comparison Approach $',
        'Indicated Value by Sales Comparison Approach Indicated',
        'Effective Date of Appraisal',
        'Inspection Date',
        'Effective Date',
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
        ...(isV1FormType ? [
          'Highest and Best Use as Improved (Present Use)',
          'Highest and Best Use as Present Use',
          'Legally Permissible',
          'Physically Possible',
          'Financially Feasible',
          'Maximally Productive'
        ] : []),
        'Indicated Value by Cost Approach',
        'Cost Approach Indicated Value',
        'Attachment Type',
        'Attached / Detached',
        'Property Rights Appraised',
        'Appraiser Credential Level'
      ].includes(lookupField);

      const isVersion1UtilitySubField = isV1FormType && [
        'Electricity Detail', 'Electricity Private Utility Impact', 'Electricity Comment',
        'Sanitary Sewer Detail', 'Sanitary Sewer Private Utility Impact', 'Sanitary Sewer Comment',
        'Water Detail', 'Water Private Utility Impact', 'Water Comment'
      ].includes(lookupField);

      const isVersion1RequiredCheck = isV1FormType && [
        'Subject Property Commentary',
        'Apparent Defects, Damages, Deficiencies Requiring Action',
        'Apparent Defects, Damages, Deficiencies (Site)',
        'Apparent Defects, Damages, Deficiencies (Dwelling Exterior)',
        'Apparent Defects, Damages, Deficiencies (Unit Interior)',
        'Appraisal Version',
        'Appraiser Reference ID',
        'Borrower Name',
        'Current Owner of Public Record',
        'Property Valuation Method',
        'Client/Lender Company Name',
        'Client/Lender Company Address',
        'Appraisal Management Company Name',
        'Appraisal Management Company Address',
        'Appraiser Name',
        'Appraiser Company Name',
        'Physical Address',
        'County',
        'Neighborhood Name',
        'Legal Description',
        'Zoning Compliance',
        'Units Excluding ADUs',
        'Accessory Dwelling Units (ADUs)'
      ].includes(lookupField);

      const isOtherLandUseSpecialCheck = lookupField === 'Present Land Use for other';

      if (isFieldValBlank(value) && !isPudSpecialCheck && !isContractSpecialCheck && !is1007SpecialCheck && !isRentScheduleSubjectSpecialCheck && !isComparativeCheck && !isFiveValCheck && !isVersion1UtilitySubField && !isVersion1RequiredCheck && !isOtherLandUseSpecialCheck) {
        return;
      }

      if (manualValidations && manualValidations[JSON.stringify(path)]) {
        return;
      }

      const lookupKey = Object.keys(customRegistry).find(k => k.toLowerCase() === String(lookupField).toLowerCase()) || lookupField;
      const validationFns = customRegistry[lookupKey] || [];
      for (const fn of validationFns) {
        try {
          let result = fn(lookupField, value, allData, path, saleName);

          if (!result && saleName) {
            try {
              const res2 = fn(lookupField, allData, saleName);
              if (res2) result = res2;
            } catch (e) { }
          }

          if (result && result.isError) {
            const isMsgBlank = !result.skipBlankFilter && result.message && (
              result.message.toLowerCase().includes('blank') ||
              result.message.toLowerCase().includes('empty')
            );
            if (isMsgBlank) {
              continue;
            }
            const properSection = getProperSectionName(path, sectionName);
            const actualFieldName = result.field || fieldName;
            const formattedFieldName = `${actualFieldName}${saleName && saleName !== 'Subject' ? ` (${saleName})` : ''}`;
            const errKey = `${properSection.toLowerCase()}|${actualFieldName.toLowerCase()}|${result.message.toLowerCase()}`;
            if (!seenErrorKeys.has(errKey)) {
              seenErrorKeys.add(errKey);
              errors.push([properSection, formattedFieldName, result.message, path]);
            }
            break;
          }
        } catch (e) {

        }
      }
    };

    Object.keys(allData).forEach(sectionKey => {
      const sectionData = allData[sectionKey];
      if (typeof sectionData === 'object' && sectionData !== null) {
        Object.keys(sectionData).forEach(fieldKey => {
          const value = sectionData[fieldKey];
          const path = [sectionKey, fieldKey];
          runChecksForField(sectionKey, fieldKey, value, path, sectionKey === 'Subject' ? 'Subject' : null);
        });
      } else {
        const value = allData[sectionKey];
        const path = [sectionKey];
        runChecksForField('Subject', sectionKey, value, path, sectionKey === 'Subject' ? 'Subject' : null);
      }
    });

    if (String(selectedFormType || '').toLowerCase().includes('1007') || String(selectedFormType || '').toLowerCase().includes('1025')) {
      const incomeSection = allData['INCOME_APPROACH'] || {};
      incomeApproachValidation.INCOME_APPROACH_1007_REQUIRED_FIELDS.forEach(field => {
        const value = incomeSection[field];
        const path = ['INCOME_APPROACH', field];
        runChecksForField('Income Approach', field, value, path);
      });
    }

    comparableSales.forEach(saleName => {
      if (allData[saleName]) {
        Object.keys(allData[saleName]).forEach(fieldKey => {
          const value = allData[saleName][fieldKey];
          const path = [saleName, fieldKey];
          runChecksForField('Sales Comparison', fieldKey, value, path, saleName);
        });
      }
    });


    comparableRents.forEach(rentName => {
      if (allData[rentName]) {
        Object.keys(allData[rentName]).forEach(fieldKey => {
          const value = allData[rentName][fieldKey];
          const path = [rentName, fieldKey];
          runChecksForField('Rent Schedule', fieldKey, value, path, rentName, rentScheduleValidationRegistry);
        });
      }
    });
    ComparableRentAdjustments.forEach(rentName => {
      if (allData[rentName]) {
        Object.keys(allData[rentName]).forEach(fieldKey => {
          const value = allData[rentName][fieldKey];
          const path = [rentName, fieldKey];
          runChecksForField('Rent Schedule', fieldKey, value, path, rentName, rentScheduleValidationRegistry);
        });
      }
    });

    const is1007GridActive = rentScheduleValidation.is1007Active(allData, selectedFormType);
    if (is1007GridActive) {
      const subjectRentFields = [
        'Date Lease Begins',
        'Date Lease Expires',
        'Monthly Rental',
        'Less: Utilities',
        'Furniture',
        'Adjusted Monthly Rent',
        'Design and Appeal',
        'Location/View',
        'Age',
        'Condition',
        'Room Count Total',
        'Room Count Bdrms',
        'Room Count Baths',
        'Gross Living Area',
        'Other:'
      ];
      subjectRentFields.forEach(fieldKey => {
        const val = rentScheduleValidation.getSubjectRentFieldVal(allData, fieldKey);
        const path = ['Subject', fieldKey];
        runChecksForField('Rent Schedule', fieldKey, val, path, 'Subject', rentScheduleValidationRegistry);
      });
    }

    const is1004And1007 = form1004And1007Validation.is1004And1007Form(allData, selectedFormType);
    if (is1004And1007) {
      try {
        const rentDateVal = form1004And1007Validation.getSectionFieldValue(allData, ['Comparable Rent Schedule Reconciliation', 'RENT_SCHEDULE_RECONCILIATION'], ['I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF']);
        const dateRes = form1004And1007Validation.checkRentScheduleAsOfDateConsistency('I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF', rentDateVal, allData, ['Comparable Rent Schedule Reconciliation', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF'], null, selectedFormType);
        if (dateRes && dateRes.isError) {
          errors.push(['Rent Schedule', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF', dateRes.message, ['Comparable Rent Schedule Reconciliation', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF']]);
        }
      } catch (e) { }

      try {
        const toBeVal = form1004And1007Validation.getSectionFieldValue(allData, ['Comparable Rent Schedule Reconciliation', 'RENT_SCHEDULE_RECONCILIATION'], ['TO BE $']);
        const toBeRes = form1004And1007Validation.checkRentScheduleToBeAmountConsistency('TO BE $', toBeVal, allData, ['Comparable Rent Schedule Reconciliation', 'TO BE $'], null, selectedFormType);
        if (toBeRes && toBeRes.isError) {
          errors.push(['Rent Schedule', 'TO BE $', toBeRes.message, ['Comparable Rent Schedule Reconciliation', 'TO BE $']]);
        }
      } catch (e) { }

      try {
        const reconIncVal = form1004And1007Validation.getSectionFieldValue(allData, ['RECONCILIATION', 'Reconciliation'], ['Income Approach (if developed) $']);
        const incRes = form1004And1007Validation.checkIncomeApproachIndicatedValueConsistency('Income Approach (if developed) $', reconIncVal, allData, ['RECONCILIATION', 'Income Approach (if developed) $'], null, selectedFormType);
        if (incRes && incRes.isError) {
          errors.push(['Reconciliation', 'Income Approach (if developed) $', incRes.message, ['RECONCILIATION', 'Income Approach (if developed) $']]);
        }
      } catch (e) { }

      try {
        const reconCostVal = form1004And1007Validation.getSectionFieldValue(allData, ['RECONCILIATION', 'Reconciliation'], ['Cost Approach (if developed)', 'Cost Approach (if developed) $']);
        if (reconCostVal && String(reconCostVal).trim() !== '') {
          const costRes = form1004And1007Validation.checkCostApproachMatchConsistency('Cost Approach (if developed)', reconCostVal, allData, ['RECONCILIATION', 'Cost Approach (if developed)'], null, selectedFormType);
          if (costRes && costRes.isError) {
            errors.push(['Reconciliation', 'Cost Approach (if developed)', costRes.message, ['RECONCILIATION', 'Cost Approach (if developed)']]);
          }
        }
      } catch (e) { }

      try {
        const rentDesignVal = form1004And1007Validation.getSectionFieldValue(allData, ['Single Family Rent Schedule', 'Subject Rent Schedule', 'Subject', 'RENT_SCHEDULE'], ['Design and Appeal', 'Design & Appeal', 'Design (Style)']);
        if (rentDesignVal && String(rentDesignVal).trim() !== '') {
          const designRes = rentScheduleValidation.checkRentSubjectDesignStyleConsistency('Design and Appeal', rentDesignVal, allData, ['Subject', 'Design and Appeal'], 'Subject', selectedFormType);
          if (designRes && designRes.isError) {
            errors.push(['Rent Schedule', 'Design and Appeal', designRes.message, ['Subject', 'Design and Appeal']]);
          }
        }
      } catch (e) { }
    }

    const isV1Form = isV1FormType;


    if (isV1Form) {
      try {
        const v1Val = allData.SUMMARY?.['Opinion of Market Value'] || allData.RECONCILIATION?.['Opinion of Market Value'] || allData['Opinion of Market Value'] || '';
        const fiveValRes = reconciliationValidation.checkFiveValuesConsistency('Opinion of Market Value', v1Val, allData, ['SUMMARY', 'Opinion of Market Value']);
        if (fiveValRes && fiveValRes.isError) {
          errors.push(['Summary', 'Opinion of Market Value', fiveValRes.message, ['SUMMARY', 'Opinion of Market Value']]);
        }
      } catch (e) { }

      try {
        const hbuVal = allData.SITE?.['Highest and Best Use as Improved (Present Use)'] || allData['Highest and Best Use as Present Use'] || '';
        const hbuRes = reconciliationValidation.checkHbuConsistency('Highest and Best Use as Present Use', hbuVal, allData, ['SITE', 'Highest and Best Use as Present Use']);
        if (hbuRes && hbuRes.isError) {
          errors.push(['Site', 'Highest and Best Use as Present Use', hbuRes.message, ['SITE', 'Highest and Best Use as Present Use']]);
        }
      } catch (e) { }

      try {
        const effVal = allData.SUMMARY?.['Effective Date of Appraisal'] || allData['Effective Date of Appraisal'] || '';
        const effDatesRes = version1Validation.checkVersion1EffectiveDatesConsistency('Effective Date of Appraisal', effVal, allData);
        if (effDatesRes && effDatesRes.isError) {
          errors.push(['Summary', 'Effective Date of Appraisal', effDatesRes.message, ['SUMMARY', 'Effective Date of Appraisal']]);
        }
      } catch (e) { }
    }

    const uniqueErrors = [];

    const seenErrors = new Set();

    for (const error of errors) {
      const fieldName = error[1];
      const message = error[2];
      const errorKey = `${fieldName}|${message}`;

      if (!seenErrors.has(errorKey)) {
        uniqueErrors.push(error);
        seenErrors.add(errorKey);
      }
    }
    return uniqueErrors;
  };

  const getValidationSuccesses = () => {
    const successes = [];
    if (!data || Object.keys(data).length === 0) {
      return successes;
    }

    const validationRegistry = buildValidationRegistry();
    const allData = { ...data, comparisonData };

    const runChecksForField = (sectionName, fieldName, rawValue, path, saleName = null, customRegistry = validationRegistry) => {
      const value = typeof rawValue === 'object' && rawValue !== null
        ? (rawValue.value !== undefined ? rawValue.value : (rawValue.comment !== undefined ? rawValue.comment : ''))
        : rawValue;
      const lookupField = (path && path[0] === 'CONTRACT' && fieldName === 'Data Source(s)') ? 'Data Source(s) (Contract)' : fieldName;
      const isPudSpecialCheck = (lookupField === "Is the developer/builder in control of the Homeowners' Association (HOA)?" || lookupField === "PUD Fees $") && String(allData['PUD'] || '').trim().toLowerCase() === 'yes';
      const isContractSpecialCheck = Boolean(path && path[0] === 'CONTRACT');
      const is1007SpecialCheck = incomeApproachValidation.INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(lookupField) &&
        (String(selectedFormType || '').toLowerCase().includes('1007') || String(selectedFormType || '').toLowerCase().includes('1025'));
      const comparativeFields = [
        'Actual Age', 'Actual Age Adjustment',
        'Quality of Construction', 'Quality of Construction Adjustment',
        'Condition', 'Condition Adjustment',
        'Bedrooms', 'Bedrooms Adjustment',
        'Baths', 'Baths Adjustment',
        'Gross Living Area', 'Gross Living Area Adjustment',
        'Site', 'Site Adjustment',
        'Design (Style)', 'Design (Style) Adjustment',
        'Functional Utility', 'Functional Utility Adjustment',
        'Heating/Cooling', 'Heating/Cooling Adjustment',
        'Energy Efficient Items', 'Energy Efficient Items Adjustment',
        'Design and Appeal', 'Design and Appeal Adjustment',
        'Design & Appeal', 'Design & Appeal Adjustment',
        'Location', 'Location Adjustment',
        'Leasehold/Fee Simple', 'Leasehold/Fee Simple Adjustment',
        'View', 'View Adjustment',
        'Location/View', 'Location/View Adjustment',
        'Age', 'Age Adjustment',
        'Room Count Total', 'Room Count Total Adjustment',
        'Room Count Bdrms', 'Room Count Baths',
        'Other:', 'Other: Adjustment',
        'Other', 'Other Adjustment'
      ];
      const isComparativeCheck = comparativeFields.includes(lookupField);
      const isFiveValCheck = [
        'Sales Comparison Approach Indicated Value',
        'Opinion of Market Value',
        'Median Sale Price',
        'Indicated Value by Sales Comparison Approach',
        'Indicated Value by Sales Comparison Approach $',
        'Effective Date of Appraisal',
        'Inspection Date',
        'Effective Date',
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
        'Highest and Best Use as Improved (Present Use)',
        'Legally Permissible',
        'Physically Possible',
        'Financially Feasible',
        'Maximally Productive',
        'Indicated Value by Cost Approach',
        'Cost Approach Indicated Value',
        'Attachment Type',
        'Attached / Detached',
        'Property Rights Appraised',
        'Appraiser Credential Level'
      ].includes(lookupField);

      const isVersion1UtilitySubField = selectedFormType === 'Appraisal Version #1' && [
        'Electricity Detail', 'Electricity Private Utility Impact', 'Electricity Comment',
        'Sanitary Sewer Detail', 'Sanitary Sewer Private Utility Impact', 'Sanitary Sewer Comment',
        'Water Detail', 'Water Private Utility Impact', 'Water Comment'
      ].includes(lookupField);

      const isOtherLandUseSpecialCheck = lookupField === 'Present Land Use for other';

      if (isFieldValBlank(value) && !isPudSpecialCheck && !isContractSpecialCheck && !is1007SpecialCheck && !isComparativeCheck && !isFiveValCheck && !isVersion1UtilitySubField && !isOtherLandUseSpecialCheck) {
        return;
      }
      if (manualValidations && manualValidations[JSON.stringify(path)]) {
        const properSection = getProperSectionName(path, sectionName);
        successes.push([properSection, `${fieldName}${saleName ? ` (${saleName})` : ''}`, 'Passed (Manually Validated)', path]);
        return;
      }

      const lookupKey = Object.keys(customRegistry).find(k => k.toLowerCase() === String(lookupField).toLowerCase()) || lookupField;
      const validationFns = customRegistry[lookupKey] || [];
      if (validationFns.length === 0) {
        return;
      }

      let hasError = false;
      for (const fn of validationFns) {
        try {
          let result = fn(lookupField, value, allData, path, saleName);

          if (!result && saleName) {
            try {
              const res2 = fn(lookupField, allData, saleName);
              if (res2) result = res2;
            } catch (e) { }
          }

          if (result && result.isError) {
            hasError = true;
            break;
          }
        } catch (e) {
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        const properSection = getProperSectionName(path, sectionName);
        successes.push([properSection, `${fieldName}${saleName ? ` (${saleName})` : ''}`, 'Passed', path]);
      }
    };

    Object.keys(allData).forEach(sectionKey => {
      if (comparableSales.includes(sectionKey) || comparableRents.includes(sectionKey) || ComparableRentAdjustments.includes(sectionKey)) {
        return;
      }
      const sectionData = allData[sectionKey];
      if (typeof sectionData === 'object' && sectionData !== null) {
        Object.keys(sectionData).forEach(fieldKey => {
          const value = sectionData[fieldKey];
          const path = [sectionKey, fieldKey];
          runChecksForField(sectionKey, fieldKey, value, path, sectionKey === 'Subject' ? 'Subject' : null);
        });
      } else {
        const value = allData[sectionKey];
        const path = [sectionKey];
        runChecksForField('Subject', sectionKey, value, path, sectionKey === 'Subject' ? 'Subject' : null);
      }
    });

    if (String(selectedFormType || '').toLowerCase().includes('1007') || String(selectedFormType || '').toLowerCase().includes('1025')) {
      const incomeSection = allData['INCOME_APPROACH'] || {};
      incomeApproachValidation.INCOME_APPROACH_1007_REQUIRED_FIELDS.forEach(field => {
        const value = incomeSection[field];
        const path = ['INCOME_APPROACH', field];
        runChecksForField('Income Approach', field, value, path);
      });
    }

    comparableSales.forEach(saleName => {
      if (allData[saleName]) {
        Object.keys(allData[saleName]).forEach(fieldKey => {
          const value = allData[saleName][fieldKey];
          const path = [saleName, fieldKey];
          runChecksForField('Sales Comparison', fieldKey, value, path, saleName);
        });
      }
    });

    const is1004And1007Success = form1004And1007Validation.is1004And1007Form(allData, selectedFormType);
    if (is1004And1007Success) {
      try {
        const rentDateVal = form1004And1007Validation.getSectionFieldValue(allData, ['Comparable Rent Schedule Reconciliation', 'RENT_SCHEDULE_RECONCILIATION'], ['I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF']);
        const dateRes = form1004And1007Validation.checkRentScheduleAsOfDateConsistency('I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF', rentDateVal, allData, ['Comparable Rent Schedule Reconciliation', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF'], null, selectedFormType);
        if (dateRes && dateRes.isMatch) {
          successes.push(['Rent Schedule', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF', dateRes.message || 'Passed', ['Comparable Rent Schedule Reconciliation', 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF']]);
        }
      } catch (e) { }

      try {
        const toBeVal = form1004And1007Validation.getSectionFieldValue(allData, ['Comparable Rent Schedule Reconciliation', 'RENT_SCHEDULE_RECONCILIATION'], ['TO BE $']);
        const toBeRes = form1004And1007Validation.checkRentScheduleToBeAmountConsistency('TO BE $', toBeVal, allData, ['Comparable Rent Schedule Reconciliation', 'TO BE $'], null, selectedFormType);
        if (toBeRes && toBeRes.isMatch) {
          successes.push(['Rent Schedule', 'TO BE $', toBeRes.message || 'Passed', ['Comparable Rent Schedule Reconciliation', 'TO BE $']]);
        }
      } catch (e) { }

      try {
        const reconIncVal = form1004And1007Validation.getSectionFieldValue(allData, ['RECONCILIATION', 'Reconciliation'], ['Income Approach (if developed) $']);
        const incRes = form1004And1007Validation.checkIncomeApproachIndicatedValueConsistency('Income Approach (if developed) $', reconIncVal, allData, ['RECONCILIATION', 'Income Approach (if developed) $'], null, selectedFormType);
        if (incRes && incRes.isMatch) {
          successes.push(['Reconciliation', 'Income Approach (if developed) $', incRes.message || 'Passed', ['RECONCILIATION', 'Income Approach (if developed) $']]);
        }
      } catch (e) { }

      try {
        const reconCostVal = form1004And1007Validation.getSectionFieldValue(allData, ['RECONCILIATION', 'Reconciliation'], ['Cost Approach (if developed)', 'Cost Approach (if developed) $']);
        if (reconCostVal && String(reconCostVal).trim() !== '') {
          const costRes = form1004And1007Validation.checkCostApproachMatchConsistency('Cost Approach (if developed)', reconCostVal, allData, ['RECONCILIATION', 'Cost Approach (if developed)'], null, selectedFormType);
          if (costRes && costRes.isMatch) {
            successes.push(['Reconciliation', 'Cost Approach (if developed)', costRes.message || 'Passed', ['RECONCILIATION', 'Cost Approach (if developed)']]);
          }
        }
      } catch (e) { }
    }

    const uniqueSuccesses = [];
    const seenSuccesses = new Set();

    for (const success of successes) {
      const fieldName = success[1];
      const status = success[2];
      const key = `${fieldName}|${status}`;

      if (!seenSuccesses.has(key)) {
        uniqueSuccesses.push(success);
        seenSuccesses.add(key);
      }
    }
    return uniqueSuccesses;
  };

  const handleGenerateErrorLog = () => {
    const enrichedData = {
      ...data,
      'Unpaid OK': data['Unpaid OK'] || (isUnpaidOkLender ? (unpaidLenderComment || `Unpaid lender found in the list:- ${unpaidLenderName}`) : (unpaidLenderStatus.lender ? 'Unpaid OK cannot proceed with review (Check lender requirement)' : 'Check lender requirement')),
      'FHA Case No.': data['FHA Case No.'] || data['FHA Case #'] || data['FHA Case Number'] || data?.Subject?.['FHA Case No.'] || data?.Subject?.['FHA Case #'] || data?.Subject?.['FHA Case Number'] || data?.SUBJECT?.['FHA Case No.'] || data?.SUBJECT?.['FHA Case #'] || data?.SUBJECT?.['FHA Case Number'] || '',
      'Prior service comment': data['Prior service comment'] || data['Prior Service Comment'] || data['Prior Service'] || '',
      'E&O': eoVal,
      'Invoice Attached': invVal,
      'Conditions Comment': data?.['Conditions Comment'] || data?.RECONCILIATION?.['Conditions Comment'] || data?.['Subject To Comment'] || data?.RECONCILIATION?.['Subject To Comment'] || '',
      'This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).': data?.['This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).'] || data?.['USPAP Reporting Option'] || data?.['USPAP / Appraisal and Report Identification'] || (data?.has_uspap_identification ? 'Appraisal Report' : ''),
      'USPAP Reporting Option': data?.['USPAP Reporting Option'] || data?.['This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).'] || data?.['USPAP / Appraisal and Report Identification'] || (data?.has_uspap_identification ? 'Appraisal Report' : ''),
      'Comments on Appraisal and Report Identification': data?.['Comments on Appraisal and Report Identification'] || data?.['Restricted Appraisal Report Comment'] || data?.CERTIFICATION?.['Comments on Appraisal and Report Identification'] || ''
    };

    generateValidationLogPDF({
      data: enrichedData,
      comparisonData,
      selectedFile,
      username,
      fileUploadTimer,
      getValidationErrors,
      getValidationSuccesses,
      getFieldValueByPath,
      getRevisionLanguage,
      selectedFormType,
      subjectPdfFields,
      subjectFields,
      ADUResponse,
      unpaidOkResponse,
      fhaResponse,
      marketConditionsRows,
      appraiserFields,
      salesGridRows,
      salesGridRows1025,
      comparableSales,
      dataConsistencyFields,
      salesComparisonAdditionalInfoFields,
      salesHistoryFields,
      stateReqResponse,
      clientReqResponse,
      escalationResponse,
      promptAnalysisResponse,
      setNotification
    });
  };

  const handleGenerateValidationLog = handleGenerateErrorLog;

  const getDataConsistencyErrors = (allData) => {
    const errors = [];
    if (!allData || Object.keys(allData).length === 0) return errors;

    Object.keys(dataConsistencyFields).forEach(item => {
      const fields = dataConsistencyFields[item];
      const values = Object.values(fields).map(fieldKey => allData[fieldKey] || 'N/A');
      if (new Set(values.filter(v => v !== 'N/A')).size > 1) {
        errors.push([item, ...values]);
      }
    });
    return errors;
  };

  const fileUploadTimerRef = useRef(null);

  const handlePreviewPdf = (file) => {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      setPdfPreviewUrl(fileURL);
      setPdfPreviewOpen(true);
    }
  };

  const handleDataChange = (path, value) => {
    setData(prevData => {
      const flatPath = (Array.isArray(path) ? path.flat(Infinity) : [path]).filter(Boolean);
      if (!flatPath.length) return prevData;
      const newData = { ...prevData };
      let current = newData;
      for (let i = 0; i < flatPath.length - 1; i++) {
        current[flatPath[i]] = { ...(current[flatPath[i]] || {}) };
        current = current[flatPath[i]];
      }
      current[flatPath[flatPath.length - 1]] = value;

      const fieldKey = flatPath[flatPath.length - 1];
      if (flatPath.length === 1) {
        if (!newData.Subject) newData.Subject = {};
        newData.Subject = { ...newData.Subject, [fieldKey]: value };
      } else if (flatPath.length === 2 && flatPath[0] === 'Subject') {
        newData[fieldKey] = value;
        if (newData['Single Family Rent Schedule']) {
          newData['Single Family Rent Schedule'] = { ...newData['Single Family Rent Schedule'], [fieldKey]: value };
        }
      } else if (flatPath.length === 2 && (flatPath[0] === 'Single Family Rent Schedule' || flatPath[0] === 'Subject Rent Schedule')) {
        if (!newData.Subject) newData.Subject = {};
        newData.Subject = { ...newData.Subject, [fieldKey]: value };
      } else if (flatPath.length === 2 && (flatPath[0].startsWith('COMPARABLE NO') || flatPath[0].startsWith('COMPARABLE RENTAL') || flatPath[0].startsWith('Rental ') || flatPath[0].startsWith('Comp '))) {
        const rentKey = flatPath[0];
        if (!newData['Comparable Rental Data']) newData['Comparable Rental Data'] = {};
        newData['Comparable Rental Data'][rentKey] = {
          ...(newData['Comparable Rental Data'][rentKey] || {}),
          [fieldKey]: value
        };
      }

      if (fieldKey === 'E&O' || fieldKey === 'E&O Present') {
        if (!newData.CERTIFICATION) newData.CERTIFICATION = {};
        newData.CERTIFICATION['E&O'] = value;
        newData.CERTIFICATION['E&O Present'] = value;
        newData['E&O'] = value;
        newData['E&O Present'] = value;
      }
      if (fieldKey === 'Invoice Attached' || fieldKey === 'Invoice Present') {
        if (!newData.CERTIFICATION) newData.CERTIFICATION = {};
        if (!newData.SUBJECT) newData.SUBJECT = {};
        if (!newData.Subject) newData.Subject = {};
        newData.CERTIFICATION['Invoice Attached'] = value;
        newData.SUBJECT['Invoice Attached'] = value;
        newData.Subject['Invoice Attached'] = value;
        newData['Invoice Attached'] = value;
      }

      if (
        fieldKey === "USPAP / Appraisal and Report Identification" ||
        fieldKey === "Appraisal and Report Identification"
      ) {
        if (!newData.SUBJECT) newData.SUBJECT = {};
        if (!newData.Subject) newData.Subject = {};
        newData["USPAP / Appraisal and Report Identification"] = value;
        newData["Appraisal and Report Identification"] = value;
        newData.SUBJECT["USPAP / Appraisal and Report Identification"] = value;
        newData.Subject["USPAP / Appraisal and Report Identification"] = value;
      }

      const uspapLongKey = "This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).";
      if (
        fieldKey === uspapLongKey ||
        fieldKey === "This report was prepared under the following USPAP reporting option:" ||
        fieldKey === "USPAP Reporting Option"
      ) {
        if (!newData.CERTIFICATION) newData.CERTIFICATION = {};
        if (!newData.SUBJECT) newData.SUBJECT = {};
        if (!newData.Subject) newData.Subject = {};
        newData[uspapLongKey] = value;
        newData["This report was prepared under the following USPAP reporting option:"] = value;
        newData["USPAP Reporting Option"] = value;
        newData.CERTIFICATION["USPAP Reporting Option"] = value;
        newData.SUBJECT["USPAP Reporting Option"] = value;
        newData.Subject["USPAP Reporting Option"] = value;
      }
      if (
        fieldKey === "Comments on Appraisal and Report Identification" ||
        fieldKey === "Restricted Appraisal Report Comment"
      ) {
        if (!newData.CERTIFICATION) newData.CERTIFICATION = {};
        if (!newData.SUBJECT) newData.SUBJECT = {};
        if (!newData.Subject) newData.Subject = {};
        newData["Comments on Appraisal and Report Identification"] = value;
        newData["Restricted Appraisal Report Comment"] = value;
        newData.CERTIFICATION["Comments on Appraisal and Report Identification"] = value;
        newData.Subject["Comments on Appraisal and Report Identification"] = value;
      }

      if (rentScheduleReconciliationFields.includes(fieldKey)) {
        if (!newData['Comparable Rent Schedule Reconciliation']) newData['Comparable Rent Schedule Reconciliation'] = {};
        newData['Comparable Rent Schedule Reconciliation'] = { ...newData['Comparable Rent Schedule Reconciliation'], [fieldKey]: value };
        if (!newData.RENT_SCHEDULE_RECONCILIATION) newData.RENT_SCHEDULE_RECONCILIATION = {};
        newData.RENT_SCHEDULE_RECONCILIATION = { ...newData.RENT_SCHEDULE_RECONCILIATION, [fieldKey]: value };
        newData[fieldKey] = value;
      }
      if (incomeApproachFields.includes(fieldKey)) {
        if (!newData.INCOME_APPROACH) newData.INCOME_APPROACH = {};
        newData.INCOME_APPROACH = { ...newData.INCOME_APPROACH, [fieldKey]: value };
        newData[fieldKey] = value;
      }
      if (reconciliationFields.includes(fieldKey) || fieldKey === 'Conditions Comment' || fieldKey === 'Subject To Comment') {
        if (!newData.RECONCILIATION) newData.RECONCILIATION = {};
        newData.RECONCILIATION = { ...newData.RECONCILIATION, [fieldKey]: value };
        newData[fieldKey] = value;
      }

      return newData;
    });
  };
  const onHtmlFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setHtmlFile(file);
      setIsHtmlReviewLoading(true);
      setHtmlExtractionTimer(0);
      if (htmlExtractionTimerRef.current) {
        clearInterval(htmlExtractionTimerRef.current);
      }
      htmlExtractionTimerRef.current = setInterval(() => {
        setHtmlExtractionTimer(prev => prev + 1);
      }, 1000);
      setNotification({ open: true, message: 'HTML file uploaded. Extracting data...', severity: 'info' });

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        const fieldsToExtract = [
          'Client/Lender on Report', 'Lender Address', 'Payment Status', 'Transaction Type', 'FHA Case Number', 'Borrower (and Co-Borrower)',
          'Property Address', 'Property County', 'Property Type', 'Assigned to Vendor(s)', 'AMC Reg. Number',
          'Appraisal Type', 'Unit Number', 'UAD XML Report'
        ];

        const fieldAliases = {
          'Client/Lender on Report': ['client/lender on report', 'client name'],
          'Lender Address': ['lender address', 'client address']
        };

        const extractedData = {};
        const mainContainer = doc.querySelector('.view-order') || doc.body;
        const allElements = mainContainer.querySelectorAll('*');

        fieldsToExtract.forEach(field => {
          extractedData[field] = 'N/A';
          const targetTexts = fieldAliases[field] || [field.toLowerCase()];

          for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];


            const tagName = element.tagName.toLowerCase();
            if (['tr', 'tbody', 'table', 'thead'].includes(tagName)) continue;

            const elText = element.textContent.trim().toLowerCase().replace(/:$/, '');
            if (targetTexts.includes(elText)) {
              const hasMatchingChild = Array.from(element.children).some(child =>
                targetTexts.includes(child.textContent.trim().toLowerCase().replace(/:$/, ''))
              );
              if (hasMatchingChild) continue;

              let nextElement = element.nextElementSibling;
              if (!nextElement && element.parentElement) {
                nextElement = element.parentElement.nextElementSibling;
              }

              if (nextElement) {
                const getExtractedText = (el) => {
                  let text = el.textContent.trim();

                  const inputEl = el.tagName.toLowerCase() === 'input' ? el : el.querySelector('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])');
                  if (inputEl && inputEl.value !== undefined) {
                    text = inputEl.value.trim() || text;
                  }

                  if (!text && el.querySelector('.paid')) return "PAID IN FULL";
                  if (!text && el.querySelector('.unpaid')) return "UNPAID";
                  if (!text && (el.querySelector('.partial') || el.querySelector('.partial-payment') || el.querySelector('.partial-paid'))) return "PARTIAL PAYMENT";

                  return text;
                };

                if (field === 'Appraisal Type' || field === 'Transaction Type') {
                  const selectElement = nextElement.tagName.toLowerCase() === 'select' ? nextElement : nextElement.querySelector('select');
                  if (selectElement && selectElement.options.length > 0) {
                    const selectedOption = selectElement.querySelector('option[selected]') || selectElement.options[selectElement.selectedIndex];
                    if (selectedOption) {
                      const selectedText = selectedOption.textContent.trim();
                      if (selectedText !== '-- Select One --' && selectedText !== '') {
                        extractedData[field] = selectedText;
                      }
                    }
                    break;
                  } else {
                    const checkedInput = nextElement.querySelector('input[type="checkbox"]:checked, input[type="radio"]:checked, input[checked]');
                    if (checkedInput) {
                      const label = checkedInput.closest('label');
                      if (label) {
                        extractedData[field] = label.textContent.trim();
                      } else {
                        let sibling = checkedInput.nextSibling;
                        let text = '';
                        while (sibling && sibling.nodeType === 3) {
                          text += sibling.textContent;
                          sibling = sibling.nextSibling;
                        }
                        extractedData[field] = text.trim() || getExtractedText(nextElement);
                      }
                    } else {
                      const textContentStr = getExtractedText(nextElement);
                      const checkMatch = textContentStr.match(/\[[xX]\]\s*([^[]+)/);
                      if (checkMatch) {
                        extractedData[field] = checkMatch[1].trim();
                      } else {
                        extractedData[field] = textContentStr;
                      }
                    }
                    break;
                  }
                } else {
                  extractedData[field] = getExtractedText(nextElement);
                  break;
                }
              }
            }
          }
        });

        setComparisonData(extractedData);

        setNotification({ open: true, message: 'HTML data extracted. Please review.', severity: 'success' });
        setIsHtmlReviewLoading(false);
        if (htmlExtractionTimerRef.current) {
          clearInterval(htmlExtractionTimerRef.current);
        }
      };
      reader.readAsText(file);
    }
  };

  const onContractFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setContractFile(file);
      setNotification({ open: true, message: 'Contract file uploaded. Click "Review Contract" to compare.', severity: 'success' });

    }
  };

  const handleContractCompare = async () => {
    if (!selectedFile || !contractFile) {
      setNotification({ open: true, message: 'Please upload both the main report and the contract copy.', severity: 'warning' });
      return;
    }
    setContractCompareLoading(true);
    setContractCompareError('');
    setContractCompareResult(null);

    const formData = new FormData();
    formData.append('main_report_file', selectedFile);
    formData.append('contract_copy_file', contractFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compare-contract/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to compare documents.');
      }

      const result = await response.json();
      setContractCompareResult(result);

    } catch (error) {
      setContractCompareError(error.message);
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setContractCompareLoading(false);
    }
  };

  const handleEngagementLetterCompare = async () => {
    if (!selectedFile || !engagementLetterFile) {
      setNotification({ open: true, message: 'Please upload both the main report and the engagement letter.', severity: 'warning' });
      return;
    }
    setEngagementLetterCompareLoading(true);
    setEngagementLetterCompareError('');
    setEngagementLetterCompareResult(null);

    const formData = new FormData();
    formData.append('main_report_file', selectedFile);
    formData.append('engagement_letter_file', engagementLetterFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compare-engagement-letter/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to compare documents.');
      }

      const result = await response.json();
      setEngagementLetterCompareResult(result.comparison_results);

    } catch (error) {
      setEngagementLetterCompareError(error.message);
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setEngagementLetterCompareLoading(false);
    }
  };


  const onEngagementLetterFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setEngagementLetterFile(file);
      setNotification({ open: true, message: 'Engagement letter uploaded. Click "Review Letter" to compare.', severity: 'success' });

    }
  };

  const handleManualValidation = (fieldPath) => {
    setManualValidations(prev => {
      const pathKey = JSON.stringify(fieldPath);
      const newValidations = { ...prev };
      if (newValidations[pathKey]) {
        delete newValidations[pathKey];
      } else {
        newValidations[pathKey] = true;
      }
      return newValidations;
    });
  };
  const handleComparisonDataChange = (field, value) => {
    setComparisonData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  useEffect(() => {
    const checkScrollTop = () => {
      if (!showScrollTop && window.pageYOffset > 400) {
        setShowScrollTop(true);
      } else if (showScrollTop && window.pageYOffset <= 400) {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScrollTop]);

  useEffect(() => {
    setUsername(localStorage.getItem('username') || 'Unknown User');
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTimeHHMMSS = (totalSeconds = 0) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
    const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const fileUploadTimerValRef = useRef(0);
  useEffect(() => {
    fileUploadTimerValRef.current = fileUploadTimer;
  }, [fileUploadTimer]);

  const getCleanFileHistory = () => {
    try {
      const stored = localStorage.getItem('reviewer_file_timers_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed['Active Document'];
        delete parsed[''];
        return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  };

  const saveFileHistoryEntry = useCallback((fName, elapsed, status) => {
    if (!fName || fName === 'Active Document') return;
    const currentHist = getCleanFileHistory();
    const currentUser = username || localStorage.getItem('username') || 'Reviewer';
    currentHist[fName] = {
      fileName: fName,
      user: currentUser,
      elapsedSeconds: elapsed,
      formattedTime: formatTimeHHMMSS(elapsed),
      lastUpdated: Date.now(),
      status
    };
    try {
      localStorage.setItem('reviewer_file_timers_history', JSON.stringify(currentHist));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    fileReviewHistoryRef.current = currentHist;
    setFileReviewHistory(currentHist);
  }, [username]);

  // Starts or switches timer for this specific browser tab, fully isolated from other tabs
  const startFileUploadTimer = useCallback((newFileOrName) => {
    const rawName = typeof newFileOrName === 'string'
      ? newFileOrName
      : (newFileOrName?.name || selectedFile?.name || xmlFile?.name || '');
    const newName = (rawName || '').trim();
    if (!newName || newName === 'Active Document') return;

    const prevName = activeTimedFileRef.current;

    // 1. If this tab was already actively reviewing a different file, finalize previous file
    if (prevName && prevName !== newName && prevName !== 'Active Document') {
      const prevElapsed = fileUploadTimerValRef.current || 0;
      saveFileHistoryEntry(prevName, prevElapsed, 'Completed');
    }

    // 2. Start the timer for this tab's new file (isolated to this tab's memory refs)
    const now = Date.now();
    activeTimedFileRef.current = newName;
    setActiveTimedFileName(newName);
    tabStartTimeRef.current = now;
    tabElapsedBaseRef.current = 0;
    tabPausedRef.current = false;

    setFileUploadTimer(0);
    setIsTimerRunning(true);

    saveFileHistoryEntry(newName, 0, 'Reviewing');
  }, [selectedFile, xmlFile, saveFileHistoryEntry]);

  // Restore review history on component mount
  useEffect(() => {
    const hist = getCleanFileHistory();
    setFileReviewHistory(hist);
    fileReviewHistoryRef.current = hist;
  }, []);

  // Ensure timer tracks whenever active file changes in this specific tab
  useEffect(() => {
    const curFile = (selectedFile?.name || xmlFile?.name || '').trim();
    if (curFile && curFile !== 'Active Document' && curFile !== activeTimedFileRef.current) {
      startFileUploadTimer(curFile);
    }
  }, [selectedFile, xmlFile, startFileUploadTimer]);

  // Main timer tick interval: updates every second based SOLELY on this tab's own refs
  useEffect(() => {
    if (fileUploadTimerRef.current) {
      clearInterval(fileUploadTimerRef.current);
    }

    if (isTimerRunning) {
      fileUploadTimerRef.current = setInterval(() => {
        if (tabPausedRef.current || !tabStartTimeRef.current) return;

        const activeName = activeTimedFileRef.current;
        if (!activeName || activeName === 'Active Document') return;

        const currentElapsed = tabElapsedBaseRef.current + Math.max(0, Math.floor((Date.now() - tabStartTimeRef.current) / 1000));
        setFileUploadTimer(currentElapsed);

        // Periodically sync review time to history every 5s so progress is preserved without excessive storage writes
        if (currentElapsed > 0 && currentElapsed % 5 === 0) {
          saveFileHistoryEntry(activeName, currentElapsed, 'Reviewing');
        }
      }, 1000);
    }

    return () => {
      if (fileUploadTimerRef.current) {
        clearInterval(fileUploadTimerRef.current);
      }
    };
  }, [isTimerRunning, saveFileHistoryEntry]);

  const handleTimerToggle = () => {
    setIsTimerRunning(prev => {
      const next = !prev;
      const now = Date.now();
      if (!next) {
        // Pausing in this tab
        tabPausedRef.current = true;
        const currentElapsed = tabElapsedBaseRef.current + (tabStartTimeRef.current ? Math.max(0, Math.floor((now - tabStartTimeRef.current) / 1000)) : 0);
        tabElapsedBaseRef.current = currentElapsed;
        tabStartTimeRef.current = null;
        if (activeTimedFileRef.current) {
          saveFileHistoryEntry(activeTimedFileRef.current, currentElapsed, 'Paused');
        }
      } else {
        // Resuming in this tab
        tabPausedRef.current = false;
        tabStartTimeRef.current = now;
        if (activeTimedFileRef.current) {
          saveFileHistoryEntry(activeTimedFileRef.current, tabElapsedBaseRef.current, 'Reviewing');
        }
      }
      return next;
    });
  };

  const handleOpenTimerHistory = (e) => {
    if (activeTimedFileRef.current && activeTimedFileRef.current !== 'Active Document') {
      saveFileHistoryEntry(activeTimedFileRef.current, fileUploadTimerValRef.current || fileUploadTimer, isTimerRunning ? 'Reviewing' : 'Paused');
    } else {
      const hist = getCleanFileHistory();
      setFileReviewHistory(hist);
      fileReviewHistoryRef.current = hist;
    }
    setTimerHistoryAnchor(e.currentTarget);
  };


  const summaryFields = [
    "Opinion of Market Value", "Market Value Condition", "Effective Date of Appraisal", "Assignment Reason",
    "Borrower Name", "Current Owner of Public Record", "Listing Status", "Property Valuation Method",
    "Appraiser Name", "Construction Method", "Attachment Type", "Overall Quality", "Overall Condition",
    "Planned Unit Development (PUD)", "Condominium", "Cooperative", "Condop", "Subject Site Owned in Common",
    "Units Excluding ADUs", "Accessory Dwelling Units (ADUs)", "Property Rights Appraised",
    "Highest and Best Use as Present Use", "Zoning Compliance", "Apparent Defects, Damages, Deficiencies Requiring Action",
    "Appraisal Version", "Appraiser Reference ID", "Property Data Report Used in Lieu of Inspection",
    "Client/Lender Company Name", "Client/Lender Company Address",
    "Appraisal Management Company Name", "Appraisal Management Company Address",
    "Appraiser Company Name", "Appraiser Company Address",
    "Subject Property Inspection", "Exterior Physical Inspection", "Interior Physical Inspection", "Inspection Date",
    "Appraiser Credential Level", "Appraiser ID", "Appraiser State", "Appraiser License Expiration Date", "Appraiser ASC Identifier",
    "Physical Address", "County", "Neighborhood Name", "Property on Native American Lands",
    "Homeowner Responsible for All Exterior Maintenance of Dwelling(s)", "New Construction",
    "All Rights Included in Appraisal", "Special Tax Assessments", "Legal Description", "Subject Property Commentary"
  ];

  const topCheckFields = [
    'FHA Case #',
    'ADU File Check',
    '1004MC Addendum',
    'USPAP / Appraisal and Report Identification',
    'USPAP Reporting Option',
    'ANSI',
    'Exposure Comment',
    'Prior Service Comment',
    'Unpaid OK',
  ];

  const subjectFields = [
    // 'FHA Case #',
    'Full Address',
    'Property Address',
    'City',
    'County',
    'State',
    'Zip Code',
    'Borrower',
    'Owner of Public Record',
    'Legal Description',
    "Assessor's Parcel #",
    'Tax Year',
    'R.E. Taxes $',
    'Neighborhood Name',
    'Map Reference',
    'Census Tract',
    'Occupant',
    'Special Assessments $',
    'PUD',
    'HOA $',
    'HOA(per year)', 'HOA(per month)',
    'Property Rights Appraised',
    'Assignment Type',
    'Lender/Client',
    'Address (Lender/Client)',
    'Offered for Sale in Last 12 Months',
    'Report data source(s) used, offering price(s), and date(s)',
    // 'ANSI',
    // 'Exposure Comment',
    // 'Prior Service Comment'
  ];

  const subjectPdfFields = [...topCheckFields, ...subjectFields];

  const statesRequiringAppraiserFee = ['AZ', 'CO', 'CT', 'GA', 'IL', 'LA', 'NJ', 'NV', 'NM', 'ND', 'OH', 'UT', 'VA', 'VT', 'WV'];
  const statesRequiringAmcLicense = ['GA', 'IL', 'MT', 'NJ', 'OH', 'VT'];

  const currentState = data?.State?.toUpperCase();
  const hasAppraiserFee = !!(data?.["Appraiser's Fee"] || data?.["Appraiser Fee"] || data?.Subject?.["Appraiser's Fee"] || data?.Subject?.["Appraiser Fee"] || data?.CERTIFICATION?.["Appraiser's Fee"] || data?.CERTIFICATION?.["Appraiser Fee"]);
  const has1004mc = !!(
    data?.has_1004mc ||
    data?.['1004MC Addendum'] === 'Present' ||
    data?.['1004MC Addendum']?.startsWith?.('Present') ||
    data?.['1004MC Present'] === 'Yes' ||
    data?.Subject?.['1004MC Addendum'] === 'Present' ||
    data?.Subject?.['1004MC Addendum']?.startsWith?.('Present') ||
    data?.Subject?.['1004MC Present'] === 'Yes' ||
    data?.Subject?.has_1004mc
  );

  if (has1004mc && !subjectFields.includes("1004MC Addendum")) {
    const reportDataSrcIdx = subjectFields.indexOf('Report data source(s) used, offering price(s), and date(s)');
    if (reportDataSrcIdx !== -1) {
      subjectFields.splice(reportDataSrcIdx + 1, 0, "1004MC Addendum");
    } else {
      subjectFields.push("1004MC Addendum");
    }
  }

  const hasUspapIdent = !!(
    data?.has_uspap_identification ||
    data?.['USPAP / Appraisal and Report Identification'] === 'Present' ||
    data?.['USPAP / Appraisal and Report Identification']?.startsWith?.('Present') ||
    data?.['Appraisal and Report Identification']?.startsWith?.('Present') ||
    data?.['USPAP Reporting Option'] ||
    data?.['This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).'] ||
    data?.Subject?.has_uspap_identification ||
    data?.Subject?.['USPAP / Appraisal and Report Identification']?.startsWith?.('Present') ||
    data?.Subject?.['Appraisal and Report Identification']?.startsWith?.('Present') ||
    data?.Subject?.['USPAP Reporting Option']
  );

  if (hasUspapIdent && !subjectFields.includes("USPAP / Appraisal and Report Identification")) {
    const mcIdx = subjectFields.indexOf("1004MC Addendum");
    const reportDataSrcIdx = subjectFields.indexOf('Report data source(s) used, offering price(s), and date(s)');
    const insertIdx = mcIdx !== -1 ? mcIdx + 1 : (reportDataSrcIdx !== -1 ? reportDataSrcIdx + 1 : subjectFields.length);
    subjectFields.splice(insertIdx, 0, "USPAP / Appraisal and Report Identification");
  }

  if (currentState || hasAppraiserFee) {
    if ((currentState && statesRequiringAppraiserFee.includes(currentState)) || hasAppraiserFee) {
      const stateIdx = subjectFields.indexOf('State');
      const feeIndex = stateIdx !== -1 ? stateIdx + 1 : 0;
      if (!subjectFields.includes("Appraiser's Fee")) {
        subjectFields.splice(feeIndex, 0, "Appraiser's Fee");
      }
    }
    if (statesRequiringAmcLicense.includes(currentState)) {
      let amcIndex = subjectFields.indexOf('State') + 1;
      if (subjectFields.includes("Appraiser's Fee")) {
        amcIndex++;
      }
      if (!subjectFields.includes('AMC License #')) {
        subjectFields.splice(amcIndex, 0, 'AMC License #');
      }
    }
    if (currentState === 'CA') {
      const caFields = ["Smoke detector comment", "CO detector comment", "Water heater double-strapped comment"];
      const stateIndex = subjectFields.indexOf('State') + 1;
      let offset = 0;
      caFields.forEach(field => {
        if (!subjectFields.includes(field)) {
          subjectFields.splice(stateIndex + offset, 0, field);
          offset++;
        }
      });
    }
    if (currentState === 'VA') {
      const vaFields = ["Smoke detector comment", "CO detector comment"];
      const stateIndex = subjectFields.indexOf('State') + 1;
      let offset = 0;
      vaFields.forEach(field => {
        if (!subjectFields.includes(field)) {
          subjectFields.splice(stateIndex + offset, 0, field);
          offset++;
        }
      });
    }

    if (currentState === 'TX') {
      const txFields = ["Smoke detector comment", "CO detector comment"];
      const stateIndex = subjectFields.indexOf('State') + 1;
      let offset = 0;
      txFields.forEach(field => {
        if (!subjectFields.includes(field)) {
          subjectFields.splice(stateIndex + offset, 0, field);
          offset++;
        }
      });
    }

    if (currentState === 'IL') {
      const ilFields = ["CO detector comment"];
      let insertionPoint = subjectFields.indexOf('State') + 1;
      if (subjectFields.includes("Appraiser's Fee")) {
        insertionPoint++;
      }
      if (subjectFields.includes('AMC License #')) {
        insertionPoint++;
      }
      ilFields.forEach(field => {
        if (!subjectFields.includes(field)) {
          subjectFields.splice(insertionPoint, 0, field);
        }
      });
    }
  }


  const highlightedSubjectFields = [
    'Property Address',
    'City',
    'County',
    'State',
    'Zip Code',
    'Borrower',
    'Occupant',
    'Assignment Type',
    'Lender/Client',
    'Address (Lender/Client)',
  ];
  const stateRequirementFields = ["STATE REQUIREMENT FIELDS"];

  const highlightedContractFields = [
    'Contract Price $',
    'Date of Contract',
  ];

  const highlightedSiteFields = [
    "Area",
    "Shape",
    "View",
    "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone",
    "FEMA Map #",
    "FEMA Map Date",
  ];


  const contractFields = [
    "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
    "Contract Price $",
    "Date of Contract",
    "Is property seller owner of public record?",
    "Data Source(s)",
    "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
    "If Yes, report the total dollar amount and describe the items to be paid"
  ];

  const neighborhoodFields = [
    "Location", "Built-Up", "Growth", "Property Values", "Demand/Supply",
    "Marketing Time", "One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other", "Present Land Use for other",
    "one unit housing price(high,low,pred)", "one unit housing age(high,low,pred)",
    "Neighborhood Boundaries", "Neighborhood Description", "Market Conditions:"
  ];

  const siteFieldsVersion1 = [
    "Total Site Size", "Number of Parcels", "Assessor Parcel Number (APN)", "APN Description", "Parcel Size",
    "Zoning Compliance", "Zoning Classification Code", "Zoning Classification Description", "Primary Access",
    "Street Type and Surface", "Typical for Market", "Non-Residential Use", "Site Influence", "Site Influence Detail",
    "Site Influence Impact", "Site Influence Comment", "View", "Range of View", "View Impact", "Site Feature",
    "Site Feature Detail", "Site Feature Impact", "Site Feature Comment", "Broadband Internet Available",
    "Electricity", "Sanitary Sewer", "Water", "Utility Type (Public/Private)", "Utility Detail",
    "Utility Impact", "Utility Comment", "Apparent Defects, Damages, Deficiencies (Site)", "View Commentary",
    "Property Access (Street Scene)", "Renewable Energy Components", "Ownership", "Financing Arrangement",
    "Known Building Certifications", "Known Efficiency Ratings",
    "Energy Efficient and Green Features Impact to Value/Marketability", "Energy Efficient and Green Features Exhibits"
  ];

  const siteFields = [
    "Dimensions",
    "Area",
    "Shape",
    "View",
    "Specific Zoning Classification",
    "Zoning Description",
    "Zoning Compliance",
    "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity",
    "Gas",
    "Water",
    "Sanitary Sewer",
    "Street",
    "Alley",
    "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone",
    "FEMA Map #",
    "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area?",
    "Are the utilities and off-site improvements typical for the market area? If No, describe",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe"
  ];

  const zoningComplianceValue = data?.SITE?.['Zoning Compliance'] ?? data?.['Zoning Compliance'];
  const zoningCompStr = (typeof zoningComplianceValue === 'object' && zoningComplianceValue !== null
    ? (zoningComplianceValue.choice || zoningComplianceValue.value || '')
    : String(zoningComplianceValue || '')).trim().toLowerCase();

  const isNonconforming = zoningCompStr.includes('nonconforming') || zoningCompStr.includes('grandfathered');

  if (isNonconforming) {
    if (!siteFields.includes('Legal Nonconforming (Grandfathered Use) comment')) {
      const zIndex = siteFields.indexOf('Zoning Compliance');
      if (zIndex !== -1) {
        siteFields.splice(zIndex + 1, 0, 'Legal Nonconforming (Grandfathered Use) comment');
      }
    }
  }
  if (zoningCompStr.includes('no zoning')) {
    if (!siteFields.includes('No Zoning comment')) {
      const zIndex = siteFields.indexOf('Zoning Compliance');
      if (zIndex !== -1) {
        siteFields.splice(zIndex + 1, 0, 'No Zoning comment');
      }
    }
  }

  const utilityComments = [
    { field: "Electricity", commentField: "Electricity comment" },
    { field: "Gas", commentField: "Gas comment" },
    { field: "Water", commentField: "Water comment" },
    { field: "Sanitary Sewer", commentField: "Sanitary Sewer comment" },
    { field: "Street", commentField: "Street comment" },
    { field: "Alley", commentField: "Alley comment" },
  ];

  utilityComments.forEach(({ field, commentField }) => {
    if (data?.SITE?.[commentField]) {
      if (!siteFields.includes(commentField)) {
        const index = siteFields.indexOf(field);
        if (index !== -1) {
          siteFields.splice(index + 1, 0, commentField);
        }
      }
    }
  });


  const improvementsFields = [
    "Units", "One with Accessory Unit", "# of Stories", "Type", "Existing/Proposed/Under Const.",
    "Design (Style)", "Year Built", "Effective Age (Yrs)", "Foundation Type",
    "Basement Area sq.ft.", "Basement Finish %",
    "Evidence of (Foundation)", "Foundation Walls (Material/Condition)",
    "Exterior Walls (Material/Condition)", "Roof Surface (Material/Condition)",
    "Gutters & Downspouts (Material/Condition)", "Window Type (Material/Condition)",
    "Storm Sash/Insulated", "Screens", "Floors (Material/Condition)", "Walls (Material/Condition)",
    "Trim/Finish (Material/Condition)", "Bath Floor (Material/Condition)", "Bath Wainscot (Material/Condition)",
    "Attic", "Heating Type", "Fuel", "Cooling Type",
    "Fireplace(s) #", "Patio/Deck", "Pool", "Woodstove(s) #", "Fence", "Porch", "Other in Amenities",
    "Car Storage", "Driveway # of Cars", "Driveway Surface", "Garage # of Cars", "Carport # of Cars", "Att./Det./Built-in",
    "Appliances",
    "Finished area above grade Rooms", "Finished area above grade Bedrooms",
    "Finished area above grade Bath(s)", "Square Feet of Gross Living Area Above Grade",
    "Additional features", "Describe the condition of the property",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe"
  ];

  const reconciliationFields = [
    'Indicated Value by: Sales Comparison Approach $',
    'Cost Approach (if developed)',
    'Income Approach (if developed) $',
    'Income Approach (if developed) $ Comment',
    'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
    "opinion of the market value, as defined, of the real property that is the subject of this report is $",
    "as of",
  ];

  const incomeApproachFields = [
    "Estimated Monthly Market Rent $",
    "X Gross Rent Multiplier  = $",
    "Indicated Value by Income Approach",
    "Summary of Income Approach (including support for market rent and GRM) "
  ];

  const costApproachFields = [
    "Provide adequate information for the lender/client to replicate the below cost figures and calculations.",
    "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)",
    "Estimated",
    "Source of cost data",
    "Quality rating from cost service ",
    "Effective date of cost data ",
    "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
    "OPINION OF SITE VALUE = $ ................................................",
    "Dwelling",
    "Basement",
    "Deck",
    "Garage/Carport ",
    "Estimated Remaining Economic Life (HUD and VA only)",
    "Total Estimate of Cost-New = $ ...................",
    "Depreciation ",
    "Depreciated Cost of Improvements......................................................=$ ",
    "“As-is” Value of Site Improvements......................................................=$",
    "Indicated Value By Cost Approach......................................................=$",
    "Indicated Value by Cost Approach",
    "Depreciated Cost of Dwellings",
    "As Is Value of Site Improvements",
    "Opinion of Site Value",
    "Above Grade Finished Area",
    "Cost Per Square Foot",
    "Depreciated Cost",
    "Physical Depreciation",
    "Functional Depreciation",
    "External Depreciation",
    "Total Depreciation",
    "Remaining Economic Life",
    "Effective Age",
    "Site Improvement Description",
    "Site Improvement Amount",
    "Primary Site Valuation Method",
    "Land Comparable Number",
    "Land Comparable Address",
    "Land Comparable County",
    "Land Comparable Data Source",
    "Land Comparable Assessor Parcel Number (APN)",
    "Land Comparable Site Size",
    "Land Comparable Sale Date",
    "Land Comparable Sale Price",
    "Commentary on Remaining Economic Life",
    "Commentary on Effective Age",
    "Reconciliation of Site Value",
    "General Description",
    "Cost Type",
    "Cost Data Source",
    "Quality Rating",
    "Effective Date",
    "Cost Method",
    "Depreciation Method",
    "Cost Approach Commentary",
    "Cost Approach Exhibits"
  ];

  const pudInformationFields = [
    "PUD Fees $",
    "PUD Fees (per month)",
    "PUD Fees (per year)",
    "Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Unit type(s)",
    "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.",
    "Legal Name of Project",
    "Total number of phases",
    "Total number of units",
    "Total number of units sold",
    "Total number of units rented",
    "Total number of units for sale",
    "Data source(s)",
    "Was the project created by the conversion of existing building(s) into a PUD?",
    " If Yes, date of conversion",
    "Does the project contain any multi-dwelling units? Yes No Data",
    "Are the units, common elements, and recreation facilities complete?",
    "If No, describe the status of completion.",
    "Are the common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.",
    "Describe common elements and recreational facilities."
  ];

  const appraiserFields = [
    "Signature",
    "Name",
    "Company Name",
    "Company Address",
    "Telephone Number",
    "Email Address",
    "Date of Signature and Report",
    "Effective Date of Appraisal",
    "State Certification #",
    "or State License #",
    "or Other (describe)",
    "State #",
    "State",
    "Expiration Date of Certification or License",
    "ADDRESS OF PROPERTY APPRAISED",
    "APPRAISED VALUE OF SUBJECT PROPERTY $",
    "LENDER/CLIENT Name",
    "Lender/Client Company Name",
    "Lender/Client Company Address",
    "Lender/Client Email Address", "E&O", "E&O Present", "E&O Insurance",
    "Policy Period From", "Policy Period To",
    "E&O Insured", "E&O Carrier", "E&O Limit", "E&O Deductible",
    "Appraiser Certifications",
    "Appraiser Signature",
    "Appraiser Name",
    "Appraiser Credential Level",
    "Appraiser ID",
    "Appraiser State",
    "Appraiser License Expiration Date",
    "License Valid To", "LICENSE/REGISTRATION/CERTIFICATION #",
    "Supervisory Signature",
    "Supervisory Name",
    "Supervisory Company Name",
    "Supervisory Company Address",
    "Supervisory Telephone Number",
    "Supervisory Email Address",
    "Supervisory Date of Signature",
    "Supervisory State Certification #",
    "Supervisory or State License #",
    "Supervisory State",
    "Supervisory Expiration Date of Certification or License",
    "Did not inspect subject property",
    "Did inspect exterior of subject property from street",
    "Subject Property Date of Inspection (Exterior)",
    "Did inspect interior and exterior of subject property",
    "Subject Property Date of Inspection (Interior/Exterior)",
    "Did not inspect exterior of comparable sales from street",
    "Did inspect exterior of comparable sales from street",
    "Comparable Sales Date of Inspection"
  ];

  const supplementalAddendumFields = [
    "SUPPLEMENTAL ADDENDUM",
    "ADDITIONAL COMMENTS",
    "APPRAISER'S CERTIFICATION:",
    "SUPERVISORY APPRAISER'S CERTIFICATION:",
    "Analysis/Comments",
    "GENERAL INFORMATION ON ANY REQUIRED REPAIRS",
    "UNIFORM APPRAISAL DATASET (UAD) DEFINITIONS ADDENDUM",
  ];

  const uniformResidentialAppraisalReportFields = [
    "SCOPE OF WORK:",
    "INTENDED USE:",
    "INTENDED USER:",
    "DEFINITION OF MARKET VALUE:",
    "STATEMENT OF ASSUMPTIONS AND LIMITING CONDITIONS:",
  ];

  const appraisalAndReportIdentificationFields = [
    "This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).",
    "This Report is one of the following types:",
    "Comments on Standards Rule 2-3",
    "Reasonable Exposure Time",
    "Comments on Appraisal and Report Identification"
  ];

  const marketConditionsFields = [
    "Instructions:", "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
    "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).",
    "Are foreclosure sales (REO sales) a factor in the market?", "If yes, explain (including the trends in listings and sales of foreclosed properties).",
    "Cite data sources for above information.", "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
  ];

  const marketConditionsRows = [
    { label: "Total # of Comparable Sales (Settled)", fullLabel: "Inventory Analysis Total # of Comparable Sales (Settled)" },
    { label: "Absorption Rate (Total Sales/Months)", fullLabel: "Inventory Analysis Absorption Rate (Total Sales/Months)" },
    { label: "Total # of Comparable Active Listings", fullLabel: "Inventory Analysis Total # of Comparable Active Listings" },
    { label: "Months of Housing Supply (Total Listings/Ab.Rate)", fullLabel: "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate)" },

    { label: "Median Comparable Sale Price", fullLabel: "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price" },
    { label: "Median Comparable Sales Days on Market", fullLabel: "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market" },
    { label: "Median Comparable List Price", fullLabel: "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price" },
    { label: "Median Comparable Listings Days on Market", fullLabel: "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market" },
    { label: "Median Sale Price as % of List Price", fullLabel: "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price" }
  ];

  const salesHistoryFields = [
    "Date of Prior Sale/Transfer",
    "Price of Prior Sale/Transfer",
    "Data Source(s) for prior sale",
    "Effective Date of Data Source(s) for prior sale"
  ];
  const COMPARABLE_RENTAL_DATA = [
    "Address", "Proximity to Subject", "Current Monthly Rent", "Rent/Gross Bldg. Area", "Rent Control", "Data Source(s)", "Date of Lease(s)", "Location", "Actual Age", "Condition", "Gross Building Area",
    "Unit Breakdown Rm Count Tot Unit # 1", "Unit Breakdown Rm Count Br Unit # 1", "Unit Breakdown Rm Count Ba Unit # 1", "Unit Breakdown Size Unit # 1", "Unit Breakdown Monthly Rent Unit # 1",
    "Unit Breakdown Rm Count Tot Unit # 2", "Unit Breakdown Rm Count Br Unit # 2", "Unit Breakdown Rm Count Ba Unit # 2", "Unit Breakdown Size Unit # 2", "Unit Breakdown Monthly Rent Unit # 2",
    "Unit Breakdown Rm Count Tot Unit # 3", "Unit Breakdown Rm Count Br Unit # 3", "Unit Breakdown Rm Count Ba Unit # 3", "Unit Breakdown Size Unit # 3", "Unit Breakdown Monthly Rent Unit # 3",
    "Unit Breakdown Rm Count Tot Unit # 4", "Unit Breakdown Rm Count Br Unit # 4", "Unit Breakdown Rm Count Ba Unit # 4", "Unit Breakdown Size Unit # 4", "Unit Breakdown Monthly Rent Unit # 4",
    "Utilities Included"
  ];
  const SUBJECT_RENT_SCHEDULE = [
    "Unit # Lease Date  Begin Date 1", "Unit # Lease Date  Begin Date 2", "Unit # Lease Date  Begin Date 3", "Unit # Lease Date  Begin Date 4", "Unit # Lease Date End Date 1", "Unit # Lease Date End Date 2", "Unit # Lease Date End Date 3", "Unit # Lease Date End Date 4", "Actual Rents Unit # 1  Per Unit Unfurnished", "Actual Rents Unit # 2  Per Unit Unfurnished", "Actual Rents Unit # 3  Per Unit Unfurnished", "Actual Rents Unit # 4  Per Unit Unfurnished",
    "Actual Rents Unit # 1  Per Unit Furnished", "Actual Rents Unit # 2  Per Unit Furnished", "Actual Rents Unit # 3  Per Unit Furnished", "Actual Rents Unit # 4  Per Unit Furnished",
    "Actual Rents Unit # 1 Total Rents", "Actual Rents Unit # 2 Total Rents", "Actual Rents Unit # 3 Total Rents", "Actual Rents Unit # 4 Total Rents",
    "Opinion Of Market Rent Unit # 1 Per Unit Unfurnished", "Opinion Of Market Rent Unit # 2 Per Unit Unfurnished", "Opinion Of Market Rent Unit # 3 Per Unit Unfurnished", "Opinion Of Market Rent Unit # 4 Per Unit Unfurnished",
    "Opinion Of Market Rent Unit # 1 Per Unit Furnished", "Opinion Of Market Rent Unit # 2 Per Unit Furnished", "Opinion Of Market Rent Unit # 3 Per Unit Furnished", "Opinion Of Market Rent Unit # 4 Per Unit Furnished",
    "Opinion Of Market Rent Unit # 1 Total Rents", "Opinion Of Market Rent Unit # 2 Total Rents", "Opinion Of Market Rent Unit # 3 Total Rents", "Opinion Of Market Rent Unit # 4 Total Rents",
    "Comment on lease data", "Total Actual Monthly Rent", "Other Monthly Income (itemize)", "Total Actual Monthly Income", " Total Gross Monthly Rent", "Other Monthly Income (itemize)",
    "Total Estimated Monthly Income", " Utilities included in estimated rents", "Comments on actual or estimated rents and other monthly income (including personal property)",
  ];
  const salesComparisonAdditionalInfoFields = [

    "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Data Source(s) for subject property research",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Data Source(s) for comparable sales research",
    "Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Summary of Sales Comparison Approach",
    "Indicated Value by Sales Comparison Approach $",
  ];

  const infoOfSalesFields = [
    "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
    "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____"
  ];
  const condoForeclosureFields = [
    "Are foreclosure sales (REO sales) a factor in the project?", "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.", "Summarize the above trends and address the impact on the subject unit and project.",
  ];
  const condoCoopProjectsRows = [
    { label: "Total # of Comparable Sales (Settled)", fullLabel: "Subject Project Data Total # of Comparable Sales (Settled)" },
    { label: "Absorption Rate (Total Sales/Months)", fullLabel: "Subject Project Data Absorption Rate (Total Sales/Months)" },
    { label: "Total # of Comparable Active Listings", fullLabel: "Subject Project Data Total # of Comparable Active Listings" },
    { label: "Months of Unit Supply (Total Listings/Ab.Rate)", fullLabel: "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate)" },
  ];
  const imageAnalysisFields = [
    "include bedroom, bed, bathroom, bath, half bath, kitchen, lobby, foyer, living room count with label and photo,please explan and match the floor plan with photo and improvement section, GLA",
    "please match comparable address in sales comparison approach and comparable photos, please make sure comp phto are not same, also find front, rear, street photo and make sure it is not same, capture any additionbal photo for adu according to check mark",
    "please match comparable address in sales comparison approach and comparable photos, please make sure comp phto are not same, also find front, rear, street photo and make sure it is not same, capture any additionbal photo for adu according to check mark, please match the same in location map, areial map should have subject address, please check signature section details of appraiser in appraiser license copy for accuracy"
  ];
  const projectSiteFields = [
    "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley", "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area?", "Are the utilities and off-site improvements typical for the market area? If No, describe",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
  ];

  if (isNonconforming) {
    if (!projectSiteFields.includes('Legal Nonconforming (Grandfathered Use) comment')) {
      const pIndex = projectSiteFields.indexOf('Zoning Compliance');
      if (pIndex !== -1) {
        projectSiteFields.splice(pIndex + 1, 0, 'Legal Nonconforming (Grandfathered Use) comment');
      }
    }
  }
  if (zoningCompStr.includes('no zoning')) {
    if (!projectSiteFields.includes('No Zoning comment')) {
      const pIndex = projectSiteFields.indexOf('Zoning Compliance');
      if (pIndex !== -1) {
        projectSiteFields.splice(pIndex + 1, 0, 'No Zoning comment');
      }
    }
  }
  const projectInfoFields = [
    "Data source(s) for project information", "Project Description", "# of Stories",
    "# of Elevators", "Existing/Proposed/Under Const.", "Year Built",
    "Effective Age", "Exterior Walls",
    "Roof Surface", "Total # Parking", "Ratio (spaces/units)", "Type", "Guest Parking", "# of Units", "# of Units Completed",
    "# of Units For Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units",
    "# of Phases", "# of Units", "# of Units for Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units", "# of Planned Phases",
    "# of Planned Units", "# of Planned Units for Sale", "# of Planned Units Sold", "# of Planned Units Rented", "# of Planned Owner Occupied Units",
    "Project Primary Occupancy", "Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Management Group", "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?"
    , "Was the project created by the conversion of existing building(s) into a condominium?",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?", "If No, describe",
    "Is there any commercial space in the project?",
    "If Yes, describe and indicate the overall percentage of the commercial space.", "Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.", "Are any common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.", "Is the project subject to a ground rent?",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?", "If No, describe and comment on the effect on value and marketability."
  ];
  const projectAnalysisFields = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability.",
  ];
  const unitDescriptionsFields = [
    "Unit Charge$", "per month X 12 = $", "per year",
    "Annual assessment charge per year per square feet of gross living area = $",
    "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
    "Floor #",
    "# of Levels",
    "Heating Type/Fuel",
    "Central AC/Individual AC/Other (describe)",
    "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
    "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
    "Floors", "Walls", "Trim/Finish", "Bath Wainscot", "Doors",
    "None/Garage/Covered/Open", "Assigned/Owned", "# of Cars", "Parking Space #",
    "Finished area above grade contains:", "Rooms", "Bedrooms", "Bath(s)", "Square Feet of Gross Living Area Above Grade",
    "Are the heating and cooling for the individual units separately metered?", "If No, describe and comment on compatibility to other projects in the market area.",
    "Additional features (special energy efficient items, etc.)",
    "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? ", "If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", "If No, describe"
  ];

  const priorSaleHistoryFields = [
    "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
    "Prior Sale History: Data source(s) for subject",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
    "Prior Sale History: Data source(s) for comparables",
    "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: Date of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer",
    "Prior Sale History: Data Source(s) for prior sale/transfer",
    "Prior Sale History: Effective Date of Data Source(s)",
    "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Prior Sales or Transfers",
    "Subject Transfer History Data Source",
    "Comparable Number",
    "Comparable Transfer Terms",
    "Comparable Transfer Date",
    "Comparable Transfer Amount",
    "Comparable Transfer Data Source",
    "Analysis of Prior Sale and Transfer History of Subject Property",
    "Analysis of Prior Sale and Transfer History of Comparable Sales"
  ];
  const dataConsistencyFields = {
    'Bedroom': {
      'Improvements': 'Bedroom Improvements Count',
      'Grid': 'Bedroom Sales Comparison Approach Count',
      'Photo': 'Bedroom Photo Count',
      'Floorplan': 'TOTAL Bedroom Floorplan Count',
    },
    'Bathroom': {
      'Improvements': 'Bathroom Improvements Count',
      'Grid': 'Bathroom Sales Comparison Approach Count',
      'Photo': 'Bathroom Photo Count',
      'Floorplan': 'TOTAL Bathroom Floorplan Count',
    },
    'GLA': { 'Improvements': 'GLA Improvements Count', 'Grid': 'GLA Sales Comparison Approach Count', 'Photo': 'GLA Photo Count', 'Floorplan': 'GLA Floorplan Count' }
  };
  const formTypes = ['1004', '1004C', '1004D', '1025', '1073', '2090', '203k-FHA', '2055', '1075', '2095', '1007', '216', '1025 + 1007', '1073 + 1007', '1004 + 1007', '1004MC', 'Appraisal Version #1', 'ERC'];

  const sections = useMemo(() => [
    { id: 'subject-info', title: 'Subject', category: 'SUBJECT', icon: <HomeIcon /> },
    { id: 'contract-section', title: 'Contract', category: 'CONTRACT', icon: <GavelIcon /> },
    { id: 'neighborhood-section', title: 'Neighborhood', category: 'NEIGHBORHOOD', icon: <LocationCityIcon /> },
    { id: 'project-site-section', title: 'Project Site', category: 'PROJECT_SITE', icon: <TerrainIcon /> },
    { id: 'project-info-section', title: 'Project Information', category: 'PROJECT_INFO', icon: <Info /> },
    { id: 'project-analysis-section', title: 'Project Analysis', category: 'PROJECT_ANALYSIS', icon: <AnalyticsIcon /> },
    { id: 'unit-descriptions-section', title: 'Unit Descriptions', category: 'UNIT_DESCRIPTIONS', icon: <MeetingRoomIcon /> },
    { id: 'site-section', title: 'Site', category: 'SITE', icon: <TerrainIcon /> },
    { id: 'improvements-section', title: 'Improvements', category: 'IMPROVEMENTS', icon: <BuildIcon /> },
    { id: 'comparable-rental-data', title: 'COMPARABLE RENTAL DATA', category: 'COMPARABLE_RENTAL_DATA', icon: <ApartmentIcon /> },
    { id: 'subject-rent-schedule', title: 'SUBJECT RENT SCHEDULE', category: 'SUBJECT_RENT_SCHEDULE', icon: <RequestQuoteIcon /> },
    { id: 'prior-sale-history-section', title: 'Prior Sale History', category: 'PRIOR_SALE_HISTORY', icon: <HistoryIcon /> },
    { id: 'info-of-sales-section', title: 'Sales Comparison Approach', category: 'INFO_OF_SALES', icon: <MonetizationOnIcon /> },
    { id: 'sales-comparison', title: 'Sales Grid', category: 'SALES_GRID', icon: <CompareArrowsIcon /> },
    { id: 'sales-history-section', title: 'Sales History', category: 'SALES_TRANSFER', icon: <HistoryIcon /> },
    { id: 'rent-schedule-section', title: 'Comparable Rent Schedule', category: 'RENT_SCHEDULE_GRID', icon: <TableChartIcon /> },
    { id: 'rent-schedule-reconciliation-section', title: 'Rent Schedule Reconciliation', category: 'RENT_SCHEDULE_RECONCILIATION', icon: <MergeTypeIcon /> },
    { id: 'reconciliation-section', title: 'Reconciliation_Section', category: 'RECONCILIATION', icon: <BalanceIcon /> },
    { id: 'cost-approach-section', title: 'Cost Approach', category: 'COST_APPROACH', icon: <CalculateIcon /> },
    { id: 'income-approach-section', title: 'Income Approach', category: 'INCOME_APPROACH', icon: <AttachMoneyIcon /> },
    { id: 'pud-info-section', title: 'PUD Information', category: 'PUD_INFO', icon: <DomainIcon /> },
    { id: 'market-conditions-section', title: 'Market Conditions', category: 'MARKET_CONDITIONS', icon: <TrendingUpIcon /> },
    { id: 'condo-coop-section', title: 'Condo/Co-op', category: ['CONDO', 'CONDO_FORECLOSURE'], icon: <BusinessIcon /> },
    { id: 'appraiser-section', title: 'Certification', category: 'CERTIFICATION', icon: <VerifiedUserIcon /> },
    { id: 'map-sketch-exhibits-section', title: 'Map & Sketch Analysis', category: 'MAP_SKETCH_ANALYSIS', icon: <MapIcon /> },
    { id: 'photos-exhibits-section', title: 'Photos & Exhibits', category: 'EXTRACTED_PHOTOS', icon: <PhotoLibraryIcon /> },
    { id: 'raw-output', title: 'Raw Output', icon: <CodeIcon /> },
  ], []);

  const salesGridRows = [
    { label: "Address", valueKey: "Address", subjectValueKey: "Property Address" },
    { label: "Proximity to Subject", valueKey: "Proximity to Subject" },
    { label: "Proximity to Subject comment", valueKey: "Proximity to Subject comment" },
    { label: "Sale Price", valueKey: "Sale Price" },
    { label: "Sale Price/Gross Liv. Area", valueKey: "Sale Price/Gross Liv. Area" },
    { label: "Data Source(s)", valueKey: "Data Source(s)" },
    { label: "Verification Source(s)", valueKey: "Verification Source(s)" },
    { label: "Sales or Financing Concessions", valueKey: "Sales or Financing Concessions", adjustmentKey: "Sales or Financing Concessions Adjustment" },
    { label: "Date of Sale/Time", valueKey: "Date of Sale/Time", adjustmentKey: "Date of Sale/Time Adjustment" },
    { label: "Location", valueKey: "Location", adjustmentKey: "Location Adjustment" },
    { label: "Leasehold/Fee Simple", valueKey: "Leasehold/Fee Simple", adjustmentKey: "Leasehold/Fee Simple Adjustment" },
    { label: "Site", valueKey: "Site", adjustmentKey: "Site Adjustment" },
    { label: "View", valueKey: "View", adjustmentKey: "View Adjustment" },
    { label: "Design (Style)", valueKey: "Design (Style)", adjustmentKey: "Design (Style) Adjustment" },
    { label: "Quality of Construction", valueKey: "Quality of Construction", adjustmentKey: "Quality of Construction Adjustment" },
    { label: "Actual Age", valueKey: "Actual Age", adjustmentKey: "Actual Age Adjustment" },
    { label: "Condition", valueKey: "Condition", adjustmentKey: "Condition Adjustment" },
    { label: "Total Rooms", valueKey: "Total Rooms" },
    { label: "Bedrooms", valueKey: "Bedrooms", adjustmentKey: "Bedrooms Adjustment" },
    { label: "Baths", valueKey: "Baths", adjustmentKey: "Baths Adjustment" },
    { label: "Above Grade Room Count", valueKey: "Above Grade Room Count" },
    { label: "Gross Living Area", valueKey: "Gross Living Area", adjustmentKey: "Gross Living Area Adjustment" },
    { label: "Basement & Finished Rooms Below Grade", valueKey: "Basement & Finished Rooms Below Grade", adjustmentKey: "Basement & Finished Rooms Below Grade Adjustment" },
    { label: "Functional Utility", valueKey: "Functional Utility", adjustmentKey: "Functional Utility Adjustment" },
    { label: "Heating/Cooling", valueKey: "Heating/Cooling", adjustmentKey: "Heating/Cooling Adjustment" },
    { label: "Energy Efficient Items", valueKey: "Energy Efficient Items", adjustmentKey: "Energy Efficient Items Adjustment" },
    { label: "Garage/Carport", valueKey: "Garage/Carport", adjustmentKey: "Garage/Carport Adjustment" },
    { label: "Porch/Patio/Deck", valueKey: "Porch/Patio/Deck", adjustmentKey: "Porch/Patio/Deck Adjustment" },
    { label: "Net Adjustment (Total)", valueKey: "Net Adjustment (Total)" },
    { label: "Adjusted Sale Price of Comparable", valueKey: "Adjusted Sale Price of Comparable" },
  ];

  const salesGridRows1025 = [
    { label: "Address", valueKey: "Address", subjectValueKey: "Property Address" },
    { label: "Proximity to Subject", valueKey: "Proximity to Subject", subjectValueKey: "" },
    { label: "Proximity to Subject comment", valueKey: "Proximity to Subject comment", subjectValueKey: "" },
    { label: "Sale Price", valueKey: "Sale Price" },
    { label: "Sale Price/Gross Bldg. Area", valueKey: "Sale Price/Gross Bldg. Area" },
    { label: "Gross Monthly Rent", valueKey: "Gross Monthly Rent" },
    { label: "Gross Rent Multiplier", valueKey: "Gross Rent Multiplier" },
    { label: "Price Per Unit", valueKey: "Price Per Unit" },
    { label: "Price Per Room", valueKey: "Price Per Room" },
    { label: "Price Per Bedroom", valueKey: "Price Per Bedroom" },
    { label: "Rent Control", valueKey: "Rent Control" },
    { label: "Data Source(s)", valueKey: "Data Source(s)" },
    { label: "Verification Source(s)", valueKey: "Verification Source(s)" },
    { label: "Sale or Financing", valueKey: "Sales or Financing Concessions", adjustmentKey: "Sales or Financing Concessions Adjustment" },
    { label: "Date of Sale/Time", valueKey: "Date of Sale/Time", adjustmentKey: "Date of Sale/Time Adjustment" },
    { label: "Location", valueKey: "Location", adjustmentKey: "Location Adjustment" },
    { label: "Leasehold/Fee Simple", valueKey: "Leasehold/Fee Simple", adjustmentKey: "Leasehold/Fee Simple Adjustment" },
    { label: "Site", valueKey: "Site", adjustmentKey: "Site Adjustment" },
    { label: "View", valueKey: "View", adjustmentKey: "View Adjustment" },
    { label: "Design (Style)", valueKey: "Design (Style)", adjustmentKey: "Design (Style) Adjustment" },
    { label: "Quality of Construction", valueKey: "Quality of Construction", adjustmentKey: "Quality of Construction Adjustment" },
    { label: "Actual Age", valueKey: "Actual Age", adjustmentKey: "Actual Age Adjustment" },
    { label: "Condition", valueKey: "Condition", adjustmentKey: "Condition Adjustment" },
    { label: "Gross Building Area", valueKey: "Gross Building Area", adjustmentKey: "Gross Building Area Adjustment" },
    { label: "Unit Breakdown Unit #1", isUnitBreakdown: true, unitNumber: 1 },
    { label: "Unit Breakdown Unit #2", isUnitBreakdown: true, unitNumber: 2 },
    { label: "Unit Breakdown Unit #3", isUnitBreakdown: true, unitNumber: 3 },
    { label: "Unit Breakdown Unit #4", isUnitBreakdown: true, unitNumber: 4 },
    { label: "Basement Description", valueKey: "Basement Description", adjustmentKey: "Basement Description Adjustment" },
    { label: "Basement Finished Rooms", valueKey: "Basement Finished Rooms", adjustmentKey: "Basement Finished Rooms Adjustment" },
    { label: "Functional Utility", valueKey: "Functional Utility", adjustmentKey: "Functional Utility Adjustment" },
    { label: "Heating/Cooling", valueKey: "Heating/Cooling", adjustmentKey: "Heating/Cooling Adjustment" },
    { label: "Energy Efficient Items", valueKey: "Energy Efficient Items", adjustmentKey: "Energy Efficient Items Adjustment" },
    { label: "Parking On/Off Site", valueKey: "Parking On/Off Site", adjustmentKey: "Parking On/Off Site Adjustment" },
    { label: "Porch/Patio/Deck", valueKey: "Porch/Patio/Deck", adjustmentKey: "Porch/Patio/Deck Adjustment" },
    { label: "Additional Description", valueKey: "Additional Description", adjustmentKey: "Additional Adjustment" },
    { label: "Net Adjustment (Total)", valueKey: "Net Adjustment (Total)" },
    { label: "Adjusted Sale Price", valueKey: "Adjusted Sale Price of Comparable" },
    { label: "Adj. Price Per Unit", valueKey: "Adj. Price Per Unit" },
    { label: "Adj. Price Per Room", valueKey: "Adj. Price Per Room" },
    { label: "Adj. Price Per Bdrm.", valueKey: "Adj. Price Per Bdrm." },
    { label: "Value Per Unit", valueKey: "Value Per Unit" },
    { label: "Value Per Gross Bldg. Area", valueKey: "Value Per Gross Bldg. Area" },
    { label: "Value Per Room", valueKey: "Value Per Room" },
    { label: "Value Per Bdrm.", valueKey: "Value Per Bdrm." }
  ];

  const rentScheduleReconciliationFields = [
    "Comments on market data, including the range of rents for single family properties, an estimate of vacancy for single family rental properties, the general trend of rents and vacancy, and support for the above adjustments. (Rent concessions should be adjusted to the market, not to the subject property.)",
    "Final Reconciliation of Market Rent:",
    "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF",
    "TO BE $",
  ];

  const RentSchedulesFIELDS2 = [
    "Address",
    "Proximity to Subject",
    "Date Lease Begins",
    "Date Lease Expires",
    "Monthly Rental",
    "Less: Utilities",
    "Furniture",
    "Adjusted Monthly Rent",
    "Data Source",
    "Rent",
    "Concessions",
    "Location/View",
    "Location/View Adjustment",
    "Design and Appeal",
    "Design and Appeal Adjustment",
    "Age",
    "Age Adjustment",
    "Condition",
    "Condition Adjustment",
    "Room Count Total",
    "Room Count Total Adjustment",
    "Room Count Bdrms",
    "Room Count Bdrms Adjustment",
    "Room Count Baths",
    "Room Count Baths Adjustment",
    "Gross Living Area",
    "Gross Living Area Adjustment",
    "Other (e.g., basement, etc.)",
    "Other (e.g., basement, etc.) Adjustment",
    "Other:",
    "Other: Adjustment",
    "Net Adj. (total)",
    "Indicated Monthly Market Rent",
  ];

  const comparableSales = [
    "COMPARABLE SALE #1",
    "COMPARABLE SALE #2",
    "COMPARABLE SALE #3",
    "COMPARABLE SALE #4",
    "COMPARABLE SALE #5",
    "COMPARABLE SALE #6",
    "COMPARABLE SALE #7",
    "COMPARABLE SALE #8",
    "COMPARABLE SALE #9",
  ];

  const comparableRents = [
    "COMPARABLE NO. 1",
    "COMPARABLE NO. 2",
    "COMPARABLE NO. 3",
    "COMPARABLE NO. 4",
    "COMPARABLE NO. 5",
    "COMPARABLE NO. 6",
    "COMPARABLE NO. 7",
    "COMPARABLE NO. 8",
    "COMPARABLE NO. 9",
  ];

  const ComparableRentAdjustments = [
    "COMPARABLE Rental No #1",
    "COMPARABLE Rental No #2",
    "COMPARABLE Rental No #3",
    "COMPARABLE Rental No #4",
    "COMPARABLE Rental No #5",
    "COMPARABLE Rental No #6",
    "COMPARABLE Rental No #7",
    "COMPARABLE Rental No #8",
    "COMPARABLE Rental No #9",
  ]

  const handleExportJSON = () => {
    if (Object.keys(data).length === 0) {
      setNotification({ open: true, message: 'No data to export.', severity: 'warning' });
      return;
    }

    const errors = typeof getValidationErrors === 'function' ? getValidationErrors() : [];
    const successes = typeof getValidationSuccesses === 'function' ? getValidationSuccesses() : [];

    // Build quick lookup maps for errors and successes by path key and field name
    const errorMapByPath = {};
    const errorMapByName = {};
    errors.forEach(err => {
      // err: [sectionName, fieldName, message, path]
      const [, fName, message, path] = err;
      if (path && Array.isArray(path)) {
        errorMapByPath[JSON.stringify(path)] = message;
      }
      if (fName) {
        errorMapByName[fName.toLowerCase()] = message;
      }
    });

    const successMapByPath = {};
    const successMapByName = {};
    successes.forEach(suc => {
      // suc: [properSection, fieldName, status, path]
      const [, fName, status, path] = suc;
      if (path && Array.isArray(path)) {
        successMapByPath[JSON.stringify(path)] = status;
      }
      if (fName) {
        successMapByName[fName.toLowerCase()] = status;
      }
    });

    const pdfId = 'p101';
    const pdfName = selectedFile?.name || 'appraisal_data.pdf';

    let sectionIndex = 1;

    const sectionEntries = [];
    const processedSectionKeys = new Set();

    const processSection = (sectionKey, sectionTitle, sectionFieldsObj) => {
      if (!sectionFieldsObj || typeof sectionFieldsObj !== 'object') return;
      const currentSectionNum = sectionIndex++;
      const sectionId = `s${100 + currentSectionNum}`;
      let fieldCounter = currentSectionNum * 100 + 1;
      const fields = [];

      Object.entries(sectionFieldsObj).forEach(([fieldKey, rawVal]) => {
        let fieldValue = rawVal;
        let fieldComment = undefined;
        if (typeof rawVal === 'object' && rawVal !== null) {
          fieldValue = rawVal.value !== undefined ? rawVal.value : '';
          if (rawVal.comment !== undefined) fieldComment = rawVal.comment;
        }

        const path = sectionKey === 'Subject' ? [fieldKey] : [sectionKey, fieldKey];
        const pathKey = JSON.stringify(path);
        const fieldNameLower = fieldKey.toLowerCase();

        let validationStatus = 'Unvalidated';
        let validationRuleOrMessage = null;

        if (manualValidations && (manualValidations[pathKey] || manualValidations[JSON.stringify([sectionKey, fieldKey])])) {
          validationStatus = 'Passed (Manually Validated)';
          validationRuleOrMessage = 'Manual verification passed by reviewer';
        } else if (errorMapByPath[pathKey] || errorMapByName[fieldNameLower]) {
          validationStatus = 'Error';
          validationRuleOrMessage = errorMapByPath[pathKey] || errorMapByName[fieldNameLower];
        } else if (successMapByPath[pathKey] || successMapByName[fieldNameLower]) {
          validationStatus = successMapByPath[pathKey] || successMapByName[fieldNameLower] || 'Passed';
          validationRuleOrMessage = 'Passed validation rule checks';
        }

        const currentFieldId = `f${fieldCounter++}`;
        const fieldItem = {
          field_id: currentFieldId,
          field_name: fieldKey,
          field_value: fieldValue,
          ...(fieldComment !== undefined && { field_comment: fieldComment }),
          validation_on_field: validationRuleOrMessage,
          validation_status: validationStatus,
          path: path
        };

        fields.push(fieldItem);
      });

      sectionEntries.push({
        section_id: sectionId,
        section_key: sectionKey,
        section_name: sectionTitle || sectionKey,
        total_fields: fields.length,
        fields: fields
      });
    };

    // 1. Process regular sections in data
    Object.keys(data).forEach(sectionKey => {
      if (comparableSales.includes(sectionKey) || comparableRents.includes(sectionKey) || ComparableRentAdjustments.includes(sectionKey)) {
        return;
      }
      processedSectionKeys.add(sectionKey);
      const sectionData = data[sectionKey];
      if (typeof sectionData === 'object' && sectionData !== null && !Array.isArray(sectionData)) {
        processSection(sectionKey, sectionKey, sectionData);
      } else {
        // Flat field at top-level
        const path = [sectionKey];
        const pathKey = JSON.stringify(path);
        const fieldNameLower = sectionKey.toLowerCase();
        let validationStatus = 'Unvalidated';
        let validationRuleOrMessage = null;

        if (manualValidations && manualValidations[pathKey]) {
          validationStatus = 'Passed (Manually Validated)';
          validationRuleOrMessage = 'Manual verification passed by reviewer';
        } else if (errorMapByPath[pathKey] || errorMapByName[fieldNameLower]) {
          validationStatus = 'Error';
          validationRuleOrMessage = errorMapByPath[pathKey] || errorMapByName[fieldNameLower];
        } else if (successMapByPath[pathKey] || successMapByName[fieldNameLower]) {
          validationStatus = successMapByPath[pathKey] || successMapByName[fieldNameLower] || 'Passed';
          validationRuleOrMessage = 'Passed validation rule checks';
        }

        let rootSection = sectionEntries.find(s => s.section_key === 'General Information');
        if (!rootSection) {
          const currentSectionNum = sectionIndex++;
          rootSection = {
            section_id: `s${100 + currentSectionNum}`,
            section_key: 'General Information',
            section_name: 'General Information',
            total_fields: 0,
            fields: [],
            _fieldCounter: currentSectionNum * 100 + 1
          };
          sectionEntries.unshift(rootSection);
        }

        const currentFieldId = `f${rootSection._fieldCounter++}`;
        rootSection.fields.push({
          field_id: currentFieldId,
          field_name: sectionKey,
          field_value: sectionData,
          validation_on_field: validationRuleOrMessage,
          validation_status: validationStatus,
          path: path
        });
        rootSection.total_fields = rootSection.fields.length;
      }
    });

    // Cleanup temporary _fieldCounter from rootSection if present
    sectionEntries.forEach(s => {
      delete s._fieldCounter;
    });

    // 2. Process Comparable Sales sections
    comparableSales.forEach(saleName => {
      if (data[saleName] && typeof data[saleName] === 'object') {
        processedSectionKeys.add(saleName);
        processSection(saleName, `Sales Comparison - ${saleName}`, data[saleName]);
      }
    });

    // 3. Process Comparable Rents & Adjustments
    comparableRents.forEach(rentName => {
      if (data[rentName] && typeof data[rentName] === 'object') {
        processedSectionKeys.add(rentName);
        processSection(rentName, `Comparable Rent - ${rentName}`, data[rentName]);
      }
    });

    ComparableRentAdjustments.forEach(rentAdjName => {
      if (data[rentAdjName] && typeof data[rentAdjName] === 'object') {
        processedSectionKeys.add(rentAdjName);
        processSection(rentAdjName, `Rent Adjustment - ${rentAdjName}`, data[rentAdjName]);
      }
    });

    // Compute summary statistics
    let totalFields = 0;
    let totalErrors = 0;
    let totalPassed = 0;
    let totalUnvalidated = 0;

    sectionEntries.forEach(sec => {
      sec.fields.forEach(f => {
        totalFields++;
        if (f.validation_status === 'Error') totalErrors++;
        else if (f.validation_status.startsWith('Passed')) totalPassed++;
        else totalUnvalidated++;
      });
    });

    const structuredExport = {
      pdf_id: pdfId,
      pdf_name: pdfName,
      form_type: selectedFormType || data?.formType || 'Appraisal Form',
      exported_at: new Date().toISOString(),
      summary: {
        total_sections: sectionEntries.length,
        total_fields: totalFields,
        total_passed: totalPassed,
        total_errors: totalErrors,
        total_unvalidated: totalUnvalidated
      },
      sections: sectionEntries
    };

    const jsonString = JSON.stringify(structuredExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'appraisal_data'}_structured_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ open: true, message: 'Structured JSON exported successfully.', severity: 'success' });
  };

  const handleClearFiles = () => {
    setSelectedFile(null);
    setHtmlFile(null);
    setContractFile(null);
    setEngagementLetterFile(null);
    setData({});
    setExtractionAttempted(false);
    setLastExtractionTime(null);
    setRawGemini('');
    setPromptAnalysisResponse(null);
    setSubmittedPrompt('');
    setStateReqResponse(null);
    setUnpaidOkResponse(null);
    setClientReqResponse(null);
    setFhaResponse(null);
    setADUResponse(null);
    setEscalationResponse(null);
    setStateReqError('');
    setClientReqError('');
    setEscalationError('');
    setActiveSection(null);
    setModalContent(null);
    setComparisonData({});
    setContractCompareResult(null);
    setEngagementLetterCompareResult(null);
    setXmlFile(null);
    setXmlDetectedFormType(null);
    setPdfExtractedData({});
    setXmlExtractedData({});
    setPdfXmlDiffResult(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (xmlFileInputRef.current) xmlFileInputRef.current.value = '';
    if (htmlFileInputRef.current) htmlFileInputRef.current.value = '';
    if (contractFileInputRef.current) contractFileInputRef.current.value = '';
    if (engagementLetterFileInputRef.current) engagementLetterFileInputRef.current.value = '';

    if (activeTimedFileRef.current && activeTimedFileRef.current !== 'Active Document' && fileUploadTimer > 0) {
      saveFileHistoryEntry(activeTimedFileRef.current, fileUploadTimer, 'Completed');
    }
    setActiveTimedFileName('');
    activeTimedFileRef.current = '';
    tabStartTimeRef.current = null;
    tabElapsedBaseRef.current = 0;
    tabPausedRef.current = false;
    setFileUploadTimer(0);
    setIsTimerRunning(false);

    try {
      sessionStorage.removeItem('tab_active_file');
      sessionStorage.removeItem('tab_start_time');
      sessionStorage.removeItem('tab_elapsed_base');
      sessionStorage.removeItem('tab_is_paused');
      sessionStorage.removeItem('tab_saved_elapsed');
    } catch {
      // ignore
    }
    if (fileUploadTimerRef.current) clearInterval(fileUploadTimerRef.current);

    setNotification({ open: true, message: 'All files cleared.', severity: 'info' });
  };

  const confirmClearFiles = () => {
    handleClearFiles();
    setIsClearDialogOpen(false);
  };

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];

    setData({});
    setExtractionAttempted(false);
    setLastExtractionTime(null);
    setRawGemini('');
    setPromptAnalysisResponse(null);
    setSubmittedPrompt('');
    setStateReqResponse(null);
    setUnpaidOkResponse(null);
    setClientReqResponse(null);
    setFhaResponse(null);
    setADUResponse(null);
    setEscalationResponse(null);
    setStateReqError('');
    setClientReqError('');
    setEscalationError('');
    setActiveSection(null);
    setModalContent(null);

    if (file) {
      if (file.name.toLowerCase().endsWith('.xml')) {
        setXmlFile(file);
        setExtractionSource('xml');
        startFileUploadTimer(file.name);
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result;
            const detected = detectFormTypeFromXmlString(text);
            if (detected) {
              setSelectedFormType(detected);
              setXmlDetectedFormType(detected);
            }
          };
          reader.readAsText(file.slice(0, 150000));
        } catch (e) {
          console.error("Instant XML detection error:", e);
        }
        setNotification({
          open: true, message: `XML file '${file.name}' uploaded successfully. Extraction source set to XML.`, severity: 'success'
        });
        extractInitialSections(file, 'xml');
        return;
      }
      setSelectedFile(file);
      setExtractionSource('pdf');
      startFileUploadTimer(file.name);
      setNotification({
        open: true, message: 'PDF file uploaded successfully.', severity: 'success'
      });
      extractInitialSections(file, 'pdf');
    }
  };

  const onXmlFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        setNotification({ open: true, message: 'Please select a valid XML file.', severity: 'error' });
        return;
      }
      setData({});
      setXmlExtractedData({});
      setComparisonData({});
      setPdfXmlDiffResult([]);
      setExtractionAttempted(false);
      setLastExtractionTime(null);
      setRawGemini('');
      setXmlFile(file);
      setExtractionSource('xml');
      startFileUploadTimer(file.name);
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result;
          const detected = detectFormTypeFromXmlString(text);
          if (detected) {
            setSelectedFormType(detected);
            setXmlDetectedFormType(detected);
          }
        };
        reader.readAsText(file.slice(0, 150000));
      } catch (err) {
        console.error("Instant XML detection error:", err);
      }
      setNotification({
        open: true,
        message: `XML file '${file.name}' uploaded successfully. Extraction source switched to XML.`,
        severity: 'success'
      });
      extractInitialSections(file, 'xml');
    }
  };

  const handleExtractionSourceChange = (newSource) => {
    setExtractionSource(newSource);
    if (newSource === 'xml') {
      if (Object.keys(xmlExtractedData).length > 0) {
        setData(xmlExtractedData);
        if (Object.keys(pdfExtractedData).length > 0) {
          setComparisonData(pdfExtractedData);
        }
      }
      setNotification({
        open: true,
        message: 'Extraction source set to XML. Clicking sidebar sections will extract from XML.',
        severity: 'info'
      });
    } else {
      if (Object.keys(pdfExtractedData).length > 0) {
        setData(pdfExtractedData);
        if (Object.keys(xmlExtractedData).length > 0) {
          setComparisonData(xmlExtractedData);
        }
      }
      setNotification({
        open: true,
        message: 'Extraction source set to PDF. Clicking sidebar sections will extract from PDF.',
        severity: 'info'
      });
    }
  };

  const handleOpenPdfXmlDiff = async () => {
    setIsPdfXmlDiffOpen(true);
    setPdfXmlDiffLoading(true);
    setPdfXmlDiffError('');
    try {
      const activePdf = selectedFile || (xmlFile && xmlFile.name.toLowerCase().endsWith('.pdf') ? xmlFile : null);
      const activeXml = xmlFile || (selectedFile && selectedFile.name.toLowerCase().endsWith('.xml') ? selectedFile : null);
      if (!activePdf || !activeXml) {
        throw new Error('Both a PDF file and an XML file must be uploaded to run comparison.');
      }
      const formData = new FormData();
      formData.append('pdf_file', activePdf);
      formData.append('xml_file', activeXml);
      const res = await fetch(`${API_BASE_URL}/api/compare-pdf-xml/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to compare PDF and XML files.');
      }
      const json = await res.json();
      setPdfXmlDiffResult(json.comparison_results || []);
      if (json.pdf_data) setPdfExtractedData(prev => ({ ...prev, ...json.pdf_data }));
      if (json.xml_data) setXmlExtractedData(prev => ({ ...prev, ...json.xml_data }));
    } catch (err) {
      setPdfXmlDiffError(err.message || 'Comparison failed');
    } finally {
      setPdfXmlDiffLoading(false);
    }
  };

  const handleApplyAllXml = () => {
    if (xmlExtractedData && Object.keys(xmlExtractedData).length > 0) {
      setData(prev => ({ ...prev, ...xmlExtractedData }));
      setComparisonData(pdfExtractedData);
      setNotification({ open: true, message: 'All XML values applied to form.', severity: 'success' });
      setIsPdfXmlDiffOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const [rawGemini, setRawGemini] = useState('');

  const validateInputs = () => {
    const activeFile = extractionSource === 'xml' ? (xmlFile || selectedFile) : (selectedFile || xmlFile);
    if (!activeFile) {
      setNotification({ open: true, message: 'Please select a PDF or XML file first.', severity: 'warning' });
      return false;
    }
    const name = activeFile.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.xml')) {
      setNotification({ open: true, message: 'Only PDF and XML files are supported.', severity: 'error' });
      return false;
    }
    return true;
  };

  const startExtractionProcess = () => {
    setLoading(true);
    setExtractionAttempted(true);
    setExtractionProgress(0);
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const callExtractionAPI = async (formType, category, onRetry, sourceOverride) => {
    setExtractionProgress(10);
    const retries = 3;
    let progressInterval;
    const delay = 1000;
    const currentSource = sourceOverride || extractionSource;
    const activeFile = currentSource === 'xml' ? (xmlFile || selectedFile) : (selectedFile || xmlFile);

    for (let i = 0; i < retries; i++) {
      try {
        const formData = new FormData();
        formData.append('file', activeFile);
        formData.append('form_type', formType);
        if (category) {
          formData.append('category', category);
        }

        progressInterval = setInterval(() => {
          setExtractionProgress(prev => (prev < 40 ? prev + 5 : prev));
        }, 500);

        const response = await fetch(`${API_BASE_URL}/api/extract/`, {
          method: 'POST', body: formData
        });

        if (!response.ok) {
          let error;
          try {
            const err = await response.json();
            error = new Error(err.error || 'Extraction failed with a non-JSON response.');
          } catch (jsonError) {
            const errorText = await response.text();
            error = new Error(errorText || 'An unknown extraction error occurred.');
          }
          throw error;
        }
        clearInterval(progressInterval);
        setExtractionProgress(90);
        return await response.json();
      } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        if (i < retries - 1) {
          const currentDelay = delay * Math.pow(2, i);
          onRetry(i + 1, retries);
          await new Promise(res => setTimeout(res, currentDelay));
        } else {
          throw error;
        }
      }
    }
  };

  const processExtractionResult = (result, startTime, category, sourceOverride) => {
    const currentSource = sourceOverride || extractionSource;
    const normalizedFields = {};
    const longUtilField = "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]";
    if (result.fields && result.fields[longUtilField]) {
      result.fields["Utilities included in the unit monthly assessment"] = result.fields[longUtilField];
    }

    const rawType = result.form_type || result.fields?.['Form Type'] || result.fields?.['From Type'] || result.fields?.['formType'] || result.clean_data?.['Form Type'] || '';
    if (rawType) {
      const finalFormType = normalizeExtractedFormType(rawType);
      if (finalFormType && formTypes.includes(finalFormType)) {
        setSelectedFormType(finalFormType);
        if (currentSource === 'xml') {
          setXmlDetectedFormType(finalFormType);
        }
        normalizedFields['Form Type'] = finalFormType;
        normalizedFields['From Type'] = finalFormType;
        normalizedFields['formType'] = finalFormType;
        normalizedFields['selectedFormType'] = finalFormType;
        setNotification({
          open: true,
          message: `Form type automatically set to '${finalFormType}'.`,
          severity: 'success'
        });
      } else if (finalFormType) {
        setNotification({ open: true, message: `Extracted form type '${finalFormType}' is not supported. Please select manually.`, severity: 'warning' });
      }
    }

    Object.keys(result.fields || {}).forEach(key => {
      if (key.toUpperCase() === "SUBJECT") {
        normalizedFields["Subject"] = { ...(normalizedFields["Subject"] || {}), ...(result.fields[key] || {}) };
      } else {
        normalizedFields[key] = result.fields[key];
      }
    });
    Object.assign(normalizedFields, result.fields);

    // Unpack SALES_GRID comps (keep Subject section and Sales Grid completely distinct)
    const salesGrid = result.fields?.SALES_GRID || result.clean_data?.['Sales Grid'] || result.clean_data?.SALES_GRID || result.SALES_GRID;
    if (salesGrid && typeof salesGrid === 'object') {
      normalizedFields["SALES_GRID"] = salesGrid;
      Object.keys(salesGrid).forEach(compKey => {
        if (typeof salesGrid[compKey] === 'object' && salesGrid[compKey] !== null) {
          if (!compKey.toLowerCase().includes('subject')) {
            normalizedFields[compKey] = salesGrid[compKey];
            const m = compKey.match(/#\s*(\d+)/);
            if (m) {
              const num = m[1];
              normalizedFields[`COMPARABLE SALE #${num}`] = salesGrid[compKey];
              normalizedFields[`COMPARABLE SALE # ${num}`] = salesGrid[compKey];
              normalizedFields[`COMPARABLE #${num}`] = salesGrid[compKey];
              normalizedFields[`COMPARABLE # ${num}`] = salesGrid[compKey];
              normalizedFields[`Comparable Sale #${num}`] = salesGrid[compKey];
              normalizedFields[`Comp ${num}`] = salesGrid[compKey];
            }
          }
        }
      });
    }

    // Unpack Comparable Rental Data comps
    const rentGrid = result.fields?.['Comparable Rental Data'] ||
      result.fields?.['COMPARABLE_RENTAL_DATA'] ||
      result.clean_data?.['Comparable Rental Data'] ||
      result.clean_data?.['COMPARABLE_RENTAL_DATA'] ||
      result['Comparable Rental Data'] ||
      result['COMPARABLE_RENTAL_DATA'];
    if (rentGrid && typeof rentGrid === 'object') {
      normalizedFields["Comparable Rental Data"] = { ...(normalizedFields["Comparable Rental Data"] || {}), ...rentGrid };
      normalizedFields["COMPARABLE_RENTAL_DATA"] = { ...(normalizedFields["COMPARABLE_RENTAL_DATA"] || {}), ...rentGrid };
      Object.keys(rentGrid).forEach(compKey => {
        if (typeof rentGrid[compKey] === 'object' && rentGrid[compKey] !== null) {
          normalizedFields[compKey] = rentGrid[compKey];
          const m = compKey.match(/(\d+)/);
          if (m) {
            const num = m[1];
            normalizedFields[`COMPARABLE NO. ${num}`] = rentGrid[compKey];
            normalizedFields[`COMPARABLE NO ${num}`] = rentGrid[compKey];
            normalizedFields[`COMPARABLE RENTAL #${num}`] = rentGrid[compKey];
            normalizedFields[`COMPARABLE #${num}`] = rentGrid[compKey];
            normalizedFields[`Rental ${num}`] = rentGrid[compKey];
            normalizedFields[`Comp ${num}`] = rentGrid[compKey];
          }
        }
      });
    }

    // Unpack Single Family Rent Schedule (Subject)
    const rentSubj = result.fields?.['Single Family Rent Schedule'] ||
      result.clean_data?.['Single Family Rent Schedule'] ||
      result.fields?.['Subject Rent Schedule'] ||
      result.clean_data?.['Subject Rent Schedule'] ||
      result['Single Family Rent Schedule'];
    if (rentSubj && typeof rentSubj === 'object') {
      normalizedFields["Single Family Rent Schedule"] = { ...(normalizedFields["Single Family Rent Schedule"] || {}), ...rentSubj };
      normalizedFields["Subject Rent Schedule"] = { ...(normalizedFields["Subject Rent Schedule"] || {}), ...rentSubj };
    }

    if (result.extracted_photos && Array.isArray(result.extracted_photos)) {
      normalizedFields["EXTRACTED_PHOTOS"] = result.extracted_photos;
      normalizedFields["extracted_photos"] = result.extracted_photos;
    }
    if (result.mathematical_verification) {
      normalizedFields["MATHEMATICAL_VERIFICATION"] = result.mathematical_verification;
      normalizedFields["mathematical_verification"] = result.mathematical_verification;
    }
    if (result.clean_data && typeof result.clean_data === 'object') {
      normalizedFields["clean_data"] = result.clean_data;
    }

    setData(prevData => {
      const updatedData = { ...prevData, ...normalizedFields };
      Object.keys(normalizedFields).forEach(key => {
        if (typeof normalizedFields[key] === 'object' && normalizedFields[key] !== null && !Array.isArray(normalizedFields[key])) {
          updatedData[key] = { ...(prevData[key] || {}), ...normalizedFields[key] };
        }
      });
      return updatedData;
    });

    if (result.fields) {
      if (currentSource === 'xml') {
        setXmlExtractedData(prev => ({ ...prev, ...normalizedFields }));
        if (Object.keys(pdfExtractedData).length > 0) {
          setComparisonData(pdfExtractedData);
        }
      } else {
        setPdfExtractedData(prev => ({ ...prev, ...normalizedFields }));
        if (Object.keys(xmlExtractedData).length > 0) {
          setComparisonData(xmlExtractedData);
        }
      }
    }

    setRawGemini(result.raw || '');
    const durationInMs = Math.max(100, Date.now() - startTime);
    const durationInSeconds = durationInMs / 1000;
    const totalSeconds = Math.floor(durationInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const sectionName = category ? `${category.replace(/_/g, ' ').toLowerCase()} section` : 'extraction';
    let durationMessage = '';
    if (minutes > 0) {
      durationMessage += `${minutes}m ${seconds}s`;
    } else {
      durationMessage += `${durationInSeconds >= 1 ? durationInSeconds.toFixed(1) : durationInSeconds.toFixed(2)}s`;
    }
    setNotification({
      open: true,
      message: <>Extraction of <strong style={{ color: '#000000' }}>{sectionName}</strong> completed in {durationMessage}.</>,
      severity: 'success'
    });
    setLastExtractionTime(durationInSeconds.toFixed(1));
    setExtractionProgress(100);
  };

  // if (result.fields?.INCOME_APPROACH?.['Estimated Monthly Market Rent $'] && selectedFormType !== '1007') {
  //   setIsRentFormTypeMismatchDialogOpen(true);
  // } else {
  //   const sectionName = category ? `${category.replace(/_/g, ' ').toLowerCase()} section` : 'extraction';
  //   let durationMessage = '';
  //   if (minutes > 0) {
  //     durationMessage += `${minutes}m `;
  //   }
  //   durationMessage += `${seconds}s`;
  //   setNotification({
  //     open: true,
  //     message: <>Extraction of <strong style={{ color: '#000000' }}>{sectionName}</strong> completed in {durationMessage}.</>,
  //     severity: 'success'
  //   });
  // }
  // setLastExtractionTime(totalSeconds.toFixed(1));
  // setExtractionProgress(100);

  const handleExtract = async (category, sectionId, sourceOverride) => {
    setNotification({ open: false, message: '', severity: 'info' });
    if (!validateInputs()) return;

    const currentSource = sourceOverride || extractionSource;
    const activeFile = currentSource === 'xml' ? (xmlFile || selectedFile) : (selectedFile || xmlFile);

    if (!category && !activeFile) {
      setNotification({ open: true, message: 'Please select a section from the sidebar to extract.', severity: 'info' });
      return;
    }

    startExtractionProcess();
    const startTime = Date.now();
    const categories = Array.isArray(category) ? category : [category];

    setLoadingSection(sectionId);
    setExtractedSections(prev => new Set(prev).add(sectionId));
    const extractionPromises = categories.map(cat =>
      callExtractionAPI(selectedFormType, cat, (attempt, maxAttempts) => {
        setNotification({ open: true, message: `Extraction for ${cat} failed. Retrying... (Attempt ${attempt}/${maxAttempts})`, severity: 'warning' });
      }, currentSource).then(result => ({ category: cat, result }))
    );

    try {
      const results = await Promise.allSettled(extractionPromises);
      results.forEach(p => {
        if (p.status === 'fulfilled') {
          processExtractionResult(p.value.result, startTime, p.value.category, currentSource);
        } else {
          setNotification({ open: true, message: p.reason.message || `An unknown error occurred during extraction.`, severity: 'error' });
        }
      });
    } catch (e) {
      setNotification({ open: true, message: e.message || 'An unexpected error occurred during extraction.', severity: 'error' });
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);

      setLoadingSection(null);
      if (extractionProgress !== 100) setExtractionProgress(0);
    }
  };

  const extractInitialSections = async (fileOverride, sourceOverride) => {
    const currentSource = sourceOverride || extractionSource;
    const activeFile = fileOverride || (currentSource === 'xml' ? (xmlFile || selectedFile) : (selectedFile || xmlFile));
    if (!activeFile) return;

    const initialCategories = ['SUBJECT'];
    setLoading(true);
    setExtractionAttempted(true);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

    let extractedDataResult = null;
    let detectedFormType = selectedFormType || '1004';

    for (const category of initialCategories) {
      try {
        const categoryStartTime = Date.now();
        const formData = new FormData();
        formData.append('file', activeFile);
        formData.append('form_type', detectedFormType);
        formData.append('category', category);

        const res = await fetch(`${API_BASE_URL}/api/extract/`, { method: 'POST', body: formData });

        if (!res.ok) {
          throw new Error(`Failed to extract ${category}`);
        }

        const result = await res.json();
        extractedDataResult = result;
        if (result.form_type) {
          const norm = normalizeExtractedFormType(result.form_type);
          if (norm) detectedFormType = norm;
        }
        processExtractionResult(result, categoryStartTime, category, currentSource);
      } catch (error) {
        console.error(error);
      }
    }

    setLoading(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Automatically trigger and output all requirement checks (State, Client, Escalation) upon file upload
    const payloadFields = extractedDataResult?.fields || {};
    triggerAutoRequirementChecks(activeFile, payloadFields, detectedFormType);
  };

  const handlePromptAnalysis = async (prompt) => {
    if (!selectedFile) {
      setPromptAnalysisError('Please select a PDF file first.');
      return;
    }

    setPromptAnalysisLoading(true);
    setPromptAnalysisError('');
    setPromptAnalysisResponse(null);
    setModalContent(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('form_type', selectedFormType);
    formData.append('comment', prompt);

    try {
      const res = await fetch(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }

      setPromptAnalysisResponse(result.fields);
      setSubmittedPrompt(prompt);
    } catch (e) {
      setPromptAnalysisError(e.message || 'An unexpected error occurred.');
    } finally {
      setPromptAnalysisLoading(false);
    }
  };

  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    const timeout = 60000;
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        if (res.status < 500) {
          return res;
        }

        console.warn(`Attempt ${i + 1}: Server error ${res.status}. Retrying in ${delay / 1000}s...`);
      } catch (error) {
        console.warn(`Attempt ${i + 1}: Network error. Retrying in ${delay / 1000}s...`, error);
      }
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve));
        delay *= 2;
      }
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
  };

  const sanitizeExtractedDataForUpload = (sourceData) => {
    if (!sourceData || typeof sourceData !== 'object') return sourceData;
    const stripImages = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => stripImages(item));
      }
      if (obj && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (
            k === 'base64_preview' ||
            k === 'image_data' ||
            k === 'base64_data' ||
            k === 'base64' ||
            k === 'image_bytes' ||
            k === 'raw_bytes'
          ) continue;
          out[k] = stripImages(v);
        }
        return out;
      }
      return obj;
    };
    return stripImages(sourceData);
  };

  const handleStateRequirementCheck = async (promptOrForceReload = false, fileOverride = null, dataOverride = null, formTypeOverride = null) => {
    const activeFile = fileOverride || selectedFile || xmlFile;
    if (!activeFile) {
      setStateReqError('Please select a PDF or XML file first.');
      return;
    }

    setStateReqLoading(true);
    setStateReqError('');
    setStateReqResponse(null);

    const activeFormType = formTypeOverride || selectedFormType || '1004';
    const activeData = dataOverride || data;
    const commentPrompt = typeof promptOrForceReload === 'string' ? promptOrForceReload : STATE_REQUIREMENTS_PROMPT;

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', activeFormType);
    formData.append('comment', commentPrompt);
    formData.append('category', 'STATE_REQUIREMENT_CHECK');
    if (activeData && Object.keys(activeData).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(activeData)));
    }

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      }, 3, 1000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setStateReqResponse(responseData);
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setStateReqError(errorMsg);
    } finally {
      setStateReqLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleUnpaidOkCheck = async (forceReload = false, fileOverride = null, dataOverride = null, formTypeOverride = null) => {
    const activeFile = fileOverride || selectedFile || xmlFile;
    if (!activeFile) {
      setUnpaidOkError('Please select a PDF or XML file first.');
      return;
    }
    if (unpaidOkResponse && !forceReload) {
      setModalContent({
        title: 'Unpaid OK Lender Check',
        Component: UnpaidOkCheck,
        props: { loading: false, response: unpaidOkResponse, error: unpaidOkError }
      });
      setIsCheckModalOpen(true);
      return;
    }

    setUnpaidOkLoading(true);
    setUnpaidOkError('');
    setUnpaidOkResponse(null);

    setModalContent({
      title: 'Unpaid OK Lender Check',
      Component: UnpaidOkCheck,
      props: { loading: true }
    });
    setIsCheckModalOpen(true);

    const activeFormType = formTypeOverride || selectedFormType || '1004';
    const activeData = dataOverride || data;

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', activeFormType);
    formData.append('comment', UNPAID_OK_PROMPT);
    formData.append('category', 'UNPAID_OK_CHECK');
    if (activeData && Object.keys(activeData).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(activeData)));
    }

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      }, 3, 1000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setUnpaidOkResponse(responseData);
      setModalContent({
        title: 'Unpaid OK Lender Check',
        Component: UnpaidOkCheck,
        props: { loading: false, response: responseData, error: '' }
      });
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setUnpaidOkError(errorMsg);
      setModalContent({
        title: 'Unpaid OK Lender Check',
        Component: UnpaidOkCheck,
        props: { loading: false, response: null, error: errorMsg }
      });
    } finally {
      setUnpaidOkLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleClientRequirementCheck = async (promptOrForceReload = false, fileOverride = null, dataOverride = null, formTypeOverride = null) => {
    const activeFile = fileOverride || selectedFile || xmlFile;
    if (!activeFile) {
      setClientReqError('Please select a PDF or XML file first.');
      return;
    }

    setClientReqLoading(true);
    setClientReqError('');
    setClientReqResponse(null);

    const activeFormType = formTypeOverride || selectedFormType || '1004';
    const activeData = dataOverride || data;
    const commentPrompt = typeof promptOrForceReload === 'string' ? promptOrForceReload : CLIENT_REQUIREMENT_PROMPT;

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', activeFormType);
    formData.append('comment', commentPrompt);
    formData.append('category', 'CLIENT_REQUIREMENT_CHECK');
    if (activeData && Object.keys(activeData).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(activeData)));
    }

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      }, 3, 1000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setClientReqResponse(responseData);
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setClientReqError(errorMsg);
    } finally {
      setClientReqLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleFhaCheck = async (promptOrForceReload = false, fileOverride = null, dataOverride = null, formTypeOverride = null) => {
    const activeFile = fileOverride || selectedFile || xmlFile;
    if (!activeFile) {
      setFhaError('Please select a PDF or XML file first.');
      return;
    }

    setFhaLoading(true);
    setFhaError('');
    setFhaResponse(null);

    const activeFormType = formTypeOverride || selectedFormType || '1004';
    const activeData = dataOverride || data;
    const commentPrompt = typeof promptOrForceReload === 'string' ? promptOrForceReload : FHA_REQUIREMENTS_PROMPT;

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', activeFormType);
    formData.append('comment', commentPrompt);
    formData.append('category', 'FHA_REQUIREMENT_CHECK');
    if (activeData && Object.keys(activeData).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(activeData)));
    }

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      }, 3, 1000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setFhaResponse(responseData);
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setFhaError(errorMsg);
    } finally {
      setFhaLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleADUCheck = async (forceReload = false) => {
    const activeFile = selectedFile || xmlFile;
    if (!activeFile) {
      setADUError('Please select a PDF or XML file first.');
      return;
    }

    if (ADUResponse && !forceReload) {
      setModalContent({
        title: 'ADU File Check',
        Component: ADUCheck,
        props: { loading: false, response: ADUResponse, error: ADUError }
      });
      setIsCheckModalOpen(true);
      return;
    }

    setADULoading(true);
    setADUError('');
    setADUResponse(null);

    setModalContent({
      title: 'ADU File Check',
      Component: ADUCheck,
      props: { loading: true }
    });
    setIsCheckModalOpen(true);

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', selectedFormType);
    formData.append('comment', ADU_REQUIREMENTS_PROMPT);
    formData.append('category', 'ADU_CHECK');
    if (data && Object.keys(data).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(data)));
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setADUResponse(responseData);
      setModalContent({
        title: 'ADU File Check',
        Component: ADUCheck,
        props: { loading: false, response: responseData, error: '' }
      });
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setADUError(errorMsg);
      setModalContent({
        title: 'ADU File Check',
        Component: ADUCheck,
        props: { loading: false, response: null, error: errorMsg }
      });
    } finally {
      setADULoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleEscalationCheck = async (promptOrForceReload = false, fileOverride = null, dataOverride = null, formTypeOverride = null) => {
    const activeFile = fileOverride || selectedFile || xmlFile;
    if (!activeFile) {
      setEscalationError('Please select a PDF or XML file first.');
      return;
    }

    setEscalationLoading(true);
    setEscalationError('');
    setEscalationResponse(null);

    const activeFormType = formTypeOverride || selectedFormType || '1004';
    const activeData = dataOverride || data;
    const commentPrompt = typeof promptOrForceReload === 'string' ? promptOrForceReload : ESCALATION_CHECK_PROMPT;

    const formData = new FormData();
    formData.append('file', activeFile);
    formData.append('form_type', activeFormType);
    formData.append('comment', commentPrompt);
    formData.append('category', 'ESCALATION_CHECK');
    if (activeData && Object.keys(activeData).length > 0) {
      formData.append('extracted_data', JSON.stringify(sanitizeExtractedDataForUpload(activeData)));
    }

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/extract/`, {
        method: 'POST',
        body: formData,
      }, 3, 1000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || `HTTP error! status: ${res.status}`);
      }
      const responseData = result.fields || result;
      setEscalationResponse(responseData);
    } catch (e) {
      const errorMsg = e.message || 'An unexpected error occurred.';
      setEscalationError(errorMsg);
    } finally {
      setEscalationLoading(false);
    }
  };

  const triggerAutoRequirementChecks = (activeFile, extractedData, formType) => {
    if (!activeFile) return;

    // Concurrently trigger State, Client, Escalation, and FHA checks upon file upload
    const checks = [
      handleStateRequirementCheck(true, activeFile, extractedData, formType),
      handleClientRequirementCheck(true, activeFile, extractedData, formType),
      handleEscalationCheck(true, activeFile, extractedData, formType),
    ];

    const hasFha = Boolean(
      extractedData?.['FHA Case No.'] ||
      extractedData?.['FHA Case #'] ||
      extractedData?.['FHA Case Number'] ||
      extractedData?.Subject?.['FHA Case No.'] ||
      extractedData?.Subject?.['FHA Case #'] ||
      extractedData?.Subject?.['FHA Case Number'] ||
      String(extractedData?.Subject?.['Loan Type'] || '').toUpperCase().includes('FHA')
    );
    if (hasFha) {
      checks.push(handleFhaCheck(true, activeFile, extractedData, formType));
    }

    Promise.allSettled(checks).catch(err => {
      console.error("Auto requirement checks error:", err);
    });
  };

  const handleSectionClick = (section) => {
    setActiveSection(section.id);
    const element = document.getElementById(section.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (!section.category) {
      return;
    }

    setNotification({ open: true, message: `Extracting ${section.title}...`, severity: 'info' });
    handleExtract(section.category, section.id);
  };

  const handleArrowClick = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    document.querySelectorAll('.section-active').forEach(el => {
      el.classList.remove('section-active');
    });

    if (activeSection) {
      const element = document.getElementById(activeSection);
      if (element) {
        element.classList.add('section-active');
      }
    }
  }, [activeSection]);

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  useEffect(() => {
    if (notification.open) {
      if (notification.severity === 'success' || notification.severity === 'upload') {
        playSound(notification.severity);
      } else if (notification.severity === 'error' || notification.severity === 'warning') {
        playSound('error');
      }
    }
  }, [notification]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (activeTimedFileRef.current && activeTimedFileRef.current !== 'Active Document' && (fileUploadTimerValRef.current || fileUploadTimer) > 0) {
        saveFileHistoryEntry(activeTimedFileRef.current, fileUploadTimerValRef.current || fileUploadTimer, 'Completed');
      }
      if (Object.keys(data).length > 0 || selectedFile) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data, selectedFile, fileUploadTimer, saveFileHistoryEntry]);

  const handleGeneratePdf = () => {
    if (Object.keys(data).length === 0) {
      setNotification({ open: true, message: 'No data to generate PDF.', severity: 'warning' });
      return;
    }

    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        let yPos = margin;

        const addHeaderFooter = () => {
          const pageCount = doc.internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('Appraisal Report Summary', margin, 10);
            doc.text(new Date().toLocaleDateString(), pageWidth - margin, 10, { align: 'right' });
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          }
        };

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Review Details', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const totalTime = formatTimeHHMMSS(fileUploadTimer);
        const detailsBody = [
          ['File Name', selectedFile?.name || activeTimedFileName || xmlFile?.name || 'N/A'],
          ['User', username],
          ['Total Time Taken', totalTime]
        ];
        autoTable(doc, {
          startY: yPos,
          body: detailsBody,
          theme: 'plain',
          styles: { cellPadding: 1 },
          columnStyles: { 0: { fontStyle: 'bold' } }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        const addSection = (title, sectionFields, sectionData, usePre = false) => {
          const dataForSection = sectionData || {};

          if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
          }
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(40);
          doc.text(title, margin, yPos);
          yPos += 8;

          const body = sectionFields.map(field => {
            let value = dataForSection[field];
            if (typeof value === 'object' && value !== null) {
              value = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n');
            }
            return [field, value || ''];
          });

          if (body.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Field', 'Value']],
              body: body,
              theme: 'grid',
              headStyles: { fillColor: [22, 160, 133], textColor: 255 },
              columnStyles: { 0: { cellWidth: 60 } },
              didDrawPage: (data) => { yPos = data.cursor.y + 10; },
              willDrawCell: (data) => {
                if (data.section === 'body' && usePre) {
                  doc.setFont('Courier');
                }
              }
            });
            yPos = doc.lastAutoTable.finalY + 10;
          } else {
            yPos -= 8;
          }
        };
        const sectionDefinitions = [
          { id: 'subject-info', title: 'Subject Information', fields: subjectFields, data: data.Subject || data },
          { id: 'contract-section', title: 'Contract', fields: contractFields, data: data.CONTRACT },
          { id: 'neighborhood-section', title: 'Neighborhood', fields: neighborhoodFields, data: data.NEIGHBORHOOD },
          { id: 'site-section', title: 'Site', fields: siteFields, data: data.SITE },
          { id: 'improvements-section', title: 'Improvements', fields: improvementsFields, data: data.IMPROVEMENTS },
          { id: 'sales-history-section', title: 'Sales History', fields: salesHistoryFields, data: data.SALES_TRANSFER },
          { id: 'prior-sale-history-section', title: 'Prior Sale History', fields: priorSaleHistoryFields, data: data.PRIOR_SALE_HISTORY, usePre: true },
          { id: 'reconciliation-section', title: 'Reconciliation', fields: reconciliationFields, data: data.RECONCILIATION },
          { id: 'cost-approach-section', title: 'Cost Approach', fields: costApproachFields, data: data.COST_APPROACH },
          { id: 'income-approach-section', title: 'Income Approach', fields: incomeApproachFields, data: data.INCOME_APPROACH },
          { id: 'pud-info-section', title: 'PUD Information', fields: pudInformationFields, data: data.PUD_INFO },
          { id: 'market-conditions-section', title: 'Market Conditions Addendum', fields: marketConditionsFields, data: data.MARKET_CONDITIONS, usePre: true },
          { id: 'appraiser-section', title: 'Certification/Signature Section', fields: appraiserFields, data: data.CERTIFICATION },
        ];

        sectionDefinitions.forEach(section => {
          addSection(section.title, section.fields, section.data, section.usePre)
        });

        if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin; }
        const targetGridRowsPdf = (selectedFormType === 'Form 1025' || selectedFormType === '1025')
          ? (salesGridRows1025 || salesGridRows)
          : salesGridRows;

        const activeCompsPdf = comparableSales.filter(sale => {
          const compData = data[sale];
          if (!compData) return false;
          return Object.values(compData).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        });

        const compsToRenderPdf = activeCompsPdf.length > 0 ? activeCompsPdf : comparableSales.slice(0, 3);

        const compChunksPdf = [];
        for (let i = 0; i < compsToRenderPdf.length; i += 3) {
          compChunksPdf.push(compsToRenderPdf.slice(i, i + 3));
        }

        compChunksPdf.forEach((chunk, chunkIdx) => {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(40);
          const sectionTitle = chunkIdx === 0 ? 'Sales Comparison Approach' : `Sales Comparison Approach (Comps ${chunkIdx * 3 + 1} - ${chunkIdx * 3 + chunk.length})`;
          doc.text(sectionTitle, margin, yPos);
          yPos += 8;

          const head = [['Feature', 'Subject', ...chunk]];
          const body = [];

          targetGridRowsPdf.forEach((row) => {
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
                { content: 'Unit Breakdown', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: 'Total / Br / Ba', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } },
                ...chunk.map(() => ({ content: 'Total / Br / Ba / Adj', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }))
              ]);
            }

            if (row.isUnitBreakdown) {
              const u = row.unitNumber;
              const totKey = `Unit Breakdown Tot Unit # ${u}`;
              const brKey = `Unit Breakdown Br Unit # ${u}`;
              const baKey = `Unit Breakdown Ba Unit # ${u}`;
              const adjKey = `Unit Breakdown Adjustment Unit # ${u}`;

              const subjTot = data.Subject?.[totKey] || '';
              const subjBr = data.Subject?.[brKey] || '';
              const subjBa = data.Subject?.[baKey] || '';
              const subjStr = [subjTot && `Tot:${subjTot}`, subjBr && `Br:${subjBr}`, subjBa && `Ba:${subjBa}`].filter(Boolean).join(' ');

              const rowCells = [`Unit #${u}`, subjStr || ''];

              chunk.forEach(sale => {
                const compVal = data[sale] || {};
                const cTot = compVal[totKey] || '';
                const cBr = compVal[brKey] || '';
                const cBa = compVal[baKey] || '';
                const cAdj = compVal[adjKey] || '';
                let cStr = [cTot && `Tot:${cTot}`, cBr && `Br:${cBr}`, cBa && `Ba:${cBa}`].filter(Boolean).join(' ');
                if (cAdj) cStr += `\n(Adj: ${cAdj})`;
                rowCells.push(cStr || '');
              });

              body.push(rowCells);
            } else {
              const rowData = [row.label];

              let subjectValue = row.subjectValueKey ? (data[row.subjectValueKey] || data.Subject?.[row.valueKey] || '') : (data.Subject?.[row.valueKey] || '');
              if (row.adjustmentKey && data.Subject?.[row.adjustmentKey]) {
                subjectValue += `\n(Adj: ${data.Subject[row.adjustmentKey]})`;
              }
              rowData.push(subjectValue);

              chunk.forEach(sale => {
                let compValue = (data[sale] || {})[row.valueKey] || '';
                if (row.adjustmentKey && data[sale]?.[row.adjustmentKey]) {
                  compValue += `\n(Adj: ${data[sale][row.adjustmentKey]})`;
                }
                rowData.push(compValue);
              });

              body.push(rowData);
            }
          });

          if (salesComparisonAdditionalInfoFields && salesComparisonAdditionalInfoFields.length > 0 && selectedFormType !== 'Appraisal Version #1') {
            body.push([
              { content: 'SALES OR TRANSFER HISTORY', colSpan: 2 + chunk.length, styles: { fontStyle: 'bold', fillColor: [220, 230, 242], halign: 'left' } }
            ]);
            salesComparisonAdditionalInfoFields.forEach(field => {
              const val = data[field] || '';
              body.push([field, { content: val, colSpan: 1 + chunk.length }]);
            });
          }

          if (salesHistoryFields && salesHistoryFields.length > 0 && selectedFormType !== 'Appraisal Version #1') {
            body.push([
              { content: 'PRIOR SALE HISTORY', colSpan: 2 + chunk.length, styles: { fontStyle: 'bold', fillColor: [220, 230, 242], halign: 'left' } }
            ]);
            salesHistoryFields.forEach(feature => {
              const subjVal =
                (data.Subject && data.Subject[feature]) ||
                (data.SUBJECT && data.SUBJECT[feature]) ||
                (data['Sales Grid']?.Subject && data['Sales Grid'].Subject[feature]) ||
                (data.SALES_GRID?.Subject && data.SALES_GRID.Subject[feature]) ||
                data[feature] ||
                '';
              const rowData = [feature, subjVal];
              chunk.forEach(sale => {
                const compVal =
                  (data[sale] && data[sale][feature]) ||
                  (data.SALES_GRID && data.SALES_GRID[sale] && data.SALES_GRID[sale][feature]) ||
                  (data['Sales Grid'] && data['Sales Grid'][sale] && data['Sales Grid'][sale][feature]) ||
                  data[`${sale} ${feature}`] ||
                  '';
                rowData.push(compVal);
              });
              body.push(rowData);
            });
          }

          autoTable(doc, {
            startY: yPos,
            head,
            body,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 8, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 45, fontStyle: 'bold' },
              1: { cellWidth: 'auto' }
            },
            didDrawPage: (d) => { yPos = d.cursor.y + 10; }
          });

          yPos = doc.lastAutoTable.finalY + 10;
        });


        addHeaderFooter();
        doc.save('Appraisal_Report_Summary.pdf');
        setNotification({ open: true, message: 'PDF generated successfully.', severity: 'success' });
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        setNotification({ open: true, message: 'An error occurred while generating the PDF.', severity: 'error' });
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 100);
  };

  const handleSaveToDB = async () => {
    if (Object.keys(data).length === 0) {
      setNotification({ open: true, message: 'No data to save.', severity: 'warning' });
      return;
    }
    setLoading(true);
    setNotification({ open: true, message: 'Saving data to database...', severity: 'info' });

    try {
      const totalTime = formatTimeHHMMSS(fileUploadTimer);

      const cleanedData = JSON.parse(JSON.stringify(data));


      const sectionOrder = [
        'Subject',
        'CONTRACT',
        'NEIGHBORHOOD',
        'SITE',
        'IMPROVEMENTS',
        'SALES_TRANSFER',
        'PRIOR_SALE_HISTORY',
        'RECONCILIATION',
        'COST_APPROACH',
        'INCOME_APPROACH',
        'PUD_INFO',
        'MARKET_CONDITIONS',
        'CONDO_FORECLOSURE',
        'CERTIFICATION',
        'INFO_OF_SALES',
        'PROJECT_SITE',
        'PROJECT_INFO',
        'PROJECT_ANALYSIS',
        'UNIT_DESCRIPTIONS',
        'SUBJECT_RENT_SCHEDULE',
        'RENT_SCHEDULE_GRID',
        'RENT_SCHEDULE_RECONCILIATION',
        'COMPARABLE_RENTAL_DATA'
      ];

      sectionOrder.forEach(section => {
        if (cleanedData[section] && typeof cleanedData[section] === 'object') {
          Object.keys(cleanedData[section]).forEach(key => {
            if (cleanedData.hasOwnProperty(key)) {
              delete cleanedData[key];
            }
          });
        }
      });

      const orderedReportData = {
        totalTimeTaken: totalTime,
        activeTimedFile: activeTimedFileName || selectedFile?.name || xmlFile?.name || '',
        fileReviewSummary: getCleanFileHistory(),
        save_option: 'update'
      };
      sectionOrder.forEach(section => {
        if (cleanedData[section]) {
          orderedReportData[section] = cleanedData[section];
          delete cleanedData[section];
        }
      });

      Object.keys(cleanedData).sort().forEach(key => {
        orderedReportData[key] = cleanedData[key];
      });

      const validationErrors = getValidationErrors();
      const validationSuccesses = getValidationSuccesses();
      const consistencyErrors = getDataConsistencyErrors(data);

      const validationLog = {
        promptAnalysis: promptAnalysisResponse,
        stateRequirementCheck: stateReqResponse,
        clientRequirementCheck: clientReqResponse,
        escalationCheck: escalationResponse,
        fhaCheck: fhaResponse,
        aduCheck: ADUResponse,
        validationErrors,
        validationSuccesses,
        consistencyErrors
      };

      const formData = new FormData();
      formData.append('file_name', selectedFile?.name || 'N/A');
      formData.append('user_name', username);
      formData.append('validation_log', JSON.stringify(validationLog));
      formData.append('report_data', JSON.stringify(orderedReportData));

      if (selectedFile && selectedFile instanceof File) {
        formData.append('pdf_file', selectedFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/save-report/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred while saving.' }));
        throw new Error(errorData.detail || 'Failed to save data.');
      }

      const result = await response.json();
      setNotification({ open: true, message: result.message || 'Data saved successfully!', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const visibleSectionsList = useMemo(() => {
    const baseSections = sections.map(s => s.id);
    let visibleSectionIds = [];

    switch (selectedFormType) {
      case 'ERC':
      case 'ECR':
        return [
          { id: 'summary-section', title: 'Summary', category: 'SUMMARY', icon: <DescriptionIcon /> },
          { id: 'subject-info', title: 'Subject Information', category: 'SUBJECT', icon: <HomeIcon /> },
          { id: 'neighborhood-section', title: 'Neighborhood', category: 'NEIGHBORHOOD', icon: <LocationCityIcon /> },
          { id: 'site-section', title: 'Site', category: 'SITE', icon: <TerrainIcon /> },
          { id: 'improvements-section', title: 'Description of Improvements', category: 'IMPROVEMENTS', icon: <BuildIcon /> },
          { id: 'market-trends-section', title: 'Market Trends Analysis', category: 'MARKET_TRENDS', icon: <TrendingUpIcon /> },
          { id: 'sales-comparison-section', title: 'Sales Comparison Analysis', category: 'SALES_COMPARISON', icon: <MonetizationOnIcon /> },
          { id: 'anticipated-sales-price-section', title: 'Anticipated Sales Price', category: 'ANTICIPATED_SALES_PRICE', icon: <AttachMoneyIcon /> },
          { id: 'certifications-section', title: 'Appraiser & Certification', category: 'CERTIFICATION', icon: <VerifiedUserIcon /> },
          { id: 'map-sketch-exhibits-section', title: 'Map & Sketch Analysis', category: 'MAP_SKETCH_ANALYSIS', icon: <MapIcon /> },
          { id: 'photos-exhibits-section', title: 'Photos & Exhibits', category: 'EXTRACTED_PHOTOS', icon: <PhotoLibraryIcon /> }
        ];
      case '1004':
        visibleSectionIds = baseSections.filter(id => !['comparable-rental-data', 'subject-rent-schedule', 'rent-schedule-section', 'prior-sale-history-section', 'rent-schedule-reconciliation-section', 'project-site-section', 'project-info-section', 'project-analysis-section', 'unit-descriptions-section'].includes(id));
        break;
      case 'Appraisal Version #1':
        return [
          { id: 'summary-section', title: 'Summary', category: 'SUMMARY', icon: <DescriptionIcon /> },
          { id: 'site', title: 'Site', category: 'SITE', icon: <TerrainIcon /> },
          { id: 'dwelling-exterior', title: 'Dwelling Exterior', category: 'IMPROVEMENTS', icon: <BuildIcon /> },
          { id: 'amenities-quality-condition', title: 'Subject Property Amenities & Overall Quality & Condition', category: 'IMPROVEMENTS', icon: <BuildIcon /> },
          { id: 'highest-best-use-market', title: 'Highest & Best Use & Market', category: 'NEIGHBORHOOD', icon: <LocationCityIcon /> },
          { id: 'subject-listing-info', title: 'Subject Listing Information', category: 'NEIGHBORHOOD', icon: <LocationCityIcon /> },
          { id: 'prior-sale-history', title: 'Prior Sale & Transfer History', category: 'PRIOR_SALE_HISTORY', icon: <HistoryIcon /> },
          { id: 'sales-comparison-approach', title: 'Sales Comparison Approach', category: ['INFO_OF_SALES', 'SALES_GRID'], icon: <MonetizationOnIcon /> },
          { id: 'cost-approach', title: 'Cost Approach', category: 'COST_APPROACH', icon: <CalculateIcon /> },
          { id: 'reconciliation', title: 'Reconciliation', category: 'RECONCILIATION', icon: <BalanceIcon /> },
          { id: 'certifications', title: 'Certifications', category: 'CERTIFICATION', icon: <VerifiedUserIcon /> },
          { id: 'map-sketch-exhibits-section', title: 'Map & Sketch Analysis', category: 'MAP_SKETCH_ANALYSIS', icon: <MapIcon /> },
          { id: 'photos-exhibits-section', title: 'Photos & Exhibits', category: 'EXTRACTED_PHOTOS', icon: <PhotoLibraryIcon /> }
        ];
      case '1025':
        visibleSectionIds = baseSections.filter(id => !['rent-schedule-section', 'project-site-section', 'project-info-section', 'rent-schedule-reconciliation-section', 'project-analysis-section', 'unit-descriptions-section'].includes(id));
        break;
      case '1025 + 1007':
        visibleSectionIds = baseSections.filter(id => !['project-site-section', 'project-info-section', 'project-analysis-section', 'unit-descriptions-section'].includes(id));
        break;
      case '1073':
        visibleSectionIds = baseSections.filter(id => !['comparable-rental-data', 'subject-rent-schedule', 'rent-schedule-section', 'improvements-section', 'site-section', 'rent-schedule-reconciliation-section', 'pud-info-section'].includes(id));
        break;
      case '1073 + 1007':
        visibleSectionIds = baseSections.filter(id => !['comparable-rental-data', 'subject-rent-schedule', 'improvements-section', 'site-section', 'pud-info-section'].includes(id));
        break;
      case '1007':
        visibleSectionIds = ['subject-info', 'rent-schedule-section', 'appraiser-section', 'map-sketch-exhibits-section', 'photos-exhibits-section', 'raw-output'];
        break;
      case '1004 + 1007':
        visibleSectionIds = baseSections.filter(id => !['comparable-rental-data', 'subject-rent-schedule', 'project-site-section', 'prior-sale-history-section', 'project-info-section', 'project-analysis-section', 'unit-descriptions-section'].includes(id));
        break;
      default:

        visibleSectionIds = baseSections.filter(id => !['rent-schedule-section', 'rent-schedule-reconciliation-section', 'project-site-section', 'project-info-section', 'project-analysis-section', 'unit-descriptions-section']);
        break;
    }

    return sections.filter(section => visibleSectionIds.includes(section.id));
  }, [selectedFormType, sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSections(prev => {
          const newVisible = new Set(prev);
          entries.forEach(entry => {
            if (entry.isIntersecting) newVisible.add(entry.target.id);
            else newVisible.delete(entry.target.id);
          });
          return newVisible;
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    );
    visibleSectionsList.forEach(section => { const el = document.getElementById(section.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [data, visibleSectionsList]);

  const handleSidebarEnter = () => {
    if (sidebarLeaveTimerRef.current) {
      clearTimeout(sidebarLeaveTimerRef.current);
      sidebarLeaveTimerRef.current = null;
    }
    if (!isSidebarLocked) {
      setIsSidebarOpen(true);
    }
  };

  const handleSidebarLeave = () => {
    if (!isSidebarLocked) {
      sidebarLeaveTimerRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 300);
    }
  };

  const renderForm = () => {
    const revisionHandlers = {
      onPropertyAddressRevisionButtonClick: () => setPropertyAddressRevisionLangDialogOpen(true),
      onAssessorsParcelNumberRevisionButtonClick: () => {
        const valStr = data["Assessor's Parcel Number"] || data["Assessor's Parcel #"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Assessor's Parcel Number'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Assessor's Parcel Number revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onStreetRevisionButtonClick: () => {
        const valStr = data["On Street"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'On Street'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "On Street revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onNeighborhoodNameRevisionButtonClick: () => {
        const valStr = data["Neighborhood Name"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Neighborhood Name'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Neighborhood Name revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCensusTractRevisionButtonClick: () => {
        const valStr = data["Census Tract"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Census Tract'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Census Tract revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSpecialAssessmentsRevisionButtonClick: () => {
        const valStr = data["Special Assessments $"] || data["Special Assessments"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Special Assessments'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Special Assessments revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onContractPriceRevisionButtonClick: () => setContractPriceRevisionLangDialogOpen(true),
      onFinancialAssistanceRevisionButtonClick: () => setFinancialAssistanceRevisionLangDialogOpen(true),
      onDateOfContractRevisionButtonClick: () => setDateOfContractRevisionLangDialogOpen(true),
      onNeighborhoodBoundariesRevisionButtonClick: () => setNeighborhoodBoundariesRevisionLangDialogOpen(true),
      onViewRevisionButtonClick: () => {
        const valStr = data["View"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'View'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "View revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDimensionsRevisionButtonClick: () => {
        const valStr = data["Dimensions"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Dimensions'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Dimensions revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onZoningRevisionButtonClick: () => {
        const valStr = data["Zoning"] || data["Specific Zoning Classification"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Zoning'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Zoning revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSpecificZoningClassificationRevisionButtonClick: () => {
        const valStr = data["Specific Zoning Classification"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Specific Zoning Classification'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Specific Zoning Classification revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onShapeRevisionButtonClick: () => {
        const valStr = data["Shape"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Shape'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Shape revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onElectricityRevisionButtonClick: () => {
        const valStr = data["Electricity"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Electricity'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Electricity revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWaterRevisionButtonClick: () => {
        const valStr = data["Water"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Water'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Water revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGasRevisionButtonClick: () => {
        const valStr = data["Gas"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Gas'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Gas revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFEMAMapDateRevisionButtonClick: () => {
        const valStr = data["FEMA Map Date"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Map Date'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Map Date revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFEMAFloodZoneRevisionButtonClick: () => {
        const valStr = data["FEMA Flood Zone"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Flood Zone'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Flood Zone revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onZoningComplianceRevisionButtonClick: () => setZoningComplianceRevisionLangDialogOpen(true),
      onOtherLandUseRevisionButtonClick: () => setOtherLandUseRevisionLangDialogOpen(true),
      onAreaRevisionButtonClick: () => setAreaRevisionLangDialogOpen(true),
      onAdverseSiteConditionsRevisionButtonClick: () => {
        const revisionText = "Please revise the checkbox marked for 'Are there any adverse site conditions or external factors?' as it does not match the commentary.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Adverse Site Conditions revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // =========================
      // PROJECT SITE
      // =========================
      onTopographyRevisionButtonClick: () => {
        const valStr = data["Topography"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Topography'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Topography revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSizeRevisionButtonClick: () => {
        const valStr = data["Size"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Size'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Size revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDensityRevisionButtonClick: () => {
        const valStr = data["Density"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Density'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Density revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFemamapRevisionButtonClick: () => {
        const valStr = data["FEMA Map #"] || data["FEMA Map"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Map'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Map revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // =========================
      // IMPROVEMENTS SECTION
      // =========================
      onImprovementsRevisionButtonClick: () => setImprovementsRevisionLangDialogOpen(true),
      onDesignStyleRevisionButtonClick: () => {
        const valStr = data["Design (Style)"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `The 'Design (Style)'${valPart} in the sales grid does not match the Improvements section. Please reconcile and revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Design/Style revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onExteriorWallsRevisionButtonClick: () => {
        const valStr = data["Exterior Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please state the condition and materials for 'Exterior Walls'${valPart} in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Exterior Walls revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSanitarySewerButtonClick: () => {
        const valStr = data["Sanitary Sewer"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `'Sanitary Sewer'${valPart} is marked as Public; however, comments indicate Septic. Please reconcile and revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sanitary Sewer revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAlleyClick: () => {
        const revisionText = "Photos show an Alley, but the Alley box is not marked in the Site section. Please verify and revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Alley revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHighestAndBestUseClick: () => {
        const revisionText = "Highest and Best Use as Improved is marked 'NO'; please provide explanatory comments.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Highest and Best Use revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // =========================
      // SALES GRID
      // =========================
      onSalesGridRevisionButtonClick: () => setSalesGridRevisionLangDialogOpen(true),
      onOneWithAccessoryUnitRevisionButtonClick: () => setOneWithAccessoryUnitRevisionLangDialogOpen(true),

      // =========================
      // RECONCILIATION / COST APPROACH / CERTIFICATION
      // =========================
      onReconciliationRevisionButtonClick: () => setReconciliationRevisionLangDialogOpen(true),
      onCostApproachRevisionButtonClick: () => setCostApproachRevisionLangDialogOpen(true),
      onCertificationRevisionButtonClick: () => setCertificationRevisionLangDialogOpen(true),

      // =========================
      // PROPERTY RIGHTS / BORROWER / MISC
      // =========================
      onAddRevision: () => {
        const revisionText = "Please mark whether the subject property is currently offered for sale in the subject section.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddBorrowerRevision: () => {
        const valStr = data["Borrower"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please add the borrower's middle initial to the borrower name${valPart} in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Borrower revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onYearBuiltRevisionButtonClick: () => {
        const valStr = data["Year Built"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Year Built'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Year Built revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBasementAreaRevisionButtonClick: () => {
        const valStr = data["Basement Area sq.ft."] || data["Basement Area"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Basement Area sq.ft.'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Basement Area revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageAreaRevisionButtonClick: () => {
        const valStr = data["Garage # of Cars"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Garage # of Cars'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage # of Cars revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEvidenceofRevisionButtonClick: () => {
        const valStr = data["Evidence of"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Evidence of'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Evidence of revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFoundationTypeRevisionButtonClick: () => {
        const valStr = data["Foundation Type"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Foundation Type'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Foundation Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onBasementFinishRevisionButtonClick: () => {
        const valStr = data["Basement Finish sq.ft."] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Basement Finish sq.ft.'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Basement Finish revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEffectiveAgeRevisionButtonClick: () => {
        const valStr = data["Effective Age"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Effective Age'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective Age revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onRoofRevisionButtonClick: () => {
        const valStr = data["Roof"] || data["Roof Surface"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Roof'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Roof revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHeatingSystemRevisionButtonClick: () => {
        const valStr = data["Heating System"] || data["Heating"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Heating System'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Heating System revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFoundationWallsRevisionButtonClick: () => {
        const valStr = data["Foundation Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Foundation Walls'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Foundation Walls revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGuttersDownspoutsRevisionButtonClick: () => {
        const valStr = data["Gutters/Downspouts"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Gutters/Downspouts'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Gutters/Downspouts revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWindowTypeRevisionButtonClick: () => {
        const valStr = data["Window Type"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Window Type'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Window Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWallsRevisionButtonClick: () => {
        const valStr = data["Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Walls'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Walls revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTrimRevisionButtonClick: () => {
        const valStr = data["Trim"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Trim'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Trim revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBsthwainscotRevisionButtonClick: () => {
        const valStr = data["Bsthwainscot"] || data["Bath Wainscot"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Bath Wainscot'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Bath Wainscot revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCoolingTypeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Cooling Type' "${data["Cooling Type"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Cooling Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFireplaceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fireplace' "${data["Fireplace"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fireplace revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPoolRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Pool' "${data["Pool"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Pool revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCarportRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Carport' "${data["Carport"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Carport revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDrivewaySurfaceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Driveway Surface' "${data["Driveway Surface"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Driveway Surface revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAtticRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Attic' "${data["Attic"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Attic revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Garage' "${data["Garage"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONAppliancesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Appliances' "${data["Appliances"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Appliances revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedareaRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area sq.ft.' "${data["Finished Area sq.ft."] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONFenceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fence' "${data["Fence"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fence revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSquareFeetOfGrossLivingAreaAboveGradeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Square Feet of Gross Living Area Above Grade' "${data["Square Feet of Gross Living Area Above Grade"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Square Feet of Gross Living Area Above Grade revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAdditionalfeaturesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Additional Features' "${data["Additional Features"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Additional Features revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onconditionRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Condition' "${data["Condition"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Condition revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ontotaldollaramountRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Total Dollar Amount' "${data["Total Dollar Amount"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Dollar Amount revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBuiltUpRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Built Up' "${data["Built Up"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Built Up revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPropertyValuesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Values' "${data["Property Values"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Values revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onMarketingTimeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Marketing Time' "${data["Marketing Time"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Marketing Time revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, ONTwoUnitrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Two Unit' "${data["Two Unit"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Two Unit revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, ONMultiFamilyrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Multi Family' "${data["Multi Family"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Multi Family revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTWOUNITAGErevisionButtonClick: () => {
        const revisionText = `Please revise the 'one unit housing age(high,low,pred)' "${data["one unit housing age(high,low,pred)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Multi Family revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONMarketConditionsrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Market Conditions:' "${data["Market Conditions:"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Market Conditions: revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONNeighborhoodDescriptionrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Neighborhood Description' "${data["Neighborhood Description"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Neighborhood Description revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONONEUNITHOUSINGrevisionButtonClick: () => {
        const revisionText = `Please revise the 'One Unit Housing' "${data["One Unit Housing"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "One Unit Housing revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCommercialrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Commercial' "${data["Commercial"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Commercial revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONOneUnitrevisionButtonClick: () => {
        const revisionText = `Please revise the 'One Unit' "${data["One Unit"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "One Unit revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONDemandSupplyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Demand/Supply' "${data["Demand/Supply"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Demand/Supply revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONGrowthRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Growth' "${data["Growth"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Growth revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLocationRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Location' "${data["Location"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Location revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      oncontractDataSourceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Contract Data Source' "${data["Contract Data Source"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Contract Data Source revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      oncontractdiddidnotRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Contract Did/Did Not' "${data["Contract Did/Did Not"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Contract Did/Did Not revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onpropertygenerallyconformRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Generally Conform' "${data["Property Generally Conform"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Generally Conform revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onpropertygenerallyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Generally' "${data["Property Generally"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Generally revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onphysicaldeficienciesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Physical Deficiencies' "${data["Physical Deficiencies"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Physical Deficiencies revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBathroomsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bathroom(s)' "${data["Finished Area Above Grade Bathroom(s)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bathroom(s) revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBathsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bath(s)' "${data["Finished Area Above Grade Bath(s)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bath(s) revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBedroomsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bedrooms' "${data["Finished Area Above Grade Bedrooms"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bedrooms revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },


      onDrivewayRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Driveway' "${data["Driveway"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Driveway revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCarStorageRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Car Storage' "${data["Car Storage"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Car Storage revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPatioDeckrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Patio/Deck' "${data["Patio/Deck"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Patio/Deck revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWoodstoveRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Woodstove' "${data["Woodstove"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Woodstove revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onbathfloorRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Bath Floor (Material/Condition)' "${data["Bath Floor (Material/Condition)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Bath Floor revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onFloorsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Floors' "${data["Floors"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Floors revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onScreensRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Screens' "${data["Screens"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Screens revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onStormSashInsulatedRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Storm Sash/Insulated' "${data["Storm Sash/Insulated"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Storm Sash/Insulated revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWindowRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Window' "${data["Window"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Window revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFuelRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fuel' "${data["Fuel"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fuel revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onproposedUseRevisionButtonClick: () => {
        const revisionText = "Improvements section: Under general description, the checkbox is marked on ‘Proposed’; however, photos indicate the under-construction property; please revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Proposed Use revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTypeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Type' "${data["Type"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onofStoriesRevisionButtonClick: () => {
        const revisionText = `Please revise the '# of Stories' "${data["# of Stories"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddEmptyBorrowerRevision: () => {
        const revisionText = `Please add the borrower's "${data["borrower's "] || '...'}" to the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Borrower revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddLegalDescRevision: () => {
        const revisionText = "Legal Description noted as 'see attached addendum'  but missing; please revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Description revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLegalDescriptionUseClick: () => {
        const revisionText = "Please have the ‘Legal Description’ noted in the report.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Description revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddPropertyRightsRevision: () => {
        const revisionText = "Please revise Property Rights Appraised to fee simple.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Rights revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddParcelNumberRevision: () => {
        const revisionText = `Please have the ‘Assessor's Parcel #’  "${data["Assessor's Parcel #"] || '...'}" noted in the subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Parcel Number revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddOwnerOfRecordRevision: () => {
        const revisionText = "Please include an owner of public record on page 1.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Owner of Record revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLenderClientAddressRevisionButtonClick: () => setLenderClientAddressRevisionLangDialogOpen(true),
      onLenderClientRevisionButtonClick: () => setLenderClientRevisionLangDialogOpen(true),
      onAddAssignmentTypeRevision: () => {
        const revisionText = "Please revise the checkbox for assignment type to refinance transaction.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Assignment revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCountyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'County' "${data["County"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "County revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTaxYearRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Tax Year' "${data["Tax Year"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Tax Year revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONZipCodeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Zip Code' "${data["Zip Code"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Zip Code revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReportdataRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Report Data' "${data["Report Data"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Report Data revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDRevisionButtonClick: () => {
        const revisionText = `Please revise the 'PUD' "${data["PUD"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONOccupantRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Occupant' "${data["Occupant"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Occupant revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONComparablePropertiesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Sales Comparison Approach' "${data["Sales Comparison Approach"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sales Comparison Approach revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONUnitsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Units' "${data["Units"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Units revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONcomparablepropertyrevisionButtonClick: () => {
        const revisionText = "Please revise the 'Sales Comparison Approach' field in the Subject section.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sales Comparison Approach revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONMapReferencerevisionButtonClick: () => {
        const revisionText = `Please revise the 'Map Reference' "${data["Map Reference"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Map Reference revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONCityRevisionButtonClick: () => {
        const revisionText = `Please revise the 'City' "${data["City"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "City revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHoaRevisionButtonClick: () => {
        const revisionText = `Please revise the 'HOA Dues' "${data["HOA Dues"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "HOA Dues revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onStateRevisionButtonClick: () => {
        const revisionText = `Please revise the 'State' "${data["State"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "State revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onRETaxesRevisionButtonClick: () => {
        const revisionText = `Please revise the R.E. Taxes $ "${data["R.E. Taxes $"] || '...'}" must only contain numbers and currency symbols.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Real Estate Taxes revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFemaHazardRevisionButtonClick: () => {
        const revisionText = `‘FEMA Special Flood Hazard Area' "${data["FEMA Special Flood Hazard Area"] || '...'}"  marked NO but Zone is AE; please revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Hazard revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onOffSiteImprovementsButtonClick: () => {
        const revisionText = `Please check a box for 'Are the utilities/off-site improvements typical?' "${data["Are the utilities/off-site improvements typical?"] || '...'}" `;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Off-Site Improvements revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // SALES GRID 
      onGRID1ButtonClick: () => {
        const revisionText = "Critical Error: Research on sale/transfer history must be performed. 'did not' is not acceptable";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID2ButtonClick: () => {
        const checkboxKey1 = "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.";
        const checkboxKey2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal";

        let checkboxVal = "";
        if (data) {
          if (data[checkboxKey1] !== undefined && data[checkboxKey1] !== null) checkboxVal = String(data[checkboxKey1]);
          else if (data[checkboxKey2] !== undefined && data[checkboxKey2] !== null) checkboxVal = String(data[checkboxKey2]);
          else if (data.SALES_TRANSFER?.[checkboxKey1] !== undefined && data.SALES_TRANSFER?.[checkboxKey1] !== null) checkboxVal = String(data.SALES_TRANSFER[checkboxKey1]);
          else if (data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== undefined && data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== null) checkboxVal = String(data.PRIOR_SALE_HISTORY[checkboxKey2]);
          else if (data.Subject?.[checkboxKey1] !== undefined && data.Subject?.[checkboxKey1] !== null) checkboxVal = String(data.Subject[checkboxKey1]);
          else {
            const allKeys = Object.keys(data);
            const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the subject property"));
            if (matchKey) checkboxVal = String(data[matchKey]);
          }
        }

        const normalized = checkboxVal.toLowerCase();
        let revisionText = "";
        if (normalized.includes("did not")) {
          revisionText = "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior ";
        } else {
          revisionText = "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior ";
        }
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID3ButtonClick: () => {
        const revisionText = "Data Source(s) for subject property research";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID4ButtonClick: () => {
        const checkboxKey1 = "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.";
        const checkboxKey2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale";

        let checkboxVal = "";
        if (data) {
          if (data[checkboxKey1] !== undefined && data[checkboxKey1] !== null) checkboxVal = String(data[checkboxKey1]);
          else if (data[checkboxKey2] !== undefined && data[checkboxKey2] !== null) checkboxVal = String(data[checkboxKey2]);
          else if (data.SALES_TRANSFER?.[checkboxKey1] !== undefined && data.SALES_TRANSFER?.[checkboxKey1] !== null) checkboxVal = String(data.SALES_TRANSFER[checkboxKey1]);
          else if (data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== undefined && data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== null) checkboxVal = String(data.PRIOR_SALE_HISTORY[checkboxKey2]);
          else if (data.Subject?.[checkboxKey1] !== undefined && data.Subject?.[checkboxKey1] !== null) checkboxVal = String(data.Subject[checkboxKey1]);
          else {
            const allKeys = Object.keys(data);
            const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the comparable sales"));
            if (matchKey) checkboxVal = String(data[matchKey]);
          }
        }

        const normalized = checkboxVal.toLowerCase();
        let revisionText = "";
        if (normalized.includes("did not")) {
          revisionText = "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank .";
        } else {
          revisionText = "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior .";
        }
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID5ButtonClick: () => {
        const revisionText = "Data Source(s) for comparable sales research.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID6ButtonClick: () => {
        const revisionText = "Analysis of prior sale or transfer history of the subject property and comparable sales";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Analysis of prior sale or transfer history of the subject property and comparable sales", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID7ButtonClick: () => {
        const revisionText = "Summary of Sales Comparison Approach";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Summary of Sales Comparison Approach", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID8ButtonClick: () => {
        const revisionText = "Indicated Value by Sales Comparison Approach $";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Sales Comparison Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // CERTIFICATION

      onSignatureButtonClick: () => {
        const revisionText = "Signature";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Signature", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onNameButtonClick: () => {
        const revisionText = `Please revise the 'Name' "${data["Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onCompanyNameButtonClick: () => {
        const revisionText = `Please revise the 'Company Name' "${data["Company Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Company Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onCompanyAddressButtonClick: () => {
        const revisionText = `Please revise the 'Company Address' "${data["Company Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Company Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTelephoneNumberButtonClick: () => {
        const revisionText = `Please revise the 'Telephone Number' "${data["Telephone Number"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Telephone Number", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEmailButtonClick: () => {
        const revisionText = `Please revise the "Email" "${data["Email"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Email", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDATESignatureButtonClick: () => {
        const revisionText = `Please revise the "Date" "${data["Date of Signature and Report"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Date", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEffectiveDateofAppraisal: () => {
        const revisionText = `Please revise the Effective Date of Appraisal "${data["Effective Date of Appraisal"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective Date of Appraisal", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONSTATE1ofAppraisal: () => {
        const revisionText = `Please revise the "State Certification #/or State License #/or Other (describe)/State #" "${data["State Certification #"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "State Certification #/or State License #/or Other (describe)/State #", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONADDRESSOFPROPERTYAppraisal: () => {
        const revisionText = `Please revise the "ADDRESS OF PROPERTY APPRAISED" "${data["Address of Property Appraised"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "ADDRESS OF PROPERTY APPRAISED ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONAPPRAISEDVALUEofAppraisal: () => {
        const revisionText = `Please revise the "APPRAISED VALUE OF SUBJECT PROPERTY $" "${data["Appraised Value of Subject Property"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "APPRAISED VALUE OF SUBJECT PROPERTY $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCLIENTNameAppraisal: () => {
        const revisionText = `Please revise the "LENDER/CLIENT Name" "${data["Lender/Client Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "LENDER/CLIENT Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCompanyName: () => {
        const revisionText = `Please revise the "Lender/Client Company NAME" "${data["Lender/Client Company Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client Company NAME", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONCompanyAddress: () => {
        const revisionText = `Please revise the "Lender/Client COMPANY Address" "${data["Lender/Client Company Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client COMPANY Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEmailAddress: () => {
        const revisionText = `Please revise the "Lender/Client Email Address" "${data["Lender/Client Email Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client Email Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONInsurance: () => {
        const revisionText = `Please revise the "Insurance COPY" "${data["Insurance Copy"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Insurance COPY", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEXP: () => {
        const revisionText = `Please revise the "Expiration Date of Certification or License" "${data["Expiration Date of Certification or License"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Expiration Date of Certification or License", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPPT: () => {
        const revisionText = `Please revise the "Policy Period To" "${data["Policy Period To"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Policy Period To", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONLVT: () => {
        const revisionText = `Please revise the "License Valid To" "${data["License Valid To"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "License Valid To", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONLVT1: () => {
        const revisionText = `Please revise the "LICENSE/REGISTRATION/CERTIFICATION #" "${data["LICENSE/REGISTRATION/CERTIFICATION #"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "LICENSE/REGISTRATION/CERTIFICATION #", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // reconciliationFields
      ONIndicated1: () => {
        const revisionText = `Please revise the "Indicated Value by Cost Approach $" "${data["Indicated Value by Cost Approach $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Cost Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONcostApproach: () => {
        const revisionText = `Please revise the "COST APPROACH" "${data["COST APPROACH"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "COST APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONincomeApproach: () => {
        const revisionText = `Please revise the "INCOME APPROACH" "${data["INCOME APPROACH"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONincomeApproach2: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach $" "${data["Indicated Value by Income Approach $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Income Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReconciledValue: () => {
        const revisionText = `Please revise the "RECONCILED VALUE $" "${data["RECONCILED VALUE $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "RECONCILED VALUE $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReconciledValue1: () => {
        const revisionText = `Please revise the "Reconciled Value $" "${data["Reconciled Value $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Reconciled Value $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // Cost Approach

      ONEstimated: () => {
        const revisionText = `Please revise the "Estimated" "${data["Estimated"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSourceofcostdata: () => {
        const revisionText = `Please revise the "Source of cost data:" "${data["Source of cost data:"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Source of cost data:", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onQuality: () => {
        const revisionText = `Please revise the "Quality rating from cost service" "${data["Quality rating from cost service"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Quality", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEffectiveDateofcostdata: () => {
        const revisionText = `Please revise the "Effective date of cost data" "${data["Effective date of cost data"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective date of cost data", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCommentsOnCost: () => {
        const revisionText = `Please revise the "Comments on Cost Approach" "${data["Comments on Cost Approach (gross living area calculations, depreciation, etc.)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Comments on Cost Approach", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onOPINIONOFSITE: () => {
        const revisionText = `Please revise the "OPINION OF SITE VALUE $" "${data["OPINION OF SITE VALUE = $ ................................................"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "OPINION OF SITE VALUE $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDwelling: () => {
        const revisionText = `Please revise the "Dwelling" "${data["Dwelling"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Dwelling", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageCarport: () => {
        const revisionText = `Please revise the "Garage/Carport" "${data["Garage/Carport "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage/Carport", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEstimatedRemainingEconomicLife: () => {
        const revisionText = `Please revise the "Estimated Remaining Economic Life" "${data["Estimated Remaining Economic Life (HUD and VA only)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated Remaining Economic Life", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTOTALESTIMATE: () => {
        const revisionText = `Please revise the "TOTAL ESTIMATE OF VALUE $ " "${data[" Total Estimate of Cost-New  = $ ..................."] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "TOTAL ESTIMATE OF VALUE $ ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONDepreciation: () => {
        const revisionText = `Please revise the "Depreciation" "${data["Depreciation"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Depreciation", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTOTALDEDUCT: () => {
        const revisionText = `Please revise the "TOTAL DEDUCTIONS $ " "${data["Depreciated Cost of Improvements......................................................=$ "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "TOTAL DEDUCTIONS $ ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onasisvalueofsiteimprovements: () => {
        const revisionText = `Please revise the "As-is value of site improvements" "${data["As-is” Value of Site Improvements......................................................=$"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "As-is value of site improvements", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalValuebyCostApproach: () => {
        const revisionText = `Please revise the "Indicated Value By Cost Approach" "${data["Indicated Value By Cost Approach......................................................=$"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Cost Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // Income Approach
      onEffectiveGrossIncome: () => {
        const revisionText = `Please revise the "Estimated Monthly Market Rent $" "${data["Estimated Monthly Market Rent $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated Monthly Market Rent $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onxgross: () => {
        const revisionText = `Please revise the "X Gross Rent Multiplier" "${data["X Gross Rent Multiplier  = $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "X Gross Rent Multiplier", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onIndicatedValuebyIncomeApproach: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach $" "${data["Indicated Value by Income Approach"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Income Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onIIA: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach" "${data["Indicated Value by Income Approach"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONSUMMARYOFINCOMEAPPROACH: () => {
        const revisionText = `Please revise the "SUMMARY OF INCOME APPROACH" "${data["Summary of Income Approach (including support for market rent and GRM) "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "SUMMARY OF INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPUDFees$: () => {
        const revisionText = `Please revise the "PUD Fees $" "${data["PUD Fees $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDFeesM: () => {
        const revisionText = `Please revise the "PUD Fees (per month)" "${data["PUD Fees (per month)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDFeesy: () => {
        const revisionText = `Please revise the "PUD Fees (per year)" "${data["PUD Fees (per year)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONdbha: () => {
        const revisionText = `Please revise the "Is the developer/builder in control of the Homeowners' Association (HOA)?" "${data["Is the developer/builder in control of the Homeowners' Association (HOA)?"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Is the developer/builder in control of the Homeowners' Association (HOA)?", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONunittypes: () => {
        const revisionText = `Please revise the "Unit Types" "${data["Unit type(s)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Unit Types", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onProvideThe: () => {
        const revisionText = `Please revise the "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit." "${data["Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit."] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLegalNameOfProject: () => {
        const revisionText = `Please revise the "Legal Name of Project" "${data["Legal Name of Project"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Name of Project", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfPhases: () => {
        const revisionText = `Please revise the "Total Number of Phases" "${data["Total Number of Phases"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Phases", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfUnits: () => {
        const revisionText = `Please revise the "Total Number of Units" "${data["Total number of units"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfUnitsSold: () => {
        const revisionText = `Please revise the "Total Number of Units Sold" "${data["Total number of units sold"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units Sold", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTotalNumberOfUnitsRented: () => {
        const revisionText = `Please revise the "Total number of units rented" "${data["Total number of units rented"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units Rented", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTotalNumberOfUnitsForSale: () => {
        const revisionText = `Please revise the "Total number of units for sale" "${data["Total number of units for sale"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units for Sale", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onDatasourcepi: () => {
        const revisionText = `Please revise the "Data Source(s) for project information" "${data["Data source(s)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Data Source(s) for project information", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onprojectcreated: () => {
        const revisionText = `Please revise the "Date Project Created" "${data["Was the project created by the conversion of existing building(s) into a PUD?"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Date Project Created", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }

    };


    const activeReportFile = (extractionSource === 'xml' ? (xmlFile || selectedFile) : (selectedFile || xmlFile)) || selectedFile || xmlFile;
    const props = {
      data,
      allData: {
        ...data,
        comparisonData,
        formType: selectedFormType,
        selectedFile: activeReportFile,
        xmlFile: xmlFile,
        reportFile: activeReportFile,
        FILE_PATH: activeReportFile?.name || data?.FILE_PATH || ''
      },
      selectedFile: activeReportFile,
      xmlFile: xmlFile,
      reportFile: activeReportFile,
      extractionAttempted, handleDataChange, editingField, setEditingField, isEditable: true, highlightedSubjectFields, highlightedContractFields, highlightedSiteFields, summaryFields, subjectFields, contractFields, neighborhoodFields, siteFields, improvementsFields, salesGridRows, salesGridRows1025, comparableSales, salesComparisonAdditionalInfoFields, salesHistoryFields, priorSaleHistoryFields, reconciliationFields, costApproachFields, incomeApproachFields, pudInformationFields, marketConditionsFields, marketConditionsRows, condoCoopProjectsRows, condoForeclosureFields, appraiserFields, supplementalAddendumFields, uniformResidentialAppraisalReportFields, appraisalAndReportIdentificationFields, projectSiteFields, projectInfoFields, projectAnalysisFields, unitDescriptionsFields, imageAnalysisFields, dataConsistencyFields, ComparableRentAdjustments, comparableRents, RentSchedulesFIELDS2, rentScheduleReconciliationFields, formType: selectedFormType, comparisonData, getComparisonStyle, SalesComparisonSection, EditableField, infoOfSalesFields, loading, stateRequirementFields, handleStateRequirementCheck, stateReqLoading, stateReqResponse, stateReqError, handleUnpaidOkCheck, unpaidOkLoading, unpaidOkResponse, unpaidOkError, handleClientRequirementCheck, clientReqLoading, clientReqResponse, clientReqError, handleFhaCheck, handleADUCheck, fhaLoading, fhaResponse, fhaError, ADULoading, handleEscalationCheck, escalationLoading, escalationResponse, escalationError, onDataChange: handleDataChange, handleExtract, manualValidations, handleManualValidation, SUBJECT_RENT_SCHEDULE, COMPARABLE_RENTAL_DATA, SubjectRentScheduleTable,
      onSubjectRevisionButtonClick: () => setRevisionLangDialogOpen(true),
      onContractRevisionButtonClick: () => setContractRevisionLangDialogOpen(true),
      onNeighborhoodRevisionButtonClick: () => setNeighborhoodRevisionLangDialogOpen(true),
      onSiteRevisionButtonClick: () => setSiteRevisionLangDialogOpen(true),
      onImprovementsRevisionButtonClick: () => setImprovementsRevisionLangDialogOpen(true),
      onSalesGridRevisionButtonClick: () => setSalesGridRevisionLangDialogOpen(true),
      onReconciliationRevisionButtonClick: () => setReconciliationRevisionLangDialogOpen(true),
      onCostApproachRevisionButtonClick: () => setCostApproachRevisionLangDialogOpen(true),
      onCertificationRevisionButtonClick: () => setCertificationRevisionLangDialogOpen(true),
      on1007RevisionButtonClick: () => set1007RevisionLangDialogOpen(true),
      revisionHandlers,
    };

    // const dialogSetters = {
    //   setPropertyAddressRevisionLangDialogOpen,
    //   setContractPriceRevisionLangDialogOpen,
    //   setFinancialAssistanceRevisionLangDialogOpen,
    //   setDateOfContractRevisionLangDialogOpen,
    //   setNeighborhoodBoundariesRevisionLangDialogOpen,
    //   setOtherLandUseRevisionLangDialogOpen,
    //   setZoningComplianceRevisionLangDialogOpen,
    //   setAreaRevisionLangDialogOpen,
    //   setImprovementsRevisionLangDialogOpen,
    //   setSalesGridRevisionLangDialogOpen,
    //   setReconciliationRevisionLangDialogOpen,
    //   setCostApproachRevisionLangDialogOpen,
    //   setCertificationRevisionLangDialogOpen,
    //   setOneWithAccessoryUnitRevisionLangDialogOpen,
    //   setLenderClientAddressRevisionLangDialogOpen,
    //   setLenderClientRevisionLangDialogOpen,
    //   setHoaRevisionLangDialogOpen,
    //   set1007RevisionLangDialogOpen,
    //   setAddendumRevisionLangDialogOpen,
    // };
    // const revisionHandlers = createRevisionHandlers(data, setNotification, setNotes, dialogSetters);

    let formComponent;
    switch (selectedFormType) {
      case '1004':
        formComponent = <Form1004 {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case 'Appraisal Version #1':
        formComponent = <Version1 {...props} siteFields={siteFieldsVersion1} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case 'ERC':
      case 'ECR':
        formComponent = <ECR {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case '1073':
      case '1073 + 1007':
        formComponent = <Form1073 {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case '1007':
        formComponent = <Form1007 {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case '1004 + 1007':
        formComponent = <Form1004And1007 {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case '1025':
      case '1025 + 1007':
        formComponent = <Form1025 {...props} allData={{ ...data, comparisonData, formType: selectedFormType, selectedFile: activeReportFile, xmlFile, reportFile: activeReportFile, FILE_PATH: activeReportFile?.name || data?.FILE_PATH || '' }} selectedFile={activeReportFile} />;
        break;
      case '1004D':
        formComponent = <Form1004D />;
        break;
      default:
        return (
          <Typography sx={{ mt: 2, textAlign: 'center' }}>Please select a form type to see the report details.</Typography>
        );
    }
    return (
      <Fade in={!!selectedFormType} timeout={1000}>
        <div>{formComponent}</div>
      </Fade>
    );
  };

  return (
    <>
      <CssBaseline />
      <TooltipStyles />


      <div className="page-container">
        <Sidebar
          sections={visibleSectionsList}
          isOpen={isSidebarOpen || isSidebarLocked}
          isLocked={isSidebarLocked}
          onLockToggle={() => { setIsSidebarLocked(!isSidebarLocked); }}
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          onSectionClick={handleSectionClick}
          onThemeToggle={handleThemeChange}
          currentTheme={themeMode}
          activeSection={activeSection}
          loadingSection={loadingSection}
          extractedSections={extractedSections}
          visibleSections={visibleSections}
          onArrowClick={handleArrowClick}
          loading={loading}
          extractionSource={extractionSource}
          onExtractionSourceChange={handleExtractionSourceChange}
          hasPdfFile={!!selectedFile}
          hasXmlFile={!!xmlFile}
          onOpenPdfXmlDiff={handleOpenPdfXmlDiff}
          diffCount={pdfXmlDiffResult ? pdfXmlDiffResult.filter(r => r.status !== 'Match').length : 0}
        />
        <div className={`main-content container-fluid ${isSidebarOpen || isSidebarLocked ? 'sidebar-open' : ''}`}>
          {selectedFormType !== '1004D' && (
            <>
              <Box
                className="header-container"
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 1.5, md: 2 },
                  my: 1.5,
                  py: 1,
                  px: 3,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${activeTheme.palette.background.paper} 0%, ${activeTheme.palette.action.hover} 100%)`,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                }}>
                <PremiumLogo size={48} fullScreen={false} />
                <Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    className="app-title"
                    sx={{
                      fontFamily: 'BBH Sans Hegarty, sans-serif',
                      fontWeight: 800,
                      fontSize: { xs: '1.6rem', md: '2.4rem' },
                      background: `linear-gradient(45deg, ${activeTheme.palette.primary.main}, ${activeTheme.palette.secondary?.main || activeTheme.palette.primary.dark})`,
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: -0.5
                    }}
                  >
                    FULL FILE REVIEW
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: 'text.secondary',
                      letterSpacing: 3,
                      fontSize: { xs: '0.6rem', md: '0.75rem' },
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      textAlign: 'right',
                      opacity: 0.8
                    }}
                  >
                    Intelligent Analysis
                  </Typography>
                </Box>
              </Box>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  // mb: 1,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <CloudUploadIcon fontSize="small" color="primary" />
                          Upload Documents
                        </Typography>
                        {(selectedFile || htmlFile || contractFile || engagementLetterFile || xmlFile) && (
                          <Button size="small" color="error" onClick={() => setIsClearDialogOpen(true)} startIcon={<DeleteForeverIcon />}>
                            Clear All
                          </Button>
                        )}
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1.5,
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(5, 1fr)'
                          }
                        }}
                      >
                        {[
                          {
                            label: 'PDF',
                            icon: <PictureAsPdfIcon fontSize="medium" />,
                            file: selectedFile,
                            onClick: () => fileInputRef.current.click(),
                            inputRef: fileInputRef,
                            accept: '.pdf',
                            onChange: onFileChange
                          },
                          {
                            label: 'XML',
                            icon: <CodeIcon fontSize="medium" />,
                            file: xmlFile,
                            onClick: () => xmlFileInputRef.current.click(),
                            inputRef: xmlFileInputRef,
                            accept: '.xml',
                            onChange: onXmlFileChange
                          },
                          {
                            label: 'HTML',
                            icon: <DescriptionIcon fontSize="medium" />,
                            file: htmlFile,
                            onClick: () => htmlFileInputRef.current.click(),
                            inputRef: htmlFileInputRef,
                            accept: '.html',
                            onChange: onHtmlFileChange
                          },
                          {
                            label: 'Contract',
                            icon: <AssignmentIcon fontSize="medium" />,
                            file: contractFile,
                            onClick: () => contractFileInputRef.current.click(),
                            inputRef: contractFileInputRef,
                            accept: '.pdf,.doc,.docx',
                            onChange: onContractFileChange
                          },
                          {
                            label: 'Letter',
                            icon: <AssignmentIcon fontSize="medium" />,
                            file: engagementLetterFile,
                            onClick: () => engagementLetterFileInputRef.current.click(),
                            inputRef: engagementLetterFileInputRef,
                            accept: '.pdf,.doc,.docx',
                            onChange: onEngagementLetterFileChange
                          }
                        ].map((item, index) => (
                          <Paper
                            key={index}
                            variant="outlined"
                            onClick={item.onClick}
                            sx={{
                              p: 1.25,
                              height: { xs: 40, sm: 60 },
                              cursor: 'pointer',
                              borderRadius: 2,
                              textAlign: 'center',
                              borderStyle: item.file ? 'solid' : 'dashed',
                              borderColor: item.file ? 'success.main' : 'divider',
                              bgcolor: item.file ? 'success.lighter' : 'background.default',
                              transition: 'all .2s',
                              '&:hover': { boxShadow: 2 }
                            }}
                          >
                            <Stack
                              direction={{ xs: 'row', sm: 'column' }}
                              spacing={0.5}
                              alignItems="center"
                              justifyContent="center"
                              height="100%"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', '& svg': { fontSize: { xs: 18, sm: 24 } } }}>
                                {item.icon}
                              </Box>
                              <Typography
                                fontSize={{ xs: 11, sm: 12 }}
                                fontWeight={600}
                                sx={{ ml: { xs: 0.5, sm: 0 } }}
                              >
                                {item.label === 'XML' && xmlDetectedFormType
                                  ? `XML (${xmlDetectedFormType})`
                                  : item.label}
                              </Typography>

                              {item.file && (
                                <Typography fontSize={10} color="success.main" sx={{ ml: 0.5 }}>
                                  ✓
                                </Typography>
                              )}
                            </Stack>

                            <input type="file" hidden ref={item.inputRef} accept={item.accept} onChange={item.onChange} />
                          </Paper>
                        ))}
                      </Box>

                      <Autocomplete
                        size="small"
                        options={formTypes}
                        sx={{ mb: '20px' }}
                        value={selectedFormType}
                        onChange={(e, v) => v && setSelectedFormType(v)}
                        disableClearable
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Form Type"
                            helperText={
                              xmlDetectedFormType && extractionSource === 'xml'
                                ? `Present in XML: Form ${xmlDetectedFormType}${!String(xmlDetectedFormType).includes('1004MC') && (data?.has_1004mc || data?.['1004MC Addendum']?.startsWith?.('Present') || data?.['1004MC Present'] === 'Yes' || data?.Subject?.['1004MC Addendum']?.startsWith?.('Present')) ? ' + 1004MC Addendum' : ''}`
                                : (data?.has_1004mc || data?.['1004MC Addendum']?.startsWith?.('Present') || data?.['1004MC Present'] === 'Yes' || data?.Subject?.['1004MC Addendum']?.startsWith?.('Present') ? '1004MC Addendum Present in Report' : undefined)
                            }
                            FormHelperTextProps={{
                              sx: { color: 'success.main', fontWeight: 600, mx: 0.5, mt: 0.5 }
                            }}
                          />
                        )}
                      />
                    </Stack>
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 4 }}
                    sx={{
                      pl: { md: 3 },
                      borderLeft: { md: '1px solid' },
                      borderColor: 'divider',
                      position: { xs: 'sticky', md: 'static' },
                      bottom: { xs: 0, md: 'auto' },
                      bgcolor: { xs: 'background.paper', md: 'transparent' },
                      zIndex: 10,
                      py: { xs: 1, md: 0 }
                    }}
                  >
                    <Stack spacing={1.5} width="100%">
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        display={{ xs: 'none', md: 'flex' }}
                        alignItems="center"
                        gap={1}
                        mt={10}
                      >
                        <AssessmentIcon fontSize="small" color="primary" />
                        Actions
                      </Typography>

                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1,
                          gridTemplateColumns: {
                            xs: 'repeat(4, 1fr)',
                            sm: 'repeat(4, 1fr)',
                            md: 'repeat(4, 1fr)'
                          }
                        }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleGeneratePdf}
                          disabled={!Object.keys(data).length}
                          startIcon={
                            isGeneratingPdf
                              ? <CircularProgress size={14} color="inherit" />
                              : <PictureAsPdfIcon fontSize="small" />
                          }
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            {isGeneratingPdf ? 'Generating' : 'PDF'}
                          </Box>
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          onClick={handleExportJSON}
                          disabled={!Object.keys(data).length}
                          startIcon={<FileDownloadIcon fontSize="small" />}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            JSON
                          </Box>
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={handleGenerateValidationLog}
                          disabled={!Object.keys(data).length}
                          startIcon={<AssessmentIcon fontSize="small" />}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Log
                          </Box>
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={handleSaveToDB}
                          disabled={!Object.keys(data).length || loading}
                          startIcon={<SaveIcon fontSize="small" />}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Save
                          </Box>
                        </Button>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
              <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 0, zIndex: 1100, mb: 3, borderRadius: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: activeTheme.palette.background.paper, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                {(selectedFile || xmlFile || (data && Object.keys(data).length > 0)) ? (
                  <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      {!selectedFile && !xmlFile && (
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Report Active
                          </Typography>
                        </Box>
                      )}
                      {selectedFile && (
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: extractionSource === 'pdf' ? 'primary.main' : 'action.hover',
                          color: extractionSource === 'pdf' ? '#fff' : 'text.primary',
                          boxShadow: extractionSource === 'pdf' ? '0 2px 8px rgba(25, 118, 210, 0.25)' : 'none',
                          border: '1px solid',
                          borderColor: extractionSource === 'pdf' ? 'primary.dark' : 'divider',
                          transition: 'all 0.2s'
                        }}>
                          <PictureAsPdfIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 160 }} noWrap>
                            {selectedFile.name}
                          </Typography>
                          <Tooltip title="Preview PDF">
                            <IconButton size="small" onClick={() => handlePreviewPdf(selectedFile)} sx={{ color: 'inherit', p: 0.25 }}>
                              <VisibilityTwoToneIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {xmlFile && (
                            <Button
                              size="small"
                              variant={extractionSource === 'pdf' ? 'outlined' : 'contained'}
                              sx={{
                                py: 0,
                                px: 1,
                                minWidth: 0,
                                fontSize: '0.65rem',
                                height: 20,
                                color: extractionSource === 'pdf' ? '#fff' : undefined,
                                borderColor: extractionSource === 'pdf' ? 'rgba(255,255,255,0.6)' : undefined
                              }}
                              onClick={() => handleExtractionSourceChange('pdf')}
                            >
                              {extractionSource === 'pdf' ? 'ACTIVE' : 'SELECT'}
                            </Button>
                          )}
                        </Box>
                      )}

                      {xmlFile && (
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: extractionSource === 'xml' ? 'secondary.main' : 'action.hover',
                          color: extractionSource === 'xml' ? '#fff' : 'text.primary',
                          boxShadow: extractionSource === 'xml' ? '0 2px 8px rgba(156, 39, 176, 0.25)' : 'none',
                          border: '1px solid',
                          borderColor: extractionSource === 'xml' ? 'secondary.dark' : 'divider',
                          transition: 'all 0.2s'
                        }}>
                          <CodeIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 160 }} noWrap>
                            {xmlFile.name}
                          </Typography>
                          {selectedFile && (
                            <Button
                              size="small"
                              variant={extractionSource === 'xml' ? 'outlined' : 'contained'}
                              color="secondary"
                              sx={{
                                py: 0,
                                px: 1,
                                minWidth: 0,
                                fontSize: '0.65rem',
                                height: 20,
                                color: extractionSource === 'xml' ? '#fff' : undefined,
                                borderColor: extractionSource === 'xml' ? 'rgba(255,255,255,0.6)' : undefined
                              }}
                              onClick={() => handleExtractionSourceChange('xml')}
                            >
                              {extractionSource === 'xml' ? 'ACTIVE' : 'SELECT'}
                            </Button>
                          )}
                        </Box>
                      )}

                      {selectedFile && xmlFile && (
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
                          onClick={handleOpenPdfXmlDiff}
                          sx={{ height: 28, fontSize: '0.75rem', textTransform: 'none', px: 1.5, fontWeight: 700 }}
                        >
                          Diff / Compare
                          {pdfXmlDiffResult && (
                            <Box
                              component="span"
                              sx={{
                                ml: 1,
                                px: 0.7,
                                py: 0.15,
                                borderRadius: 10,
                                bgcolor: 'error.main',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {pdfXmlDiffResult.filter(r => r.status !== 'Match').length} diffs
                            </Box>
                          )}
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2">
                            {Math.floor(timer / 60)}m {timer % 60}s
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={extractionProgress}
                            sx={{ width: '80px' }}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 3 }}>
                        <Tooltip title={isTimerRunning ? `Timer Running for ${activeTimedFileName || selectedFile?.name || xmlFile?.name || 'Current File'} (Click to Pause)` : "Timer Paused (Click to Resume)"}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              color: isTimerRunning ? '#16a34a' : '#d97706',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              transition: 'color 0.2s ease-in-out'
                            }}
                            onClick={handleTimerToggle}>
                            <span style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: isTimerRunning ? '#22c55e' : '#f59e0b',
                              boxShadow: isTimerRunning ? '0 0 6px rgba(34, 197, 94, 0.6)' : 'none'
                            }} />
                            Total: {formatTimeHHMMSS(fileUploadTimer)}
                          </Typography>
                        </Tooltip>

                        {Object.values(fileReviewHistory).filter(it => it && it.fileName && it.fileName !== 'Active Document').length > 0 && (
                          <Tooltip title="Click to view reviewer time taken per file">
                            <Chip
                              size="small"
                              icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                              label={`${Object.values(fileReviewHistory).filter(it => it && it.fileName && it.fileName !== 'Active Document').length} File${Object.values(fileReviewHistory).filter(it => it && it.fileName && it.fileName !== 'Active Document').length > 1 ? 's' : ''} Tracked`}
                              onClick={handleOpenTimerHistory}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#e2e8f0' }
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>

                      <Popover
                        open={Boolean(timerHistoryAnchor)}
                        anchorEl={timerHistoryAnchor}
                        onClose={() => setTimerHistoryAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        PaperProps={{ sx: { p: 2, minWidth: 340, maxWidth: 460, borderRadius: 2 } }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            ⏱️ Reviewer Time Taken Per File
                          </Typography>
                          <IconButton size="small" onClick={() => setTimerHistoryAnchor(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5 }}>
                          Time taken from upload through testing and seeing the report. Separate for each file.
                        </Typography>
                        <Divider sx={{ mb: 1.5 }} />
                        <Stack spacing={1}>
                          {Object.values(fileReviewHistory)
                            .filter(item => item && item.fileName && item.fileName !== 'Active Document')
                            .map((item, idx) => {
                              const isActiveInThisTab = (activeTimedFileName || selectedFile?.name || xmlFile?.name) === item.fileName;
                              const displayTime = isActiveInThisTab
                                ? formatTimeHHMMSS(fileUploadTimer)
                                : (item.formattedTime || formatTimeHHMMSS(item.elapsedSeconds || 0));
                              const reviewerUser = item.user || username || localStorage.getItem('username') || 'Reviewer';

                              return (
                                <Box key={item.fileName || idx} sx={{
                                  p: 1.25,
                                  borderRadius: 1.5,
                                  bgcolor: isActiveInThisTab ? '#f0fdf4' : '#f8fafc',
                                  border: '1px solid',
                                  borderColor: isActiveInThisTab ? '#bbf7d0' : '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1
                                }}>
                                  <Box sx={{ maxWidth: '68%', overflow: 'hidden' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: isActiveInThisTab ? '#166534' : '#1e293b' }} noWrap>
                                      {item.fileName}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.3, flexWrap: 'wrap' }}>
                                      <Chip
                                        label={reviewerUser}
                                        size="small"
                                        sx={{
                                          height: '18px',
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                          bgcolor: isActiveInThisTab ? '#dcfce7' : '#e2e8f0',
                                          color: isActiveInThisTab ? '#15803d' : '#475569'
                                        }}
                                      />
                                      <Typography variant="caption" sx={{ color: isActiveInThisTab ? '#15803d' : '#64748b', fontWeight: isActiveInThisTab ? 600 : 400 }}>
                                        {isActiveInThisTab
                                          ? '● Active in this tab'
                                          : (item.status === 'Reviewing' ? '● Active in another tab' : '✓ Completed')}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: isActiveInThisTab ? '#16a34a' : '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                    {displayTime}
                                  </Typography>
                                </Box>
                              );
                            })}
                        </Stack>
                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            sx={{ fontSize: '0.72rem', textTransform: 'none', color: '#dc2626' }}
                            onClick={() => {
                              localStorage.removeItem('reviewer_file_timers_history');
                              const fresh = {};
                              if (activeTimedFileName && activeTimedFileName !== 'Active Document') {
                                const currentUser = username || localStorage.getItem('username') || 'Reviewer';
                                fresh[activeTimedFileName] = {
                                  fileName: activeTimedFileName,
                                  user: currentUser,
                                  elapsedSeconds: fileUploadTimer,
                                  formattedTime: formatTimeHHMMSS(fileUploadTimer),
                                  lastUpdated: Date.now(),
                                  status: isTimerRunning ? 'Reviewing' : 'Paused'
                                };
                                try {
                                  localStorage.setItem('reviewer_file_timers_history', JSON.stringify(fresh));
                                } catch (e) {
                                  console.warn(e);
                                }
                              }
                              setFileReviewHistory(fresh);
                              fileReviewHistoryRef.current = fresh;
                            }}
                          >
                            Reset History
                          </Button>
                        </Box>
                      </Popover>

                      {!loading && lastExtractionTime != null && Number(lastExtractionTime) > 0 && (
                        <Typography variant="body2" color="success.main"
                          sx={{ marginRight: '40px' }}>
                          Last: {Number(lastExtractionTime) >= 60 ? `${Math.floor(Number(lastExtractionTime) / 60)}m ` : ''}
                          {Number(lastExtractionTime) < 0.1
                            ? '< 0.1s'
                            : (Number(lastExtractionTime) < 1
                                ? `${Number(lastExtractionTime).toFixed(2)}s`
                                : `${(Number(lastExtractionTime) % 60).toFixed(1)}s`)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">No file selected</Typography>
                )}

                {(htmlFile || contractFile || engagementLetterFile) && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                      {htmlFile && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>HTML:</Typography>
                          <Typography variant="caption">{htmlFile.name}</Typography>
                          <Button size="small" variant="outlined" sx={{ py: 0, minWidth: 0 }} onClick={() => setIsComparisonDialogOpen(true)} disabled={isHtmlReviewLoading || loading}>
                            {isHtmlReviewLoading ? (
                              <>
                                <CircularProgress size={14} sx={{ mr: 0.5 }} />
                                {Math.floor(htmlExtractionTimer / 60)}m {htmlExtractionTimer % 60}s
                              </>
                            ) : <GetAppIcon fontSize="small" />}
                          </Button>
                        </Stack>
                      )}
                      {contractFile && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Contract:</Typography>
                          <Typography variant="caption">{contractFile.name}</Typography>
                          <Button size="small" variant="outlined" sx={{ py: 0, minWidth: 0 }} onClick={() => setIsContractCompareOpen(true)}><GetAppIcon fontSize="small" /></Button>
                          <IconButton size="small" onClick={() => handlePreviewPdf(contractFile)} sx={{ p: 0.5 }}><VisibilityTwoToneIcon fontSize="small" color="primary" /></IconButton>
                        </Stack>
                      )}
                      {engagementLetterFile && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Engagement:</Typography>
                          <Typography variant="caption">{engagementLetterFile.name}</Typography>
                          <Button size="small" variant="outlined" sx={{ py: 0, minWidth: 0 }} onClick={() => setIsEngagementLetterDialogOpen(true)}><GetAppIcon fontSize="small" /></Button>
                          <IconButton size="small" onClick={() => handlePreviewPdf(engagementLetterFile)} sx={{ p: 0.5 }}><VisibilityTwoToneIcon fontSize="small" color="primary" /></IconButton>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                )}
              </Paper>
              <Paper elevation={2} sx={{ p: 2, mb: 2, backgroundColor: activeTheme.palette.background.paper, borderRadius: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: (!isValidationSectionMinimized && (selectedFile || xmlFile || (data && Object.keys(data).length > 0))) ? 2 : 0,
                    pb: (!isValidationSectionMinimized && (selectedFile || xmlFile || (data && Object.keys(data).length > 0))) ? 1 : 0,
                    borderBottom: (!isValidationSectionMinimized && (selectedFile || xmlFile || (data && Object.keys(data).length > 0))) ? '1px solid' : 'none',
                    borderColor: 'divider',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsValidationSectionMinimized(!isValidationSectionMinimized)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FactCheckIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                      Validation Checks
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    {isValidationSectionMinimized ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                  </IconButton>
                </Box>
                {!isValidationSectionMinimized && (selectedFile || xmlFile || (data && Object.keys(data).length > 0)) && (
                  <Stack spacing={2}>
                    {data['From Type'] && (
                      <Alert
                        severity="warning"
                        icon={<WarningIcon fontSize="inherit" />}
                        sx={{ alignItems: 'center', '& .MuiAlert-message': { width: '100%' } }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2} width="100%">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            Form Type Mismatch:
                          </Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <EditableField
                              fieldPath={['From Type']}
                              value={data['From Type']}
                              onDataChange={handleDataChange}
                              editingField={editingField}
                              setEditingField={setEditingField}
                              isEditable={isEditable}
                              allData={data}
                            />
                          </Box>
                        </Stack>
                      </Alert>
                    )}

                    <Grid container spacing={2}>
                      {(data['FHA Case No.'] || data['FHA Case #'] || data['FHA Case Number'] || data?.Subject?.['FHA Case No.'] || data?.Subject?.['FHA Case #'] || data?.Subject?.['FHA Case Number'] || data?.SUBJECT?.['FHA Case No.'] || data?.SUBJECT?.['FHA Case #'] || data?.SUBJECT?.['FHA Case Number']) && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', borderColor: ((data['FHA Case No.'] || data['FHA Case #'] || data?.Subject?.['FHA Case No.'] || data?.SUBJECT?.['FHA Case No.']) === '000-0000000') ? 'error.main' : 'divider', bgcolor: ((data['FHA Case No.'] || data['FHA Case #'] || data?.Subject?.['FHA Case No.'] || data?.SUBJECT?.['FHA Case No.']) === '000-0000000') ? '#fff5f5' : 'background.paper' }}>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>FHA Case #</Typography>
                              <EditableField fieldPath={['FHA Case No.']} value={data['FHA Case No.'] || data['FHA Case #'] || data['FHA Case Number'] || data?.Subject?.['FHA Case No.'] || data?.Subject?.['FHA Case #'] || data?.Subject?.['FHA Case Number'] || data?.SUBJECT?.['FHA Case No.'] || data?.SUBJECT?.['FHA Case #'] || data?.SUBJECT?.['FHA Case Number'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={isEditable} allData={data} />
                            </Box>
                            <Tooltip title="Scroll to FHA Requirements Check">
                              <IconButton
                                onClick={() => {
                                  const elem = document.getElementById('fha-requirement-check');
                                  if (elem) {
                                    elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                  if (!fhaResponse && !fhaLoading) {
                                    handleFhaCheck();
                                  }
                                }}
                                size="small"
                                color="info"
                              >
                                <Info fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Grid>
                      )}

                      {data['ADU File Check'] && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>ADU File Check</Typography>
                              <EditableField fieldPath={['ADU File Check']} value={data['ADU File Check']} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={isEditable} allData={data} />
                            </Box>
                            <Tooltip title="Check ADU Requirements">
                              <IconButton onClick={handleADUCheck} size="small" color="info">
                                <Info fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Grid>
                      )}

                      {(data['1004MC Addendum'] || data['1004MC Present'] || data?.Subject?.['1004MC Addendum'] || data?.has_1004mc !== undefined) && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              height: '100%',
                              borderColor: (data?.has_1004mc || data['1004MC Addendum']?.startsWith('Present') || data['1004MC Present'] === 'Yes' || data?.Subject?.['1004MC Addendum']?.startsWith('Present')) ? 'success.main' : 'divider',
                              bgcolor: (data?.has_1004mc || data['1004MC Addendum']?.startsWith('Present') || data['1004MC Present'] === 'Yes' || data?.Subject?.['1004MC Addendum']?.startsWith('Present')) ? '#f0fdf4' : 'background.paper'
                            }}
                          >
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                                1004MC Addendum
                              </Typography>
                              <EditableField
                                fieldPath={['1004MC Addendum']}
                                value={data['1004MC Addendum'] || (data?.has_1004mc ? 'Present' : 'Not Present')}
                                onDataChange={handleDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField}
                                isEditable={isEditable}
                                allData={data}
                              />
                            </Box>
                            <Tooltip title="View Market Conditions Section">
                              <IconButton
                                onClick={() => {
                                  const el = document.getElementById('market-conditions-section') || document.getElementById('market-conditions-summary');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                size="small"
                                color="primary"
                              >
                                <TrendingUpIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Grid>
                      )}

                      {/* USPAP / Appraisal and Report Identification Presence Check */}
                      {(data['USPAP / Appraisal and Report Identification'] || data['Appraisal and Report Identification'] || data?.Subject?.['USPAP / Appraisal and Report Identification'] || data?.Subject?.['Appraisal and Report Identification'] || data?.has_uspap_identification !== undefined) && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              height: '100%',
                              borderColor: (data?.has_uspap_identification || String(data['USPAP / Appraisal and Report Identification'] || data['Appraisal and Report Identification'] || data?.Subject?.['USPAP / Appraisal and Report Identification'] || '').startsWith('Present')) ? 'success.main' : 'divider',
                              bgcolor: (data?.has_uspap_identification || String(data['USPAP / Appraisal and Report Identification'] || data['Appraisal and Report Identification'] || data?.Subject?.['USPAP / Appraisal and Report Identification'] || '').startsWith('Present')) ? '#f0fdf4' : 'background.paper'
                            }}
                          >
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                                USPAP / Report Identification
                              </Typography>
                              <EditableField
                                fieldPath={['USPAP / Appraisal and Report Identification']}
                                value={data['USPAP / Appraisal and Report Identification'] || data['Appraisal and Report Identification'] || data?.Subject?.['USPAP / Appraisal and Report Identification'] || (data?.has_uspap_identification ? 'Present' : 'Not Present')}
                                onDataChange={handleDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField}
                                isEditable={isEditable}
                                allData={data}
                              />
                            </Box>
                            <Tooltip title="USPAP & Appraisal Report Identification Page Presence">
                              <IconButton
                                size="small"
                                color={(data?.has_uspap_identification || String(data['USPAP / Appraisal and Report Identification'] || data['Appraisal and Report Identification'] || data?.Subject?.['USPAP / Appraisal and Report Identification'] || '').startsWith('Present')) ? "success" : "default"}
                              >
                                <AssignmentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Grid>
                      )}

                      {/* USPAP Reporting Option Check */}
                      {(data['USPAP Reporting Option'] || data['This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).'] || data?.Subject?.['USPAP Reporting Option'] || data?.CERTIFICATION?.['USPAP Reporting Option'] || data?.has_uspap_identification) && (() => {
                        const uspapLongKey = "This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).";
                        const uspapVal = data[uspapLongKey] ||
                          data['This report was prepared under the following USPAP reporting option:'] ||
                          data['USPAP Reporting Option'] ||
                          data?.Subject?.[uspapLongKey] ||
                          data?.Subject?.['USPAP Reporting Option'] ||
                          data?.CERTIFICATION?.['USPAP Reporting Option'] ||
                          (data?.has_uspap_identification ? 'Appraisal Report (USPAP Standards Rule 2-2(a))' : '');

                        const commentVal = (
                          data['Comments on Appraisal and Report Identification'] ||
                          data['Restricted Appraisal Report Comment'] ||
                          data?.CERTIFICATION?.['Comments on Appraisal and Report Identification'] ||
                          data?.Subject?.['Comments on Appraisal and Report Identification'] ||
                          ''
                        ).trim();

                        const valLower = String(uspapVal || '').toLowerCase();
                        const isRestricted = valLower.includes('restricted');
                        const isAppraisalReport = valLower.includes('appraisal report') && !isRestricted;
                        const isValidated = (isRestricted && Boolean(commentVal)) || isAppraisalReport;
                        const isWarning = isRestricted && !commentVal;

                        return (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '100%',
                                borderColor: isValidated ? 'success.main' : (isWarning ? 'warning.main' : 'divider'),
                                bgcolor: isValidated ? '#f0fdf4' : (isWarning ? '#fffbeb' : 'background.paper')
                              }}
                            >
                              <Box sx={{ overflow: 'hidden', flex: 1, mr: 1 }}>
                                <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                                  USPAP Reporting Option
                                </Typography>
                                <EditableField
                                  fieldPath={[uspapLongKey]}
                                  value={uspapVal || 'Not Present'}
                                  onDataChange={handleDataChange}
                                  editingField={editingField}
                                  setEditingField={setEditingField}
                                  isEditable={isEditable}
                                  allData={data}
                                />
                                {isRestricted && commentVal && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.72rem', fontStyle: 'italic', wordBreak: 'break-word' }}>
                                    Comment: {commentVal.length > 80 ? commentVal.substring(0, 80) + '...' : commentVal}
                                  </Typography>
                                )}
                                {isRestricted && !commentVal && (
                                  <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block', mt: 0.5, fontSize: '0.72rem', fontWeight: 600 }}>
                                    Restricted report selected: comment required
                                  </Typography>
                                )}
                              </Box>
                              <Tooltip title={isRestricted && commentVal ? `Restricted Appraisal Report Comment: ${commentVal}` : "USPAP Reporting Option (Standards Rule 2-2(a) / 2-2(b))"}>
                                <IconButton
                                  size="small"
                                  color={isValidated ? "success" : (isWarning ? "warning" : "primary")}
                                >
                                  <AssignmentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Paper>
                          </Grid>
                        );
                      })()}

                      {/* ANSI - Compulsory Extraction Check */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            height: '100%',
                            borderColor: ((data['ANSI'] || data?.Subject?.['ANSI'] || data?.SUBJECT?.['ANSI']) && !String(data['ANSI'] || data?.Subject?.['ANSI'] || '').toLowerCase().includes('not present')) ? 'success.main' : 'warning.main',
                            bgcolor: ((data['ANSI'] || data?.Subject?.['ANSI'] || data?.SUBJECT?.['ANSI']) && !String(data['ANSI'] || data?.Subject?.['ANSI'] || '').toLowerCase().includes('not present')) ? '#f0fdf4' : '#fffbeb'
                          }}
                        >
                          <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                            ANSI
                          </Typography>
                          <EditableField
                            fieldPath={['ANSI']}
                            value={data['ANSI'] || data?.Subject?.['ANSI'] || data?.SUBJECT?.['ANSI'] || 'Not Present'}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={data}
                          />
                        </Paper>
                      </Grid>

                      {/* Exposure Comment - Compulsory Extraction Check */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            height: '100%',
                            borderColor: ((data['Exposure comment'] || data['Exposure Comment'] || data?.Subject?.['Exposure comment'] || data?.SUBJECT?.['Exposure comment']) && !String(data['Exposure comment'] || data['Exposure Comment'] || '').toLowerCase().includes('not present')) ? 'success.main' : 'warning.main',
                            bgcolor: ((data['Exposure comment'] || data['Exposure Comment'] || data?.Subject?.['Exposure comment'] || data?.SUBJECT?.['Exposure comment']) && !String(data['Exposure comment'] || data['Exposure Comment'] || '').toLowerCase().includes('not present')) ? '#f0fdf4' : '#fffbeb'
                          }}
                        >
                          <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                            Exposure Comment
                          </Typography>
                          <EditableField
                            fieldPath={['Exposure comment']}
                            value={data['Exposure comment'] || data['Exposure Comment'] || data?.Subject?.['Exposure comment'] || data?.Subject?.['Exposure Comment'] || data?.SUBJECT?.['Exposure comment'] || data?.SUBJECT?.['Exposure Comment'] || 'Not Present'}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={data}
                          />
                        </Paper>
                      </Grid>

                      {/* Prior Service Comment - Compulsory Extraction Check */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            height: '100%',
                            borderColor: ((data['Prior service comment'] || data['Prior Service Comment'] || data?.Subject?.['Prior service comment'] || data?.SUBJECT?.['Prior service comment']) && !String(data['Prior service comment'] || data['Prior Service Comment'] || '').toLowerCase().includes('not present')) ? 'success.main' : 'warning.main',
                            bgcolor: ((data['Prior service comment'] || data['Prior Service Comment'] || data?.Subject?.['Prior service comment'] || data?.SUBJECT?.['Prior service comment']) && !String(data['Prior service comment'] || data['Prior Service Comment'] || '').toLowerCase().includes('not present')) ? '#f0fdf4' : '#fffbeb'
                          }}
                        >
                          <Typography variant="caption" color="secondary.main" fontWeight="bold" display="block" noWrap>
                            Prior Service Comment
                          </Typography>
                          <EditableField
                            fieldPath={['Prior service comment']}
                            value={data['Prior service comment'] || data['Prior Service Comment'] || data?.Subject?.['Prior service comment'] || data?.Subject?.['Prior Service Comment'] || data?.SUBJECT?.['Prior service comment'] || data?.SUBJECT?.['Prior Service Comment'] || 'Not Present'}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={data}
                          />
                        </Paper>
                      </Grid>

                      {/* E&O - Insurance Compliance Check */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            borderColor: isEoPresent ? 'success.main' : 'warning.main',
                            bgcolor: isEoPresent ? '#f0fdf4' : '#fff5f5'
                          }}
                        >
                          <Box sx={{ overflow: 'hidden', flexGrow: 1, mr: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="caption"
                                color="secondary.main"
                                fontWeight="bold"
                                noWrap
                                sx={{ cursor: 'pointer' }}
                                onClick={() => setEditingField && setEditingField(['E&O'])}
                              >
                                E&O
                              </Typography>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  backgroundColor: isEoPresent ? '#e8f5e9' : '#ffebee',
                                  color: isEoPresent ? '#1b5e20' : '#c62828',
                                  border: `1px solid ${isEoPresent ? '#a5d6a7' : '#ef9a9a'}`
                                }}
                              >
                                {isEoPresent ? '● Present' : '○ Absent'}
                              </span>
                            </Box>
                            <EditableField
                              fieldPath={['E&O']}
                              value={eoVal}
                              onDataChange={(path, val) => {
                                handleDataChange(['E&O'], val);
                                handleDataChange(['CERTIFICATION', 'E&O'], val);
                                handleDataChange(['E&O Present'], val);
                                handleDataChange(['CERTIFICATION', 'E&O Present'], val);
                              }}
                              editingField={editingField}
                              setEditingField={setEditingField}
                              isEditable={isEditable}
                              allData={data}
                              manualValidations={manualValidations}
                              handleManualValidation={handleManualValidation}
                            />
                          </Box>
                          <Tooltip title="Scroll to Appraiser / E&O Insurance Section">
                            <IconButton
                              onClick={() => {
                                const el = document.getElementById('appraiser-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              size="small"
                              color="primary"
                            >
                              <VerifiedUserIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Paper>
                      </Grid>

                      {/* Invoice Attached - Compliance Check */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            borderColor: isInvoiceAttached ? 'success.main' : 'warning.main',
                            bgcolor: isInvoiceAttached ? '#f0fdf4' : '#fff5f5'
                          }}
                        >
                          <Box sx={{ overflow: 'hidden', flexGrow: 1, mr: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="caption"
                                color="secondary.main"
                                fontWeight="bold"
                                noWrap
                                sx={{ cursor: 'pointer' }}
                                onClick={() => setEditingField && setEditingField(['Invoice Attached'])}
                              >
                                Invoice Attached
                              </Typography>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  backgroundColor: isInvoiceAttached ? '#e8f5e9' : '#ffebee',
                                  color: isInvoiceAttached ? '#1b5e20' : '#c62828',
                                  border: `1px solid ${isInvoiceAttached ? '#a5d6a7' : '#ef9a9a'}`
                                }}
                              >
                                {isInvoiceAttached ? '● Attached' : '○ Not Attached'}
                              </span>
                            </Box>
                            <EditableField
                              fieldPath={['Invoice Attached']}
                              value={invVal}
                              onDataChange={(path, val) => {
                                handleDataChange(['Invoice Attached'], val);
                                handleDataChange(['CERTIFICATION', 'Invoice Attached'], val);
                                handleDataChange(['SUBJECT', 'Invoice Attached'], val);
                                handleDataChange(['Subject', 'Invoice Attached'], val);
                              }}
                              editingField={editingField}
                              setEditingField={setEditingField}
                              isEditable={isEditable}
                              allData={data}
                              manualValidations={manualValidations}
                              handleManualValidation={handleManualValidation}
                            />
                          </Box>
                          <Tooltip title="Scroll to Appraiser / Invoice Section">
                            <IconButton
                              onClick={() => {
                                const el = document.getElementById('appraiser-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              size="small"
                              color="primary"
                            >
                              <ReceiptLongIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Paper>
                      </Grid>
                    </Grid>

                    {isUnpaidOkLender && (
                      <Alert severity="success" variant="standard" sx={{ fontWeight: 'bold' }}>
                        {unpaidLenderComment || `Unpaid lender in the list found :- ${unpaidLenderName || data['Lender/Client']}`}
                      </Alert>
                    )}
                    {!isUnpaidOkLender && (
                      <Alert severity="warning" variant="standard" sx={{ fontWeight: 'bold' }}>
                        Unpaid OK cannot proceed with review, please check with lender requirement.
                      </Alert>
                    )}

                    {/* {(data['FHA Case No.'] === '000-0000000' || !data['ANSI'] || !data['Exposure comment'] || !data['Prior service comment'] || !isUnpaidOkLender) && (
                      <Alert severity="error" variant="filled" icon={<ErrorOutlineIcon fontSize="inherit" />} sx={{ fontWeight: 'bold' }}>
                        Plz check the report
                      </Alert>
                    )} */}
                  </Stack>
                )}
              </Paper>
              {htmlFile && (
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: activeTheme.palette.background.paper,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden'
                  }}
                  id="html-data-section"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer' }} onClick={() => setIsHtmlDataMinimized(!isHtmlDataMinimized)}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" fontWeight="bold" color="text.primary">
                        HTML Data Analysis
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setIsHtmlDataMinimized(!isHtmlDataMinimized)}>
                      {isHtmlDataMinimized ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                    </IconButton>
                  </Box>

                  {!isHtmlDataMinimized && (
                    <Box>
                      {comparisonData?.comparison_results ? (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2 }} icon={<CompareArrowsIcon fontSize="inherit" />}>
                            Comparison Results
                          </Alert>
                          <ComparisonResultTable result={comparisonData.comparison_results} />
                        </Box>
                      ) : (
                        <Box>
                          {Object.keys(comparisonData).length > 0 && (
                            <GridInfoCard
                              id="html-data-info"
                              title="Extracted HTML Data"
                              fields={Object.keys(comparisonData)}
                              data={comparisonData}
                              cardClass="bg-primary text-white"
                              onDataChange={(field, value) => handleComparisonDataChange(field[0], value)}
                              editingField={editingField}
                              setEditingField={setEditingField}
                              isEditable={true}
                              allData={data}
                              manualValidations={manualValidations}
                              handleManualValidation={handleManualValidation}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              )}
            </>
          )}


          <ComparisonDialog
            open={isComparisonDialogOpen}
            onClose={() => setIsComparisonDialogOpen(false)}
            data={{
              comparisonData: comparisonData,
              pdfFile: selectedFile,
              htmlFile: htmlFile,
            }}
            onDataChange={handleComparisonDataChange}
            pdfFile={selectedFile}
            setComparisonData={setComparisonData}
            htmlFile={htmlFile}
          />
          <ContractComparisonDialog
            open={isContractCompareOpen}
            onClose={() => setIsContractCompareOpen(false)}
            onCompare={handleContractCompare}
            loading={contractCompareLoading}
            result={contractCompareResult}
            error={contractCompareError}
            selectedFile={selectedFile}
            contractFile={contractFile}
            mainData={data}
          />
          <EngagementLetterDialog
            open={isEngagementLetterDialogOpen}
            onClose={() => setIsEngagementLetterDialogOpen(false)}
            onCompare={handleEngagementLetterCompare}
            loading={engagementLetterCompareLoading}
            result={engagementLetterCompareResult}
            error={engagementLetterCompareError}
            selectedFile={selectedFile}
            engagementLetterFile={engagementLetterFile}
            mainData={data}
          />


          <Snackbar open={notification.open} autoHideDuration={3000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={handleCloseNotification} severity={notification.severity} variant="filled" sx={{ width: '100%' }}>
              {notification.message}
            </Alert>
          </Snackbar>

          {renderForm()}

          {selectedFormType !== '1004D' && (
            <>
              <div id="state-requirement-check" className="mb-4">
                <StateRequirementCheck
                  onPromptSubmit={handleStateRequirementCheck}
                  loading={stateReqLoading}
                  response={stateReqResponse}
                  error={stateReqError}
                />
              </div>

              <div id="client-requirement-check" className="mb-4">
                <ClientRequirementCheck
                  onPromptSubmit={handleClientRequirementCheck}
                  loading={clientReqLoading}
                  response={clientReqResponse}
                  error={clientReqError}
                  detectedLender={
                    data?.['Lender/Client'] ||
                    data?.Subject?.['Lender/Client'] ||
                    data?.Subject?.['Lender Name'] ||
                    data?.Subject?.['LENDER/CLIENT Name'] ||
                    data?.['LENDER/CLIENT Name'] ||
                    ''
                  }
                />
              </div>

              <div id="escalation-check" className="mb-4">
                <EscalationCheck
                  onPromptSubmit={handleEscalationCheck}
                  loading={escalationLoading}
                  response={escalationResponse}
                  error={escalationError}
                />
              </div>

              <div id="fha-requirement-check" className="mb-4">
                <FhaCheck
                  onPromptSubmit={handleFhaCheck}
                  loading={fhaLoading}
                  response={fhaResponse}
                  error={fhaError}
                />
              </div>

              <PromptAnalysis
                onPromptSubmit={handlePromptAnalysis}
                loading={promptAnalysisLoading}
                response={promptAnalysisResponse}
                error={promptAnalysisError}
                submittedPrompt={submittedPrompt}
                onAddendumRevisionButtonClick={() => setAddendumRevisionLangDialogOpen(true)}
              />

              {(rawGemini || Object.keys(data).length > 0) && (
                <Paper
                  id="raw-output"
                  elevation={3}
                  sx={{
                    mt: 4,
                    mb: 4,
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: activeTheme.palette.background.paper,
                    border: `1px solid ${activeTheme.palette.divider}`
                  }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={2} mb={2}>
                    <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
                      <CodeIcon color="primary" />
                      Extracted JSON Data (Raw Data)
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => {
                          const fileName = rawSectionFilter === 'ALL'
                            ? 'extracted_appraisal_data.json'
                            : `extracted_${rawSectionFilter.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_data.json`;
                          const blob = new Blob([JSON.stringify(filteredDisplayJson, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = fileName;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download JSON
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(filteredDisplayJson, null, 2));
                          setNotification({ open: true, message: 'Filtered JSON copied to clipboard!', severity: 'success' });
                        }}
                      >
                        Copy JSON
                      </Button>
                    </Stack>
                  </Stack>

                  {/* Filter Toolbar: Section-wise filter and Search across all data */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
                    <FormControl size="small" sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      <InputLabel id="raw-section-filter-label">Filter Section</InputLabel>
                      <Select
                        labelId="raw-section-filter-label"
                        id="raw-section-filter-select"
                        value={rawSectionFilter}
                        label="Filter Section"
                        onChange={(e) => setRawSectionFilter(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <FilterListIcon fontSize="small" color="primary" />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="ALL">
                          <em>All Sections (Entire Report)</em>
                        </MenuItem>
                        {rawSectionOptions.map((sec) => (
                          <MenuItem key={sec} value={sec}>
                            {sec}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      placeholder={rawSectionFilter === 'ALL' ? 'Search in all data / fields...' : `Search in ${rawSectionFilter}...`}
                      value={rawSearchQuery}
                      onChange={(e) => setRawSearchQuery(e.target.value)}
                      sx={{ flex: 1, minWidth: 200 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: rawSearchQuery ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setRawSearchQuery('')}>
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                    />

                    {(rawSectionFilter !== 'ALL' || rawSearchQuery) && (
                      <Button
                        size="small"
                        variant="text"
                        color="secondary"
                        onClick={() => {
                          setRawSectionFilter('ALL');
                          setRawSearchQuery('');
                        }}
                      >
                        Clear Filter
                      </Button>
                    )}
                  </Stack>

                  {/* Filter Status Badge / Chip */}
                  <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Section: ${rawSectionFilter === 'ALL' ? 'All Sections' : rawSectionFilter}`}
                      color={rawSectionFilter === 'ALL' ? 'default' : 'primary'}
                      variant={rawSectionFilter === 'ALL' ? 'outlined' : 'filled'}
                      onDelete={rawSectionFilter !== 'ALL' ? () => setRawSectionFilter('ALL') : undefined}
                    />
                    {rawSearchQuery && (
                      <Chip
                        size="small"
                        label={`Search: "${rawSearchQuery}"`}
                        color="secondary"
                        onDelete={() => setRawSearchQuery('')}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {Object.keys(filteredDisplayJson).length === 0
                        ? 'No matching fields found'
                        : `Showing ${Object.keys(filteredDisplayJson).length} section${Object.keys(filteredDisplayJson).length > 1 ? 's' : ''}`}
                    </Typography>
                  </Stack>

                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: themeMode === 'dark' ? '#0d1117' : '#1e293b',
                      color: themeMode === 'dark' ? '#58a6ff' : '#38bdf8',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      maxHeight: '450px',
                      overflow: 'auto',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <code>
                      {Object.keys(filteredDisplayJson).length > 0
                        ? JSON.stringify(filteredDisplayJson, null, 2)
                        : `// No data matching the filter: section="${rawSectionFilter}", search="${rawSearchQuery}".\n// Click "Clear Filter" to view all data.`}
                    </code>
                  </Box>
                </Paper>
              )}
            </>
          )}

          <Footer />

        </div>
        {modalContent && (
          <Dialog open={isCheckModalOpen} onClose={() => setIsCheckModalOpen(false)} fullWidth maxWidth="md">
            <DialogTitle>
              {modalContent.title}
              <IconButton
                aria-label="close"
                onClick={() => setIsCheckModalOpen(false)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <modalContent.Component {...modalContent.props} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsCheckModalOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
      {
        showScrollTop && (
          <Fab color="primary" size="small" onClick={scrollTop} sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
            <KeyboardArrowUpIcon />
          </Fab>
        )
      }
      <NotepadDialog
        open={isNotepadOpen}
        onClose={() => setIsNotepadOpen(false)}
        notes={notes}
        onNotesChange={setNotes}
      />
      <Tooltip title="Open Notepad" placement="top">
        <Fab color="secondary" size="small" onClick={handleOpenNotepad} sx={{ position: 'fixed', bottom: 16, right: 80, zIndex: 1200 }}>
          <NoteAltIcon />
        </Fab>
      </Tooltip>

      <Dialog open={isRentFormTypeMismatchDialogOpen} onClose={() => setIsRentFormTypeMismatchDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          Form Type Mismatch
        </DialogTitle>
        <DialogContent>
          <Typography>
            "Estimated Monthly Market Rent $" is present, but the Form Type is not 1007.
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Please verify the selected form type.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRentFormTypeMismatchDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <RevisionLanguageDialog
        open={isContractRevisionLangDialogOpen}
        onClose={() => setContractRevisionLangDialogOpen(false)}
        title="Contract Section Revision Language"
        prompts={CONTRACT_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isNeighborhoodRevisionLangDialogOpen}
        onClose={() => setNeighborhoodRevisionLangDialogOpen(false)}
        title="Neighborhood Section Revision Language"
        prompts={NEIGHBORHOOD_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });

        }}
      />
      <RevisionLanguageDialog
        open={isSiteRevisionLangDialogOpen}
        onClose={() => setSiteRevisionLangDialogOpen(false)}
        title="Site Section Revision Language"
        prompts={SITE_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });

        }}
      />
      <RevisionLanguageDialog
        open={isImprovementsRevisionLangDialogOpen}
        onClose={() => setImprovementsRevisionLangDialogOpen(false)}
        title="Improvements Section Revision Language"
        prompts={IMPROVEMENTS_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isSalesGridRevisionLangDialogOpen}
        onClose={() => setSalesGridRevisionLangDialogOpen(false)}
        title="Sales Comparison Grid Revision Language"
        prompts={SALES_GRID_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isReconciliationRevisionLangDialogOpen}
        onClose={() => setReconciliationRevisionLangDialogOpen(false)}
        title="Reconciliation Section Revision Language"
        prompts={RECONCILIATION_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isCostApproachRevisionLangDialogOpen}
        onClose={() => setCostApproachRevisionLangDialogOpen(false)}
        title="Cost Approach Section Revision Language"
        prompts={COST_APPROACH_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isCertificationRevisionLangDialogOpen}
        onClose={() => setCertificationRevisionLangDialogOpen(false)}
        title="Certification Section Revision Language"
        prompts={CERTIFICATION_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isAddendumRevisionLangDialogOpen}
        onClose={() => setAddendumRevisionLangDialogOpen(false)}
        title="General / Addendum Revision Language"
        prompts={ADDENDUM_GENERAL_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setAddendumRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={is1007RevisionLangDialogOpen}
        onClose={() => set1007RevisionLangDialogOpen(false)}
        title="1007 / Rent Schedule Revision Language"
        prompts={FORM_1007_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isRevisionLangDialogOpen}
        onClose={() => setRevisionLangDialogOpen(false)}
        title="Subject Section Revision Language"
        prompts={SUBJECT_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isPropertyAddressRevisionLangDialogOpen}
        onClose={() => setPropertyAddressRevisionLangDialogOpen(false)}
        title="Property Address Revision Language"
        prompts={[
          `The subject's street name should reflect as "${data['Property Address'] || '...'}", please verify and revise.`,
          `Please verify and revise the subject's street name and suffix in the Property Address ("${data['Property Address'] || '...'}").`,
          `Please update the Property Address ("${data['Property Address'] || '...'}") to match legal and title documentation.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isLenderClientRevisionLangDialogOpen}
        onClose={() => setLenderClientRevisionLangDialogOpen(false)}
        title="Lender/Client Revision Language"
        prompts={[
          `Please revise the lender/client name ("${data['Lender/Client'] || '...'}") to match the engagement letter and order form.`,
          `Please revise the spelling and legal entity designator (e.g. Inc, LLC, NA) of the lender/client name ("${data['Lender/Client'] || '...'}").`,
          `Please verify the lender/client name ("${data['Lender/Client'] || '...'}") and update to match legal documentation.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isFinancialAssistanceRevisionLangDialogOpen}
        onClose={() => setFinancialAssistanceRevisionLangDialogOpen(false)}
        title="Financial Assistance Revision Language"
        prompts={[
          "The report indicates 'Is there any financial assistance to be paid by any party on behalf of the borrower?' as YES; however, the concession amount is noted as $0. Please revise.",
          `Please verify the financial assistance concession amount ("${data['Financial Assistance $'] || data['Concession $'] || '$0'}") and match with the purchase agreement.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isDateOfContractRevisionLangDialogOpen}
        onClose={() => setDateOfContractRevisionLangDialogOpen(false)}
        title="Date of Contract Revision Language"
        prompts={[
          `The 'Date of Contract' ("${data['Date of Contract'] || '...'}") noted in the contract section does not match the purchase agreement; please verify and revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isHoaRevisionLangDialogOpen}
        onClose={() => setHoaRevisionLangDialogOpen(false)}
        title="HOA Revision Language"
        prompts={[
          "In the subject section, the HOA amount is noted; however, the payment frequency (per year or per month) is missing. Please revise.",
          "The PUD box is marked in the subject section; however, the HOA amount is noted as $0. Please verify and update."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setHoaRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={isonewithAccessoryUnitRevisionLangDialogOpen}
        onClose={() => setOneWithAccessoryUnitRevisionLangDialogOpen(false)}
        title="One with Accessory Unit Revision Language"
        prompts={[
          "Photos and sketches indicate the subject has an ADU; however, the 'One with Accessory Unit' box is not marked in the Improvements section. Please revise.",
          "The guest house does not have a kitchen; however, it is marked as an accessory unit. Please verify/revise qualifications as an ADU.",
          "Photos and sketches do not indicate an ADU; however, the 'One with Accessory Unit' box is marked in the Improvements section. Please verify and revise."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setOneWithAccessoryUnitRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={isLenderClientAddressRevisionLangDialogOpen}
        onClose={() => setLenderClientAddressRevisionLangDialogOpen(false)}
        title="Lender/Client Address Revision Language"
        prompts={[
          `Please update the lender address to the new address, as it was not updated in the system:\n3232 E Cesar Chavez St, Suite 1-320, Austin, TX 78702.`,
          `Please update the lender/client address ("${data['Address (Lender/Client)'] || '...'}") in the subject section to match the order form.`,
          `Please revise the lender/client address ("${data['Address (Lender/Client)'] || '...'}") to ensure street, city, state, and zip code match the engagement letter.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isContractPriceRevisionLangDialogOpen}
        onClose={() => setContractPriceRevisionLangDialogOpen(false)}
        title="Contract Price Revision Language"
        prompts={[
          "The 'Contract Price' noted in the report does not match the purchase agreement; please verify and revise.",
          `The report shows the 'Contract Price' as "${data['Contract Price $'] || '...'}"; please verify and reconcile with the purchase contract.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isNeighborhoodBoundariesRevisionLangDialogOpen}
        onClose={() => setNeighborhoodBoundariesRevisionLangDialogOpen(false)}
        title="Neighborhood Boundaries Revision Language"
        prompts={[
          "Please provide complete neighborhood boundaries for North, South, East, and West directions in the neighborhood section.",
          `Neighborhood boundaries ("${data['Neighborhood Boundaries'] || '...'}") appear incomplete or missing specific directional boundaries. Please revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isOtherLandUseRevisionLangDialogOpen}
        onClose={() => setOtherLandUseRevisionLangDialogOpen(false)}
        title="Other Land Use Revision Language"
        prompts={[
          "Please revise the 'Present Land Use' percentages in the neighborhood section so that the total equals 100%.",
          "Please provide explanation and comment for the 'Other' land use percentage noted in the neighborhood section."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isZoningComplianceRevisionLangDialogOpen}
        onClose={() => setZoningComplianceRevisionLangDialogOpen(false)}
        title="Zoning Compliance Revision Language"
        prompts={[
          "The 'Zoning Compliance' is marked as 'Legal Nonconforming (Grandfathered Use)'; please comment whether the subject can be rebuilt if destroyed.",
          "The 'Zoning Compliance' is marked as 'No Zoning'; please comment whether the subject can be rebuilt if destroyed."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isAreaRevisionLangDialogOpen}
        onClose={() => setAreaRevisionLangDialogOpen(false)}
        title="Area Revision Language"
        prompts={[
          `Please state the site area ("${data['Area'] || '...'}") in square feet (sf) or acres (ac) in the site section.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isFemaHazardRevisionLangDialogOpen}
        onClose={() => setFemaHazardRevisionLangDialogOpen(false)}
        title="FEMA Hazard Revision Language"
        prompts={[
          `'FEMA Special Flood Hazard Area' is marked as NO; however, FEMA Flood Zone is "${data['FEMA Flood Zone'] || '...'}". Please reconcile and revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      {pdfPreviewOpen && (
        <PdfPreview
          key={pdfPreviewUrl}
          pdfUrl={pdfPreviewUrl}
          onClose={() => {
            setPdfPreviewOpen(false);
            URL.revokeObjectURL(pdfPreviewUrl);
          }}
        />
      )}
      <Dialog open={isClearDialogOpen} onClose={() => setIsClearDialogOpen(false)}>
        <DialogTitle>Clear All Data?</DialogTitle>
        <DialogContent>
          <Typography>This will remove all uploaded files and extracted data. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsClearDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmClearFiles} color="error" variant="contained" autoFocus>Clear All</Button>
        </DialogActions>
      </Dialog>
      <PdfXmlDiffDialog
        open={isPdfXmlDiffOpen}
        onClose={() => setIsPdfXmlDiffOpen(false)}
        onCompare={handleOpenPdfXmlDiff}
        loading={pdfXmlDiffLoading}
        result={pdfXmlDiffResult}
        error={pdfXmlDiffError}
        selectedFile={selectedFile}
        xmlFile={xmlFile}
        onApplyAllXml={handleApplyAllXml}
      />
    </>
  );
}
export default Subject;
