import React, {useState} from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NamespaceSelector from './NamespaceSelector';
import PodList from './PodList';
import {updateAppSettingsWithMutate, useAppSettings, useProfiles} from '../services/hooks';
import {getCurrentProfile, login} from "../services/api.ts";

const DRAWER_WIDTH = 250;

const Dashboard: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const {settings, mutate: refreshSettings, isLoading} = useAppSettings();
  const [namespace, setNamespace] = useState<string>('');
  const [profile, setProfile] = useState<string>(settings?.profile || '');
  const {profiles} = useProfiles();

  React.useEffect(() => {
    (async () => {
      try {
        const currentProfile = await getCurrentProfile();

        if (!currentProfile){
          console.log('No profile found, logging in...');
          await login();
          window.location.reload();
          return;
        }
      }
      catch (e) {
        console.log('No profile found, logging in...');
        await login();
        window.location.reload();
      }
    })();
  }, []);

  // Set namespace from settings when they load
  React.useEffect(() => {
    if (settings?.namespace) {
      setNamespace(settings.namespace);
    }

    if (settings?.profile) {
      setProfile(settings.profile);
    }
  }, [settings]);

  const handleNamespaceChange = async (newNamespace: string) => {
    if (isLoading) {
      return;
    }
    setNamespace(newNamespace);

    // Save the namespace to settings
    try {
      await updateAppSettingsWithMutate({namespace: newNamespace}, refreshSettings);
    } catch (err) {
      console.error('Failed to update namespace in settings:', err);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <div style={{height: '100vh', width: '70vw'}}>
      <CssBaseline/>
      <AppBar position="fixed" color="primary" elevation={0} sx={{zIndex: (theme) => theme.zIndex.drawer + 1}}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{mr: 2, display: {sm: 'none'}}}
          >
            <MenuIcon/>
          </IconButton>
          <Typography fontWeight={500} variant="h6" component="div" sx={{flexGrow: 1}}>
            Deel LDE
          </Typography>
        </Toolbar>
      </AppBar>
      {/*<Drawer*/}
      {/*  variant="temporary"*/}
      {/*  open={drawerOpen}*/}
      {/*  onClose={toggleDrawer}*/}
      {/*  sx={{*/}
      {/*    display: { xs: 'block', sm: 'none' },*/}
      {/*    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <Toolbar />*/}
      {/*  <Box sx={{ p: 2 }}>*/}
      {/*    <NamespaceSelector onNamespaceChange={handleNamespaceChange} />*/}
      {/*  </Box>*/}
      {/*</Drawer>*/}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: {xs: 'none', sm: 'block'},
          '& .MuiDrawer-paper': {boxSizing: 'border-box', width: DRAWER_WIDTH},
        }}
      >
        <Stack justifyContent="space-between" sx={{height: '100%'}}>
          <Stack>
            <Toolbar/>
            <Box sx={{p: 2, overflow: 'auto'}}>
              <NamespaceSelector onNamespaceChange={handleNamespaceChange}/>
            </Box>
          </Stack>
          <Stack>
            <Box sx={{p: 2}}>
              <Typography variant="subtitle1" fontWeight={500}>
                Profiles
              </Typography>
              <Select variant="outlined" fullWidth value={profile} onChange={(e) => {
                const newProfile = e.target.value as string;
                setProfile(newProfile);
                if (isLoading) {
                  return;
                }
                // Update the profile in settings
                updateAppSettingsWithMutate({profile: newProfile}, refreshSettings).catch((err) => {
                  console.error('Failed to update profile in settings:', err);
                });
              }}>
                {profiles?.map(({name}) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>
        </Stack>
      </Drawer>
      <Box component="main" sx={{flexGrow: 1}}>
        <Toolbar/>
        {namespace && <PodList namespace={namespace}/>}
      </Box>
    </div>
  );
};

export default Dashboard;
