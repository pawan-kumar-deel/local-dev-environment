import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { AppBar, Box, CssBaseline, Drawer, IconButton, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NamespaceSelector from './NamespaceSelector';
import PodList from './PodList';
import { updateAppSettingsWithMutate, useAppSettings, useProfiles } from '../services/hooks';
import { getCurrentProfile, login } from "../services/api.ts";
const DRAWER_WIDTH = 250;
const Dashboard = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { settings, mutate: refreshSettings, isLoading } = useAppSettings();
    const [namespace, setNamespace] = useState('');
    const [profile, setProfile] = useState(settings?.profile || '');
    const { profiles } = useProfiles();
    React.useEffect(() => {
        (async () => {
            try {
                const currentProfile = await getCurrentProfile();
                if (!currentProfile) {
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
    const handleNamespaceChange = async (newNamespace) => {
        if (isLoading) {
            return;
        }
        setNamespace(newNamespace);
        // Save the namespace to settings
        try {
            await updateAppSettingsWithMutate({ namespace: newNamespace }, refreshSettings);
        }
        catch (err) {
            console.error('Failed to update namespace in settings:', err);
        }
    };
    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };
    return (_jsxs("div", { style: { height: '100vh', width: '70vw' }, children: [_jsx(CssBaseline, {}), _jsx(AppBar, { position: "fixed", color: "primary", elevation: 0, sx: { zIndex: (theme) => theme.zIndex.drawer + 1 }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: toggleDrawer, sx: { mr: 2, display: { sm: 'none' } }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { fontWeight: 500, variant: "h6", component: "div", sx: { flexGrow: 1 }, children: "Deel LDE" })] }) }), _jsx(Drawer, { variant: "permanent", sx: {
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                }, children: _jsxs(Stack, { justifyContent: "space-between", sx: { height: '100%' }, children: [_jsxs(Stack, { children: [_jsx(Toolbar, {}), _jsx(Box, { sx: { p: 2, overflow: 'auto' }, children: _jsx(NamespaceSelector, { onNamespaceChange: handleNamespaceChange }) })] }), _jsx(Stack, { children: _jsxs(Box, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: 500, children: "Profiles" }), _jsx(Select, { variant: "outlined", fullWidth: true, value: profile, onChange: (e) => {
                                            const newProfile = e.target.value;
                                            setProfile(newProfile);
                                            if (isLoading) {
                                                return;
                                            }
                                            // Update the profile in settings
                                            updateAppSettingsWithMutate({ profile: newProfile }, refreshSettings).catch((err) => {
                                                console.error('Failed to update profile in settings:', err);
                                            });
                                        }, children: profiles?.map(({ name }) => (_jsx(MenuItem, { value: name, children: name }, name))) })] }) })] }) }), _jsxs(Box, { component: "main", sx: { flexGrow: 1 }, children: [_jsx(Toolbar, {}), namespace && _jsx(PodList, { namespace: namespace })] })] }));
};
export default Dashboard;
