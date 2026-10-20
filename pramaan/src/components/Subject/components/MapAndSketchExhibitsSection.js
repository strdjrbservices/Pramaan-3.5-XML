import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress
} from '@mui/material';
import {
  Map as MapIcon,
  Satellite as SatelliteIcon,
  Architecture as ArchitectureIcon,
  Home as HomeIcon,
  RotateRight as RotateRightIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Layers as LayersIcon,
  KingBed as BedIcon,
  Bathtub as BathIcon,
  Weekend as LivingIcon,
  Kitchen as KitchenIcon,
  LocalLaundryService as LaundryIcon,
  DirectionsCar as GarageIcon,
  MeetingRoom as RoomIcon
} from '@mui/icons-material';

const ROOM_THEMES = {
  bedrooms: { label: 'Bedrooms', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
  bathrooms: { label: 'Bathrooms', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc' },
  living: { label: 'Living Areas', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  kitchen_dining: { label: 'Kitchen & Dining', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  utility_laundry: { label: 'Utility & Laundry', color: '#334155', bg: '#f8fafc', border: '#cbd5e1' },
  garage_parking: { label: 'Garage & Parking', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  openings_outdoor: { label: 'Openings & Outdoor', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' }
};

const DEFAULT_ROOM_THEME = { label: 'Room', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' };

const parseSketchRooms = (sketchItem) => {
  if (sketchItem?.room_labels && sketchItem.room_labels.length > 0) {
    return {
      labels: sketchItem.room_labels,
      byCategory: sketchItem.rooms_by_category || {},
      byLevel: sketchItem.rooms_by_level || {},
      summary: sketchItem.room_summary || {}
    };
  }

  // Fallback: parse from raw_text_sample or areas
  const LEVEL_PATS = [
    { regex: /\blower\s*level\b/i, name: 'Lower Level' },
    { regex: /\bmain\s*level\b/i, name: 'Main Level' },
    { regex: /\bupper\s*level\b/i, name: 'Upper Level' },
    { regex: /\b(?:first|1st)\s*(?:floor|flcor|level)\b/i, name: '1st Floor' },
    { regex: /\b(?:second|2nd)\s*(?:floor|flcor|foor|level)\b/i, name: '2nd Floor' },
    { regex: /\b(?:third|3rd)\s*(?:floor|flcor|level)\b/i, name: '3rd Floor' },
    { regex: /\bbasement\b/i, name: 'Basement' }
  ];

  const CATEGORY_RULES = {
    bedrooms: [
      { regex: /\b(?:main|master|primary)\s+bed(?:room)?\b/i, name: 'Main Bedroom' },
      { regex: /\bguest\s+bed(?:room)?\b/i, name: 'Guest Bedroom' },
      { regex: /\bbed(?:room)?\s*\d*\b/i, name: 'Bedroom' },
      { regex: /\b(?:be[cd]r[oc0-9]+m|eedroom|bacroom|becrcem|becrc-m)\b/i, name: 'Bedroom' },
      { regex: /\b(?:br|bdrm)\b/i, name: 'Bedroom' },
      { regex: /\bbed\s*\d+\b/i, name: 'Bedroom' }
    ],
    bathrooms: [
      { regex: /\b(?:bath\s*\(\s*(?:half|1\/2)\s*\)|half\s*bath|1\/2\s*bath|powder(?:\s*room)?\b)/i, name: 'Half Bath' },
      { regex: /\b(?:main|master|primary)\s+bath(?:room)?\b/i, name: 'Main Bath' },
      { regex: /\b(?:full\s+)?bath(?:room)?\s*\d*\b/i, name: 'Bath' },
      { regex: /\bba\b/i, name: 'Bath' },
      { regex: /\blav(?:atory)?\b/i, name: 'Half Bath' },
      { regex: /\bwc\b/i, name: 'Half Bath' }
    ],
    living: [
      { regex: /\bliving(?:\s*room|\s*rm|\s*area)?\b/i, name: 'Living Room' },
      { regex: /\blivira\b/i, name: 'Living Room' },
      { regex: /\bfamily(?:\s*room|\s*rm)?\b/i, name: 'Family Room' },
      { regex: /\bgreat\s*room\b/i, name: 'Great Room' },
      { regex: /\brec(?:reation)?(?:\s*room)?\b/i, name: 'Rec Room' },
      { regex: /\b(?:den|study|office|loft)\b/i, name: 'Den / Study' },
      { regex: /\bsitting(?:\s*room|\s*area)?\b/i, name: 'Sitting Area' },
      { regex: /\bsun\s*room|sunroom\b/i, name: 'Sun Room' },
      { regex: /\bbonus\s*room\b/i, name: 'Bonus Room' }
    ],
    kitchen_dining: [
      { regex: /\bkitchen|kitch|kteten\b/i, name: 'Kitchen' },
      { regex: /\bdining(?:\s*room|\s*rm|\s*area)?|diring\b/i, name: 'Dining Room' },
      { regex: /\bbreakfast(?:\s*nook|\s*area|\s*room)?\b/i, name: 'Breakfast Nook' },
      { regex: /\b(?:nook|dinette)\b/i, name: 'Dining Nook' },
      { regex: /\bpantry\b/i, name: 'Pantry' },
      { regex: /\bwet\s*bar|bar\b/i, name: 'Bar' }
    ],
    openings_outdoor: [
      { regex: /\bopen\s+to\s+below\b/i, name: 'Open to Below' },
      { regex: /\b(?:closed\s*porch|uncover\s*porch|screened?\s*porch|porch)\b/i, name: 'Porch' },
      { regex: /\bdeck\b/i, name: 'Deck' },
      { regex: /\bpatio\b/i, name: 'Patio' },
      { regex: /\bbalcony\b/i, name: 'Balcony' },
      { regex: /\bterrace|veranda|lanai\b/i, name: 'Terrace / Lanai' }
    ],
    garage_parking: [
      { regex: /\b\d+\s*car\s*(?:attached|detached)?(?:\s*garage)?\b/i, name: 'Car Garage' },
      { regex: /\b1\s*car\s*attached\b/i, name: '1 Car Attached' },
      { regex: /\b2\s*car\s*attached\b/i, name: '2 Car Attached' },
      { regex: /\b(?:attached|detached)?\s*garage\b/i, name: 'Garage' },
      { regex: /\bcarport\b/i, name: 'Carport' }
    ],
    utility_laundry: [
      { regex: /\blaundry(?:\s*room|\s*rm|\s*area)?\b/i, name: 'Laundry' },
      { regex: /\butility(?:\s*room|\s*rm)?\b/i, name: 'Utility' },
      { regex: /\bmud\s*room|mudroom\b/i, name: 'Mud Room' },
      { regex: /\b(?:foyer|entry(?:way)?|vestibule)\b/i, name: 'Foyer / Entry' },
      { regex: /\b(?:stairs|stairway)\b/i, name: 'Stairs' },
      { regex: /\bwalk[\s-]*in\s*closet|wic\b/i, name: 'Walk-in Closet' },
      { regex: /\bcl(?:o)?se[td](?!\s*porch)\b/i, name: 'Closet' },
      { regex: /\b(?:mechanical|furnace|hvac|storage)\b/i, name: 'Storage / Mech' }
    ]
  };

  const rawCandidates = [];
  if (sketchItem?.raw_text_sample) {
    rawCandidates.push(...sketchItem.raw_text_sample.split('|').map(s => s.trim()));
  }
  if (Array.isArray(sketchItem?.areas)) {
    sketchItem.areas.forEach(a => {
      if (a?.name) rawCandidates.push(a.name.trim());
    });
  }

  const byCategory = {
    bedrooms: [],
    bathrooms: [],
    living: [],
    kitchen_dining: [],
    utility_laundry: [],
    garage_parking: [],
    openings_outdoor: []
  };
  const byLevel = {};
  const allLabels = [];
  let currentLevel = 'Main Level';

  rawCandidates.forEach(cand => {
    const cleaned = cand.replace(/\[?\s*-?\d+(?:\.\d+)?\s*sq\s*ft\s*\]?/gi, '').trim();
    if (!cleaned || /^[\d.\s'"x=\-+/\\]+$/.test(cleaned)) return;

    let isLevel = false;
    for (const lvl of LEVEL_PATS) {
      if (lvl.regex.test(cleaned)) {
        currentLevel = lvl.name;
        if (!byLevel[currentLevel]) byLevel[currentLevel] = [];
        isLevel = true;
        break;
      }
    }
    if (isLevel) return;

    for (const [catKey, rules] of Object.entries(CATEGORY_RULES)) {
      let matched = false;
      for (const r of rules) {
        if (r.regex.test(cleaned)) {
          const item = { label: cand, standard_name: r.name, category: catKey, level: currentLevel };
          byCategory[catKey].push(item);
          if (!byLevel[currentLevel]) byLevel[currentLevel] = [];
          byLevel[currentLevel].push(item);
          allLabels.push(cand);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  });

  const fullBaths = byCategory.bathrooms.filter(b => b.standard_name !== 'Half Bath').length;
  const halfBaths = byCategory.bathrooms.filter(b => b.standard_name === 'Half Bath').length;
  const bathCount = fullBaths + 0.5 * halfBaths;
  const bathDisplay = `${fullBaths} Full${halfBaths > 0 ? `, ${halfBaths} Half` : ''}`;

  return {
    labels: allLabels,
    byCategory,
    byLevel,
    summary: {
      bedroom_count: byCategory.bedrooms.length,
      bathroom_count: bathCount,
      bathroom_display: bathDisplay,
      living_rooms_count: byCategory.living.length,
      has_kitchen: byCategory.kitchen_dining.some(k => /kitchen/i.test(k.label)),
      has_dining: byCategory.kitchen_dining.some(k => /dining|nook/i.test(k.label)),
      has_laundry: byCategory.utility_laundry.some(u => /laundry/i.test(u.label)),
      garage: byCategory.garage_parking[0]?.label || null,
      total_room_labels: allLabels.length
    }
  };
};

const cleanPinAddress = (pin, subjectPin = null, compIndex = null) => {
  if (!pin) return { street: '', city: '', state: '', zipcode: '', fullAddress: '', miles: '', proximity: '', label: '', photo_data: null, raw_pin: null, item_type: 'Comparable' };

  const raw = [pin.label, pin.address, pin.street, pin.raw_text].filter(Boolean).join(' ').trim();
  const isSub = pin.item_type === 'Subject' || /subject/i.test(pin.label || '');
  const isRental = pin.item_type === 'Rental' || /rental/i.test(pin.label || '') || /rental/i.test(pin.raw_text || '');

  // 1. Street Address Normalization
  let street = (pin.street && pin.street !== '(Address pin)') ? pin.street.trim() : '';
  if (!street) {
    const STREET_SUFFIX_REGEX = '(?:Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Way|Ct|Court|Lane|Ln|Place|Pl|Tr|Trail|Circle|Cir|Terrace|Ter|Terr|Parkway|Pkwy|Alley|Aly|Loop|Hwy|Highway|Park|Pk|Pike|Cove|Cv|Square|Sq|Ridge|Rdg|Run|Trace|Trce|Point|Pt|Crossing|Xing|Plaza|Plz|Row|Pass|Path|Walk|Bend|Hollow|Holw|Landing|Lndg|Bay|View|Vw|Branch|Br|Creek|Crk|Turnpike|Tpke|Freeway|Fwy|Heights|Hts|Estates|Est|Station|Stn|Glen|Harbor|Hbr|Isle|Island|Knoll|Meadow|Overlook|Pond|Reach|Spring|Spur)';
    const mSt = raw.match(new RegExp('\\b([0-9]{1,6}(?:-[0-9]{1,6})?\\s+[A-Za-z0-9#\\s.,\'-]+?' + STREET_SUFFIX_REGEX + ')\\b', 'i'));
    if (mSt) {
      street = mSt[1].trim();
    } else if (pin.raw_text) {
      // Clean off headers and distance to find street
      let tClean = pin.raw_text
        .replace(/\b(?:SUBJECT|COM[P|R|B|I]+AR?AB[L|I]+E(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*|RENTAL(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*)\b/gi, '')
        .replace(/[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b(?:\s*[NSEWnsew]{1,2}|North|South|East|West)?/gi, '')
        .replace(/[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$/i, '')
        .trim();
      const mNum = tClean.match(/\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,'-]+)/);
      if (mNum) {
        let cand = mNum[1].trim().replace(/[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$/i, '').trim();
        cand = cand.replace(/\s+[~_].*$/, '').trim();
        if (cand.split(/\s+/).length >= 2) street = cand;
      }
    }
    if (!street && pin.photo_data?.address) {
      street = pin.photo_data.address.trim();
    }
    if (!street && pin.address && pin.address !== '(Address pin)') {
      street = pin.address.trim();
    }
  }

  // 2. City, State, Zip Normalization
  let city = (pin.city && pin.city !== '—') ? pin.city.trim() : '';
  let state = (pin.state && pin.state !== '—') ? pin.state.trim() : '';
  let zipcode = (pin.zipcode && pin.zipcode !== '—') ? pin.zipcode.trim() : '';

  if (!city || city === '—') {
    const mCsz = raw.match(/([A-Za-z\s]+?)[,\s]+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+([0-9]{5}(?:-[0-9]{4})?)/i);
    if (mCsz && !/Main|Street|Road|Ave|Blvd/i.test(mCsz[1])) {
      if (!city) city = mCsz[1].replace(/,/g, '').trim();
      if (!state) state = mCsz[2].toUpperCase();
      if (!zipcode) zipcode = mCsz[3];
    } else if (subjectPin && subjectPin.city) {
      if (!city) city = subjectPin.city;
      if (!state) state = subjectPin.state || '';
      if (!zipcode) zipcode = subjectPin.zipcode || '';
    } else if (pin.photo_data?.city) {
      if (!city) city = pin.photo_data.city;
      if (!state) state = pin.photo_data.state || '';
      if (!zipcode) zipcode = pin.photo_data.zipcode || '';
    }
  }

  if (city && /,\s*[A-Z]{2}\s+[0-9]{5}/.test(city)) {
    const mCszParts = city.match(/([A-Za-z\s]+?)[,\s]+([A-Z]{2})\s+([0-9]{5})/);
    if (mCszParts) {
      city = mCszParts[1].trim();
      state = mCszParts[2].toUpperCase();
      zipcode = mCszParts[3];
    }
  }

  // 3. Miles & Proximity Normalization
  let miles = pin.miles ? String(pin.miles) : '';
  let proximity = pin.proximity ? String(pin.proximity) : '';

  if (isSub) {
    miles = '0.00';
    proximity = '0.00 mi (Base)';
  } else {
    if (!miles && pin.distance) {
      const mMiles = pin.distance.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (mMiles) miles = mMiles[1];
    }
    if (!proximity && pin.distance) {
      proximity = `${pin.distance} ${pin.direction || ''}`.trim();
    }
  }

  // 4. Label & Comp / Rental Number Normalization
  let label = pin.label || (isSub ? 'Subject' : (isRental ? 'Rental' : 'Comparable'));
  if (!isSub) {
    const mNum = label.match(/#?([0-9]+)/);
    if (mNum && parseInt(mNum[1], 10) > 30) {
      label = isRental ? `Rental #${compIndex !== null ? compIndex + 1 : 1}` : `Comparable #${compIndex !== null ? compIndex + 1 : 1}`;
    }
  }

  const fullAddress = `${street}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zipcode ? ` ${zipcode}` : ''}`.trim();

  return {
    item_type: isSub ? 'Subject' : (isRental ? 'Rental' : 'Comparable'),
    label,
    street,
    city,
    state,
    zipcode,
    fullAddress,
    miles,
    proximity,
    photo_data: pin.photo_data || null,
    raw_pin: pin
  };
};

const getComparablePhotoData = (compInfo, compIndex, scanResult, allData, data) => {
  if (compInfo?.photo_data) return compInfo.photo_data;
  if (compInfo?.raw_pin?.photo_data) return compInfo.raw_pin.photo_data;

  const isRental = compInfo?.item_type === 'Rental' || /rental/i.test(compInfo?.label || '');
  const compPhotosList = scanResult?.comparable_photos || [];
  const allPhotos = allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || allData?.extracted_photos || data?.extracted_photos || [];
  
  const allCandidatePhotos = [
    ...compPhotosList,
    ...allPhotos.filter(p => p.category === 'Comparable' || p.category === 'Rental' || (p.comp_number && p.address) || p.sale_price)
  ];

  const compPhotos = allCandidatePhotos.filter(p => {
    const pIsRental = p.category === 'Rental' || p.is_rental || /rental/i.test(p.title || '') || /rental/i.test(p.caption || '');
    return isRental ? pIsRental : !pIsRental;
  });

  if (!compPhotos.length) return null;

  const norm = (s) => (s || '').toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\s+/g, ' ')
    .trim();

  const pinStreet = norm(compInfo?.street || compInfo?.address || '');
  const pinNumMatch = pinStreet.match(/^([0-9]{1,6}(?:-[0-9]{1,6})?)/);
  const pinNum = pinNumMatch ? pinNumMatch[1] : '';

  // 1. Match by address street number & keywords
  if (pinNum) {
    for (const cp of compPhotos) {
      const cpAddrNorm = norm(cp.address || '');
      const cpNumMatch = cpAddrNorm.match(/^([0-9]{1,6}(?:-[0-9]{1,6})?)/);
      if (cpNumMatch) {
        const cpNum = cpNumMatch[1];
        if (cpNum === pinNum) {
          const pinWords = pinStreet.split(' ').slice(1).filter(w => w.length >= 4 && !['street', 'road', 'avenue', 'lane', 'drive', 'court'].includes(w));
          const cpWords = cpAddrNorm.split(' ').slice(1).filter(w => w.length >= 4);
          if (!pinWords.length || pinWords.some(w => cpWords.some(cw => cw.includes(w) || w.includes(cw)))) {
            return cp;
          }
        }
      }
    }
  }

  // 2. Match by Comparable / Rental Number in label (#1, #2, etc.)
  const labelNumMatch = (compInfo?.label || '').match(/#?(\d+)/);
  const targetCompNum = labelNumMatch ? parseInt(labelNumMatch[1], 10) : (compIndex !== null ? compIndex + 1 : null);
  if (targetCompNum) {
    const byNum = compPhotos.find(cp => cp.comp_number === targetCompNum || cp.comp_num === targetCompNum);
    if (byNum) return byNum;
  }

  // 3. Match by Proximity / Distance (e.g. 2.79 miles or 0.29 miles)
  const distMatch = (compInfo?.proximity || compInfo?.miles || '').match(/([0-9]+\.[0-9]+)/);
  if (distMatch) {
    const dVal = distMatch[1];
    const byDist = compPhotos.find(cp => (cp.proximity || '').includes(dVal));
    if (byDist) return byDist;
  }

  return null;
};

const getSubjectPhotoData = (allData, data) => {
  const allPhotos = allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || allData?.extracted_photos || data?.extracted_photos || [];
  return allPhotos.find(p => p.category === 'Subject' || /front/i.test(p.caption || '') || /front/i.test(p.title || '')) || null;
};

const normalizeAddressForCompare = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bway\b/g, 'wy')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w')
    .replace(/\s+/g, ' ')
    .trim();
};

const compareAddresses = (mapAddr, gridAddr) => {
  const normMap = normalizeAddressForCompare(mapAddr);
  const normGrid = normalizeAddressForCompare(gridAddr);
  if (!normMap || !normGrid || normGrid === '—') return { status: 'missing', label: 'No Data' };

  if (normMap === normGrid) return { status: 'match', label: 'Match' };

  const mMapNum = normMap.match(/^(\d+)/);
  const mGridNum = normGrid.match(/^(\d+)/);

  if (mMapNum && mGridNum && mMapNum[1] === mGridNum[1]) {
    const mapWords = normMap.split(' ').slice(1);
    const gridWords = normGrid.split(' ').slice(1);
    const common = mapWords.filter(w => w.length > 1 && gridWords.some(gw => gw.includes(w) || w.includes(gw)));
    if (common.length >= 1) {
      return { status: 'match', label: 'Match' };
    }
    return { status: 'partial', label: 'Near Match' };
  }

  // Check street words overlap if pin lacked house number
  const mapWords = normMap.split(' ');
  const gridWords = normGrid.split(' ');
  const common = mapWords.filter(w => w.length > 2 && gridWords.some(gw => gw === w));
  if (common.length >= 2) {
    return { status: 'partial', label: 'Near Match' };
  }

  return { status: 'mismatch', label: 'Mismatch' };
};

const getSubjectGridData = (data, allData) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const subj = root.Subject || root.SUBJECT || {};
  const sGrid = root.SALES_GRID || root['Sales Grid'] || {};

  const street = subj['Property Address'] || subj['Address'] || subj['Physical Address'] || root['Property Address'] || root['Physical Address'] || root['Full Address'] || sGrid['Subject Address'] || sGrid.Subject?.Address || '';
  const city = subj['City'] || root['City'] || '';
  const state = subj['State'] || root['State'] || '';
  const zip = subj['Zip Code'] || subj['Zip'] || root['Zip Code'] || root['Zip'] || '';

  let full = '';
  if (street && city && state) {
    full = `${street}, ${city}, ${state} ${zip}`.trim();
  } else {
    full = street || (city && state ? `${city}, ${state} ${zip}`.trim() : '');
  }

  return {
    street: street || full,
    city,
    state,
    zipcode: zip,
    fullAddress: full || '—',
    proximity: 'Subject Base'
  };
};

const getGridComparableData = (compIndex, compLabel, compStreet, data, allData) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const sGrid = root.SALES_GRID || root['Sales Grid'] || {};

  let explicitNum = null;
  const mLabel = (compLabel || '').match(/#?(\d+)/);
  if (mLabel && parseInt(mLabel[1], 10) <= 20) {
    explicitNum = parseInt(mLabel[1], 10);
  } else if (compIndex !== null && compIndex >= 0 && compIndex < 10) {
    explicitNum = compIndex + 1;
  }

  const normMap = normalizeAddressForCompare(compStreet);
  const mMapNum = normMap.match(/^(\d+)/);
  const mapNum = mMapNum ? mMapNum[1] : '';

  const extractFromCompObj = (obj) => {
    if (!obj) return { address: '', proximity: '', sale_price: '', gla: '', bed_bath: '', site: '', quality_age: '' };
    if (typeof obj === 'string') return { address: obj, proximity: '', sale_price: '', gla: '', bed_bath: '', site: '', quality_age: '' };
    const addr = obj['Address'] || obj['Comparable Property Address'] || obj['Property Address'] || obj['Physical Address'] || '';
    const prox = obj['Proximity to Subject'] || obj['Proximity'] || '';
    const sale_price = obj['Sale Price'] || obj['Sales Price'] || obj['Settlement Price'] || '';
    const gla = obj['Gross Living Area'] || obj['GLA'] || '';
    const beds = obj['Total Bedrooms'] || obj['Bedrooms'] || '';
    const baths = obj['Total Bathrooms'] || obj['Bathrooms'] || '';
    const rooms = obj['Total Rooms'] || '';
    const bed_bath = (beds || baths) ? `${rooms ? `${rooms} / ` : ''}${beds} Bed / ${baths} Bath` : '';
    const site = obj['Site'] || obj['Site Area'] || '';
    const quality = obj['Quality of Construction'] || obj['Quality'] || '';
    const age = obj['Actual Age'] || obj['Age'] || '';
    const quality_age = (quality || age) ? `${quality}${age ? ` / ${age} yrs` : ''}`.trim() : '';

    return { address: addr, proximity: prox, sale_price, gla, bed_bath, site, quality_age };
  };

  // 1. Check Rental Grid if item is a Rental
  const isRental = /rental/i.test(compLabel || '');
  if (isRental) {
    const rGrid = root.RENTAL_GRID || root['Rental Grid'] || root.RENTALS || root['Rentals'] || {};
    for (let i = 1; i <= 9; i++) {
      const candidateKeys = [
        `RENTAL #${i}`,
        `Rental #${i}`,
        `RENTAL_${i}`,
        `Rental ${i}`,
        `RENTAL_COMPARABLE_${i}`
      ];
      for (const k of candidateKeys) {
        const item = root[k] || rGrid[k];
        if (item) {
          const compData = extractFromCompObj(item);
          if (compData.address) {
            const cmpRes = compareAddresses(compStreet, compData.address);
            if (cmpRes.status === 'match' || cmpRes.status === 'partial') {
              return {
                gridCompNum: i,
                gridCompLabel: `Rental #${i}`,
                ...compData,
                matchStatus: cmpRes.status,
                matchLabel: cmpRes.label
              };
            }
          }
        }
      }
    }
    if (explicitNum) {
      const candidateKeys = [
        `RENTAL #${explicitNum}`,
        `Rental #${explicitNum}`,
        `RENTAL_${explicitNum}`,
        `Rental ${explicitNum}`,
        `RENTAL_COMPARABLE_${explicitNum}`
      ];
      for (const k of candidateKeys) {
        const item = root[k] || rGrid[k];
        if (item) {
          const compData = extractFromCompObj(item);
          if (compData.address) {
            const cmpRes = compareAddresses(compStreet, compData.address);
            return {
              gridCompNum: explicitNum,
              gridCompLabel: `Rental #${explicitNum}`,
              ...compData,
              matchStatus: cmpRes.status,
              matchLabel: cmpRes.label
            };
          }
        }
      }
    }
  }

  // 2. Check all Sales Grid comps (1..9) for matching address / house number
  if (mapNum && !isRental) {
    for (let i = 1; i <= 9; i++) {
      const candidateKeys = [
        `COMPARABLE SALE #${i}`,
        `Comparable #${i}`,
        `Comparable Sale ${i}`,
        `COMP_${i}`
      ];
      for (const k of candidateKeys) {
        const item = root[k] || sGrid[k];
        if (item) {
          const compData = extractFromCompObj(item);
          if (compData.address) {
            const cmpRes = compareAddresses(compStreet, compData.address);
            if (cmpRes.status === 'match' || cmpRes.status === 'partial') {
              return {
                gridCompNum: i,
                gridCompLabel: `Comp #${i}`,
                ...compData,
                matchStatus: cmpRes.status,
                matchLabel: cmpRes.label
              };
            }
          }
        }
      }
    }
  }

  // 3. Lookup by explicit comp number if present
  if (explicitNum && !isRental) {
    const candidateKeys = [
      `COMPARABLE SALE #${explicitNum}`,
      `Comparable #${explicitNum}`,
      `Comparable Sale ${explicitNum}`,
      `COMP_${explicitNum}`,
      `Comparable #${explicitNum} Address`
    ];
    for (const k of candidateKeys) {
      const item = root[k] || sGrid[k];
      if (item) {
        const compData = extractFromCompObj(item);
        if (compData.address) {
          const cmpRes = compareAddresses(compStreet, compData.address);
          return {
            gridCompNum: explicitNum,
            gridCompLabel: `Comp #${explicitNum}`,
            ...compData,
            matchStatus: cmpRes.status,
            matchLabel: cmpRes.label
          };
        }
      }
    }
  }

  return {
    gridCompNum: null,
    gridCompLabel: '—',
    address: '—',
    proximity: '—',
    sale_price: '—',
    gla: '—',
    bed_bath: '—',
    site: '—',
    quality_age: '—',
    matchStatus: 'missing',
    matchLabel: 'Not in Grid'
  };
};

export const MapAndSketchExhibitsSection = ({
  id = 'map-sketch-exhibits-section',
  data = {},
  allData = {},
  selectedFile = null
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [copiedKey, setCopiedKey] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCompPhotoModal, setSelectedCompPhotoModal] = useState(null);
  const scannedFileRef = useRef('');

  // Initial load or check from data / allData
  useEffect(() => {
    if (data?.MAP_EXHIBITS_ANALYSIS) {
      setScanResult(data.MAP_EXHIBITS_ANALYSIS);
    } else if (allData?.MAP_EXHIBITS_ANALYSIS) {
      setScanResult(allData.MAP_EXHIBITS_ANALYSIS);
    }
  }, [data, allData]);

  // Resolve the active file object or file name from direct props or parent data
  const effectiveFile = selectedFile || allData?.selectedFile || allData?.xmlFile || allData?.reportFile || null;
  const effectiveFilePath = (effectiveFile && typeof effectiveFile === 'object' && effectiveFile.name)
    ? effectiveFile.name
    : (typeof effectiveFile === 'string' ? effectiveFile : '')
      || data?.FILE_PATH
      || allData?.FILE_PATH
      || data?.['File Name']
      || allData?.['File Name']
      || data?.FILE_NAME
      || allData?.FILE_NAME
      || '';

  // Trigger automated scan of map and sketch exhibits
  const handleScanExhibits = useCallback(async () => {
    const fileObj = selectedFile || allData?.selectedFile || allData?.xmlFile || allData?.reportFile || null;
    const filePath = (fileObj && typeof fileObj === 'object' && fileObj.name)
      ? fileObj.name
      : (typeof fileObj === 'string' ? fileObj : '')
        || data?.FILE_PATH
        || allData?.FILE_PATH
        || data?.['File Name']
        || allData?.['File Name']
        || data?.FILE_NAME
        || allData?.FILE_NAME
        || '';

    if (!fileObj && !filePath) {
      setErrorMessage('Please upload or load an appraisal XML or PDF file first to extract visual exhibits.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      let bodyData;
      let headers = {};

      if (fileObj instanceof File) {
        const formData = new FormData();
        formData.append('file', fileObj);
        formData.append('save_images', 'true');
        bodyData = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({
          file_path: filePath,
          save_images: true
        });
      }

      const response = await fetch('http://127.0.0.1:8000/api/extract-maps/', {
        method: 'POST',
        headers: headers,
        body: bodyData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      setScanResult(result);
    } catch (err) {
      console.warn('Map & Sketch scan notice:', err);
      setErrorMessage(
        err.message || 'Could not scan exhibits via backend server. Ensure Django server is running or run "run_all.bat".'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFile, allData, data]);

  // Automatically trigger scan once if not already scanned and file is present
  useEffect(() => {
    const fileIdentifier = (effectiveFile instanceof File ? effectiveFile.name : effectiveFilePath) || '';
    if (fileIdentifier && scannedFileRef.current !== fileIdentifier && !scanResult && !loading) {
      scannedFileRef.current = fileIdentifier;
      handleScanExhibits();
    }
  }, [effectiveFile, effectiveFilePath, scanResult, loading, handleScanExhibits]);

  // Extracted Location / Comp Maps
  const locationMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m =>
      /location|comparable|sales\s*map/i.test(m.map_type || '')
    );
  }, [scanResult]);

  // Extracted Aerial Maps
  const aerialMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m => /aerial|satellite/i.test(m.map_type || ''));
  }, [scanResult]);

  // Extracted Rentals & Other Maps (Plat, Flood, Parcel)
  const rentalMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m =>
      /rental|plat|flood|parcel|hazard/i.test(m.map_type || '') ||
      (!/location|comparable|sales\s*map/i.test(m.map_type || '') && !/aerial|satellite/i.test(m.map_type || ''))
    );
  }, [scanResult]);

  // Extracted Building Sketches
  const sketches = useMemo(() => {
    return scanResult?.sketches || [];
  }, [scanResult]);

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download CSV helper
  const handleDownloadCSV = () => {
    const pins = scanResult?.all_pins || [];
    if (!pins.length) return;

    const headers = ['Map Type', 'Page', 'Item Type', 'Label', 'Street Address', 'City', 'State', 'Zipcode', 'Full Address', 'Miles', 'Direction', 'Proximity'];
    const rows = pins.map(p => {
      const clean = cleanPinAddress(p);
      return [
        `"${p.map_type || ''}"`,
        p.page_number || '',
        `"${p.item_type || ''}"`,
        `"${p.label || ''}"`,
        `"${clean.street || p.street || ''}"`,
        `"${clean.city || p.city || ''}"`,
        `"${clean.state || p.state || ''}"`,
        `"${clean.zipcode || p.zipcode || ''}"`,
        `"${clean.fullAddress || p.address || ''}"`,
        `"${clean.miles || p.miles || ''}"`,
        `"${p.direction || ''}"`,
        `"${clean.proximity || p.proximity || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'map_exhibits_comparables_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Comparison: Check if Sketch areas relate to Sales Grid Gross Living Area
  const salesGridGLA = data?.SALES_GRID?.['Gross Living Area'] || allData?.SALES_GRID?.['Gross Living Area'] || '';

  return (
    <Paper
      id={id}
      elevation={2}
      sx={{
        p: 2.5,
        my: 3,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}
    >
      {/* Section Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <LayersIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#0f172a' }}>
              Map & Building Sketch Exhibit Analysis
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Computer Vision Pin Extraction & Sketch Dimension Engine
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={handleScanExhibits}
            disabled={loading}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {loading ? 'Scanning Exhibits...' : 'Scan / Refresh Exhibits'}
          </Button>

          {scanResult?.all_pins?.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCSV}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Export CSV
            </Button>
          )}
        </Stack>
      </Stack>

      {errorMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<MapIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Location Map & Comps (${locationMaps.reduce((acc, m) => acc + (m.comparables?.length || 0), 0)} Comps)`}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<SatelliteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Aerial Map (${aerialMaps.length})`}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<ArchitectureIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Building Sketch & Floor Plan (${sketches.length})`}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<HomeIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Rentals & Other Maps (${rentalMaps.length})`}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: LOCATION MAP & SALES COMPARABLES */}
      {activeTab === 0 && (
        <Stack spacing={2.5}>
          {locationMaps.length > 0 ? (
            locationMaps.map((mapItem, mIdx) => (
              <Grid container spacing={2.5} key={mIdx}>
                {/* Left: Comparables & Subject Data Table */}
                <Grid item xs={12} lg={8}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {mapItem.map_type} (Page {mapItem.page_number})
                      </Typography>
                      {(() => {
                        const rawItemsForCount = (mapItem.comparables && mapItem.rentals)
                          ? [...mapItem.comparables.filter(c => c.item_type !== 'Rental'), ...(mapItem.rentals || [])]
                          : (mapItem.comparables || []);
                        const compsCount = rawItemsForCount.filter(c => c.item_type !== 'Rental').length;
                        const rentalsCount = rawItemsForCount.filter(c => c.item_type === 'Rental').length;
                        const chipText = rentalsCount > 0 
                          ? `${compsCount} Comparables, ${rentalsCount} Rentals Detected`
                          : `${compsCount} Comparables Detected`;
                        return (
                          <Chip
                            label={chipText}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        );
                      })()}
                    </Stack>

                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: '10%' }}>Item</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '22%' }}>Location Map Pin</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '26%' }}>Photo Addendum Data</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '20%' }}>Sales Grid Address</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '11%' }}>Miles / Prox</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '11%' }}>Match Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Subject Property Row */}
                          {mapItem.subject && (() => {
                            const subInfo = cleanPinAddress(mapItem.subject);
                            const subGrid = getSubjectGridData(data, allData);
                            const subPhoto = getSubjectPhotoData(allData, data);
                            const subMatch = compareAddresses(subInfo.street || subInfo.fullAddress, subGrid.fullAddress || subGrid.street);
                            const subSubjectAddress = subPhoto?.address || subGrid.street || subGrid.fullAddress || subInfo.street || subInfo.fullAddress || 'Subject Property';

                            return (
                              <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                <TableCell sx={{ verticalAlign: 'middle' }}>
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '0.75rem' }}>
                                    🔴 Subject
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                    {(subInfo.street && subInfo.street !== '(Address pin)') ? subInfo.street : (subGrid.street || subGrid.fullAddress || subPhoto?.address || 'Subject Property')}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                    {subInfo.city ? `${subInfo.city}, ${subInfo.state} ${subInfo.zipcode}` : (subGrid.city ? `${subGrid.city}, ${subGrid.state} ${subGrid.zipcode}` : '—')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {subPhoto ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Box
                                        onClick={() => {
                                          setPreviewImage(subPhoto.base64_preview);
                                          setRotation(0);
                                        }}
                                        sx={{
                                          width: 44,
                                          height: 34,
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                          bgcolor: '#0f172a',
                                          cursor: 'pointer',
                                          flexShrink: 0,
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                          transition: 'transform 0.15s',
                                          '&:hover': { transform: 'scale(1.08)' }
                                        }}
                                      >
                                        <img
                                          src={subPhoto.base64_preview}
                                          alt={subSubjectAddress}
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="body2"
                                          onClick={() => {
                                            setPreviewImage(subPhoto.base64_preview);
                                            setRotation(0);
                                          }}
                                          sx={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', '&:hover': { color: '#0284c7' } }}
                                        >
                                          {subSubjectAddress}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600, display: 'block' }}>
                                          {subPhoto.caption ? `${subPhoto.caption} • ` : 'Subject Front • '}Page {subPhoto.page} Exhibit Photo
                                        </Typography>
                                        {subGrid.city && !subSubjectAddress.toLowerCase().includes(subGrid.city.toLowerCase()) && (
                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                            {subGrid.city}, {subGrid.state} {subGrid.zipcode}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Stack>
                                  ) : (
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                        {subSubjectAddress}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                        Form Subject (No Photo Attached)
                                      </Typography>
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {subGrid.fullAddress || subGrid.street || '—'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600 }}>
                                    Form Subject
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${subInfo.miles} mi (Base)`}
                                    size="small"
                                    sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, border: '1px solid #fecaca' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {subMatch.status === 'match' ? (
                                    <Chip
                                      label="Match"
                                      size="small"
                                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                      sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                    />
                                  ) : (
                                    <Chip
                                      label={subMatch.label}
                                      size="small"
                                      sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })()}

                          {/* Comparables & Rentals Rows Sorted 1..N */}
                          {(() => {
                            const rawSourceList = (mapItem.comparables && mapItem.rentals)
                              ? [...mapItem.comparables.filter(c => c.item_type !== 'Rental'), ...(mapItem.rentals || [])]
                              : (mapItem.comparables || []);
                            const compsList = rawSourceList.map((comp, cIdx) => cleanPinAddress(comp, mapItem.subject, cIdx));
                            compsList.sort((a, b) => {
                              const aRank = a.item_type === 'Rental' ? 2 : 1;
                              const bRank = b.item_type === 'Rental' ? 2 : 1;
                              if (aRank !== bRank) return aRank - bRank;
                              const na = parseInt(a.label.replace(/\D/g, '') || '99', 10);
                              const nb = parseInt(b.label.replace(/\D/g, '') || '99', 10);
                              return na - nb;
                            });

                            return compsList.map((compInfo, cIdx) => {
                              const gridComp = getGridComparableData(cIdx, compInfo.label, compInfo.street, data, allData);
                              const photoComp = getComparablePhotoData(compInfo, cIdx, scanResult, allData, data);

                              const mapStreet = (compInfo.street && compInfo.street !== '(Address pin)') ? compInfo.street : (compInfo.address !== '(Address pin)' ? compInfo.address : '');
                              const photoStreet = photoComp?.address || '';
                              const gridStreet = gridComp?.address || '';

                              const mapMatchesPhoto = photoStreet ? compareAddresses(mapStreet, photoStreet).status === 'match' : false;
                              const mapMatchesGrid = gridComp?.matchStatus === 'match';
                              const photoMatchesGrid = (photoStreet && gridStreet && gridStreet !== '—') ? compareAddresses(photoStreet, gridStreet).status === 'match' : false;

                              const isRental = compInfo.item_type === 'Rental';
                              const displayStreet = (compInfo.street && compInfo.street !== '(Address pin)')
                                ? compInfo.street
                                : (photoStreet || gridStreet || (compInfo.address !== '(Address pin)' ? compInfo.address : '') || '—');

                              return (
                                <TableRow key={cIdx} hover>
                                  <TableCell sx={{ verticalAlign: 'middle' }}>
                                    <Box sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      px: 1,
                                      py: 0.25,
                                      borderRadius: 1,
                                      bgcolor: isRental ? '#f0fdf4' : '#e0f2fe',
                                      color: isRental ? '#166534' : '#0369a1',
                                      border: isRental ? '1px solid #bbf7d0' : '1px solid #bae6fd',
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}>
                                      {isRental ? '🟢' : '🔵'} {gridComp.gridCompLabel !== '—' ? gridComp.gridCompLabel : (compInfo.label || `${isRental ? 'Rental' : 'Comp'} #${cIdx + 1}`)}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      {displayStreet}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                      {compInfo.city ? `${compInfo.city}, ${compInfo.state} ${compInfo.zipcode}` : (gridComp?.city ? `${gridComp.city}, ${gridComp.state} ${gridComp.zipcode}` : '—')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {photoComp ? (
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        {(photoComp.thumbnail || photoComp.base64_preview) && (
                                          <Tooltip title="Click to view photo & detailed cross-reference" arrow>
                                            <Box
                                              onClick={() => setSelectedCompPhotoModal({ compInfo, photoComp, gridComp })}
                                              sx={{
                                                width: 44,
                                                height: 34,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                bgcolor: '#0f172a',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                                transition: 'transform 0.15s',
                                                '&:hover': { transform: 'scale(1.08)' }
                                              }}
                                            >
                                              <img
                                                src={photoComp.thumbnail || photoComp.base64_preview}
                                                alt={photoComp.title || 'Comp Photo'}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                              />
                                            </Box>
                                          </Tooltip>
                                        )}
                                        <Box>
                                          <Typography
                                            variant="body2"
                                            onClick={() => setSelectedCompPhotoModal({ compInfo, photoComp, gridComp })}
                                            sx={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', '&:hover': { color: '#0284c7' } }}
                                          >
                                            {photoComp.address || photoComp.title}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600, display: 'block' }}>
                                            Page {photoComp.page} {photoComp.sale_price ? `• $${photoComp.sale_price}` : ''} {photoComp.gla ? `• ${photoComp.gla} sf` : ''} {photoComp.bedrooms ? `• ${photoComp.bedrooms}B/${photoComp.bathrooms || '1'}Ba` : ''}
                                          </Typography>
                                          {photoComp.proximity && (
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                              Prox: <strong>{photoComp.proximity}</strong>
                                            </Typography>
                                          )}
                                        </Box>
                                      </Stack>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: gridComp.address !== '—' ? '#0f172a' : '#94a3b8' }}>
                                      {gridComp.address}
                                    </Typography>
                                    {gridComp.gridCompLabel !== '—' && (
                                      <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600 }}>
                                        Sales Grid {gridComp.gridCompLabel} {gridComp.sale_price && gridComp.sale_price !== '—' ? `• $${gridComp.sale_price}` : ''}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {compInfo.proximity ? (
                                      <Chip
                                        label={`Map: ${compInfo.proximity}`}
                                        size="small"
                                        sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.72rem' }}
                                      />
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                    {photoComp?.proximity && (
                                      <Typography variant="caption" sx={{ color: '#4338ca', display: 'block', mt: 0.25, fontWeight: 600 }}>
                                        Photo: {photoComp.proximity}
                                      </Typography>
                                    )}
                                    {gridComp.proximity && gridComp.proximity !== '—' && (
                                      <Typography variant="caption" sx={{ color: '#047857', display: 'block', mt: 0.25, fontWeight: 600 }}>
                                        Grid: {gridComp.proximity}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {mapMatchesPhoto && (mapMatchesGrid || photoMatchesGrid) ? (
                                      <Chip
                                        label="3-Way Match"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : mapMatchesPhoto ? (
                                      <Chip
                                        label="Map ↔ Photo"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                        sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                      />
                                    ) : mapMatchesGrid ? (
                                      <Chip
                                        label="Map ↔ Grid"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : gridComp.matchStatus === 'partial' ? (
                                      <Chip
                                        label="Near Match"
                                        size="small"
                                        sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                                      />
                                    ) : gridComp.matchStatus === 'mismatch' ? (
                                      <Chip
                                        label="Mismatch"
                                        size="small"
                                        sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fecaca', fontSize: '0.72rem' }}
                                      />
                                    ) : (
                                      <Chip
                                        label="Not in Grid"
                                        size="small"
                                        sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', fontSize: '0.72rem' }}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

                {/* Right: Map Preview Image */}
                <Grid item xs={12} lg={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="320"
                        image={mapItem.image_preview}
                        alt="Location Map Preview"
                        sx={{ objectFit: 'contain', bgcolor: '#0f172a', cursor: 'pointer' }}
                        onClick={() => {
                          setPreviewImage(mapItem.image_preview);
                          setRotation(0);
                        }}
                      />
                      <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, px: 1, py: 0.5, color: '#fff', fontSize: '0.75rem' }}>
                        Click to Zoom
                      </Box>
                    </Box>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        Page {mapItem.page_number} Exhibit Overlay
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Segmented 🔴 Red Subject callout and 🔵 Blue Comparable pins
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ))
          ) : (
            <Alert severity="info">
              No Location Map pages extracted yet. Click <strong>"Scan / Refresh Exhibits"</strong> above to extract pins.
            </Alert>
          )}
        </Stack>
      )}

      {/* TAB 1: AERIAL MAP */}
      {activeTab === 1 && (
        <Stack spacing={2.5}>
          {aerialMaps.length > 0 ? (
            aerialMaps.map((mapItem, aIdx) => (
              <Grid container spacing={2.5} key={aIdx}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                      Aerial / Satellite Map (Page {mapItem.page_number})
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                      Verified high-resolution satellite imagery showing property boundaries, roof footprint, and adjacent road network.
                    </Typography>

                    {mapItem.subject && (() => {
                      const subGrid = getSubjectGridData(data, allData);
                      const subMatch = compareAddresses(mapItem.subject.address || mapItem.subject.street, subGrid.fullAddress || subGrid.street);
                      return (
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>
                              Aerial Map Subject Property
                            </Typography>
                            {subMatch.status === 'match' ? (
                              <Chip
                                label="Matches Form Subject"
                                size="small"
                                icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                              />
                            ) : (
                              <Chip
                                label={subMatch.label}
                                size="small"
                                sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                              />
                            )}
                          </Stack>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                            {mapItem.subject.address || 'Subject marked on aerial map'}
                          </Typography>
                          {subGrid.fullAddress && subGrid.fullAddress !== '—' && (
                            <Box sx={{ pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Sales Grid / Form Subject Address:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                {subGrid.fullAddress}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <CardMedia
                      component="img"
                      height="300"
                      image={mapItem.image_preview}
                      alt="Aerial Map Preview"
                      sx={{ objectFit: 'contain', bgcolor: '#0f172a', cursor: 'pointer' }}
                      onClick={() => {
                        setPreviewImage(mapItem.image_preview);
                        setRotation(0);
                      }}
                    />
                  </Card>
                </Grid>
              </Grid>
            ))
          ) : (
            <Alert severity="info">
              No Aerial Map exhibit detected in this document.
            </Alert>
          )}
        </Stack>
      )}

      {/* TAB 2: BUILDING SKETCH & FLOOR PLAN */}
      {activeTab === 2 && (
        <Stack spacing={2.5}>
          {sketches.length > 0 ? (
            sketches.map((sketchItem, sIdx) => {
              const roomDetails = parseSketchRooms(sketchItem);
              const { labels: roomLabels, byCategory: roomCats, byLevel: roomLevels, summary: roomSum } = roomDetails;

              return (
                <Grid container spacing={2.5} key={sIdx}>
                  {/* Left: Extracted Room Labels, Floor Plan Layout, Area Calculations & Dimensions */}
                  <Grid item xs={12} lg={7}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {sketchItem.sketch_type} (Page {sketchItem.page_number})
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Architectural Floor Plan Exhibit & Spatial Room Analysis
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          {roomLabels.length > 0 && (
                            <Chip
                              label={`${roomLabels.length} Room Labels`}
                              size="small"
                              color="primary"
                              variant="filled"
                              sx={{ fontWeight: 700, bgcolor: '#4f46e5' }}
                            />
                          )}
                          <Chip
                            label="Floor Plan Layout"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                      </Stack>

                      {/* Extracted Room Labels & Breakdown */}
                      {(roomLabels.length > 0 || Object.keys(roomCats).length > 0) && (
                        <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <RoomIcon fontSize="small" sx={{ color: '#4f46e5' }} /> Extracted Interior Room Labels:
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                              Auto-extracted from Sketch Canvas
                            </Typography>
                          </Stack>

                          {/* Quick Summary Badges */}
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                            {roomSum.bedroom_count > 0 && (
                              <Chip
                                icon={<BedIcon fontSize="small" />}
                                label={`${roomSum.bedroom_count} Bed${roomSum.bedroom_count > 1 ? 's' : ''}`}
                                size="small"
                                sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700, border: '1px solid #c7d2fe' }}
                              />
                            )}
                            {roomSum.bathroom_count > 0 && (
                              <Chip
                                icon={<BathIcon fontSize="small" />}
                                label={`${roomSum.bathroom_display || roomSum.bathroom_count + ' Bath'}`}
                                size="small"
                                sx={{ bgcolor: '#ecfeff', color: '#0e7490', fontWeight: 700, border: '1px solid #a5f3fc' }}
                              />
                            )}
                            {roomSum.living_rooms_count > 0 && (
                              <Chip
                                icon={<LivingIcon fontSize="small" />}
                                label="Living Area"
                                size="small"
                                sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }}
                              />
                            )}
                            {roomSum.has_kitchen && (
                              <Chip
                                icon={<KitchenIcon fontSize="small" />}
                                label="Kitchen"
                                size="small"
                                sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
                              />
                            )}
                            {roomSum.has_dining && (
                              <Chip
                                label="Dining"
                                size="small"
                                sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
                              />
                            )}
                            {roomSum.has_laundry && (
                              <Chip
                                icon={<LaundryIcon fontSize="small" />}
                                label="Laundry"
                                size="small"
                                sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700, border: '1px solid #cbd5e1' }}
                              />
                            )}
                            {roomSum.garage && (
                              <Chip
                                icon={<GarageIcon fontSize="small" />}
                                label={roomSum.garage}
                                size="small"
                                sx={{ bgcolor: '#f5f3ff', color: '#6d28d9', fontWeight: 700, border: '1px solid #ddd6fe' }}
                              />
                            )}
                          </Stack>

                          {/* Floor-by-Floor (Level Breakdown) */}
                          {Object.keys(roomLevels).length > 0 ? (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Layout By Level / Floor:
                              </Typography>
                              <Stack spacing={1}>
                                {Object.entries(roomLevels).map(([levelName, items], lIdx) => (
                                  <Paper key={lIdx} variant="outlined" sx={{ p: 1.25, bgcolor: '#ffffff', borderRadius: 1.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.75}>
                                      <Chip
                                        label={levelName}
                                        size="small"
                                        sx={{ fontWeight: 700, bgcolor: '#0f172a', color: '#ffffff' }}
                                      />
                                      {items.map((item, itmIdx) => {
                                        const theme = ROOM_THEMES[item.category] || DEFAULT_ROOM_THEME;
                                        return (
                                          <Chip
                                            key={itmIdx}
                                            label={item.label}
                                            size="small"
                                            sx={{
                                              bgcolor: theme.bg,
                                              color: theme.color,
                                              border: `1px solid ${theme.border}`,
                                              fontWeight: 600
                                            }}
                                          />
                                        );
                                      })}
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Box>
                          ) : (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                                Detected Room & Feature Labels:
                              </Typography>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
                                {roomLabels.map((lbl, rIdx) => (
                                  <Chip
                                    key={rIdx}
                                    label={lbl}
                                    size="small"
                                    sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Living / Non-Living Area Calculations Table */}
                      {sketchItem.areas && sketchItem.areas.length > 0 && (
                        <Box sx={{ mb: 2.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                            Living / Non-Living Area Calculations:
                          </Typography>
                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Area Level / Section</TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Calculated Square Footage</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {sketchItem.areas.map((ar, aIdx) => (
                                  <TableRow key={aIdx} hover>
                                    <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                                      {ar.name || 'Living Area'}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      {ar.area}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}

                      {/* Extracted Exterior Dimensions & Wall Lengths */}
                      {sketchItem.dimensions && sketchItem.dimensions.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                            Extracted Exterior Dimensions & Wall Lengths:
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
                            {sketchItem.dimensions.map((dim, dIdx) => (
                              <Chip
                                key={dIdx}
                                label={dim}
                                size="small"
                                sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700, border: '1px solid #cbd5e1' }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Sales Grid GLA Verification */}
                      {salesGridGLA && (
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon fontSize="inherit" /> Sales Grid GLA Reference:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#14532d' }}>
                            Report Sales Grid GLA: {salesGridGLA} Sq Ft
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>

                  {/* Right: Building Sketch Image Canvas */}
                  <Grid item xs={12} lg={5}>
                    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="420"
                          image={sketchItem.image_preview}
                          alt="Building Sketch Canvas"
                          sx={{ objectFit: 'contain', bgcolor: '#ffffff', cursor: 'pointer' }}
                          onClick={() => {
                            setPreviewImage(sketchItem.image_preview);
                            setRotation(0);
                          }}
                        />
                        <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, px: 1, py: 0.5, color: '#fff', fontSize: '0.75rem' }}>
                          Click to Enlarge
                        </Box>
                      </Box>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          Page {sketchItem.page_number} - {sketchItem.sketch_type} Canvas
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              );
            })
          ) : (
            <Alert severity="info">
              No Building Sketch or Floor Plan pages detected in this file.
            </Alert>
          )}
        </Stack>
      )}

      {/* TAB 3: RENTALS & OTHER MAPS */}
      {activeTab === 3 && (
        <Stack spacing={2.5}>
          {rentalMaps.length > 0 ? (
            rentalMaps.map((mapItem, rIdx) => (
              <Grid container spacing={2.5} key={rIdx}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                      {mapItem.map_type || 'Map Exhibit'} (Page {mapItem.page_number})
                    </Typography>
                    {mapItem.subject && (
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          Subject Property (Rentals Reference):
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {mapItem.subject.address || 'Subject marked'}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <CardMedia
                      component="img"
                      height="300"
                      image={mapItem.image_preview}
                      alt="Rentals Map Preview"
                      sx={{ objectFit: 'contain', bgcolor: '#0f172a', cursor: 'pointer' }}
                      onClick={() => {
                        setPreviewImage(mapItem.image_preview);
                        setRotation(0);
                      }}
                    />
                  </Card>
                </Grid>
              </Grid>
            ))
          ) : (
            <Alert severity="info">
              No additional Rentals or Flood Map exhibits found.
            </Alert>
          )}
        </Stack>
      )}

      {/* Modal Zoom & Rotate Dialog */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Exhibit Viewer (Full Resolution)
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Rotate 90° Clockwise">
              <IconButton onClick={() => setRotation((prev) => (prev + 90) % 360)}>
                <RotateRightIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setPreviewImage(null)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2, bgcolor: '#0f172a' }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="Exhibit Enlarged Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Comparable Photo Addendum & Location Map Cross-Reference Modal */}
      <Dialog
        open={Boolean(selectedCompPhotoModal)}
        onClose={() => setSelectedCompPhotoModal(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip label={selectedCompPhotoModal?.photoComp?.title || 'Comparable Photo'} color="primary" size="small" sx={{ fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
              {selectedCompPhotoModal?.photoComp?.address || selectedCompPhotoModal?.compInfo?.street}
            </Typography>
            <Tooltip title={copiedKey === 'modal' ? 'Copied!' : 'Copy Clean Address'} arrow>
              <IconButton size="small" onClick={() => handleCopy(selectedCompPhotoModal?.photoComp?.address || selectedCompPhotoModal?.compInfo?.street, 'modal')}>
                {copiedKey === 'modal' ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
          <IconButton onClick={() => setSelectedCompPhotoModal(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Grid container spacing={2.5}>
            {/* Left: Image */}
            <Grid item xs={12} sm={5}>
              <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img
                  src={selectedCompPhotoModal?.photoComp?.thumbnail || selectedCompPhotoModal?.photoComp?.base64_preview}
                  alt={selectedCompPhotoModal?.photoComp?.title}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 260, objectFit: 'contain' }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textAlign: 'center', mt: 1 }}>
                Photo Addendum Page {selectedCompPhotoModal?.photoComp?.page}
              </Typography>
            </Grid>

            {/* Right: Cross-Reference Comparison Table */}
            <Grid item xs={12} sm={7}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Cross-Reference Comparison (Map vs. Photo Addendum vs. Sales Grid)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Attribute</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0369a1' }}>Location Map</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#4338ca' }}>Photo Addendum</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#047857' }}>Sales Grid</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                      <TableCell>{selectedCompPhotoModal?.compInfo?.street || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4338ca' }}>{selectedCompPhotoModal?.photoComp?.address || '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.address || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Proximity</TableCell>
                      <TableCell>{selectedCompPhotoModal?.compInfo?.proximity || selectedCompPhotoModal?.compInfo?.miles || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4338ca' }}>{selectedCompPhotoModal?.photoComp?.proximity || '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.proximity || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Sale Price</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#16a34a' }}>{selectedCompPhotoModal?.photoComp?.sale_price ? `$${selectedCompPhotoModal.photoComp.sale_price}` : '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.sale_price && selectedCompPhotoModal?.gridComp?.sale_price !== '—' ? `$${selectedCompPhotoModal.gridComp.sale_price}` : (selectedCompPhotoModal?.gridComp?.sale_price || '—')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Living Area (GLA)</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.gla ? `${selectedCompPhotoModal.photoComp.gla} sf` : '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.gla || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Bed / Bath Count</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.bedrooms ? `${selectedCompPhotoModal.photoComp.bedrooms} Bed / ${selectedCompPhotoModal.photoComp.bathrooms || '1'} Bath` : '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.bed_bath || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Site Area</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.site || '—'}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.site || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Quality / Age</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.quality || '—'} {selectedCompPhotoModal?.photoComp?.age ? `/ ${selectedCompPhotoModal.photoComp.age} yrs` : ''}</TableCell>
                      <TableCell>{selectedCompPhotoModal?.gridComp?.quality_age || '—'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MapAndSketchExhibitsSection;
