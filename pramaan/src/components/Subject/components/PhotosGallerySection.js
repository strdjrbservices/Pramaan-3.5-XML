import React, { useState, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Alert,
  Stack
} from '@mui/material';
import {
  PhotoLibrary as PhotoLibraryIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  Collections as CollectionsIcon,
  ImageSearch as ImageSearchIcon,
  RotateRight as RotateRightIcon
} from '@mui/icons-material';

export const PhotosGallerySection = ({
  id = 'photos-exhibits-section',
  data = {},
  allData = {},
  extractedPhotos = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);

  // Combine photos from props or from data/allData
  const photosList = useMemo(() => {
    if (Array.isArray(extractedPhotos) && extractedPhotos.length > 0) {
      return extractedPhotos;
    }
    if (data?.EXTRACTED_PHOTOS && Array.isArray(data.EXTRACTED_PHOTOS)) {
      return data.EXTRACTED_PHOTOS;
    }
    if (data?.extracted_photos && Array.isArray(data.extracted_photos)) {
      return data.extracted_photos;
    }
    if (allData?.EXTRACTED_PHOTOS && Array.isArray(allData.EXTRACTED_PHOTOS)) {
      return allData.EXTRACTED_PHOTOS;
    }
    if (allData?.extracted_photos && Array.isArray(allData.extracted_photos)) {
      return allData.extracted_photos;
    }
    return [];
  }, [extractedPhotos, data, allData]);

  // Categories and counts
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: photosList.length,
      Subject: 0,
      Comparable: 0,
      Rental: 0,
      Interior: 0,
      Sketch: 0,
      Map: 0,
      General: 0
    };
    photosList.forEach(p => {
      const cat = p.category || 'General';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.General++;
      }
    });
    return counts;
  }, [photosList]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filtered photos by Category AND Search Term
  const filteredPhotos = useMemo(() => {
    return photosList.filter(p => {
      const matchCat = selectedCategory === 'ALL' || (p.category || 'General') === selectedCategory;
      const matchSearch = !searchTerm.trim() ||
        (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (`page ${p.page}`.includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [photosList, selectedCategory, searchTerm]);

  // Requirement Verification Checks
  const verificationStatus = useMemo(() => {
    const hasFront = photosList.some(p => /front/i.test(p.caption || '') || /front/i.test(p.category || ''));
    const hasRear = photosList.some(p => /rear/i.test(p.caption || '') || /rear/i.test(p.category || ''));
    const hasStreet = photosList.some(p => /street/i.test(p.caption || '') || /street/i.test(p.category || ''));
    const compPhotosCount = photosList.filter(p => /comparable/i.test(p.category || '') || /comp/i.test(p.caption || '')).length;
    const hasSketch = photosList.some(p => p.category === 'Sketch' || /sketch|floor\s*plan/i.test(p.caption || ''));
    const hasMap = photosList.some(p => p.category === 'Map' || /map|aerial/i.test(p.caption || ''));

    return [
      { label: 'Subject Front View', pass: hasFront },
      { label: 'Subject Rear View', pass: hasRear },
      { label: 'Subject Street Scene', pass: hasStreet },
      { label: `Comparable Photos (${compPhotosCount} Found)`, pass: compPhotosCount >= 3 },
      { label: 'Building Sketch / Floor Plan', pass: hasSketch },
      { label: 'Location Map / Aerial', pass: hasMap }
    ];
  }, [photosList]);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Subject': return { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' };
      case 'Comparable': return { bg: '#f3e5f5', color: '#7b1fa2', border: '#ce93d8' };
      case 'Rental': return { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' };
      case 'Interior': return { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' };
      case 'Sketch': return { bg: '#fbe9e7', color: '#d84315', border: '#ffab91' };
      case 'Map': return { bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' };
      default: return { bg: '#f5f5f5', color: '#424242', border: '#e0e0e0' };
    }
  };

  return (
    <Paper
      id={id}
      elevation={2}
      sx={{
        p: 2.5,
        my: 2.5,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}
          >
            <PhotoLibraryIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Extracted Photos, Exhibits & Visual Addenda
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100% Deterministic Photo Extraction paired with report page coordinates and labeled captions
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<CollectionsIcon fontSize="small" />}
          label={`${photosList.length} Photos / Exhibits`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Verification Checklist Bar */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2.5,
          borderRadius: 2,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: '1px dashed',
          borderColor: 'divider'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircleIcon color="success" fontSize="small" />
          Photo Addenda Compliance Checklist
        </Typography>
        <Grid container spacing={1}>
          {verificationStatus.map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  borderRadius: 1.5,
                  backgroundColor: item.pass ? 'rgba(46, 125, 50, 0.08)' : 'rgba(237, 108, 2, 0.08)',
                  border: `1px solid ${item.pass ? 'rgba(46, 125, 50, 0.25)' : 'rgba(237, 108, 2, 0.25)'}`
                }}
              >
                {item.pass ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                ) : (
                  <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                )}
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', color: item.pass ? 'success.dark' : 'warning.dark' }}>
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Filter and Search Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {[
            { key: 'ALL', label: 'All Exhibits' },
            { key: 'Subject', label: 'Subject Photos' },
            { key: 'Comparable', label: 'Comparable Photos' },
            { key: 'Rental', label: 'Rental Photos' },
            { key: 'Interior', label: 'Interior Rooms' },
            { key: 'Sketch', label: 'Building Sketch' },
            { key: 'Map', label: 'Maps & Aerials' },
            { key: 'General', label: 'Other Exhibits' }
          ].map(({ key, label }) => {
            const count = categoryCounts[key] || 0;
            if (count === 0 && key !== 'ALL') return null;
            const isSelected = selectedCategory === key;
            return (
              <Chip
                key={key}
                label={`${label} (${count})`}
                onClick={() => setSelectedCategory(key)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-1px)' }
                }}
              />
            );
          })}
        </Stack>

        <input
          type="text"
          placeholder="Search by label or room..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '0.85rem',
            outline: 'none',
            minWidth: '220px'
          }}
        />
      </Box>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No extracted photos found matching your filter or search.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredPhotos.map((photo, index) => {
            const catStyle = getCategoryColor(photo.category);
            const imgSrc = photo.base64_preview || '';

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      '& .photo-overlay': { opacity: 1 }
                    }
                  }}
                  onClick={() => {
                    setRotation(0);
                    setPreviewPhoto(photo);
                  }}
                >
                  <Box sx={{ position: 'relative', width: '100%', height: 180, backgroundColor: '#0f172a' }}>
                    {imgSrc ? (
                      <CardMedia
                        component="img"
                        image={imgSrc}
                        alt={photo.caption}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          backgroundColor: '#1e293b'
                        }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'grey.500' }}>
                        <ImageSearchIcon sx={{ fontSize: 40 }} />
                      </Box>
                    )}

                    {/* Category Badge Top Left */}
                    <Chip
                      size="small"
                      label={photo.category || 'Exhibit'}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        backgroundColor: catStyle.bg,
                        color: catStyle.color,
                        border: `1px solid ${catStyle.border}`
                      }}
                    />

                    {/* Page Number Top Right */}
                    <Chip
                      size="small"
                      label={`Page ${photo.page}`}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: '#fff'
                      }}
                    />

                    {/* Hover Zoom Overlay */}
                    <Box
                      className="photo-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: '#fff'
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 36 }} />
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.3,
                        mb: 0.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                      title={photo.caption}
                    >
                      {photo.caption || 'Exhibit Photo'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Page {photo.page} • {photo.width} × {photo.height} pt
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Fullscreen Preview Lightbox Modal */}
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: '#0f172a',
            color: '#fff',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip label={previewPhoto?.category || 'Exhibit'} color="primary" size="small" sx={{ fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
              {previewPhoto?.caption || 'Photo Preview'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Rotate 90°">
              <IconButton onClick={() => setRotation((prev) => (prev + 90) % 360)} sx={{ color: '#fff' }}>
                <RotateRightIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setPreviewPhoto(null)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 450 }}>
          {previewPhoto?.base64_preview ? (
            <img
              src={previewPhoto.base64_preview}
              alt={previewPhoto.caption}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />
          ) : (
            <Typography variant="body1" color="grey.400">
              No high-resolution preview available.
            </Typography>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 3, color: 'grey.400', fontSize: '0.85rem' }}>
            <span><strong>Page:</strong> {previewPhoto?.page}</span>
            <span><strong>Dimensions:</strong> {previewPhoto?.width} × {previewPhoto?.height} pt</span>
            <span><strong>Format:</strong> {previewPhoto?.format?.toUpperCase()}</span>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default PhotosGallerySection;
