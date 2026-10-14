import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../../context/ThemeContext.js';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  useTheme,
} from '@mui/material';

import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import HistoryIcon from '@mui/icons-material/History';
// import AssignmentIcon from '@mui/icons-material/Assignment';
import LightModeIcon from '@mui/icons-material/LightMode';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import PremiumLogo from '../../auth/logo.js';
import { API_BASE_URL } from '../utils/utils.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  // PieChart,
  // Pie,
  // Cell,
} from 'recharts';

// const MOCK_ERROR_DATA = [
//   { name: 'Missing Signatures', value: 15 },
//   { name: 'Date Mismatch', value: 10 },
//   { name: 'UAD Compliance', value: 8 },
//   { name: 'Location Map', value: 5 },
// ];
// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

/* ---------- CARD COMPONENT ---------- */

const AnimatedCard = ({ to, title, desc, icon, color, newTab }) => {
  const location = useLocation();
  const theme = useTheme();
  const isActive = location.pathname === to;

  return (
    <Box
      component={Link}
      to={to}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
      }}
    >
      <Box
        sx={{
          p: 3,
          height: '100%',
          borderRadius: 3,
          backgroundColor: 'background.paper',
          border: isActive
            ? `2px solid ${color}`
            : `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',

          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.15)',
            border: '1px solid #bdb068ff'
          },

          '&:hover .icon': {
            transform: 'rotate(6deg) scale(1.15)',
          },
        }}
      >
        <Box
          className="icon"
          sx={{
            mb: 2,
            transition: 'transform 0.35s ease',
            '& svg': {
              fontSize: 46,
              color,
            },
          }}
        >
          {icon}
        </Box>

        <Typography fontWeight={800} mb={1}>
          {title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6 }}
        >
          {desc}
        </Typography>
      </Box>
    </Box>
  );
};


const HomePage = () => {
  const { themeMode, toggleTheme } = useThemeContext();
  const [username, setUsername] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    setUsername(localStorage.getItem('username') || '');
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-reports/`);
      if (response.ok) {
        const data = await response.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch reports for analytics", error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (timeRange === '7days') {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      return last7Days.map(date => {
        const count = reports.filter(r => r.created_at && r.created_at.startsWith(date)).length;
        return {
          date,
          count,
          label: new Date(date).toLocaleDateString(undefined, { weekday: 'short' })
        };
      });
    } else if (timeRange === 'month') {
      const last30Days = [...Array(30)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });
      return last30Days.map(date => {
        const count = reports.filter(r => r.created_at && r.created_at.startsWith(date)).length;
        return {
          date,
          count,
          label: new Date(date).getDate().toString()
        };
      });
    } else if (timeRange === 'year') {
      const last12Months = [...Array(12)].map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return {
          year: d.getFullYear(),
          month: d.getMonth(),
          label: d.toLocaleString('default', { month: 'short' })
        };
      });
      return last12Months.map(({ year, month, label }) => {
        const count = reports.filter(r => {
          if (!r.created_at) return false;
          const d = new Date(r.created_at);
          return d.getFullYear() === year && d.getMonth() === month;
        }).length;
        return { date: `${year}-${month + 1}`, count, label };
      });
    }
    return [];
  };

  const getAverageTime = () => {
    if (!reports.length) return 0;
    const times = reports.map(r => {
      const timeStr = r.report_data?.totalTimeTaken;
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60; // Minutes
      return 0;
    }).filter(t => t > 0);

    if (!times.length) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const chartData = getChartData();
  const avgTime = getAverageTime();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: themeMode === 'dark'
          ? 'linear-gradient(135deg, #1b1f3b, #2b2f55, #1b1f3b)'
          : 'linear-gradient(135deg, #f5f7fa, #c3cfe2, #f5f7fa)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        color: 'text.primary',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1000,
          backgroundColor: 'background.paper',
          borderRadius: 4,
          p: { xs: 3, md: 5 },
          position: 'relative',
          color: 'text.primary',
        }}
      >
        <IconButton
          onClick={toggleTheme}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'text.secondary',
          }}
        >
          {themeMode === 'dark' ? <LightModeIcon /> : <NightlightRoundIcon />}
        </IconButton>
        <Box display="flex" alignItems="center" justifyContent="center" mb={5} gap={3}>
          <PremiumLogo size={100} fullScreen={false} />
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Appraisal Tools
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Welcome, <strong>{username}</strong>
            </Typography>
          </Box>
        </Box>


        <Box mb={5}>
          <Typography variant="h6" fontWeight={800} mb={2} display='flex' justifyContent='center' alignItems="center" gap={1}>
            Analytics Dashboard
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3} display='flex' justifyContent='center' alignItems="center">

              <Grid item xs={12} md={8}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: 320, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>Reviews Completed</Typography>
                    <FormControl size="small" variant="standard">
                      <Select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        disableUnderline
                        sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}
                      >
                        <MenuItem value="7days">Last 7 Days</MenuItem>
                        <MenuItem value="month">Last 30 Days</MenuItem>
                        <MenuItem value="year">Last Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={timeRange === 'month' ? 'preserveStartEnd' : 0} />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} name="Reviews" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>


              <Grid item xs={12} md={4}>
                <Grid container spacing={3} direction="column" style={{ height: '100%' }}>
                  <Grid item xs={12} sx={{ flex: 1 }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="subtitle2" color="text.secondary">Avg. Turnaround Time</Typography>
                      <Typography variant="h3" fontWeight={800} color="primary.main" my={1}>
                        {avgTime}<Typography component="span" variant="h6" color="text.secondary"> min</Typography>
                      </Typography>
                    </Paper>
                  </Grid>
                  {/* <Grid item xs={12} sx={{ flex: 1 }}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: '100%', minHeight: 150, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" fontWeight={700} mb={1}>Common Error Types</Typography>
                      <Box sx={{ flexGrow: 1, minHeight: 40 }}>
                        <ResponsiveContainer sx={{ minHeight: 40 , minWidth: 40}}>
                          <PieChart >
                            <Pie   data={MOCK_ERROR_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                              {MOCK_ERROR_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid> */}
                </Grid>
              </Grid>
            </Grid>
          )}
        </Box>


        <Typography variant="h6" fontWeight={800} mb={2} display='flex' justifyContent='center' alignItems="center" gap={1}>
          Review Workflows
        </Typography>

        <Grid container spacing={3} mb={5} display='flex' justifyContent='center' alignItems="center">
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/extractor"
              title="Full File Review"
              desc="Complete appraisal document review with structured insights."
              icon={<DescriptionIcon />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/erc"
              title="ERC Review"
              desc="Employee Relocation Council (ERC) Report with side-by-side comparison."
              icon={<CompareArrowsIcon />}
              color="#e91e63"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/extractor?formType=Appraisal Version %231"
              title="Appraisal Version #1"
              desc="Comprehensive review for Appraisal Version #1 reports."
              icon={<DescriptionIcon />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/compare"
              title="Revised File Review"
              desc="Compare original and revised reports side-by-side."
              icon={<CompareArrowsIcon />}
              color="#9c27b0"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="https://praman-strdjrbservices.pythonanywhere.com/api/automation/"
              title="Automation Dashboard"
              desc="Automation Dashboard."
              icon={<AutoModeIcon />}
              color="#070b4eff"
              newTab
            />
          </Grid>
        </Grid>


        <Typography variant="h6" fontWeight={800} mb={2} display='flex' justifyContent='center' alignItems="center">
          Utilities
        </Typography>

        <Grid container spacing={3} mb={5} display='flex' justifyContent='center' alignItems="center">
          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/query"
              title="Custom Query"
              desc="Run advanced appraisal data queries."
              icon={<SearchIcon />}
              color="#ed6c02"

            />
          </Grid>

          <Grid item xs={12} md={4}  >
            <AnimatedCard
              to="/1004D"
              title="1004D"
              desc="Process appraisal completion certificates."
              icon={<AssignmentTurnedInIcon />}
              color="#2e7d32"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AnimatedCard
              to="/history"
              title="Review History"
              desc="View past appraisal reviews and reports."
              icon={<HistoryIcon />}
              color="#673ab7"

            />
          </Grid>
        </Grid>
        <Typography variant="h6" fontWeight={800} mb={2} display='flex' justifyContent='center' alignItems="center" gap={1}>
          Support & Resources
        </Typography>

        <Grid container spacing={3} display='flex' justifyContent='center' alignItems="center">
          <Grid item xs={12} md={6}>
            <AnimatedCard
              to="/guide"
              title="User Guide"
              desc="Comprehensive documentation and usage instructions."
              icon={<MenuBookIcon />}
              color="#009688"
              newTab
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <AnimatedCard
              to="/contact"
              title="Contact Us"
              desc="Get in touch with our support team."
              icon={<ContactSupportIcon />}
              color="#E91E63"
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default HomePage;
