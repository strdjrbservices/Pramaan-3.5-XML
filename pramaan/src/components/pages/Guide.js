import React from 'react';
import { Box, Typography, Paper, Container, Divider, Button, List, ListItem, ListItemText, ListItemIcon, Link, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircleIcon from '@mui/icons-material/Circle';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import PremiumLogo from '../auth/logo';
import Footer from './Footer';

const Guide = () => {
  const navigate = useNavigate();

  const SectionHeader = ({ children }) => (
    <Typography variant="h5" gutterBottom fontWeight={700} color="primary" sx={{ mt: 2 }}>
      {children}
    </Typography>
  );

  const BulletPoint = ({ title, children }) => (
    <ListItem alignItems="flex-start" sx={{ pl: 0, py: 0.5 }}>
      <ListItemIcon sx={{ minWidth: 24, mt: 1 }}>
        <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
      </ListItemIcon>
      <ListItemText
        primary={
          title ? (
            <Typography variant="subtitle1" component="span" fontWeight={700} color="text.primary" sx={{ mr: 1 }}>
              {title}
            </Typography>
          ) : null
        }
        secondary={
          <Typography variant="body1" component="span" color="text.secondary">
            {children}
          </Typography>
        }
        disableTypography
      />
    </ListItem>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8', py: 5 }}>
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }} >
          <Box display="flex" alignItems="center" justifyContent='center' gap={2} mb={4}>
            <PremiumLogo size={60} fullScreen={false} />
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{
                background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex', alignItems: 'center', gap: 1,
                justifyContent: 'center',
              }}>
                User Guide
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Documentation & Usage Instructions
              </Typography>
            </Box>
          </Box>

          <SectionHeader>Getting Started</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Welcome to the Appraisal Review Tool. This platform provides a suite of tools to assist in the review and analysis of appraisal reports.
            To get started, choose a workflow from the main dashboard that matches your current task.
          </Typography>
          <List dense>
            <BulletPoint title="Dashboard:">The central hub for accessing all review tools and utilities.</BulletPoint>
            <BulletPoint title="Navigation:">Use the side menu or home page cards to switch between different review modes.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader>Overview</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
            The Appraisal Review Tool is designed to streamline the review process of appraisal reports.
            It leverages automated data extraction and validation rules to identify potential issues and inconsistencies.
          </Typography>

          <Divider sx={{}} />

          <SectionHeader>File Inputs</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            The tool accepts various file types to perform comprehensive cross-checks:
          </Typography>
          <List dense>
            <BulletPoint title="PDF:">The main appraisal report file. This is the primary document for extraction and review.</BulletPoint>
            <BulletPoint title="HTML:">An HTML file (often from the order management system) used to verify data consistency or check revision requests.</BulletPoint>
            <BulletPoint title="Contract Copy:">The purchase contract copy. Upload this to validate the Contract Price and Date against the appraisal report.</BulletPoint>
            <BulletPoint title="Engagement Letter:">The engagement letter. Upload this to verify that the report matches the engagement terms (e.g., Appraiser Name, Address).</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader><Link component={RouterLink} to="/extractor" color="primary" underline="hover">Full File Review</Link></SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            <strong>Supported Forms:</strong> 1004, 1004C, 1004D, 1025, 1073, 2090, 203k-FHA, 2055, 1075, 2095, 1007, 216, 1025 + 1007, 1073 + 1007, Appraisal Version #1, ERC.
          </Typography>
          <List dense>
            <BulletPoint title="1. Upload:">Select your appraisal PDF file.</BulletPoint>
            <BulletPoint title="2. Extraction:">The system automatically extracts data from the PDF.</BulletPoint>
            <BulletPoint title="3. Validation:">Review automated validation checks for missing fields, inconsistencies, and guideline compliance.</BulletPoint>
            <BulletPoint title="4. Editing:">You can manually edit extracted fields if necessary.</BulletPoint>
            <BulletPoint title="5. Reporting:">Generate a PDF summary or validation log of your review.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader>Validation Logic</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            The tool automatically runs a comprehensive set of validation rules on the extracted data. These rules cover:
          </Typography>
          <List dense>
            <BulletPoint title="Mandatory Fields:">Ensures critical fields like Address, Borrower, Lender, and Value are present.</BulletPoint>
            <BulletPoint title="Data Consistency:">Checks for consistency across sections (e.g., Room counts in Improvements vs. Sales Grid).</BulletPoint>
            <BulletPoint title="Logical Consistency:">Verifies logical relationships (e.g., Year Built vs. Age, Condition ratings vs. Adjustments).</BulletPoint>
            <BulletPoint title="USPAP & GSE Guidelines:">Flags potential non-compliance with standard appraisal guidelines.</BulletPoint>
            <BulletPoint title="State Specifics:">Checks for state-specific requirements (e.g., Disclosure of fees in certain states).</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader><Link component={RouterLink} to="/compare" color="primary" underline="hover">Revised File Review</Link></SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            This workflow helps you efficiently review revised appraisal reports. It offers several comparison modes:
          </Typography>
          <List dense>
            <BulletPoint title="Revision Verification:">Upload the revised PDF and the HTML file containing revision requests. The tool will check if the specific changes requested in the HTML have been addressed in the revised PDF.</BulletPoint>
            <BulletPoint title="Confirmation Checklist:">Upload the original and revised PDFs to run a predefined checklist of common verification points, such as value changes, map presence, and form inclusion.</BulletPoint>
            <BulletPoint title="PDF vs. HTML:">Compare a PDF file against an HTML file to check for data consistency between the two documents.</BulletPoint>
            <BulletPoint title="PDF vs. PDF:">Upload the original and revised PDFs to see a detailed, side-by-side comparison of all detected text changes, highlighting exactly what was modified.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader><Link component={RouterLink} to="/query" color="primary" underline="hover">1004 Workflow</Link></SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            The 1004D workflow facilitates the review of Appraisal Update and/or Completion Reports.
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>Comparison Modes:</Typography>
          <List dense>
            <BulletPoint title="PDF vs. PDF:">Compare the Original Appraisal (Old PDF) against the 1004D (New PDF). This checks for consistency in Contract Price, Date of Contract, Effective Date, Original Appraised Value, and verifies the "Summary Appraisal Update Report" and "Certification of Completion" sections.</BulletPoint>
            <BulletPoint title="HTML vs. PDF:">Compare data extracted from an HTML file against the 1004D PDF. This verifies that the Lender/Client name, Inspection Date, Borrower information, and Appraiser name match the order details.</BulletPoint>
            <BulletPoint title="Reporting:">Generate a validation log summarizing the comparison results and save the report to the database.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader><Link component={RouterLink} to="/1004D" color="primary" underline="hover">Custom Query</Link></SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            The Custom Query tool allows you to ask specific questions about your appraisal document using AI.
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>How to use:</Typography>
          <List dense>
            <BulletPoint title="1. Upload:">Upload your PDF file.</BulletPoint>
            <BulletPoint title="2. Ask:">Enter a specific question or instruction in the text box (e.g., "Extract the borrower's name" or "Check if the subject property is in a PUD").</BulletPoint>
            <BulletPoint title="3. Run:">Click "Run Query" to get an AI-generated answer based on the document's content.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader>Clearing & Resetting</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            To start a new review or clear the current session:
          </Typography>
          <List dense>
            <BulletPoint title="Clear Files:">Use the 'Clear' button in the upload section to remove all uploaded files and reset extracted data.</BulletPoint>
            <BulletPoint title="Reset Form:">Refreshing the page will also reset the application state.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader>New Section Title</SectionHeader>
          <Typography paragraph color="text.secondary" sx={{ lineHeight: 1.7 }}>
            This is where you can add the description for the new section.
          </Typography>
          <List dense>
            <BulletPoint title="Point 1:">Description for point 1.</BulletPoint>
            <BulletPoint title="Point 2:">Description for point 2.</BulletPoint>
          </List>

          <Divider sx={{}} />

          <SectionHeader>FAQ</SectionHeader>
          <List dense>
            <BulletPoint title="What file formats are supported?">
              Currently, the tool supports PDF files for appraisal reports and HTML files for revision requests.
            </BulletPoint>
            <BulletPoint title="How do I report a bug?">
              Please contact the support team or use the feedback form in the dashboard.
            </BulletPoint>
            <BulletPoint title="Is my data secure?">
              Yes, all uploaded files are processed securely and are not shared with third parties. Data is used solely for the purpose of analysis and review.
            </BulletPoint>
            <BulletPoint title="Browser Compatibility">
              This tool is optimized for modern web browsers such as Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari.
            </BulletPoint>
          </List>

          <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<EmailIcon />}
              href="mailto:strdjrbservices@gmail.com?subject=Appraisal Review Tool Support Request"
            >
              Email Support
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/contact"
            >
              Contact Page
            </Button>
          </Stack>
        </Paper>

        <Footer />
      </Container>
    </Box>
  );
};

export default Guide;
