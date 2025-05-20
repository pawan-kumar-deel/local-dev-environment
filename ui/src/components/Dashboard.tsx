import React, { useState } from 'react';
import { Typography, Box, AppBar, Toolbar, CssBaseline, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NamespaceSelector from './NamespaceSelector';
import PodList from './PodList';
import { useAppSettings, updateAppSettingsWithMutate } from '../services/hooks';

const DRAWER_WIDTH = 240;

const Dashboard: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const { settings, mutate: refreshSettings, isLoading } = useAppSettings();
  const [namespace, setNamespace] = useState<string>('');

  // Set namespace from settings when they load
  React.useEffect(() => {
    if (settings?.namespace) {
      setNamespace(settings.namespace);
    }
  }, [settings]);

  const handleNamespaceChange = async (newNamespace: string) => {
    if (isLoading){
      return;
    }
    setNamespace(newNamespace);

    // Save the namespace to settings
    try {
      await updateAppSettingsWithMutate({ namespace: newNamespace }, refreshSettings);
    } catch (err) {
      console.error('Failed to update namespace in settings:', err);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width:'100vw', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
      <CssBaseline />
      <AppBar position="fixed" color="primary" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography fontWeight={500} variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Deel LDE
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <NamespaceSelector onNamespaceChange={handleNamespaceChange} />
        </Box>
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2, overflow: 'auto' }}>
          <NamespaceSelector onNamespaceChange={handleNamespaceChange} />
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        <Toolbar />
        {namespace && <PodList namespace={namespace} />}
      </Box>
    </Box>
  );
};

export default Dashboard;
