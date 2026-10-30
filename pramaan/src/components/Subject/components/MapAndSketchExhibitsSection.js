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
  CircularProgress,
  LinearProgress
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
  MeetingRoom as RoomIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../utils/utils.js';

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
    const rawSum = sketchItem.room_summary || {};
    const bedCount = rawSum.bedroom_count ?? (sketchItem.rooms_by_category?.bedrooms?.length || 0);
    const livingCount = rawSum.living_rooms_count ?? (sketchItem.rooms_by_category?.living?.length || 0);
    const kitchenCount = rawSum.has_kitchen ? 1 : 0;
    const diningCount = rawSum.has_dining ? 1 : 0;
    const totalRooms = rawSum.total_rooms ?? (bedCount + livingCount + kitchenCount + diningCount);

    return {
      labels: sketchItem.room_labels,
      byCategory: sketchItem.rooms_by_category || {},
      byLevel: sketchItem.rooms_by_level || {},
      summary: {
        ...rawSum,
        bedroom_count: bedCount,
        living_rooms_count: livingCount,
        total_rooms: totalRooms
      }
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
  const bedCount = byCategory.bedrooms.length;
  const livingCount = byCategory.living.length;
  const hasKitchen = byCategory.kitchen_dining.some(k => /kitchen/i.test(k.label));
  const hasDining = byCategory.kitchen_dining.some(k => /dining|nook/i.test(k.label));
  const totalRooms = bedCount + livingCount + (hasKitchen ? 1 : 0) + (hasDining ? 1 : 0);

  return {
    labels: allLabels,
    byCategory,
    byLevel,
    summary: {
      bedroom_count: bedCount,
      bathroom_count: bathCount,
      bathroom_display: bathDisplay,
      living_rooms_count: livingCount,
      has_kitchen: hasKitchen,
      has_dining: hasDining,
      has_laundry: byCategory.utility_laundry.some(u => /laundry/i.test(u.label)),
      garage: byCategory.garage_parking[0]?.label || null,
      total_rooms: totalRooms,
      total_room_labels: allLabels.length
    }
  };
};

const extractCompNumberFromLabel = (label) => {
  if (!label) return null;
  const m = label.match(/(?:comp(?:arable)?|rental|listing|sale|no\.?|#)\s*#?\s*([0-9]+)\b/i) || label.match(/^#\s*([0-9]+)\b/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (val >= 1 && val <= 30) return val;
  }
  return null;
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
      const mNum = tClean.match(/\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\\s.,'-]+)/);
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
    } else if (pin.photo_data?.city) {
      city = pin.photo_data.city;
      if (!state) state = pin.photo_data.state || '';
      if (!zipcode) zipcode = pin.photo_data.zipcode || '';
    } else if (subjectPin?.city && !isRental) {
      city = subjectPin.city;
      if (!state) state = subjectPin.state || '';
      if (!zipcode) zipcode = subjectPin.zipcode || '';
    }
    if (!state && subjectPin?.state) {
      state = subjectPin.state;
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

  // 4. Label & Comp / Rental Number Normalization (strictly preserve true labels, never overwrite with fake compIndex)
  let label = pin.label || (isSub ? 'Subject' : (isRental ? 'Rental' : 'Comparable'));
  if (!isSub) {
    const explicitLabelNum = extractCompNumberFromLabel(label);
    if (explicitLabelNum) {
      label = isRental ? `Rental #${explicitLabelNum}` : `Comparable #${explicitLabelNum}`;
    } else {
      label = isRental ? 'Rental' : 'Comparable';
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
    grid_data: pin.grid_data || null,
    raw_pin: pin
  };
};

const getComparablePhotoData = (compInfo, compIndex, scanResult, allData, data) => {
  if (compInfo?.photo_data) return compInfo.photo_data;
  if (compInfo?.raw_pin?.photo_data) return compInfo.raw_pin.photo_data;

  const isRental = compInfo?.item_type === 'Rental' || 
                   /rental/i.test(compInfo?.label || '') ||
                   compInfo?.isRental;
  const compPhotosList = scanResult?.comparable_photos || [];
  const allPhotos = allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || allData?.extracted_photos || data?.extracted_photos ||
                    allData?.clean_data?.EXTRACTED_PHOTOS || data?.clean_data?.EXTRACTED_PHOTOS || [];
  
  const allCandidatePhotos = [
    ...(compPhotosList || []).filter(Boolean),
    ...allPhotos.filter(p => p && (p.category === 'Comparable' || p.category === 'Rental' || (p.comp_number && p.address) || p.sale_price || p.rent_amount || p.monthly_rent))
  ];

  const compPhotos = allCandidatePhotos.filter(p => {
    if (!p) return false;
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

  // 1. Match by address street number & keywords from pin street
  if (pinNum) {
    for (const cp of compPhotos) {
      if (!cp) continue;
      const cpAddrNorm = norm(cp.address || '');
      const cpNumMatch = cpAddrNorm.match(/^([0-9]{1,6}(?:-[0-9]{1,6})?)/);
      if (cpNumMatch && cpNumMatch[1] === pinNum) {
        const pinWords = pinStreet.split(' ').slice(1).filter(w => w.length >= 4 && !['street', 'road', 'avenue', 'lane', 'drive', 'court'].includes(w));
        const cpWords = cpAddrNorm.split(' ').slice(1).filter(w => w.length >= 4);
        if (!pinWords.length || pinWords.some(w => cpWords.some(cw => cw.includes(w) || w.includes(cw)))) {
          return cp;
        }
      }
    }
  }

  // 2. Match by verified gridComp address if linked
  if (compInfo?.gridComp?.address && compInfo.gridComp.address !== '—') {
    const gridAddrNorm = norm(compInfo.gridComp.address);
    const mGNum = gridAddrNorm.match(/^([0-9]{1,6})/);
    if (mGNum) {
      for (const cp of compPhotos) {
        if (!cp) continue;
        const cpAddrNorm = norm(cp.address || '');
        const cpNumMatch = cpAddrNorm.match(/^([0-9]{1,6})/);
        if (cpNumMatch && cpNumMatch[1] === mGNum[1]) {
          return cp;
        }
      }
    }
  }

  // 3. Match by explicit comp / rental number (ONLY if explicitly labeled or verified gridCompNum)
  const targetCompNum = extractCompNumberFromLabel(compInfo?.label) || (compInfo?.gridComp?.matchStatus !== 'mismatch' ? compInfo?.gridComp?.gridCompNum : null);
  if (targetCompNum) {
    const byNum = compPhotos.find(cp => cp && (cp.comp_number === targetCompNum || cp.comp_num === targetCompNum));
    if (byNum) {
      // Validate photo address does not conflict with pinStreet house number
      if (pinNum) {
        const cpAddrNorm = norm(byNum.address || '');
        const cpNumMatch = cpAddrNorm.match(/^([0-9]{1,6})/);
        if (!cpNumMatch || cpNumMatch[1] === pinNum) {
          return byNum;
        }
      } else {
        return byNum;
      }
    }
  }

  // 4. Match by Proximity / Distance (e.g. 2.79 miles or 0.29 miles)
  const distMatch = (compInfo?.proximity || compInfo?.miles || '').match(/([0-9]+\.[0-9]+)/);
  if (distMatch) {
    const dVal = distMatch[1];
    const byDist = compPhotos.find(cp => cp && (cp.proximity || '').includes(dVal));
    if (byDist) return byDist;
  }

  return null;
};

const getSubjectPhotoData = (allData, data) => {
  const allPhotos = allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || allData?.extracted_photos || data?.extracted_photos || [];
  return allPhotos.find(p => p && (p.category === 'Subject' || /front/i.test(p.caption || '') || /front/i.test(p.title || ''))) || null;
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
    .replace(/\bterrace\b/g, 'ter')
    .replace(/\bsath\b/g, '58th')
    .replace(/\bs(\d+)(?:st|nd|rd|th)\b/g, '5$1th')
    .replace(/\s+/g, ' ')
    .trim();
};

const compareAddresses = (mapAddr, gridAddr) => {
  const normMap = normalizeAddressForCompare(mapAddr);
  const normGrid = normalizeAddressForCompare(gridAddr);
  if (!normMap || !normGrid || normGrid === '—') return { status: 'missing', label: 'No Data' };

  if (normMap === normGrid) return { status: 'match', label: 'Match' };

  // 1. House number matching (robust to 1 to 6 digit house numbers, e.g. 3 Jockey Ter N)
  const mGridNum = normGrid.match(/\b([0-9]{1,6})\b/);
  const mMapNum = normMap.match(/\b([0-9]{1,6})\b/);

  if (mGridNum) {
    const gridHouse = mGridNum[1];
    const mapHasGridHouse = new RegExp(`\\b${gridHouse}\\b`).test(normMap);
    if (mapHasGridHouse || (mMapNum && mMapNum[1] === gridHouse)) {
      const mapWords = normMap.split(' ');
      const gridWords = normGrid.split(' ');
      const common = mapWords.filter(w => w.length > 1 && !/^\d+$/.test(w) && gridWords.some(gw => gw === w || (w.length >= 4 && (gw.includes(w) || w.includes(gw)))));
      if (common.length >= 1) {
        return { status: 'match', label: 'Match' };
      }
      return { status: 'partial', label: 'Near Match' };
    }
  }

  // 2. Street words overlap fallback
  const mapWords = normMap.split(' ');
  const gridWords = normGrid.split(' ');
  const common = mapWords.filter(w => w.length > 2 && !/^\d+$/.test(w) && gridWords.some(gw => gw === w));
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

const getImprovementsRoomCounts = (data, allData) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const imp = root.IMPROVEMENTS || root.Improvements || root.improvements || {};
  const fields = root.fields?.IMPROVEMENTS || root.fields?.Improvements || {};
  const clean = root.clean_data?.Improvements || {};

  const getVal = (keys) => {
    for (const k of keys) {
      if (imp[k] !== undefined && imp[k] !== null && String(imp[k]).trim() !== '') return String(imp[k]).trim();
      if (fields[k] !== undefined && fields[k] !== null && String(fields[k]).trim() !== '') return String(fields[k]).trim();
      if (clean[k] !== undefined && clean[k] !== null && String(clean[k]).trim() !== '') return String(clean[k]).trim();
      if (root[k] !== undefined && root[k] !== null && String(root[k]).trim() !== '') return String(root[k]).trim();
    }
    return '';
  };

  const rawRooms = getVal([
    'Finished area above grade Rooms',
    'Rooms',
    'Total Rooms',
    'Improvements Rooms',
    'Finished Area Above Grade Rooms'
  ]);

  const rawBeds = getVal([
    'Finished area above grade Bedrooms',
    'Bedrooms',
    'Total Bedrooms',
    'Improvements Bedrooms',
    'Finished Area Above Grade Bedrooms'
  ]);

  const rawBaths = getVal([
    'Finished area above grade Bath(s)',
    'Finished area above grade Baths',
    'Bath(s)',
    'Baths',
    'Total Bathrooms',
    'Bathrooms',
    'Improvements Bathrooms',
    'Finished Area Above Grade Bath(s)',
    'Finished Area Above Grade Bathroom(s)'
  ]);

  const rawGLA = getVal([
    'Square Feet of Gross Living Area Above Grade',
    'Gross Living Area',
    'Gross Living Area: square feet',
    'Square Feet of Gross Living Area',
    'GLA',
    'Finished area above grade GLA',
    'Above Grade Finished Area'
  ]);

  return {
    totalRooms: rawRooms,
    bedrooms: rawBeds,
    bathrooms: rawBaths,
    gla: rawGLA
  };
};

const getSalesGridSubjectRoomCounts = (data, allData) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const sGrid = root.SALES_GRID || root['Sales Grid'] || root.sales_grid || {};
  const sSubj = sGrid.Subject || sGrid.SUBJECT || {};
  const rootSubj = root.Subject || root.SUBJECT || {};
  const fieldsSGrid = root.fields?.SALES_GRID || {};
  const fieldsSubj = fieldsSGrid.Subject || fieldsSGrid.SUBJECT || root.fields?.Subject || {};
  const cleanGrid = root.clean_data?.['Sales Grid']?.Subject || root.clean_data?.Subject || {};

  const getVal = (keys) => {
    for (const k of keys) {
      if (sSubj[k] !== undefined && sSubj[k] !== null && String(sSubj[k]).trim() !== '') return String(sSubj[k]).trim();
      if (fieldsSubj[k] !== undefined && fieldsSubj[k] !== null && String(fieldsSubj[k]).trim() !== '') return String(fieldsSubj[k]).trim();
      if (cleanGrid[k] !== undefined && cleanGrid[k] !== null && String(cleanGrid[k]).trim() !== '') return String(cleanGrid[k]).trim();
      if (rootSubj[k] !== undefined && rootSubj[k] !== null && String(rootSubj[k]).trim() !== '') return String(rootSubj[k]).trim();
      if (sGrid[k] !== undefined && sGrid[k] !== null && String(sGrid[k]).trim() !== '') return String(sGrid[k]).trim();
      if (root[k] !== undefined && root[k] !== null && String(root[k]).trim() !== '') return String(root[k]).trim();
    }
    return '';
  };

  let rawRooms = getVal([
    'Total Rooms',
    'Subject Total Rooms',
    'Total',
    'Subject Above Grade Total Rooms'
  ]);

  let rawBeds = getVal([
    'Bedrooms',
    'Subject Bedrooms',
    'Total Bedrooms',
    'Subject Above Grade Bedrooms'
  ]);

  let rawBaths = getVal([
    'Baths',
    'Subject Bathrooms',
    'Subject Baths',
    'Bathrooms',
    'Total Bathrooms',
    'Subject Above Grade Bathrooms'
  ]);

  const rawAboveGrade = getVal([
    'Above Grade Room Count',
    'Subject Above Grade Room Count'
  ]);

  if (rawAboveGrade && (!rawRooms || !rawBeds || !rawBaths)) {
    const m = rawAboveGrade.match(/^([0-9]+)[\s/]+([0-9]+)[\s/]+([0-9]+(?:\.[0-9]+)?)/);
    if (m) {
      if (!rawRooms) rawRooms = m[1];
      if (!rawBeds) rawBeds = m[2];
      if (!rawBaths) rawBaths = m[3];
    }
  }

  // Also check Form 1025 multi-family unit breakdowns (Unit Breakdown Tot Unit # 1)
  if (!rawRooms) {
    let sumTot = 0;
    let sumBr = 0;
    let sumBa = 0;
    let hasUnits = false;
    for (let u = 1; u <= 4; u++) {
      const uTot = getVal([`Unit Breakdown Tot Unit # ${u}`, `Unit ${u} Total Rooms`]);
      const uBr = getVal([`Unit Breakdown Br Unit # ${u}`, `Unit ${u} Bedrooms`]);
      const uBa = getVal([`Unit Breakdown Ba Unit # ${u}`, `Unit ${u} Baths`]);
      if (uTot || uBr || uBa) {
        hasUnits = true;
        if (uTot && !isNaN(parseFloat(uTot))) sumTot += parseFloat(uTot);
        if (uBr && !isNaN(parseFloat(uBr))) sumBr += parseFloat(uBr);
        if (uBa && !isNaN(parseFloat(uBa))) sumBa += parseFloat(uBa);
      }
    }
    if (hasUnits) {
      if (sumTot > 0 && !rawRooms) rawRooms = String(sumTot);
      if (sumBr > 0 && !rawBeds) rawBeds = String(sumBr);
      if (sumBa > 0 && !rawBaths) rawBaths = String(sumBa);
    }
  }

  let rawGLA = getVal([
    'Gross Living Area',
    'Subject Gross Living Area',
    'GLA',
    'Subject GLA',
    'Finished Area Above Grade'
  ]);

  return {
    totalRooms: rawRooms,
    bedrooms: rawBeds,
    bathrooms: rawBaths,
    aboveGradeRoomCount: rawAboveGrade,
    gla: rawGLA
  };
};

const getSketchGLA = (sketchItem) => {
  if (sketchItem?.gla) return String(sketchItem.gla).replace(/,/g, '').trim();

  // Check sketchItem.areas
  const areas = sketchItem?.areas || [];
  if (areas.length > 0) {
    for (const ar of areas) {
      const nm = (ar?.name || '').toLowerCase();
      if (/total\s*(?:sketch|living|area)|gross\s*living\s*area|\bgla\b/i.test(nm)) {
        const m = String(ar?.area || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) return m[1];
      }
    }

    let livingSum = 0;
    let foundLiving = false;
    for (const ar of areas) {
      const nm = (ar?.name || '').toLowerCase();
      if (
        /first|second|third|1st|2nd|3rd|floor|level|main|upper|living/i.test(nm) &&
        !/garage|carport|porch|deck|patio|basement|non-living/i.test(nm)
      ) {
        const m = String(ar?.area || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) {
          livingSum += parseFloat(m[1]);
          foundLiving = true;
        }
      }
    }
    if (foundLiving && livingSum > 0) {
      return String(Math.round(livingSum));
    }

    const firstM = String(areas[0]?.area || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (firstM) return firstM[1];
  }

  if (sketchItem?.raw_text_sample) {
    const m = sketchItem.raw_text_sample.replace(/,/g, '').match(/(?:total\s*(?:living\s*area|sketch|area)|gross\s*living\s*area|\bgla\b)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return m[1];
  }

  return '';
};

const evaluateRoomMatch = (sketchVal, impVal, gridVal, isBath = false, isGLA = false) => {
  const parseNum = (v) => {
    if (v === null || v === undefined) return null;
    const m = String(v).replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : null;
  };

  const s = parseNum(sketchVal);
  const i = parseNum(impVal);
  const g = parseNum(gridVal);

  if (s === null && i === null && g === null) {
    return { status: 'unknown', label: 'No Data', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', isMatch: false };
  }

  const fmt = (num) => {
    if (num === null) return '—';
    if (isBath) {
      return Number.isInteger(num) ? `${num}.0` : `${num}`;
    }
    if (isGLA) {
      return `${Math.round(num).toLocaleString()} Sq Ft`;
    }
    return `${num}`;
  };

  // 3-Way Match
  if (s !== null && i !== null && g !== null && s === i && s === g) {
    return {
      status: 'match_3way',
      label: '3-Way Match',
      detail: `All 3 sources match (${fmt(s)})`,
      color: '#15803d',
      bg: '#dcfce7',
      border: '#bbf7d0',
      isMatch: true
    };
  }

  // 2 Sources present and match
  if (s !== null && i !== null && s === i && g === null) {
    return {
      status: 'match_sketch_imp',
      label: 'Sketch ↔ Imp Match',
      detail: `Matches Improvements (${fmt(s)})`,
      color: '#0369a1',
      bg: '#e0f2fe',
      border: '#bae6fd',
      isMatch: true
    };
  }
  if (s !== null && g !== null && s === g && i === null) {
    return {
      status: 'match_sketch_grid',
      label: 'Sketch ↔ Grid Match',
      detail: `Matches Sales Grid (${fmt(s)})`,
      color: '#0369a1',
      bg: '#e0f2fe',
      border: '#bae6fd',
      isMatch: true
    };
  }

  // Partial matches with 3 sources present
  if (s !== null && i !== null && s === i) {
    return {
      status: 'match_sketch_imp',
      label: 'Sketch ↔ Imp Match',
      detail: `Sketch matches Imp (${fmt(s)}) vs Grid (${fmt(g)})`,
      color: '#0369a1',
      bg: '#e0f2fe',
      border: '#bae6fd',
      isMatch: true
    };
  }
  if (s !== null && g !== null && s === g) {
    return {
      status: 'match_sketch_grid',
      label: 'Sketch ↔ Grid Match',
      detail: `Sketch matches Grid (${fmt(s)}) vs Imp (${fmt(i)})`,
      color: '#0369a1',
      bg: '#e0f2fe',
      border: '#bae6fd',
      isMatch: true
    };
  }
  if (i !== null && g !== null && i === g) {
    return {
      status: 'match_imp_grid',
      label: 'Imp ↔ Grid Match',
      detail: `Imp matches Grid (${fmt(i)})${s !== null ? ` vs Sketch (${fmt(s)})` : ''}`,
      color: '#166534',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      isMatch: true
    };
  }

  // Discrepancy
  return {
    status: 'variance',
    label: 'Variance Detected',
    detail: `Sketch: ${fmt(s)}, Imp: ${fmt(i)}, Grid: ${fmt(g)}`,
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    isMatch: false
  };
};

const getGridComparableData = (compIndex, compLabel, compStreet, data, allData, scanResult) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const sGrid = {
    ...(allData?.clean_data?.['Sales Grid'] || {}),
    ...(allData?.fields?.['Sales Grid'] || {}),
    ...(allData?.clean_data?.SALES_GRID || {}),
    ...(allData?.fields?.SALES_GRID || {}),
    ...(allData?.['Sales Grid'] || {}),
    ...(allData?.SALES_GRID || {}),
    ...(data?.clean_data?.['Sales Grid'] || {}),
    ...(data?.fields?.['Sales Grid'] || {}),
    ...(data?.clean_data?.SALES_GRID || {}),
    ...(data?.fields?.SALES_GRID || {}),
    ...(data?.['Sales Grid'] || {}),
    ...(data?.SALES_GRID || {})
  };
  const rGrid = {
    ...(allData?.clean_data?.['Comparable Rental Data'] || {}),
    ...(allData?.fields?.['Comparable Rental Data'] || {}),
    ...(allData?.clean_data?.['Single Family Rent Schedule'] || {}),
    ...(allData?.fields?.['Single Family Rent Schedule'] || {}),
    ...(allData?.['Comparable Rental Data'] || {}),
    ...(allData?.['Single Family Rent Schedule'] || {}),
    ...(data?.clean_data?.['Comparable Rental Data'] || {}),
    ...(data?.fields?.['Comparable Rental Data'] || {}),
    ...(data?.clean_data?.['Single Family Rent Schedule'] || {}),
    ...(data?.fields?.['Single Family Rent Schedule'] || {}),
    ...(data?.['Comparable Rental Data'] || {}),
    ...(data?.['Single Family Rent Schedule'] || {})
  };

  const explicitNum = extractCompNumberFromLabel(compLabel);
  const isRentalLabel = /rental/i.test(compLabel || '');

  const normMap = normalizeAddressForCompare(compStreet);
  const mMapNum = normMap.match(/^(\d+)/);
  const mapNum = mMapNum ? mMapNum[1] : '';

  const subGrid = getSubjectGridData(data, allData);
  const subCity = subGrid.city || '';
  const subState = subGrid.state || '';
  const subZip = subGrid.zipcode || '';

  const extractFromCompObj = (obj, isRental = false) => {
    if (!obj) return { address: '', proximity: '', sale_price: '', gla: '', bed_bath: '', site: '', quality_age: '' };
    if (typeof obj === 'string') {
      let strAddr = obj.trim();
      if (strAddr && !/,\s*[A-Z]{2}\s+[0-9]{5}/i.test(strAddr) && subCity && subState) {
        strAddr = `${strAddr}, ${subCity}, ${subState} ${subZip}`.trim();
      }
      return { address: strAddr, proximity: '', sale_price: '', gla: '', bed_bath: '', site: '', quality_age: '' };
    }
    let addr = obj['Address'] || obj['Comparable Property Address'] || obj['Property Address'] || obj['Physical Address'] || obj['Street Address'] || obj['Street'] || obj['Full Address'] || obj['PropertyStreetAddress'] || '';
    if (addr && typeof addr === 'string') {
      addr = addr.trim();
      if (addr && !/,\s*[A-Z]{2}\s+[0-9]{5}/i.test(addr) && subCity && subState) {
        addr = `${addr}, ${subCity}, ${subState} ${subZip}`.trim();
      }
    }
    const prox = obj['Proximity to Subject'] || obj['Proximity'] || '';
    let sale_price = '';
    if (isRental) {
      const rCandidates = [
        obj['Adjusted Monthly Rent'],
        obj['Monthly Rental'],
        obj['Gross Monthly Rent'],
        obj['Rental Price'],
        obj['Indicated Monthly Market Rent'],
        obj['Current Monthly Rent'],
        obj['Actual Rent'],
        obj['Rent'],
        obj['Sale Price']
      ];
      for (const rc of rCandidates) {
        if (rc !== undefined && rc !== null && String(rc).trim() !== '' && String(rc).trim() !== '0' && String(rc).trim() !== '$0') {
          sale_price = String(rc).trim();
          break;
        }
      }
      if (!sale_price && obj['Monthly Rental']) {
        sale_price = String(obj['Monthly Rental']).trim();
      }
    } else {
      sale_price = obj['Sale Price'] || obj['Sales Price'] || obj['Settlement Price'] || '';
    }
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

  // Dynamically extract all sales comps from grid (minimum 3 comps guaranteed)
  const salesComps = [];
  const allSalesKeys = new Set([...Object.keys(root || {}), ...Object.keys(sGrid || {})]);
  const salesCompNums = new Set([1, 2, 3]);
  allSalesKeys.forEach(k => {
    const m = k.match(/(?:COMPARABLE(?:\s+SALE)?|COMP)[_\s]+#?([0-9]+)/i);
    if (m) salesCompNums.add(parseInt(m[1], 10));
  });
  if (scanResult?.reference_records?.sales_comps) {
    scanResult.reference_records.sales_comps.forEach(sc => {
      if (sc.comp_num) salesCompNums.add(sc.comp_num);
    });
  }
  const salesNumsToCheck = Array.from(salesCompNums).sort((a, b) => a - b);

  for (const i of salesNumsToCheck) {
    const candidateKeys = [
      `COMPARABLE SALE #${i}`,
      `COMPARABLE SALE # ${i}`,
      `Comparable Sale ${i}`,
      `Comparable Sale #${i}`,
      `Comparable #${i}`,
      `COMPARABLE #${i}`,
      `COMPARABLE # ${i}`,
      `Comparable ${i}`,
      `Comp ${i}`,
      `COMP ${i}`,
      `COMP_${i}`,
      `COMP #${i}`,
      `Comparable #${i} Address`,
      `COMP_SALE_${i}`
    ];
    let found = false;
    let item = null;
    for (const k of candidateKeys) {
      if (root[k]) { item = root[k]; break; }
      if (sGrid[k]) { item = sGrid[k]; break; }
    }
    if (!item) {
      const sGridKeys = Object.keys(sGrid || {});
      const matchK = sGridKeys.find(sk => {
        const m = sk.match(/(?:comp|comparable|sale)[_\s#]*0?([0-9]+)(?:\b|_|$)/i);
        return m && parseInt(m[1], 10) === i;
      });
      if (matchK) item = sGrid[matchK];
    }
    if (!item) {
      const rootKeys = Object.keys(root || {});
      const matchK = rootKeys.find(rk => {
        const m = rk.match(/^(?:comp|comparable(?:\s+sale)?)[_\s#]*0?([0-9]+)$/i);
        return m && parseInt(m[1], 10) === i;
      });
      if (matchK) item = root[matchK];
    }
    if (item) {
      const compData = extractFromCompObj(item);
      if (compData.address) {
        salesComps.push({ num: i, label: `Comp #${i}`, ...compData });
        found = true;
      }
    }
    if (!found && scanResult?.reference_records?.sales_comps) {
      const refComp = scanResult.reference_records.sales_comps.find(s => s.comp_num === i);
      if (refComp && refComp.address && refComp.address !== '—') {
        let rAddr = refComp.address;
        if (rAddr && !/,\s*[A-Z]{2}\s+[0-9]{5}/i.test(rAddr) && subCity && subState) {
          rAddr = `${rAddr}, ${subCity}, ${subState} ${subZip}`.trim();
        }
        salesComps.push({
          num: i,
          label: `Comp #${i}`,
          address: rAddr,
          proximity: refComp.proximity || '',
          sale_price: refComp.sale_price || '',
          gla: '',
          bed_bath: '',
          site: '',
          quality_age: ''
        });
        found = true;
      }
    }
  }

  // Dynamically extract all rental comps from grid (minimum 3 rentals guaranteed)
  const rentalComps = [];
  const allRentalKeys = new Set([...Object.keys(root || {}), ...Object.keys(rGrid || {})]);
  const rentalCompNums = new Set([1, 2, 3]);
  allRentalKeys.forEach(k => {
    const m = k.match(/(?:RENTAL(?:_COMPARABLE)?|COMPARABLE\s+NO\.|COMPARABLE\s+RENTAL)[_\s]+#?([0-9]+)/i);
    if (m) rentalCompNums.add(parseInt(m[1], 10));
  });
  if (scanResult?.reference_records?.rental_comps) {
    scanResult.reference_records.rental_comps.forEach(rc => {
      if (rc.comp_num) rentalCompNums.add(rc.comp_num);
    });
  }
  const rentalNumsToCheck = Array.from(rentalCompNums).sort((a, b) => a - b);

  for (const i of rentalNumsToCheck) {
    const candidateKeys = [
      `Rental ${i}`,
      `Rental #${i}`,
      `RENTAL #${i}`,
      `RENTAL_${i}`,
      `COMPARABLE NO. ${i}`,
      `Comparable Rental #${i}`,
      `COMPARABLE RENTAL #${i}`,
      `Comparable Rental No #${i}`,
      `RENTAL_COMPARABLE_${i}`
    ];
    let found = false;
    let item = null;
    for (const k of candidateKeys) {
      if (root[k]) { item = root[k]; break; }
      if (rGrid[k]) { item = rGrid[k]; break; }
    }
    if (!item) {
      const rGridKeys = Object.keys(rGrid || {});
      const matchK = rGridKeys.find(rk => {
        const m = rk.match(/(?:rental|comparable\s+no|comp\s*rent)[_\s#]*0?([0-9]+)(?:\b|_|$)/i);
        return m && parseInt(m[1], 10) === i;
      });
      if (matchK) item = rGrid[matchK];
    }
    if (!item) {
      const rootKeys = Object.keys(root || {});
      const matchK = rootKeys.find(rk => {
        const m = rk.match(/^(?:rental|comparable\s+rental|comparable\s+no)[_\s#]*0?([0-9]+)$/i);
        return m && parseInt(m[1], 10) === i;
      });
      if (matchK) item = root[matchK];
    }
    if (item) {
      const compData = extractFromCompObj(item, true);
      if (compData.address) {
        rentalComps.push({ num: i, label: `Rental #${i}`, ...compData });
        found = true;
      }
    }
    if (!found && scanResult?.reference_records?.rental_comps) {
      const refRent = scanResult.reference_records.rental_comps.find(r => r.comp_num === i);
      if (refRent && refRent.address && refRent.address !== '—') {
        let rAddr = refRent.address;
        if (rAddr && !/,\s*[A-Z]{2}\s+[0-9]{5}/i.test(rAddr) && subCity && subState) {
          rAddr = `${rAddr}, ${subCity}, ${subState} ${subZip}`.trim();
        }
        rentalComps.push({
          num: i,
          label: `Rental #${i}`,
          address: rAddr,
          proximity: refRent.proximity || '',
          sale_price: refRent.monthly_rent || '',
          gla: '',
          bed_bath: '',
          site: '',
          quality_age: ''
        });
        found = true;
      }
    }
  }

  // 1. High-confidence address match:
  if (compStreet && compStreet !== '—' && compStreet !== '(Address pin)') {
    if (isRentalLabel) {
      // Strictly match only against Rental Comps
      for (const rc of rentalComps) {
        const cmpRes = compareAddresses(compStreet, rc.address);
        if (cmpRes.status === 'match' || cmpRes.status === 'partial') {
          return {
            gridCompNum: rc.num,
            gridCompLabel: rc.label,
            ...rc,
            isRental: true,
            matchStatus: cmpRes.status,
            matchLabel: cmpRes.label
          };
        }
      }
    } else {
      // Strictly match only against Sales Comps
      for (const sc of salesComps) {
        const cmpRes = compareAddresses(compStreet, sc.address);
        if (cmpRes.status === 'match' || cmpRes.status === 'partial') {
          return {
            gridCompNum: sc.num,
            gridCompLabel: sc.label,
            ...sc,
            isRental: false,
            matchStatus: cmpRes.status,
            matchLabel: cmpRes.label
          };
        }
      }
    }
  }

  // 2. Explicit comp or rental number from label
  if (explicitNum) {
    if (isRentalLabel) {
      const matchedRental = rentalComps.find(r => r.num === explicitNum);
      if (matchedRental) {
        const cmpRes = compareAddresses(compStreet, matchedRental.address);
        return {
          gridCompNum: explicitNum,
          gridCompLabel: `Rental #${explicitNum}`,
          ...matchedRental,
          isRental: true,
          matchStatus: cmpRes.status,
          matchLabel: cmpRes.label
        };
      }
    } else {
      const matchedComp = salesComps.find(s => s.num === explicitNum);
      if (matchedComp) {
        const cmpRes = compareAddresses(compStreet, matchedComp.address);
        return {
          gridCompNum: explicitNum,
          gridCompLabel: `Comp #${explicitNum}`,
          ...matchedComp,
          isRental: false,
          matchStatus: cmpRes.status,
          matchLabel: cmpRes.label
        };
      }
    }
  }

  // 3. Fallback: match by house number if available
  if (mapNum) {
    if (isRentalLabel) {
      for (const rc of rentalComps) {
        const gridNorm = normalizeAddressForCompare(rc.address);
        const mGridNum = gridNorm.match(/^(\d+)/);
        if (mGridNum && mGridNum[1] === mapNum) {
          const cmpRes = compareAddresses(compStreet, rc.address);
          return {
            gridCompNum: rc.num,
            gridCompLabel: rc.label,
            ...rc,
            isRental: true,
            matchStatus: cmpRes.status,
            matchLabel: cmpRes.label
          };
        }
      }
    } else {
      for (const sc of salesComps) {
        const gridNorm = normalizeAddressForCompare(sc.address);
        const mGridNum = gridNorm.match(/^(\d+)/);
        if (mGridNum && mGridNum[1] === mapNum) {
          const cmpRes = compareAddresses(compStreet, sc.address);
          return {
            gridCompNum: sc.num,
            gridCompLabel: sc.label,
            ...sc,
            isRental: false,
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
    isRental: isRentalLabel,
    matchStatus: 'missing',
    matchLabel: 'Not in Grid'
  };
};

const buildProcessedExhibitsRows = (rawSourceList, mapItem, scanResult, data, allData, forceRental = false) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const sGrid = root.SALES_GRID || root['Sales Grid'] || {};
  const rGrid = root.RENTAL_GRID || root['Rental Grid'] || root.RENTALS || root['Rentals'] || {};

  // Dynamically count max sales comps and rental comps available in grid
  let maxSalesComps = 0;
  const allSalesKeys = [...Object.keys(root || {}), ...Object.keys(sGrid || {})];
  allSalesKeys.forEach(k => {
    const m = k.match(/(?:COMPARABLE(?:\s+SALE)?|COMP)[_\s]+#?([0-9]+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSalesComps) maxSalesComps = n;
    }
  });
  if (maxSalesComps === 0) maxSalesComps = Infinity;

  let maxRentalComps = 0;
  const allRentalKeys = [...Object.keys(root || {}), ...Object.keys(rGrid || {})];
  allRentalKeys.forEach(k => {
    const m = k.match(/RENTAL(?:_COMPARABLE)?[_\s]+#?([0-9]+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxRentalComps) maxRentalComps = n;
    }
  });
  if (maxRentalComps === 0) maxRentalComps = Infinity;

  // 1. Resolve all pin metadata, photo match, and grid match
  const allItems = (rawSourceList || []).map((comp, idx) => {
    const pinInfo = cleanPinAddress(comp, mapItem?.subject, idx);
    const isRental = forceRental || 
                     pinInfo.item_type === 'Rental' || 
                     /rental/i.test(pinInfo.label || '') || 
                     /rental/i.test(mapItem?.map_type || '');

    const compLabel = isRental
      ? (pinInfo.label?.toLowerCase()?.includes('rental') ? pinInfo.label : `Rental ${pinInfo.label || `#${idx + 1}`}`)
      : pinInfo.label;

    let gridComp = getGridComparableData(idx, compLabel, pinInfo.street, data, allData, scanResult);
    const photoComp = getComparablePhotoData({ ...pinInfo, gridComp, isRental }, idx, scanResult, allData, data);

    // Fallback A: If gridComp address is missing or '—', check direct grid_data from backend
    const directGridData = comp?.grid_data || pinInfo?.raw_pin?.grid_data || pinInfo?.grid_data;
    if ((!gridComp || !gridComp.address || gridComp.address === '—') && directGridData) {
      const gNum = directGridData.comp_num || extractCompNumberFromLabel(pinInfo.label) || (idx + 1);
      gridComp = {
        gridCompNum: gNum,
        gridCompLabel: isRental ? `Rental #${gNum}` : `Comp #${gNum}`,
        address: directGridData.address || directGridData.street || '—',
        proximity: directGridData.proximity || '',
        sale_price: directGridData.sale_price || directGridData.monthly_rent || '',
        gla: directGridData.gla || '',
        bed_bath: directGridData.bed_bath || '',
        site: directGridData.site || '',
        quality_age: directGridData.quality_age || '',
        isRental: Boolean(isRental),
        matchStatus: 'match',
        matchLabel: 'Match'
      };
    }

    // Fallback B: If still missing, check comp.matched_photo_address
    if ((!gridComp || !gridComp.address || gridComp.address === '—') && comp?.matched_photo_address) {
      const byPhotoMatch = getGridComparableData(idx, compLabel, comp.matched_photo_address, data, allData, scanResult);
      if (byPhotoMatch && byPhotoMatch.address && byPhotoMatch.address !== '—') {
        gridComp = byPhotoMatch;
      }
    }

    // Cross-link: If gridComp address is missing or '—', but photoComp was identified, resolve gridComp via photoComp!
    if ((!gridComp || !gridComp.address || gridComp.address === '—') && photoComp) {
      const photoNum = photoComp.comp_num || photoComp.comp_number;
      const photoAddr = photoComp.address;
      if (photoAddr && photoAddr !== '—') {
        const byPhotoAddr = getGridComparableData(idx, isRental ? `Rental #${photoNum || idx + 1}` : `Comp #${photoNum || idx + 1}`, photoAddr, data, allData, scanResult);
        if (byPhotoAddr && byPhotoAddr.address && byPhotoAddr.address !== '—') {
          gridComp = byPhotoAddr;
        }
      }
      if ((!gridComp || !gridComp.address || gridComp.address === '—') && photoNum) {
        const byPhotoNum = getGridComparableData(photoNum - 1, isRental ? `Rental #${photoNum}` : `Comp #${photoNum}`, pinInfo.street, data, allData, scanResult);
        if (byPhotoNum && byPhotoNum.address && byPhotoNum.address !== '—') {
          gridComp = byPhotoNum;
        }
      }
    }

    // Fallback C: If still missing, resolve by explicit comp number from pinInfo.label
    if (!gridComp || !gridComp.address || gridComp.address === '—') {
      const lblNum = extractCompNumberFromLabel(pinInfo.label);
      if (lblNum) {
        const byNum = getGridComparableData(lblNum - 1, isRental ? `Rental #${lblNum}` : `Comp #${lblNum}`, '', data, allData, scanResult);
        if (byNum && byNum.address && byNum.address !== '—') {
          gridComp = byNum;
        }
      }
    }

    let num = null;
    if (gridComp?.gridCompNum) {
      num = gridComp.gridCompNum;
    } else if (photoComp?.comp_num) {
      num = photoComp.comp_num;
    } else {
      num = extractCompNumberFromLabel(pinInfo.label);
    }

    const mMiles = (pinInfo.miles || pinInfo.proximity || '').match(/([0-9]+(?:\.[0-9]+)?)/);
    const milesVal = mMiles ? parseFloat(mMiles[1]) : 999.0;

    const displayStreet = (pinInfo.street && pinInfo.street !== '(Address pin)')
      ? pinInfo.street
      : (photoComp?.address || gridComp?.address || (pinInfo.address !== '(Address pin)' ? pinInfo.address : '') || '—');

    return {
      pinInfo,
      photoComp,
      gridComp,
      isRental,
      num,
      milesVal,
      displayStreet
    };
  });

  // Separate into groups
  const listingsGroup = allItems.filter(it => it.pinInfo.item_type === 'Listing' || /listing/i.test(it.pinInfo.label || ''));
  const rentalsGroup = allItems.filter(it => (it.isRental || it.pinInfo.item_type === 'Rental') && !listingsGroup.includes(it));
  const compsGroup = allItems.filter(it => !it.isRental && it.pinInfo.item_type !== 'Rental' && !listingsGroup.includes(it));

  // Process each group: deduplicate identical addresses, fill missing numbers, and sort strictly 1..N
  const processGroup = (group, prefix, maxAllowedComps) => {
    const deduped = [];
    const seenGridNums = new Set();
    const seenStreets = new Set();

    // Prioritize high-quality matches first: items that match grid or photo by address
    const sortedCandidates = [...group].sort((a, b) => {
      const aScore = (a.gridComp?.matchStatus === 'match' ? 3 : (a.gridComp?.matchStatus === 'partial' ? 2 : 0)) +
                     (a.photoComp ? 1 : 0);
      const bScore = (b.gridComp?.matchStatus === 'match' ? 3 : (b.gridComp?.matchStatus === 'partial' ? 2 : 0)) +
                     (b.photoComp ? 1 : 0);
      return bScore - aScore;
    });

    for (const it of sortedCandidates) {
      const sKey = (it.displayStreet || '').toLowerCase().replace(/[^\w]/g, '');
      const rawSt = (it.displayStreet || '').trim();
      const letterCount = (rawSt.match(/[a-zA-Z]/g) || []).length;
      const isStandaloneHwy = !/\d/.test(rawSt) && /^(?:interstate|highway|hwy|fwy|freeway|expressway|turnpike|parkway|pkwy|beltway)\b/i.test(rawSt);
      const isNoise = (letterCount < 3 || isStandaloneHwy) && (!it.gridComp?.address || it.gridComp.address === '—');
      if (isNoise) continue;

      // Check if this exact street has been processed
      if (sKey && sKey !== '—' && seenStreets.has(sKey)) {
        continue;
      }

      // Check street tokens base: e.g. "6 Newport Ave" vs "8996 Newport Ave"
      // If a full 4-digit address on Newport Ave was already seen or exists in grid/rentals, drop the clipped fragment
      const stNorm = normalizeAddressForCompare(it.displayStreet);
      const mNum = stNorm.match(/^(\d+)\s+(.*)/);
      if (mNum) {
        const houseNum = mNum[1];
        const streetBase = mNum[2].replace(/\b(?:st|ave|dr|ln|rd|ct|blvd|cir|pl|way)\b/g, '').trim();
        if (houseNum.length <= 2 && streetBase.length >= 4) {
          const alreadyHasFull = deduped.some(d => {
            const dNorm = normalizeAddressForCompare(d.displayStreet);
            const dM = dNorm.match(/^(\d+)\s+(.*)/);
            if (dM && dM[1].length > houseNum.length && dM[2].includes(streetBase)) {
              return true;
            }
            return false;
          });
          if (alreadyHasFull) continue;
        }
      }

      // Check if grid comp number is already claimed by a verified comp
      if (it.gridComp?.gridCompNum) {
        if (seenGridNums.has(it.gridComp.gridCompNum)) {
          it.gridComp = {
            gridCompNum: null,
            gridCompLabel: '—',
            address: '—',
            proximity: '—',
            sale_price: '—',
            gla: '—',
            bed_bath: '—',
            site: '—',
            quality_age: '—',
            isRental: Boolean(it.isRental),
            matchStatus: 'missing',
            matchLabel: 'Not in Grid'
          };
          it.num = null;
        } else if (it.gridComp.matchStatus === 'match' || it.gridComp.matchStatus === 'partial') {
          seenGridNums.add(it.gridComp.gridCompNum);
        }
      }

      if (sKey && sKey !== '—') seenStreets.add(sKey);
      deduped.push(it);
    }

    // Sort by comp number if valid, then by miles
    deduped.sort((a, b) => {
      if (a.num !== null && b.num !== null) return a.num - b.num;
      if (a.num !== null) return -1;
      if (b.num !== null) return 1;
      return a.milesVal - b.milesVal;
    });

    // Assign unique ascending numbers up to maxAllowedComps without creating phantoms
    const usedNums = new Set();
    deduped.forEach(it => {
      if (it.num !== null && it.num <= maxAllowedComps && !usedNums.has(it.num)) {
        usedNums.add(it.num);
      } else {
        it.num = null;
      }
    });

    let nextNum = 1;
    deduped.forEach(it => {
      if (it.num === null) {
        while (usedNums.has(nextNum) && nextNum <= maxAllowedComps) nextNum++;
        if (nextNum <= maxAllowedComps) {
          it.num = nextNum;
          usedNums.add(nextNum);
          it.badgeLabel = `${prefix} #${it.num}`;
        } else {
          it.badgeLabel = `${prefix} Pin`;
        }
      } else {
        it.badgeLabel = `${prefix} #${it.num}`;
      }
    });

    deduped.sort((a, b) => {
      const aN = a.num !== null ? a.num : 999;
      const bN = b.num !== null ? b.num : 999;
      return aN - bN;
    });

    // Filter out phantom noise pins: if an item has no grid comp address, no photo comp, and was assigned 'Pin'
    const validGroup = deduped.filter(it => {
      const hasGrid = it.gridComp?.address && it.gridComp.address !== '—';
      const hasPhoto = Boolean(it.photoComp);
      const isNamedComp = it.badgeLabel && !it.badgeLabel.endsWith('Pin');
      return hasGrid || hasPhoto || isNamedComp;
    });

    return validGroup;
  };

  const finalComps = processGroup(compsGroup, 'Comp', maxSalesComps);
  const finalRentals = processGroup(rentalsGroup, 'Rental', maxRentalComps);
  const finalListings = processGroup(listingsGroup, 'Listing', Infinity);

  // Guarantee comp address minimum 3 (Comps 1, 2, 3) in Location Map & Comps
  for (let cNum = 1; cNum <= 3; cNum++) {
    const existingIndex = finalComps.findIndex(c => c.num === cNum);
    if (existingIndex >= 0) {
      const cRow = finalComps[existingIndex];
      if (!cRow.gridComp || !cRow.gridComp.address || cRow.gridComp.address === '—') {
        let numComp = getGridComparableData(cNum - 1, `Comp #${cNum}`, '', data, allData, scanResult);
        if (numComp && numComp.address && numComp.address !== '—') {
          cRow.gridComp = numComp;
        } else {
          const linkedGrid = getGridComparableData(cNum - 1, `Comp #${cNum}`, cRow.displayStreet, data, allData, scanResult);
          if (linkedGrid && linkedGrid.address && linkedGrid.address !== '—') {
            cRow.gridComp = linkedGrid;
          }
        }
      }
      if ((!cRow.displayStreet || cRow.displayStreet === '—') && cRow.gridComp?.address && cRow.gridComp.address !== '—') {
        cRow.displayStreet = cRow.gridComp.address;
      }
    } else {
      const gridComp = getGridComparableData(cNum - 1, `Comp #${cNum}`, '', data, allData, scanResult);
      const photoComp = getComparablePhotoData({ gridComp, isRental: false, label: `Comp #${cNum}` }, cNum - 1, scanResult, allData, data);
      finalComps.push({
        pinInfo: {
          label: `Comp #${cNum}`,
          street: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
          address: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
          item_type: 'Comparable',
          notOnMap: true
        },
        photoComp,
        gridComp: gridComp || {
          gridCompNum: cNum,
          gridCompLabel: `Comp #${cNum}`,
          address: '—',
          proximity: '—',
          sale_price: '—',
          gla: '—',
          bed_bath: '—',
          site: '—',
          quality_age: '—',
          isRental: false,
          matchStatus: 'missing',
          matchLabel: 'Not on Map'
        },
        isRental: false,
        num: cNum,
        milesVal: 999.0,
        displayStreet: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
        badgeLabel: `Comp #${cNum}`
      });
    }
  }
  finalComps.sort((a, b) => (a.num || 999) - (b.num || 999));

  // Guarantee rentals address minimum 3 (Rentals 1, 2, 3) in Rentals Map & Table
  for (let rNum = 1; rNum <= 3; rNum++) {
    const existingIndex = finalRentals.findIndex(r => r.num === rNum);
    if (existingIndex >= 0) {
      const rRow = finalRentals[existingIndex];
      if (!rRow.gridComp || !rRow.gridComp.address || rRow.gridComp.address === '—') {
        let numRent = getGridComparableData(rNum - 1, `Rental #${rNum}`, '', data, allData, scanResult);
        if (numRent && numRent.address && numRent.address !== '—') {
          rRow.gridComp = numRent;
        } else {
          const linkedGrid = getGridComparableData(rNum - 1, `Rental #${rNum}`, rRow.displayStreet, data, allData, scanResult);
          if (linkedGrid && linkedGrid.address && linkedGrid.address !== '—') {
            rRow.gridComp = linkedGrid;
          }
        }
      }
      if ((!rRow.displayStreet || rRow.displayStreet === '—') && rRow.gridComp?.address && rRow.gridComp.address !== '—') {
        rRow.displayStreet = rRow.gridComp.address;
      }
    } else {
      const gridComp = getGridComparableData(rNum - 1, `Rental #${rNum}`, '', data, allData, scanResult);
      const photoComp = getComparablePhotoData({ gridComp, isRental: true, label: `Rental #${rNum}` }, rNum - 1, scanResult, allData, data);
      finalRentals.push({
        pinInfo: {
          label: `Rental #${rNum}`,
          street: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
          address: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
          item_type: 'Rental',
          notOnMap: true
        },
        photoComp,
        gridComp: gridComp || {
          gridCompNum: rNum,
          gridCompLabel: `Rental #${rNum}`,
          address: '—',
          proximity: '—',
          sale_price: '—',
          gla: '—',
          bed_bath: '—',
          site: '—',
          quality_age: '—',
          isRental: true,
          matchStatus: 'missing',
          matchLabel: 'Not on Map'
        },
        isRental: true,
        num: rNum,
        milesVal: 999.0,
        displayStreet: gridComp?.address && gridComp.address !== '—' ? gridComp.address : '—',
        badgeLabel: `Rental #${rNum}`
      });
    }
  }
  finalRentals.sort((a, b) => (a.num || 999) - (b.num || 999));
  
  // Strictly isolate: Rentals tab gets only rentals, Sales tab gets only sales comps & listings
  const sortedRows = forceRental ? finalRentals : [...finalComps, ...finalListings];

  return {
    allItems,
    finalComps,
    finalRentals,
    finalListings,
    sortedRows,
    compsCount: finalComps.length,
    rentalsCount: finalRentals.length,
    listingsCount: finalListings.length
  };
};

const EXHIBIT_STAGES = [
  { key: 'building_sketch', label: 'Building Sketch & Floor Plan', shortLabel: 'Building Sketch', tabIndex: 2 },
  { key: 'aerial_map', label: 'Aerial Map', shortLabel: 'Aerial Map', tabIndex: 1 },
  { key: 'location_map', label: 'Location Map & Comps', shortLabel: 'Location Map', tabIndex: 0 },
  { key: 'rental_map', label: 'Rentals & Other Maps', shortLabel: 'Rentals / Other', tabIndex: 3 }
];

export const MapAndSketchExhibitsSection = ({
  id = 'map-sketch-exhibits-section',
  data = {},
  allData = {},
  selectedFile = null
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [extractingStage, setExtractingStage] = useState(null); // 'location_map' | 'aerial_map' | 'building_sketch' | 'rental_map'
  const [extractProgressText, setExtractProgressText] = useState('');
  const [completedStages, setCompletedStages] = useState(new Set());
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

  // Trigger automated one-by-one sequential scan of map and sketch exhibits
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
    setCompletedStages(new Set());

    // Reset scan result so exhibits load progressively in real-time
    setScanResult({
      status: 'success',
      maps: [],
      sketches: [],
      comparable_photos: [],
      all_pins: []
    });

    let cachedServerPath = null;

    try {
      for (let i = 0; i < EXHIBIT_STAGES.length; i++) {
        const stage = EXHIBIT_STAGES[i];
        const isLast = (i === EXHIBIT_STAGES.length - 1);

        setExtractingStage(stage.key);
        setExtractProgressText(`Extracting ${stage.label} (${i + 1}/4)...`);

        let bodyData;
        let headers = {};

        // If server provided a temporary file path from stage 1, reuse it directly (zero overhead, no re-upload)
        if (cachedServerPath) {
          headers['Content-Type'] = 'application/json';
          bodyData = JSON.stringify({
            file_path: cachedServerPath,
            exhibit_type: stage.key,
            keep_file: !isLast,
            cleanup: isLast,
            save_images: true
          });
        } else if (fileObj instanceof File) {
          const formData = new FormData();
          formData.append('file', fileObj);
          formData.append('exhibit_type', stage.key);
          formData.append('keep_file', isLast ? 'false' : 'true');
          formData.append('cleanup', isLast ? 'true' : 'false');
          formData.append('save_images', 'true');
          bodyData = formData;
        } else {
          headers['Content-Type'] = 'application/json';
          bodyData = JSON.stringify({
            file_path: filePath,
            exhibit_type: stage.key,
            keep_file: !isLast,
            cleanup: isLast,
            save_images: true
          });
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/extract-maps/`, {
            method: 'POST',
            headers: headers,
            body: bodyData
          });

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            console.warn(`Extraction notice for ${stage.key}:`, errJson);
            if (errJson?.message && errJson.message.toLowerCase().includes('file not found')) {
              setErrorMessage('The appraisal file could not be found on the server. Please select or re-upload your XML or PDF report file using the file selector above.');
              break;
            } else if (errJson?.message) {
              setErrorMessage(`Exhibit extraction notice: ${errJson.message}`);
              break;
            }
            continue;
          }

          const result = await response.json();
          if (result.file_path && !cachedServerPath) {
            cachedServerPath = result.file_path;
          }

          // Immediately merge the newly extracted stage into scanResult so it renders on UI right now!
          setScanResult(prev => {
            const existingMaps = prev?.maps || [];
            const newMaps = result.maps || [];
            const mergedMaps = [...existingMaps];
            newMaps.forEach(nm => {
              const idx = mergedMaps.findIndex(m => m.page_number === nm.page_number && m.map_type === nm.map_type);
              if (idx >= 0) {
                mergedMaps[idx] = nm;
              } else {
                mergedMaps.push(nm);
              }
            });

            const existingSketches = prev?.sketches || [];
            const newSketches = result.sketches || [];
            const mergedSketches = [...existingSketches];
            newSketches.forEach(ns => {
              const idx = mergedSketches.findIndex(s => s.page_number === ns.page_number);
              if (idx >= 0) {
                mergedSketches[idx] = ns;
              } else {
                mergedSketches.push(ns);
              }
            });

            const existingPins = prev?.all_pins || [];
            const newPins = result.all_pins || [];
            const mergedPins = [...existingPins];
            newPins.forEach(np => {
              if (!mergedPins.some(p => p.page_number === np.page_number && p.label === np.label)) {
                mergedPins.push(np);
              }
            });

            const existingPhotos = prev?.comparable_photos || [];
            const newPhotos = result.comparable_photos || [];
            const mergedPhotos = [...existingPhotos];
            newPhotos.forEach(np => {
              if (!mergedPhotos.some(p => p.page_number === np.page_number && p.comp_num === np.comp_num)) {
                mergedPhotos.push(np);
              }
            });

            return {
              status: 'success',
              file_name: result.file_name || prev?.file_name || filePath,
              maps: mergedMaps,
              sketches: mergedSketches,
              comparable_photos: mergedPhotos,
              all_pins: mergedPins
            };
          });

          setCompletedStages(prev => new Set([...prev, stage.key]));
        } catch (stageErr) {
          console.warn(`Stage ${stage.key} error:`, stageErr);
        }
      }
    } catch (err) {
      console.warn('Map & Sketch scan notice:', err);
      const isNetworkError = !err.response && (err.message === 'Failed to fetch' || err.name === 'TypeError');
      const friendlyMsg = isNetworkError
        ? `Could not connect to backend server at ${API_BASE_URL}. Please ensure Django backend server is running on port 8000 (execute "python manage.py runserver" in appraisal_review or launch "run_all.bat").`
        : (err.message || 'Could not scan exhibits via backend server.');
      setErrorMessage(friendlyMsg);
    } finally {
      setLoading(false);
      setExtractingStage(null);
      setExtractProgressText('');
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

  // Extracted Location / Comp Maps (maps that show location / comps)
  const locationMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m =>
      /location|comparable|sales\s*map/i.test(m.map_type || '') &&
      !/rental/i.test(m.map_type || '')
    );
  }, [scanResult]);

  // Extracted Aerial Maps
  const aerialMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m => /aerial|satellite/i.test(m.map_type || ''));
  }, [scanResult]);

  // Extracted Rentals & Other Maps (dedicated rental maps OR location maps with rental pins)
  const rentalMaps = useMemo(() => {
    if (!scanResult?.maps) return [];
    return scanResult.maps.filter(m =>
      /rental/i.test(m.map_type || '') ||
      (m.rentals && m.rentals.length > 0) ||
      /plat|flood|parcel|hazard/i.test(m.map_type || '') ||
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

      {/* Progressive Extraction Stepper Banner */}
      {loading && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2,
            bgcolor: '#f0f9ff',
            borderColor: '#bae6fd'
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} sx={{ color: '#0284c7' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                {extractProgressText || 'Extracting Exhibits Progressively...'}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#0284c7' }}>
              Step {completedStages.size + (extractingStage ? 1 : 0)} of 4
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={(completedStages.size / 4) * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              mb: 1.5,
              bgcolor: '#e0f2fe',
              '& .MuiLinearProgress-bar': { bgcolor: '#0284c7', borderRadius: 3 }
            }}
          />

          <Grid container spacing={1}>
            {EXHIBIT_STAGES.map((stg, sIdx) => {
              const isDone = completedStages.has(stg.key);
              const isCurrent = extractingStage === stg.key;
              return (
                <Grid size={{ xs: 6, sm: 3 }} key={stg.key}>
                  <Box
                    onClick={() => setActiveTab(stg.tabIndex)}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: isCurrent ? '#0284c7' : (isDone ? '#86efac' : '#e2e8f0'),
                      bgcolor: isCurrent ? '#e0f2fe' : (isDone ? '#f0fdf4' : '#ffffff'),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }
                    }}
                  >
                    {isCurrent ? (
                      <CircularProgress size={16} sx={{ color: '#0284c7', flexShrink: 0 }} />
                    ) : isDone ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#16a34a', flexShrink: 0 }} />
                    ) : (
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '2px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: '#94a3b8',
                          flexShrink: 0
                        }}
                      >
                        {sIdx + 1}
                      </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          display: 'block',
                          fontWeight: isCurrent || isDone ? 700 : 500,
                          color: isCurrent ? '#0369a1' : (isDone ? '#166534' : '#64748b'),
                          fontSize: '0.73rem',
                          lineHeight: 1.2
                        }}
                      >
                        {stg.shortLabel}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: isCurrent ? '#0284c7' : (isDone ? '#15803d' : '#94a3b8')
                        }}
                      >
                        {isCurrent ? 'Extracting...' : (isDone ? 'Extracted ✓' : 'Queued')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
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
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>Location Map & Comps ({locationMaps.length > 0 ? Math.max(3, locationMaps.reduce((acc, m) => Math.max(acc, m.comparables?.length || 0), 0)) : 3} Comps)</span>
                {extractingStage === 'location_map' && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<SatelliteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>Aerial Map ({aerialMaps.length})</span>
                {extractingStage === 'aerial_map' && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<ArchitectureIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>Building Sketch & Floor Plan ({sketches.length})</span>
                {extractingStage === 'building_sketch' && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<HomeIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>Rentals & Other Maps ({rentalMaps.length})</span>
                {extractingStage === 'rental_map' && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: LOCATION MAP & SALES COMPARABLES */}
      {activeTab === 0 && (
        <Stack spacing={2.5}>
          {locationMaps.length > 0 ? (
            locationMaps.map((mapItem, mIdx) => {
              const rawSourceList = (mapItem.comparables_only && mapItem.comparables_only.length > 0)
                ? mapItem.comparables_only
                : (mapItem.comparables || []).filter(c => c.item_type !== 'Rental');

              const {
                sortedRows,
                compsCount,
                listingsCount
              } = buildProcessedExhibitsRows(rawSourceList, mapItem, scanResult, data, allData, false);

              const parts = [];
              if (compsCount > 0) parts.push(`${compsCount} Sales Comparables`);
              if (listingsCount > 0) parts.push(`${listingsCount} Listings`);
              const chipText = parts.length > 0 ? `${parts.join(', ')} Detected` : 'No Sales Callouts Detected';

              return (
                <Grid container spacing={2.5} key={mIdx}>
                  {/* Left: Comparables & Subject Data Table */}
                  <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {mapItem.map_type} (Page {mapItem.page_number})
                        </Typography>
                        <Chip
                          label={chipText}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>

                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: '10%' }}>Item</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '22%', color: '#047857' }}>Sales Grid Address</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '22%', color: '#0369a1' }}>Location Map Pin</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '24%', color: '#4338ca' }}>Photo Addendum Data</TableCell>
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
                            const subGridStreet = subGrid.fullAddress || subGrid.street || '';
                            const subMapStreet = (subInfo.street && subInfo.street !== '(Address pin)') ? subInfo.street : (subInfo.fullAddress || '');
                            const subPhotoStreet = subPhoto?.address || '';

                            const gridMatchesMap = subGridStreet && subMapStreet ? compareAddresses(subGridStreet, subMapStreet).status === 'match' : false;
                            const gridMatchesPhoto = subGridStreet && subPhotoStreet ? compareAddresses(subGridStreet, subPhotoStreet).status === 'match' : false;
                            const mapMatchesPhoto = subMapStreet && subPhotoStreet ? compareAddresses(subMapStreet, subPhotoStreet).status === 'match' : false;
                            const isThreeWayMatch = gridMatchesMap && (subPhotoStreet ? (gridMatchesPhoto || mapMatchesPhoto) : true);
                            const subSubjectAddress = subPhoto?.address || subGrid.street || subGrid.fullAddress || subInfo.street || subInfo.fullAddress || 'Subject Property';

                            return (
                              <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                <TableCell sx={{ verticalAlign: 'middle' }}>
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '0.75rem' }}>
                                    🔴 Subject
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {subGrid.fullAddress || subGrid.street || '—'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>
                                    Form Subject / Sales Grid
                                  </Typography>
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
                                  <Chip
                                    label={`${subInfo.miles} mi (Base)`}
                                    size="small"
                                    sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, border: '1px solid #fecaca' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {isThreeWayMatch ? (
                                    <Chip
                                      label="3-Way Match"
                                      size="small"
                                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                      sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                    />
                                  ) : gridMatchesMap ? (
                                    <Chip
                                      label="Grid ↔ Map"
                                      size="small"
                                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                      sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                    />
                                  ) : gridMatchesPhoto ? (
                                    <Chip
                                      label="Grid ↔ Photo"
                                      size="small"
                                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                      sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.72rem' }}
                                    />
                                  ) : mapMatchesPhoto ? (
                                    <Chip
                                      label="Map ↔ Photo"
                                      size="small"
                                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                      sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                    />
                                  ) : (
                                    <Chip
                                      label={subGridStreet && subMapStreet ? compareAddresses(subGridStreet, subMapStreet).label : 'Mismatch'}
                                      size="small"
                                      sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fecaca', fontSize: '0.72rem' }}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })()}

                          {/* Comparables & Rentals Rows Sorted in Strict Ascending Order (1..N) */}
                          {sortedRows.map((rowItem, rIdx) => {
                            const { pinInfo, photoComp, gridComp, isRental, displayStreet, badgeLabel } = rowItem;
                              const isListing = pinInfo?.item_type === 'Listing' || /listing/i.test(pinInfo?.label || '');
                              const compInfo = pinInfo || {};
                              const safeGridComp = gridComp || {
                                gridCompNum: null,
                                gridCompLabel: '—',
                                address: '—',
                                proximity: '—',
                                sale_price: '—',
                                gla: '—',
                                bed_bath: '—',
                                site: '—',
                                quality_age: '—',
                                isRental: Boolean(isRental),
                                matchStatus: 'missing',
                                matchLabel: 'Not in Grid'
                              };

                              const mapStreet = (compInfo.street && compInfo.street !== '(Address pin)') ? compInfo.street : (compInfo.address !== '(Address pin)' ? compInfo.address : '');
                              const photoStreet = photoComp?.address || '';
                              const gridStreet = safeGridComp.address || '';

                              const mapMatchesPhoto = photoStreet ? compareAddresses(mapStreet, photoStreet).status === 'match' : false;
                              const mapMatchesGrid = safeGridComp.matchStatus === 'match';
                              const photoMatchesGrid = (photoStreet && gridStreet && gridStreet !== '—') ? compareAddresses(photoStreet, gridStreet).status === 'match' : false;

                              return (
                                <TableRow key={rIdx} hover>
                                  <TableCell sx={{ verticalAlign: 'middle' }}>
                                    <Box sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      px: 1,
                                      py: 0.25,
                                      borderRadius: 1,
                                      bgcolor: isListing ? '#ccfbf1' : (isRental ? '#f0fdf4' : '#e0f2fe'),
                                      color: isListing ? '#0f766e' : (isRental ? '#166534' : '#0369a1'),
                                      border: isListing ? '1px solid #99f6e4' : (isRental ? '1px solid #bbf7d0' : '1px solid #bae6fd'),
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}>
                                      {isListing ? '📋' : (isRental ? '🟢' : '🔵')} {badgeLabel}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: safeGridComp.address !== '—' ? '#0f172a' : '#94a3b8' }}>
                                      {safeGridComp.address}
                                    </Typography>
                                    {safeGridComp.gridCompLabel !== '—' && (
                                      <Typography variant="caption" sx={{ color: isRental ? '#166534' : '#047857', fontWeight: 600 }}>
                                        {isRental ? `Rental Schedule ${safeGridComp.gridCompLabel}` : `Sales Grid ${safeGridComp.gridCompLabel}`} {safeGridComp.sale_price && safeGridComp.sale_price !== '—' ? `• $${safeGridComp.sale_price}` : ''}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      {displayStreet}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ my: 0.25 }} flexWrap="wrap">
                                      {compInfo.price && (
                                        <Chip
                                          label={compInfo.price}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
                                        />
                                      )}
                                      {compInfo.apn && (
                                        <Chip
                                          label={`APN: ${compInfo.apn}`}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                                        />
                                      )}
                                    </Stack>
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
                                          <Typography variant="caption" sx={{ color: '#4338ca', fontWeight: 600, display: 'block' }}>
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
                                    {safeGridComp.proximity && safeGridComp.proximity !== '—' && (
                                      <Typography variant="caption" sx={{ color: '#047857', display: 'block', mb: 0.25, fontWeight: 600 }}>
                                        Grid: {safeGridComp.proximity}
                                      </Typography>
                                    )}
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
                                  </TableCell>
                                  <TableCell>
                                    {(mapMatchesPhoto && (mapMatchesGrid || photoMatchesGrid)) || (mapMatchesGrid && photoMatchesGrid) ? (
                                      <Chip
                                        label="3-Way Match"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : mapMatchesGrid ? (
                                      <Chip
                                        label="Grid ↔ Map"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : photoMatchesGrid ? (
                                      <Chip
                                        label="Grid ↔ Photo"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                        sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.72rem' }}
                                      />
                                    ) : mapMatchesPhoto ? (
                                      <Chip
                                        label="Map ↔ Photo"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                        sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                      />
                                    ) : safeGridComp.matchStatus === 'partial' ? (
                                      <Chip
                                        label="Near Match"
                                        size="small"
                                        sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                                      />
                                    ) : safeGridComp.matchStatus === 'mismatch' ? (
                                      <Chip
                                        label="Mismatch"
                                        size="small"
                                        sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fecaca', fontSize: '0.72rem' }}
                                      />
                                    ) : (safeGridComp.address && safeGridComp.address !== '—') ? (
                                      <Chip
                                        label="Grid Verified"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#047857 !important' }} />}
                                        sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0', fontSize: '0.72rem' }}
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
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Rental Comparables detected on this Map */}
                    {mapItem.rentals && mapItem.rentals.length > 0 && (() => {
                      const { sortedRows: rentalRows, rentalsCount } = buildProcessedExhibitsRows(
                        mapItem.rentals,
                        mapItem,
                        scanResult,
                        data,
                        allData,
                        true
                      );
                      if (rentalRows.length === 0) return null;

                      return (
                        <Box sx={{ mt: 3, pt: 2, borderTop: '2px dashed #cbd5e1' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span>🟢</span> Rental Comparables on this Map ({rentalsCount})
                            </Typography>
                            <Chip
                              label={`${rentalsCount} Rentals Cross-Referenced`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 600, color: '#16a34a', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}
                            />
                          </Stack>

                          <TableContainer>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#f0fdf4' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, width: '10%' }}>Item</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: '22%', color: '#047857' }}>Rental Schedule / Grid</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: '22%', color: '#0369a1' }}>Map Pin Address</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: '24%', color: '#4338ca' }}>Photo Addendum Data</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: '11%' }}>Miles / Prox</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: '11%' }}>Match Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {rentalRows.map((rowItem, rIdx) => {
                                  const { pinInfo, photoComp, gridComp, displayStreet, badgeLabel } = rowItem;
                                  const compInfo = pinInfo || {};
                                  const safeGridComp = gridComp || {
                                    gridCompNum: null,
                                    gridCompLabel: '—',
                                    address: '—',
                                    proximity: '—',
                                    sale_price: '—',
                                    gla: '—',
                                    bed_bath: '—',
                                    site: '—',
                                    quality_age: '—',
                                    isRental: true,
                                    matchStatus: 'missing',
                                    matchLabel: 'Not in Grid'
                                  };

                                  const mapStreet = (compInfo.street && compInfo.street !== '(Address pin)') ? compInfo.street : (compInfo.address !== '(Address pin)' ? compInfo.address : '');
                                  const photoStreet = photoComp?.address || '';
                                  const gridStreet = safeGridComp.address || '';

                                  const mapMatchesPhoto = photoStreet ? compareAddresses(mapStreet, photoStreet).status === 'match' : false;
                                  const mapMatchesGrid = safeGridComp.matchStatus === 'match';
                                  const photoMatchesGrid = (photoStreet && gridStreet && gridStreet !== '—') ? compareAddresses(photoStreet, gridStreet).status === 'match' : false;

                                  return (
                                    <TableRow key={rIdx} hover>
                                      <TableCell sx={{ verticalAlign: 'middle' }}>
                                        <Box sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                          px: 1,
                                          py: 0.25,
                                          borderRadius: 1,
                                          bgcolor: '#f0fdf4',
                                          color: '#166534',
                                          border: '1px solid #bbf7d0',
                                          fontWeight: 700,
                                          fontSize: '0.75rem'
                                        }}>
                                          🟢 {badgeLabel}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: safeGridComp.address !== '—' ? '#0f172a' : '#94a3b8' }}>
                                          {safeGridComp.address}
                                        </Typography>
                                        {safeGridComp.gridCompLabel !== '—' && (
                                          <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>
                                            Rental Grid {safeGridComp.gridCompLabel} {safeGridComp.sale_price && safeGridComp.sale_price !== '—' ? `• $${safeGridComp.sale_price}` : ''}
                                          </Typography>
                                        )}
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
                                                    alt={photoComp.title || 'Rental Photo'}
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
                                                Page {photoComp.page} {photoComp.rent_amount || photoComp.sale_price ? `• $${photoComp.rent_amount || photoComp.sale_price}/mo` : ''} {photoComp.gla ? `• ${photoComp.gla} sf` : ''}
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
                                        {safeGridComp.proximity && safeGridComp.proximity !== '—' && (
                                          <Typography variant="caption" sx={{ color: '#047857', display: 'block', mb: 0.25, fontWeight: 600 }}>
                                            Grid: {safeGridComp.proximity}
                                          </Typography>
                                        )}
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
                                      </TableCell>
                                      <TableCell>
                                        {(mapMatchesPhoto && (mapMatchesGrid || photoMatchesGrid)) || (mapMatchesGrid && photoMatchesGrid) ? (
                                          <Chip
                                            label="3-Way Match"
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                          />
                                        ) : mapMatchesGrid ? (
                                          <Chip
                                            label="Grid ↔ Map"
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                          />
                                        ) : photoMatchesGrid ? (
                                          <Chip
                                            label="Grid ↔ Photo"
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                            sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.72rem' }}
                                          />
                                        ) : mapMatchesPhoto ? (
                                          <Chip
                                            label="Map ↔ Photo"
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                            sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                          />
                                        ) : safeGridComp.matchStatus === 'partial' ? (
                                          <Chip
                                            label="Near Match"
                                            size="small"
                                            sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                                          />
                                        ) : (
                                          <Chip
                                            label={safeGridComp.matchLabel || 'Not in Grid'}
                                            size="small"
                                            sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fecaca', fontSize: '0.72rem' }}
                                          />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                {/* Right: Map Preview Image */}
                <Grid size={{ xs: 12, lg: 4 }}>
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
            );
          })
          ) : (
            extractingStage === 'location_map' ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <CircularProgress size={32} sx={{ color: '#0284c7', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Extracting Location Map & Sales Comparables...
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Detecting subject pin, comparable pins, and cross-referencing addresses with the Sales Grid.
                </Typography>
              </Paper>
            ) : (
              <Alert severity="info">
                No Location Map pages extracted yet. Click <strong>"Scan / Refresh Exhibits"</strong> above to extract pins.
              </Alert>
            )
          )}
        </Stack>
      )}

      {/* TAB 1: AERIAL MAP */}
      {activeTab === 1 && (
        <Stack spacing={2.5}>
          {aerialMaps.length > 0 ? (
            aerialMaps.map((mapItem, aIdx) => (
              <Grid container spacing={2.5} key={aIdx}>
                <Grid size={{ xs: 12, md: 6 }}>
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

                <Grid size={{ xs: 12, md: 6 }}>
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
            extractingStage === 'aerial_map' ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <CircularProgress size={32} sx={{ color: '#0284c7', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Extracting Aerial / Satellite Map Exhibit...
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Locating satellite imagery and subject property boundary callouts.
                </Typography>
              </Paper>
            ) : loading && !completedStages.has('aerial_map') ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569' }}>
                  Aerial Map Extraction Queued (Stage 2/4)
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Will extract automatically once Location Map completes.
                </Typography>
              </Paper>
            ) : (
              <Alert severity="info">
                No Aerial Map exhibit detected in this document.
              </Alert>
            )
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
                  <Grid size={{ xs: 12, lg: 7 }}>
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
                      {(roomLabels.length > 0 || Object.keys(roomCats).length > 0 || sketchItem.gla || (sketchItem.areas && sketchItem.areas.length > 0) || sketchItem.raw_text_sample) && (
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
                            {(() => {
                              const sGLA = getSketchGLA(sketchItem);
                              const impC = getImprovementsRoomCounts(data, allData);
                              const gridC = getSalesGridSubjectRoomCounts(data, allData);
                              const activeGLA = sGLA || impC.gla || gridC.gla;
                              if (!activeGLA) return null;
                              const numGla = Number(String(activeGLA).replace(/,/g, ''));
                              if (isNaN(numGla) || numGla <= 0) return null;
                              return (
                                <Chip
                                  icon={<ArchitectureIcon fontSize="small" />}
                                  label={`${numGla.toLocaleString()} Sq Ft GLA`}
                                  size="small"
                                  sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
                                />
                              );
                            })()}
                            {roomSum.total_rooms > 0 && (
                              <Chip
                                icon={<HomeIcon fontSize="small" />}
                                label={`${roomSum.total_rooms} Total Rooms`}
                                size="small"
                                sx={{ bgcolor: '#ede9fe', color: '#5b21b6', fontWeight: 700, border: '1px solid #ddd6fe' }}
                              />
                            )}
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

                          {/* Room Count & GLA Reconciliation: Building Sketch vs Improvements vs Sales Grid */}
                          {(() => {
                            const impCounts = getImprovementsRoomCounts(data, allData);
                            const gridCounts = getSalesGridSubjectRoomCounts(data, allData);
                            const sketchGLA = getSketchGLA(sketchItem);

                            const glaEval = evaluateRoomMatch(sketchGLA, impCounts.gla, gridCounts.gla, false, true);
                            const bedEval = evaluateRoomMatch(roomSum.bedroom_count, impCounts.bedrooms, gridCounts.bedrooms, false);
                            const bathEval = evaluateRoomMatch(roomSum.bathroom_count, impCounts.bathrooms, gridCounts.bathrooms, true);
                            const totEval = evaluateRoomMatch(roomSum.total_rooms, impCounts.totalRooms, gridCounts.totalRooms, false);

                            const rows = [
                              {
                                metric: 'Gross Living Area (GLA)',
                                icon: <ArchitectureIcon fontSize="small" sx={{ color: '#059669' }} />,
                                sketchDisplay: sketchGLA ? `${Number(sketchGLA).toLocaleString()} Sq Ft` : (sketchItem.areas?.length > 0 ? `${sketchItem.areas[0].area}` : '—'),
                                sketchDetail: sketchGLA ? 'Calculated Floor Plan Area' : (sketchItem.areas?.length > 0 ? 'Canvas Area Extract' : 'See Area Table Below'),
                                impDisplay: impCounts.gla ? `${Number(String(impCounts.gla).replace(/,/g, '')).toLocaleString()} Sq Ft` : '—',
                                gridDisplay: gridCounts.gla ? `${Number(String(gridCounts.gla).replace(/,/g, '')).toLocaleString()} Sq Ft` : '—',
                                eval: glaEval
                              },
                              {
                                metric: 'Bedrooms',
                                icon: <BedIcon fontSize="small" sx={{ color: '#4338ca' }} />,
                                sketchDisplay: `${roomSum.bedroom_count} Bed${roomSum.bedroom_count !== 1 ? 's' : ''}`,
                                impDisplay: impCounts.bedrooms ? `${impCounts.bedrooms} Bedrooms` : '—',
                                gridDisplay: gridCounts.bedrooms ? `${gridCounts.bedrooms} Bedrooms` : '—',
                                eval: bedEval
                              },
                              {
                                metric: 'Bathrooms',
                                icon: <BathIcon fontSize="small" sx={{ color: '#0e7490' }} />,
                                sketchDisplay: roomSum.bathroom_display || `${roomSum.bathroom_count} Bath`,
                                impDisplay: impCounts.bathrooms ? `${impCounts.bathrooms} Bath(s)` : '—',
                                gridDisplay: gridCounts.bathrooms ? `${gridCounts.bathrooms} Bath(s)` : '—',
                                eval: bathEval
                              },
                              {
                                metric: 'Total Rooms',
                                icon: <HomeIcon fontSize="small" sx={{ color: '#5b21b6' }} />,
                                sketchDisplay: `${roomSum.total_rooms} Rooms`,
                                sketchDetail: '(Bedrooms + Living + Dining + Kitchen)',
                                impDisplay: impCounts.totalRooms ? `${impCounts.totalRooms} Rooms` : '—',
                                gridDisplay: gridCounts.totalRooms ? `${gridCounts.totalRooms} Rooms` : '—',
                                eval: totEval
                              }
                            ];

                            const allMatched = glaEval.isMatch && bedEval.isMatch && bathEval.isMatch && totEval.isMatch;

                            return (
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  mb: 2.5,
                                  borderRadius: 2,
                                  bgcolor: '#ffffff',
                                  borderColor: '#e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LayersIcon fontSize="small" sx={{ color: '#4f46e5' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      Room Count & GLA Reconciliation: Building Sketch vs Improvements vs Sales Grid
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={allMatched ? "All Categories Consistent" : "Section Cross-Reference"}
                                    size="small"
                                    icon={allMatched ? <CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} /> : undefined}
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '0.72rem',
                                      bgcolor: allMatched ? '#dcfce7' : '#f1f5f9',
                                      color: allMatched ? '#15803d' : '#475569',
                                      border: allMatched ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                    }}
                                  />
                                </Stack>

                                <TableContainer>
                                  <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 700, width: '22%' }}>Appraisal Metric</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: '26%' }}>Building Sketch Canvas</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: '22%' }}>Improvements Section</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: '18%' }}>Sales Grid (Subject)</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: '12%' }}>Audit Status</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {rows.map((r, rIdx) => (
                                        <TableRow key={rIdx} hover>
                                          <TableCell sx={{ verticalAlign: 'middle' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                              {r.icon}
                                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                {r.metric}
                                              </Typography>
                                            </Box>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'middle' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                              {r.sketchDisplay}
                                            </Typography>
                                            {r.sketchDetail && (
                                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                                                {r.sketchDetail}
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'middle' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                              {r.impDisplay}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                                              Form Finished Area
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'middle' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                              {r.gridDisplay}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                                              Grid Subject Unit
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'middle' }}>
                                            <Tooltip title={r.eval.detail || r.eval.label} arrow>
                                              <Chip
                                                size="small"
                                                icon={r.eval.isMatch ? <CheckCircleIcon sx={{ fontSize: '13px !important', color: `${r.eval.color} !important` }} /> : undefined}
                                                label={r.eval.label}
                                                sx={{
                                                  fontWeight: 700,
                                                  fontSize: '0.72rem',
                                                  bgcolor: r.eval.bg,
                                                  color: r.eval.color,
                                                  border: `1px solid ${r.eval.border}`
                                                }}
                                              />
                                            </Tooltip>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>

                                <Typography variant="caption" sx={{ color: '#64748b', mt: 1.25, display: 'block', fontSize: '0.72rem', fontStyle: 'italic' }}>
                                  * Note: As per ANSI Z765 & Fannie Mae guidelines, Gross Living Area (GLA) measures finished above-grade exterior dimensions. Total Rooms includes finished above-grade living rooms, bedrooms, kitchens, and dining rooms; bathrooms, hallways, basements, and utility rooms are excluded. In multi-unit (Form 1025) appraisals, Improvements shows total property count while Sales Grid reflects the subject evaluation unit.
                                </Typography>
                              </Paper>
                            );
                          })()}

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
                  <Grid size={{ xs: 12, lg: 5 }}>
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
            extractingStage === 'building_sketch' ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <CircularProgress size={32} sx={{ color: '#0284c7', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Extracting Building Sketch & Architectural Floor Plans...
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Parsing room labels (Bedrooms, Baths, Kitchen, Garage), wall dimensions, and gross living area.
                </Typography>
              </Paper>
            ) : loading && !completedStages.has('building_sketch') ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569' }}>
                  Building Sketch Extraction Queued (Stage 3/4)
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Will extract automatically once Aerial Map completes.
                </Typography>
              </Paper>
            ) : (
              <Alert severity="info">
                No Building Sketch or Floor Plan pages detected in this file.
              </Alert>
            )
          )}
        </Stack>
      )}

      {/* TAB 3: RENTALS & OTHER MAPS */}
      {activeTab === 3 && (
        <Stack spacing={2.5}>
          {rentalMaps.length > 0 ? (
            rentalMaps.map((mapItem, rIdx) => {
              const rawSourceList = (mapItem.rentals && mapItem.rentals.length > 0)
                ? mapItem.rentals
                : (mapItem.comparables || []).filter(c => c.item_type === 'Rental' || /rental/i.test(mapItem.map_type || ''));

              const {
                sortedRows,
                rentalsCount
              } = buildProcessedExhibitsRows(rawSourceList, mapItem, scanResult, data, allData, true);

              return (
                <Grid container spacing={2.5} key={rIdx}>
                  {/* Left: Rentals & Subject Data Table */}
                  <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {mapItem.map_type || 'Rentals Map'} (Page {mapItem.page_number})
                        </Typography>
                        <Chip
                          label={rentalsCount > 0 ? `${rentalsCount} Rental Comparables Detected` : 'Exhibits Reference Map'}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600, color: '#16a34a', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}
                        />
                      </Stack>

                      <TableContainer>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, width: '10%' }}>Item</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '22%', color: '#047857' }}>Rental Schedule / Grid</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '22%', color: '#0369a1' }}>Rentals Map Pin</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '24%', color: '#4338ca' }}>Photo Addendum Data</TableCell>
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
                              const subGridStreet = subGrid.fullAddress || subGrid.street || '';
                              const subMapStreet = (subInfo.street && subInfo.street !== '(Address pin)') ? subInfo.street : (subInfo.fullAddress || '');
                              const subPhotoStreet = subPhoto?.address || '';

                              const gridMatchesMap = subGridStreet && subMapStreet ? compareAddresses(subGridStreet, subMapStreet).status === 'match' : false;
                              const gridMatchesPhoto = subGridStreet && subPhotoStreet ? compareAddresses(subGridStreet, subPhotoStreet).status === 'match' : false;
                              const mapMatchesPhoto = subMapStreet && subPhotoStreet ? compareAddresses(subMapStreet, subPhotoStreet).status === 'match' : false;
                              const isThreeWayMatch = gridMatchesMap && (subPhotoStreet ? (gridMatchesPhoto || mapMatchesPhoto) : true);
                              const subSubjectAddress = subPhoto?.address || subGrid.street || subGrid.fullAddress || subInfo.street || subInfo.fullAddress || 'Subject Property';

                              return (
                                <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                  <TableCell sx={{ verticalAlign: 'middle' }}>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '0.75rem' }}>
                                      🔴 Subject
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      {subGrid.fullAddress || subGrid.street || '—'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>
                                      Form Subject / Rental Schedule
                                    </Typography>
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
                                    <Chip
                                      label={`${subInfo.miles} mi (Base)`}
                                      size="small"
                                      sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, border: '1px solid #fecaca' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {isThreeWayMatch ? (
                                      <Chip
                                        label="3-Way Match"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : gridMatchesMap ? (
                                      <Chip
                                        label="Grid ↔ Map"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                      />
                                    ) : gridMatchesPhoto ? (
                                      <Chip
                                        label="Grid ↔ Photo"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                        sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.72rem' }}
                                      />
                                    ) : mapMatchesPhoto ? (
                                      <Chip
                                        label="Map ↔ Photo"
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                        sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                      />
                                    ) : (
                                      <Chip
                                        label={subGridStreet && subMapStreet ? compareAddresses(subGridStreet, subMapStreet).label : 'Mismatch'}
                                        size="small"
                                        sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fecaca', fontSize: '0.72rem' }}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}

                            {/* Rental Comparables Rows Sorted in Strict Ascending Order (1..N) */}
                            {sortedRows.map((rowItem, rowIdx) => {
                              const { pinInfo, photoComp, gridComp, displayStreet, badgeLabel } = rowItem;
                                const compInfo = pinInfo || {};
                                const safeGridComp = gridComp || {
                                  gridCompNum: null,
                                  gridCompLabel: '—',
                                  address: '—',
                                  proximity: '—',
                                  sale_price: '—',
                                  gla: '—',
                                  bed_bath: '—',
                                  site: '—',
                                  quality_age: '—',
                                  isRental: true,
                                  matchStatus: 'missing',
                                  matchLabel: 'Not in Grid'
                                };

                                const mapStreet = (compInfo.street && compInfo.street !== '(Address pin)') ? compInfo.street : (compInfo.address !== '(Address pin)' ? compInfo.address : '');
                                const photoStreet = photoComp?.address || '';
                                const gridStreet = safeGridComp.address || '';

                                const mapMatchesPhoto = photoStreet ? compareAddresses(mapStreet, photoStreet).status === 'match' : false;
                                const mapMatchesGrid = safeGridComp.matchStatus === 'match';
                                const photoMatchesGrid = (photoStreet && gridStreet && gridStreet !== '—') ? compareAddresses(photoStreet, gridStreet).status === 'match' : false;

                                return (
                                  <TableRow key={rowIdx} hover>
                                    <TableCell sx={{ verticalAlign: 'middle' }}>
                                      <Box sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        bgcolor: '#f0fdf4',
                                        color: '#166534',
                                        border: '1px solid #bbf7d0',
                                        fontWeight: 700,
                                        fontSize: '0.75rem'
                                      }}>
                                        🟢 {badgeLabel}
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: safeGridComp.address !== '—' ? '#0f172a' : '#94a3b8' }}>
                                        {safeGridComp.address}
                                      </Typography>
                                      {safeGridComp.gridCompLabel !== '—' && (
                                        <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>
                                          Rental Grid {safeGridComp.gridCompLabel} {safeGridComp.sale_price && safeGridComp.sale_price !== '—' ? `• $${safeGridComp.sale_price}` : ''}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                        {displayStreet}
                                      </Typography>
                                      <Stack direction="row" spacing={0.5} sx={{ my: 0.25 }} flexWrap="wrap">
                                        {compInfo.price && (
                                          <Chip
                                            label={compInfo.price}
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
                                          />
                                        )}
                                        {compInfo.apn && (
                                          <Chip
                                            label={`APN: ${compInfo.apn}`}
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                                          />
                                        )}
                                      </Stack>
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
                                                  alt={photoComp.title || 'Rental Photo'}
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
                                              Page {photoComp.page} {photoComp.rent_amount || photoComp.sale_price ? `• $${photoComp.rent_amount || photoComp.sale_price}/mo` : ''} {photoComp.gla ? `• ${photoComp.gla} sf` : ''} {photoComp.bedrooms ? `• ${photoComp.bedrooms}B/${photoComp.bathrooms || '1'}Ba` : ''}
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
                                      {safeGridComp.proximity && safeGridComp.proximity !== '—' && (
                                        <Typography variant="caption" sx={{ color: '#047857', display: 'block', mb: 0.25, fontWeight: 600 }}>
                                          Grid: {safeGridComp.proximity}
                                        </Typography>
                                      )}
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
                                    </TableCell>
                                    <TableCell>
                                      {(mapMatchesPhoto && (mapMatchesGrid || photoMatchesGrid)) || (mapMatchesGrid && photoMatchesGrid) ? (
                                        <Chip
                                          label="3-Way Match"
                                          size="small"
                                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                          sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                        />
                                      ) : mapMatchesGrid ? (
                                        <Chip
                                          label="Grid ↔ Map"
                                          size="small"
                                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                                          sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}
                                        />
                                      ) : photoMatchesGrid ? (
                                        <Chip
                                          label="Grid ↔ Photo"
                                          size="small"
                                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                          sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.72rem' }}
                                        />
                                      ) : mapMatchesPhoto ? (
                                        <Chip
                                          label="Map ↔ Photo"
                                          size="small"
                                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                          sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd', fontSize: '0.72rem' }}
                                        />
                                      ) : safeGridComp.matchStatus === 'partial' ? (
                                        <Chip
                                          label="Near Match"
                                          size="small"
                                          sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 700, border: '1px solid #fde047', fontSize: '0.72rem' }}
                                        />
                                      ) : safeGridComp.matchStatus === 'mismatch' ? (
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
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>

                  {/* Right: Rentals Map Preview Image */}
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="320"
                          image={mapItem.image_preview}
                          alt="Rentals Map Preview"
                          sx={{ objectFit: 'contain', bgcolor: '#0f172a', cursor: 'pointer' }}
                          onClick={() => {
                            setPreviewImage(mapItem.image_preview);
                            setRotation(0);
                          }}
                        />
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 1,
                            p: 0.5
                          }}
                        >
                          <Tooltip title="View Fullscreen" arrow>
                            <IconButton
                              size="small"
                              sx={{ color: '#ffffff' }}
                              onClick={() => {
                                setPreviewImage(mapItem.image_preview);
                                setRotation(0);
                              }}
                            >
                              <FullscreenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                            Page {mapItem.page_number} • {mapItem.map_type}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setPreviewImage(mapItem.image_preview); setRotation(0); }}>
                            Click image to expand
                          </Typography>
                        </Stack>
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              );
            })
          ) : (
            extractingStage === 'rental_map' ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <CircularProgress size={32} sx={{ color: '#0284c7', mb: 1.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Extracting Rentals, Flood & Plat Map Exhibits...
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Scanning rental comparables, flood hazard boundaries, and plat maps.
                </Typography>
              </Paper>
            ) : loading && !completedStages.has('rental_map') ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569' }}>
                  Rentals & Other Maps Extraction Queued (Stage 4/4)
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Will extract automatically once Building Sketch completes.
                </Typography>
              </Paper>
            ) : (
              <Alert severity="info">
                No additional Rentals or Flood Map exhibits found.
              </Alert>
            )
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
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
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
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip label={selectedCompPhotoModal?.photoComp?.title || 'Comparable Photo'} color="primary" size="small" sx={{ fontWeight: 700 }} />
            <Typography component="span" variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
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
            <Grid size={{ xs: 12, sm: 5 }}>
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
            <Grid size={{ xs: 12, sm: 7 }}>
              {(() => {
                const isRental = Boolean(selectedCompPhotoModal?.photoComp?.rent_amount || selectedCompPhotoModal?.photoComp?.title?.toLowerCase()?.includes('rental') || selectedCompPhotoModal?.compInfo?.badgeLabel?.includes('Rental'));
                return (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                      Cross-Reference Comparison ({isRental ? 'Rental Grid vs. Rentals Map vs. Photo Addendum' : 'Sales Grid vs. Location Map vs. Photo Addendum'})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Attribute</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#047857' }}>{isRental ? 'Rental Schedule / Grid' : 'Sales Grid'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#0369a1' }}>{isRental ? 'Rentals Map Pin' : 'Location Map Pin'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#4338ca' }}>Photo Addendum Data</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.address || '—'}</TableCell>
                            <TableCell>{selectedCompPhotoModal?.compInfo?.street || '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#4338ca' }}>{selectedCompPhotoModal?.photoComp?.address || '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Proximity</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.proximity || '—'}</TableCell>
                            <TableCell>{selectedCompPhotoModal?.compInfo?.proximity || selectedCompPhotoModal?.compInfo?.miles || '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#4338ca' }}>{selectedCompPhotoModal?.photoComp?.proximity || '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>{isRental ? 'Rent / Price' : 'Sale Price'}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.sale_price && selectedCompPhotoModal?.gridComp?.sale_price !== '—' ? `$${selectedCompPhotoModal.gridComp.sale_price}${isRental ? '/mo' : ''}` : (selectedCompPhotoModal?.gridComp?.sale_price || '—')}</TableCell>
                            <TableCell>{selectedCompPhotoModal?.compInfo?.price || '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#16a34a' }}>
                              {selectedCompPhotoModal?.photoComp?.rent_amount
                                ? `$${selectedCompPhotoModal.photoComp.rent_amount}/mo`
                                : (selectedCompPhotoModal?.photoComp?.sale_price ? `$${selectedCompPhotoModal.photoComp.sale_price}${isRental ? '/mo' : ''}` : '—')}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Living Area (GLA)</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.gla || '—'}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.gla ? `${selectedCompPhotoModal.photoComp.gla} sf` : '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Bed / Bath Count</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.bed_bath || '—'}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.bedrooms ? `${selectedCompPhotoModal.photoComp.bedrooms} Bed / ${selectedCompPhotoModal.photoComp.bathrooms || '1'} Bath` : '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Site Area</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.site || '—'}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.site || '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Quality / Age</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#047857' }}>{selectedCompPhotoModal?.gridComp?.quality_age || '—'}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{selectedCompPhotoModal?.photoComp?.quality || '—'} {selectedCompPhotoModal?.photoComp?.age ? `/ ${selectedCompPhotoModal.photoComp.age} yrs` : ''}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                );
              })()}
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MapAndSketchExhibitsSection;
