import re

path = r"D:\new start\9-2-2026\Pramaan\src\components\Subject\subject.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'\{\(rawGemini \|\| Object\.keys\(data\)\.length > 0\) && \(\s*<div id="raw-output".*?</div>\s*\)\}'

replacement = """{(rawGemini || Object.keys(data).length > 0) && (
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
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
                      <CodeIcon color="primary" />
                      Extracted JSON Data (Raw Data)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'extracted_appraisal_data.json';
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
                          navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                          setNotification({ open: true, message: 'JSON copied to clipboard!', severity: 'success' });
                        }}
                      >
                        Copy JSON
                      </Button>
                    </Stack>
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
                    <code>{JSON.stringify(data, null, 2)}</code>
                  </Box>
                </Paper>
              )}"""

new_content, count = re.subn(pattern, replacement, content, flags=re.DOTALL)
print(f"Replacements made: {count}")

if count > 0:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully updated Pramaan/src/components/Subject/subject.js")
else:
    print("Pattern was not matched.")
